# Call Fi — Deploy Guide

Full end-to-end: generate wallet → fund → deploy contract → Vercel.

---

## 1. Install dependencies

```bash
# Root (Hardhat tools)
cd somnia-call
npm install

# Frontend
cd frontend
npm install
```

---

## 2. Generate a deployer wallet

```bash
cd somnia-call
npm run wallet
```

Output:
```
┌─────────────────────────────────────────────────────┐
│  New EVM Wallet                                     │
│  Address:     0xABC...                              │
│  Private Key: 0xDEF...                              │
│  Mnemonic:    word word word ...                    │
└─────────────────────────────────────────────────────┘
```

Save the private key. This wallet only needs STT to pay the deploy gas once — it has zero ongoing rights after the contract is deployed. There is no owner, no pause function, no upgrade proxy. You can throw away the deploy key after the tx confirms.

---

## 3. Fund the deployer

Get testnet STT from the faucet:
**https://testnet.somnia.network/faucet**

You need ~0.1 STT to deploy.

---

## 4. Set up the deploy environment

Create a `.env` file in the `somnia-call/` root (not in `frontend/`):

```bash
# somnia-call/.env
DEPLOYER_PRIVATE_KEY=0xYourPrivateKeyHere
```

> `.env` is in `.gitignore` — it will never be committed.

---

## 5. Deploy the contract

```bash
cd somnia-call
npx hardhat run scripts/deploy.js --network somnia
```

Output:
```
Deployer: 0xABC...
Balance: 0.5 STT
Deploying CallFi...

CallFi deployed to: 0x00D3288C5668479764673213bc84C44905C71c93
    Tx: 0xef37...

Add to frontend .env.local:
NEXT_PUBLIC_CALLFI_ADDRESS=0x00D3288C5668479764673213bc84C44905C71c93
```

> The contract is already deployed at `0x00D3288C5668479764673213bc84C44905C71c93` on Somnia Testnet. You only need to redeploy if you modify the contract source.

---

## 6. Get a WalletConnect Project ID

1. Go to **https://cloud.walletconnect.com**
2. Sign up free → New Project → type "App"
3. Copy the **Project ID**

This enables Web3Modal to show MetaMask, Coinbase, Rainbow, and 200+ other wallet connectors.

---

## 7. Configure the frontend

```bash
# somnia-call/frontend/.env.local
NEXT_PUBLIC_CALLFI_ADDRESS=0x00D3288C5668479764673213bc84C44905C71c93
NEXT_PUBLIC_WC_PROJECT_ID=your_project_id_here
```

That's it. Two variables. No relayer key, no server URLs, no API keys.

---

## 8. Run locally

```bash
cd somnia-call/frontend
npm run dev
```

Open **http://localhost:3000**

---

## 9. Push to GitHub and deploy to Vercel

```bash
cd somnia-call
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Then in Vercel:

1. Go to **https://vercel.com/new**
2. Import the GitHub repo
3. Set **Root Directory** → `somnia-call/frontend`
4. Add environment variables:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_CALLFI_ADDRESS` | `0x00D3288C5668479764673213bc84C44905C71c93` |
| `NEXT_PUBLIC_WC_PROJECT_ID` | Your WalletConnect project ID |

5. Click **Deploy**

---

## 10. Add Somnia Testnet to MetaMask

| Field | Value |
|-------|-------|
| Network Name | Somnia Testnet |
| RPC URL | `https://dream-rpc.somnia.network` |
| Chain ID | `50312` |
| Symbol | `STT` |
| Block Explorer | `https://explorer.somnia.network` |

---

## 11. Test the full flow

### Voice call

1. Open the deployed URL in two browser windows (different wallets)
2. Connect Wallet A → click **CONNECT WALLET**
3. Connect Wallet B in the second window
4. In Wallet A's dialer, paste Wallet B's address → click **VOICE**
5. Wallet A shows "Sign to initiate call" overlay → confirm in MetaMask
6. Wallet B sees incoming call screen within 1-2 seconds (Somnia Reactivity)
7. Wallet B clicks Accept → "Gathering connection info…" → "Sign to accept call" → confirm
8. Wallet A's caller screen transitions from ringing to active call
9. Audio connects peer-to-peer — speak and listen
10. Click **SEND** mid-call → enter amount → confirm → Wallet B sees payment notification
11. Either side clicks **END** → confirm tx → call duration stored on-chain

### Video call

1. Same as above but click **VIDEO** instead of **VOICE** in step 4
2. Both browsers request camera + microphone access — allow both
3. Wallet B sees "VIDEO CALL" badge on the incoming screen
4. After accepting, remote video fills Wallet A's screen; Wallet B's local video appears as PiP
5. Click the camera button to toggle your camera off (remote sees nothing) / back on (remote sees video again)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Web3Modal doesn't open | Check `NEXT_PUBLIC_WC_PROJECT_ID` is set in Vercel env vars and redeploy |
| Call events not received | Somnia WebSocket may be down — check `wss://dream-rpc.somnia.network/ws` |
| Incoming call doesn't appear | Both wallets must be on Somnia Testnet (chainId 50312) |
| Caller stays on ringing screen | The callee's `acceptCall` tx may have failed — check their wallet |
| Mic not working | Browser must grant microphone permission — check browser site settings |
| Camera not working | Browser must grant camera permission — check site settings; on iOS use Safari |
| Remote video doesn't resume after camera on | Hard refresh both sides — a stuck sender state may require a new peer connection |
| No audio in call | Check browser didn't block autoplay; try clicking anywhere on the page first |
| Payment tx fails | Check wallet has enough STT for amount + gas |
| Deploy fails: insufficient funds | Fund deployer address from faucet at `testnet.somnia.network/faucet` |
| Video call not available | Camera must be connected and permission granted before clicking VIDEO |

---

## How signaling works (technical summary)

The entire WebRTC handshake uses **vanilla ICE bundling**: before any transaction is sent, the browser gathers ALL ICE candidates locally (using STUN + TURN), bundles them into the SDP, and only then sends the transaction. This means:

- Caller sends one tx (`initiateCall` with complete SDP offer including all candidates)
- Callee sends one tx (`acceptCall` with complete SDP answer including all candidates)
- No additional ICE candidate exchange is needed — two transactions is the entire handshake

ICE candidate gathering times out after 12 seconds if not complete — the SDP is sent with whatever candidates were gathered by then (usually completes in 1-3 seconds on a normal connection).

TURN relay (`turn:openrelay.metered.ca`) is included in the ICE server list to handle strict NAT environments where direct peer-to-peer connection is blocked. When TURN is used, the media is still DTLS-SRTP encrypted — the TURN server can relay the packets but cannot decrypt them.
