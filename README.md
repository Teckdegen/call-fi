# Call Fi

**On-chain voice and video calls between any two wallet addresses. Payments mid-call. Powered by Somnia Reactivity.**

Call any wallet. Talk or video-chat peer-to-peer. Send or request STT while the call is live. Every event — signaling, payments, call history — lives permanently on-chain. No servers. No polling. No off-chain bots. No token approvals.

Live contract: [`0x00D3288C5668479764673213bc84C44905C71c93`](https://explorer.somnia.network/address/0x00D3288C5668479764673213bc84C44905C71c93) on Somnia Testnet

---

## The core idea

Traditional voice apps (Telegram, WhatsApp, Signal) rely on centralised signaling servers to negotiate peer-to-peer connections. When you call someone, those servers coordinate the WebRTC handshake before audio flows. Call Fi replaces that entire server with Somnia Reactivity.

The WebRTC signaling — the offer SDP and answer SDP — is written on-chain and delivered to the other browser instantly via Somnia's WebSocket push (Reactivity). No server. No polling. No accounts. The chain is the signaling layer.

---

## How a call works — end to end

```
Alice wants to call Bob
─────────────────────────────────────────────────────────────────────────────

1.  Alice opens the dialer, types Bob's wallet address
    Chooses VOICE or VIDEO

2.  Browser calls getUserMedia() — requests mic (+ camera for video)

3.  A WebRTC SDP offer is generated locally in Alice's browser
    This offer contains: supported codecs, Alice's public IP/port candidates,
    DTLS fingerprint (for media encryption key exchange)
    ALL ICE candidates are gathered BEFORE the tx — vanilla ICE bundling

4.  Alice signs one transaction: initiateCall(bob, sdpOffer)
    → CallInitiated event emitted on-chain with the full SDP as a string

5.  Somnia Reactivity delivers CallInitiated to Bob's browser
    in the same block it was mined — no refresh, no polling, no waiting

6.  Bob sees the incoming call screen. Ring tone plays.
    If it's a video call, the screen shows "VIDEO CALL"

7.  Bob taps Accept
    Browser creates a WebRTC SDP answer from Alice's offer
    All of Bob's ICE candidates are gathered locally before sending

8.  Bob signs one transaction: acceptCall(callId, sdpAnswer)
    → CallAccepted event emitted on-chain with Bob's full SDP

9.  Somnia Reactivity delivers CallAccepted to Alice's browser instantly
    Alice's browser sets Bob's answer as the remote description

10. WebRTC peer connection negotiates directly between the two browsers
    DTLS handshake → SRTP keys exchanged → encrypted media flows
    No server is involved in the media path

─── During the call ─────────────────────────────────────────────────────────

11. Alice wants to send 0.5 STT to Bob
    She hits Send, enters amount, confirms in her wallet
    Direct ETH transfer to Bob's address — no contract involved
    Bob sees a payment notification (via PaymentSent... actually direct transfer)

12. Bob wants to request 1 STT from Alice
    requestPayment(callId, alice, 1 STT) → PaymentRequested event
    → Reactivity delivers it to Alice — she sees a request banner

13. Alice accepts the request
    Direct ETH transfer of 1 STT to Bob's wallet
    → PaymentRequestResolved event → Bob notified instantly

─── Ending the call ─────────────────────────────────────────────────────────

14. Either party clicks End
    endCall(callId) is called on-chain
    → CallEnded event with permanent duration stored on-chain
    → WebRTC peer connection closes, media stops
```

Two transactions total for a complete call: one offer, one answer. That's the entire signaling.

---

## How Somnia Reactivity works

Reactivity is the technology that makes real-time on-chain signaling possible. Here is exactly what happens under the hood.

### The WebSocket subscription

When your browser connects, `useReactivity.ts` opens a WebSocket to:

```
wss://dream-rpc.somnia.network/ws
```

Using `viem`'s `watchContractEvent`, it subscribes to all CallFi events filtered to your wallet address. Each subscription sends a filter to the Somnia node that looks like:

```
{ address: CallFi_contract, event: "CallInitiated", args: { receiver: your_address } }
```

The node-side filter means only events relevant to you are pushed to your browser. No unnecessary data.

### When a transaction confirms

The moment a transaction is included in a Somnia block (block time ~1-2 seconds), the Somnia validators push the matching log to every subscriber whose filter matches. Your browser receives the event in the same block — typically within 1-2 seconds of the transaction being signed.

This is not polling. The frontend has zero `setInterval`, zero `eth_getLogs` loops, zero HTTP requests waiting on events. The WebSocket connection stays open and the chain pushes to you.

### Why this is necessary

On a standard EVM chain (Ethereum, Polygon, etc), you would typically poll for events every few seconds. That means:

- Incoming call: up to 15 seconds to appear
- Call answer: up to 15 seconds to reach the caller
- Total setup time: potentially 30+ seconds of ringing before audio connects

On Somnia with Reactivity:

- Incoming call: appears in 1-2 seconds (same block as the tx)
- Call answer: reaches caller in 1-2 seconds
- Total setup time: 3-5 seconds from tap to audio

Sub-second event delivery is what turns blockchain signaling from a thought experiment into a real product.

### How stale closures are avoided

A subtle implementation detail: the WebSocket subscriptions are set up once when your wallet address is known, and must not be torn down and recreated on every render (that would cause event loss). But the React callbacks they invoke — `onCallInitiated`, `onCallAccepted`, etc — change on every render.

The solution is a callback ref pattern in `useReactivity.ts`:

```typescript
const cb = useRef<Callbacks>({});
cb.current = { onCallInitiated, onCallAccepted, ... }; // updated every render

// subscriptions call cb.current.onX() — always the latest version
onLogs: logs => logs.forEach(log => {
  cb.current.onCallInitiated?.(callId, caller, signalOffer);
})
```

The subscriptions are stable (set up once per address). The callbacks are always fresh (read from `cb.current` at call time). No stale closures.

---

## Is it encrypted?

Yes and no. Here is the honest breakdown.

### Audio and video — YES, truly encrypted

All media flowing between the two browsers is encrypted end-to-end using **DTLS-SRTP** — the same standard that Signal, Zoom, and every modern WebRTC application uses.

When the peer connection is established:
1. Each browser generates a DTLS certificate (ephemeral, session-only)
2. The DTLS fingerprints are included in the SDP offer and answer
3. During connection setup, both browsers perform a DTLS handshake — this is mutual authentication and key exchange, happening directly peer-to-peer
4. SRTP session keys are derived from the DTLS handshake
5. All audio and video packets are encrypted with SRTP before leaving your device

This means: Somnia nodes, ISPs, anyone on the network path between the two browsers — none of them can hear or see the call audio or video. The content is encrypted between your browser and the other person's browser only. No third party holds the keys.

### Signaling — Encrypted before going on-chain

The WebRTC SDP strings — the offer and the answer — are encrypted in the browser using the receiver's public key before being submitted on-chain. Only the receiver's wallet can decrypt them.

The SDP contains:
- Codec preferences (opus for audio, H.264/VP8 for video)
- ICE candidates (your public IP addresses and ports for NAT traversal)
- The DTLS certificate fingerprint

Before any of that hits the chain, it is encrypted using the receiver's Ethereum public key via `eciesjs`. The encrypted blob is what gets stored on-chain — it looks like random bytes to everyone else. Only the intended receiver can decrypt it using their private key locally in the browser.

This means your IP addresses and connection info are never exposed publicly on-chain.

### Metadata — fully public

| Data | Visibility |
|------|-----------|
| Who called who | Public on-chain forever |
| Call timestamp | Public on-chain forever |
| Call duration | Public on-chain forever |
| Payment amounts | Public on-chain forever |
| Payment sender/receiver | Public on-chain forever |
| SDP offer/answer strings | Encrypted before going on-chain |
| ICE candidates / IP addresses | Encrypted before going on-chain |
| Media content (audio/video) | Encrypted, peer-to-peer only |

If metadata privacy matters to your use case, be aware that Call Fi does not hide it. The call record is permanent and readable by anyone.

### Summary

Media: end-to-end encrypted via DTLS-SRTP. As private as Signal calls.
Signaling: encrypted on-chain using the receiver's public key. Only the receiver can decrypt it.
Metadata (who called who, timestamps, duration): public on-chain. Permanent and readable by anyone.

---

## Features

- **Dial any wallet** — paste or type any `0x` address and call
- **Voice or video** — choose before the call starts from the dialer
- **Incoming call screen** — delivered via Reactivity, same block as the initiating tx
- **Video call screen** — shows "VIDEO CALL" badge, accept button includes video icon
- **Peer-to-peer audio and video** — WebRTC DTLS-SRTP encrypted, no relay server for media
- **Camera toggle** — turn your camera off and back on mid-call; remote party sees the change via `replaceTrack`
- **Mute** — kills your outgoing mic track
- **Hold** — freezes your mic AND pauses incoming audio (both directions silent)
- **Speaker** — routes audio to loudspeaker via `setSinkId`
- **Send STT mid-call** — direct ETH transfer to peer's wallet, one wallet popup
- **Request STT mid-call** — recipient accepts or declines with one wallet popup
- **TX waiting states** — every transaction shows a status overlay ("Gathering connection info…", "Sign to accept call", "Waiting for Transaction")
- **Call log** — full history stored on-chain, shows duration and status
- **Call back** — tap any past call to redial instantly
- **Auto end on tab close** — `beforeunload` fires `endCall` so calls don't hang

---

## Payment system

Payments are native STT (the Somnia gas token). No ERC-20 tokens, no approvals, no relayer.

| Action | How it works | What user sees |
|--------|-------------|---------------|
| Send STT | Direct ETH transfer to peer's wallet | One wallet popup |
| Request STT | `requestPayment(callId, target, amount)` on-chain | One wallet popup |
| Accept a request | Direct ETH transfer to requester's wallet | One wallet popup |
| Decline a request | `declinePaymentRequest(requestId)` on-chain | One wallet popup |

Send and accept are direct wallet-to-wallet transfers — they bypass the contract entirely. The contract only records the request intent and the resolution, so the payment log is on-chain but the funds never touch the contract.

---

## Smart contract — CallFi.sol

Single contract. No external dependencies. No owner. No upgradeable proxy. No relayer. No token. The deployer has zero ongoing rights — there is nothing to admin after deploy.

Deployed at `0x00D3288C5668479764673213bc84C44905C71c93` on Somnia Testnet.

### Call lifecycle functions

```solidity
initiateCall(address receiver, string sdpOffer)     → CallInitiated
acceptCall(uint256 callId, string sdpAnswer)         → CallAccepted
declineCall(uint256 callId)                          → CallDeclined
endCall(uint256 callId)                              → CallEnded
```

### Payment functions

```solidity
requestPayment(uint256 callId, address target, uint256 amount)  → PaymentRequested
declinePaymentRequest(uint256 requestId)                        → PaymentRequestResolved
```

Note: `sendPayment` and `acceptPaymentRequest` are direct ETH transfers from the user's wallet — they don't call the contract (no gas overhead, no approval step).

### Read functions

```solidity
getCall(uint256 callId)              → Call struct
getUserCalls(address user)           → uint256[] callIds
getPaymentRequest(uint256 requestId) → PaymentRequest struct
```

### Events (what Reactivity subscribes to)

```solidity
CallInitiated(
  uint256 indexed callId,
  address indexed caller,
  address indexed receiver,
  string signalOffer,       // full SDP offer — public on-chain
  uint256 timestamp
)

CallAccepted(
  uint256 indexed callId,
  address indexed receiver,
  string signalAnswer,      // full SDP answer — public on-chain
  uint256 timestamp
)

CallDeclined(
  uint256 indexed callId,
  address indexed receiver,
  uint256 timestamp
)

CallEnded(
  uint256 indexed callId,
  address indexed endedBy,
  uint256 duration,         // seconds
  uint256 timestamp
)

PaymentRequested(
  uint256 indexed callId,
  uint256 indexed requestId,
  address indexed requester,
  address target,
  uint256 amount,
  uint256 timestamp
)

PaymentRequestResolved(
  uint256 indexed requestId,
  address indexed resolvedBy,
  bool accepted,
  uint256 timestamp
)
```

---

## Frontend architecture

### Tech stack

| Layer | Technology |
|-------|-----------|
| Chain | Somnia Testnet — chainId 50312 |
| RPC (HTTP) | `https://dream-rpc.somnia.network` |
| RPC (WebSocket / Reactivity) | `wss://dream-rpc.somnia.network/ws` |
| Contracts | Solidity ^0.8.20, compiled with Hardhat |
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Wallet | Web3Modal v4 (`@web3modal/wagmi`) — MetaMask, WalletConnect, Coinbase, 200+ wallets |
| Web3 | wagmi v2, viem v2 |
| WebRTC | Browser native — peer-to-peer audio + video, DTLS-SRTP encrypted |
| Signaling | On-chain events delivered via Somnia Reactivity (no signaling server) |
| TURN relay | OpenRelay (`turn:openrelay.metered.ca`) — for NAT traversal when direct peer connection fails |
| STUN | Google public STUN (`stun:stun.l.google.com:19302`) |
| Styling | Custom CSS — cream/ink design, Playfair Display, Space Grotesk, Space Mono |

### File structure

```
somnia-call/
├── contracts/
│   └── CallFi.sol                  # The entire protocol — calls + payments
│
├── scripts/
│   ├── deploy.js                   # Deploy to Somnia testnet
│   └── generate-wallet.js          # Generate a fresh EVM wallet
│
├── hardhat.config.js               # Somnia network config
├── package.json
│
└── frontend/
    ├── app/
    │   ├── page.tsx                # Main app — dialer, call log, connect screen
    │   ├── layout.tsx              # Root layout with fonts
    │   ├── globals.css             # Design system — cream/ink, typography, animations
    │   └── providers.tsx           # WagmiProvider + QueryClientProvider
    │
    ├── components/
    │   ├── ActiveCall.tsx          # Full-screen call UI — mute, hold, speaker, camera, end, payments
    │   ├── IncomingCall.tsx        # Incoming call overlay — voice/video badge, accept/decline
    │   └── PaymentModal.tsx        # Send / request STT sheet
    │
    ├── hooks/
    │   ├── useCall.ts              # Call state machine — orchestrates everything
    │   ├── useReactivity.ts        # Somnia Reactivity WebSocket subscriptions
    │   └── useWebRTC.ts            # Peer connection, media, mute, hold, speaker, camera
    │
    └── lib/
        ├── chain.ts                # Somnia Testnet viem chain definition
        ├── contract.ts             # CallFi ABI + deployed address
        ├── sounds.ts               # Ring, answer, hangup, click sound effects
        └── wagmi.ts                # Web3Modal + wagmi config
```

### Hook responsibilities

**`useWebRTC.ts`** — owns the browser media layer

Creates the `RTCPeerConnection` with STUN + TURN servers. Requests mic/camera access via `getUserMedia`. Builds SDP offers and answers using **vanilla ICE gathering**: all ICE candidates are gathered locally before the SDP is returned, so the entire connection info fits in one on-chain string with no follow-up candidate exchanges needed.

Key behaviours:
- `createOffer(video: boolean)` — requests `{ audio, video }` or `{ audio }`, gathers all candidates, returns complete SDP JSON
- `createAnswer(offerStr)` — auto-detects whether the offer includes video from `sdp.includes("m=video")`, matches media mode, returns complete SDP JSON
- `ontrack` — drives a DOM `<audio>` element appended to `document.body` for guaranteed audio playback (bypasses browser autoplay blocking)
- `toggleCamera` — uses `RTCRtpSender.replaceTrack(null)` to stop sending video (remote sees black/nothing) and `replaceTrack(videoTrack)` to resume (remote sees video again). `track.enabled` alone is not enough — `replaceTrack` explicitly re-signals the sender so the remote receiver acts on the change immediately.
- `toggleMute` — disables local audio tracks
- `toggleHold` — disables all local tracks + pauses the remote audio element
- `toggleSpeaker` — calls `setSinkId` to route audio output to loudspeaker

**`useReactivity.ts`** — owns the Somnia WebSocket connection

Opens a viem `createPublicClient` with `transport: webSocket(...)`. Subscribes to all six CallFi events, filtered server-side by your wallet address where possible. Uses the callback-ref pattern so subscriptions are never recreated mid-session but always call the latest callback versions.

Filters applied:
- `CallInitiated` — filtered server-side by `receiver: myAddress` (you only receive calls meant for you)
- `CallAccepted` — received globally, but the receiver field is checked client-side: if `receiver === myAddress`, skip it (you already handled accept in `acceptCall()`)
- `CallDeclined`, `CallEnded` — received globally, dispatched to handler
- `PaymentRequested` — checked client-side: only handle if `target === myAddress`
- `PaymentRequestResolved` — received globally (requester needs to know when their request resolves)

**`useCall.ts`** — the state machine

Calls both `useWebRTC` and `useReactivity`. Owns the `callState` enum (`idle → calling → incoming → active → ended`), current call info, pending payment requests, the elapsed timer, and TX waiting labels. Exposes every action the UI needs and translates between on-chain events and React state.

Notable behaviours:
- `onCallAccepted` wraps `webrtc.setAnswer` in a try/catch — the caller's UI transitions to "active" even if setAnswer throws, so the caller is never stuck on the ringing screen
- `busyLabel` state drives TX overlay UI across all three transaction-heavy flows (accept, decline, end)
- `callMode` (`"voice" | "video"`) is detected from incoming SDP (`sdp.includes("m=video")`) so the receiver's UI matches what the caller chose

---

## UI design system

The interface uses the Encrypted Fi design language:

- **Background**: `#E7E2D9` (warm cream)
- **Foreground**: `#0A0A0A` (near-black ink)
- **Accents**: red for danger/decline, green for accept/active, yellow for hold state
- **Typography**: Playfair Display (headings/wordmark), Space Grotesk (body), Space Mono (addresses/numbers)
- **Borders**: `1px solid rgba(10,10,10,0.14)` — square corners, no border-radius
- **Active voice call**: full ink background, cream text, 3-column control grid
- **Active video call**: remote video fills the screen (fullscreen fixed), local video PiP (top-right corner), controls float over the video with solid dark glass backgrounds so they're visible against any video content

---

## Setup and local development

### 1. Install dependencies

```bash
# Root (Hardhat)
cd somnia-call
npm install

# Frontend (Next.js)
cd frontend
npm install
```

### 2. Generate a deployer wallet

```bash
cd somnia-call
npm run wallet
```

Copy the private key and address. Fund the address with testnet STT from the [Somnia faucet](https://testnet.somnia.network/faucet).

### 3. Configure environment

```bash
# somnia-call/.env  (for Hardhat deploy)
DEPLOYER_PRIVATE_KEY=0xYourPrivateKey

# somnia-call/frontend/.env.local  (for the frontend)
NEXT_PUBLIC_CALLFI_ADDRESS=0x00D3288C5668479764673213bc84C44905C71c93
NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_project_id
```

Get a WalletConnect Project ID free at [cloud.walletconnect.com](https://cloud.walletconnect.com).

### 4. Run locally

```bash
cd somnia-call/frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Connect MetaMask on Somnia Testnet. Dial a wallet address.

### 5. Deploy the contract (optional — already live)

```bash
cd somnia-call
npx hardhat run scripts/deploy.js --network somnia
```

---

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) → import the repo
3. Set **Root Directory** to `somnia-call/frontend`
4. Add environment variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_CALLFI_ADDRESS` | `0x00D3288C5668479764673213bc84C44905C71c93` |
| `NEXT_PUBLIC_WC_PROJECT_ID` | Your WalletConnect project ID |

5. Deploy

---

## Add Somnia Testnet to MetaMask

| Field | Value |
|-------|-------|
| Network Name | Somnia Testnet |
| RPC URL | `https://dream-rpc.somnia.network` |
| Chain ID | `50312` |
| Currency Symbol | `STT` |
| Block Explorer | `https://explorer.somnia.network` |

---

## Hackathon judging

| Criterion | How Call Fi addresses it |
|-----------|--------------------------|
| **Technical excellence** | Full WebRTC voice + video call flow negotiated entirely on-chain via vanilla ICE bundling. Two transactions (offer + answer) complete the entire signaling handshake. No ICE candidate exchanges, no separate signaling server, no polling. |
| **Somnia Reactivity** | Reactivity is not an add-on — it IS the product. Without sub-second event delivery, real-time call signaling on-chain would take 30+ seconds and be unusable. Every user-facing real-time event (incoming call, call accepted, call ended, payment events) goes through Reactivity. |
| **Real-time UX** | Incoming call arrives in the same block as `initiateCall`. Zero polling. Full call setup (offer tx → Reactivity → answer tx → Reactivity → audio) completes in under 5 seconds despite being fully on-chain. |
| **Novel use case** | WebRTC signaling on-chain with sub-second Reactivity delivery is a new primitive. Any two wallet addresses can call each other — no accounts, no servers, permanent immutable call records. |
| **Production readiness** | Live on Somnia Testnet. Full UI: voice calls, video calls, mute, hold, speaker, camera toggle, send/request payments, TX waiting states, call log with callbacks. Deploys to Vercel in under a minute with 2 env vars. |

---

Built for the Somnia Reactivity Mini Hackathon.
