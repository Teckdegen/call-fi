"use client";
import { useState, useCallback, useEffect } from "react";
import { useWalletClient, usePublicClient }  from "wagmi";
import { parseEther, formatEther }           from "viem";
import { CALLFI_ADDRESS, CALLFI_ABI }        from "../lib/contract";
import { encryptSDP, decryptSDP }            from "../lib/crypto";
import { useWebRTC }                         from "./useWebRTC";
import { useReactivity }                     from "./useReactivity";
import {
  startRing, stopRing,
  playAnswerSound, playHangupSound, playDeclineSound,
  playClickSound, playPaymentSound,
} from "../lib/sounds";

export type CallState = "idle" | "calling" | "incoming" | "active" | "ended";
export type CallError = { title: string; detail: string } | null;

export interface CallInfo {
  callId:   bigint;
  peer:     string;
  duration: number;
}

export interface PaymentEvent {
  type:       "sent" | "received" | "request_in" | "request_out" | "request_resolved";
  amount:     string;
  from?:      string;
  requestId?: bigint;
  accepted?:  boolean;
}

export interface PendingRequest {
  amount: bigint;
  from:   string;
}

export function useCall(myAddress?: `0x${string}`) {
  const { data: walletClient } = useWalletClient();
  const publicClient           = usePublicClient();
  const webrtc                 = useWebRTC();

  const [callState,       setCallState]       = useState<CallState>("idle");
  const [currentCall,     setCurrentCall]     = useState<CallInfo | null>(null);
  const [incomingCall,    setIncomingCall]    = useState<{ callId: bigint; caller: string; offer: string } | null>(null);
  const [payments,        setPayments]        = useState<PaymentEvent[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Map<bigint, PendingRequest>>(new Map());
  const [elapsed,         setElapsed]         = useState(0);
  const [preparingStep,   setPreparingStep]   = useState<"connecting" | "signing" | null>(null);
  const [callMode,        setCallMode]        = useState<"voice" | "video">("voice");
  const [busyLabel,       setBusyLabel]       = useState<string | null>(null);
  const [callError,       setCallError]       = useState<CallError>(null);

  // ── Call timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (callState !== "active") { setElapsed(0); return; }
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [callState]);

  // ── Ring management ──────────────────────────────────────────────────────
  useEffect(() => {
    if (callState === "calling" || callState === "incoming") {
      startRing();
    } else {
      stopRing();
    }
  }, [callState]);

  // ── Missed call recovery on page load ───────────────────────────────────
  // When the user comes back to the page, query the chain for any pending
  // calls directed to their wallet. If the call is still Pending AND was
  // initiated less than 3 minutes ago, ring as if the call just came in.
  useEffect(() => {
    if (!myAddress || !publicClient) return;

    (async () => {
      try {
        const currentBlock = await publicClient.getBlockNumber();
        // Somnia ~1 block/sec  →  3 min ≈ 180 blocks.  Use 300 for headroom.
        const fromBlock = currentBlock > 300n ? currentBlock - 300n : 0n;

        const logs = await publicClient.getContractEvents({
          address:   CALLFI_ADDRESS,
          abi:       CALLFI_ABI,
          eventName: "CallInitiated",
          args:      { receiver: myAddress },
          fromBlock,
          toBlock:   "latest",
        });

        if (!logs.length) return;

        const now          = BigInt(Math.floor(Date.now() / 1000));
        const THREE_MINUTES = 180n;

        // Walk from most recent → oldest, grab first still-valid pending call
        for (const log of [...logs].reverse()) {
          const { callId, caller, signalOffer } = (log as any).args;

          // Ask the contract — is this call still Pending?
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const call = await (publicClient as any).readContract({
            address:      CALLFI_ADDRESS,
            abi:          CALLFI_ABI,
            functionName: "getCall",
            args:         [callId],
          }) as any;

          // status 0 = Pending.  Also check it hasn't expired (> 3 min).
          if (call.status !== 0) continue;
          if (now - BigInt(call.startTime) > THREE_MINUTES) continue;

          // Still live — surface it exactly like a real-time incoming call
          const isNewFormat    = signalOffer.startsWith("video:") || signalOffer.startsWith("voice:");
          const isVideo        = isNewFormat ? signalOffer.startsWith("video:") : false;
          const encryptedOffer = isNewFormat
            ? signalOffer.replace(/^(video|voice):/, "")
            : signalOffer;

          setCallMode(isVideo ? "video" : "voice");
          setIncomingCall({ callId, caller, offer: encryptedOffer });
          setCallState("incoming");
          break; // only surface the most recent valid pending call
        }
      } catch (e) {
        console.warn("[call] missed-call recovery failed:", e);
      }
    })();
  }, [myAddress, publicClient]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 3-minute no-answer timeout ───────────────────────────────────────────
  // If the caller is still ringing after 3 minutes, auto-end and mark Missed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (callState !== "calling") return;

    const t = setTimeout(async () => {
      webrtc.hangUp();
      playHangupSound();

      // Try to mark the call as Missed on-chain
      const cc = currentCall;
      if (cc?.callId && cc.callId !== 0n && walletClient) {
        try {
          setBusyLabel("No answer — sign to close");
          await walletClient.writeContract({
            address:      CALLFI_ADDRESS,
            abi:          CALLFI_ABI,
            functionName: "markNoAnswer",
            args:         [cc.callId],
          } as any);
        } catch {
          // Contract call failed; still end locally
        } finally {
          setBusyLabel(null);
        }
      }

      setCallState("ended");
      setTimeout(() => setCallState("idle"), 3000);
    }, 3 * 60 * 1000); // 3 minutes

    return () => clearTimeout(t);
  }, [callState]); // intentionally exclude currentCall/walletClient/webrtc — stable during calling phase

  // ── Reactivity subscriptions ─────────────────────────────────────────────
  useReactivity({
    myAddress,

    onCallInitiated: (callId, caller, signalData) => {
      // New format: "video:enc1:..." or "voice:enc1:..."
      // Legacy format: raw SDP JSON (no prefix)
      const isNewFormat = signalData.startsWith("video:") || signalData.startsWith("voice:");
      const isVideo     = isNewFormat
        ? signalData.startsWith("video:")
        : (() => { try { return JSON.parse(signalData).sdp?.includes("m=video") ?? false; } catch { return false; } })();
      const encryptedOffer = isNewFormat
        ? signalData.replace(/^(video|voice):/, "")
        : signalData;

      setCallMode(isVideo ? "video" : "voice");
      setIncomingCall({ callId, caller, offer: encryptedOffer });
      setCallState("incoming");
    },

    onCallAccepted: async (callId, signalAnswer) => {
      // Decrypt the answer — try/catch so UI always transitions to active
      try {
        const peer      = currentCall?.peer ?? "";
        const decrypted = await decryptSDP(signalAnswer, myAddress!, peer as `0x${string}`);
        await webrtc.setAnswer(decrypted);
      } catch (e) {
        console.warn("[call] decrypt/setAnswer failed:", e);
      }
      setCurrentCall(p => p ? { ...p, callId } : { callId, peer: "", duration: 0 });
      setCallState("active");
      playAnswerSound();
    },

    onCallDeclined: () => {
      webrtc.hangUp();
      playDeclineSound();
      setCallState("ended");
      setTimeout(() => setCallState("idle"), 2000);
    },

    onCallEnded: (_callId, duration) => {
      // Guard: if we're on the incoming screen, caller ended before we answered — go straight to idle
      if (callState === "incoming") {
        setIncomingCall(null);
        setCallState("idle");
        return;
      }
      // Guard: if we already ended the call ourselves, ignore the echo from Reactivity
      if (callState === "ended" || callState === "idle") return;

      webrtc.hangUp();
      playHangupSound();
      setCurrentCall(p => p ? { ...p, duration: Number(duration) } : null);
      setCallState("ended");
      setTimeout(() => setCallState("idle"), 3000);
    },

    onTipSent: (_callId, from, amount) => {
      playPaymentSound();
      setPayments(p => [...p, { type: "received", amount: formatEther(amount), from }]);
    },

    onPaymentRequested: (_callId, requestId, requester, _target, amount) => {
      setPendingRequests(m => new Map(m).set(requestId, { amount, from: requester }));
      setPayments(p => [...p, { type: "request_in", amount: formatEther(amount), from: requester, requestId }]);
    },

    onPaymentRequestResolved: (requestId, accepted) => {
      // Capture amount before clearing it from pending requests
      let resolvedAmount = "";
      setPendingRequests(m => {
        resolvedAmount = formatEther(m.get(requestId)?.amount ?? 0n);
        const n = new Map(m);
        n.delete(requestId);
        return n;
      });
      setPayments(p => [...p, { type: "request_resolved", amount: resolvedAmount, accepted, requestId }]);
    },
  });

  // ── Initiate call ─────────────────────────────────────────────────────────
  const initiateCall = useCallback(async (receiver: `0x${string}`, mode: "voice" | "video" = "voice") => {
    if (!walletClient || !myAddress) {
      setCallError({ title: "Wallet not ready", detail: "Please wait a moment and try again." });
      return;
    }
    setCallError(null);

    // ── Step 1: get mic / camera ──────────────────────────────────────────
    setCallMode(mode);
    setPreparingStep("connecting");

    let offer: string;
    try {
      offer = await webrtc.createOffer(mode === "video");
    } catch (e: any) {
      setPreparingStep(null);
      const msg = e?.message ?? String(e);
      if (msg.includes("Permission") || msg.includes("denied") || msg.includes("NotAllowed")) {
        setCallError({ title: "Microphone blocked", detail: "Allow microphone access in your browser settings and try again." });
      } else if (msg.includes("NotFound") || msg.includes("Devices")) {
        setCallError({ title: "No microphone found", detail: "Plug in a microphone and try again." });
      } else {
        setCallError({ title: "Connection setup failed", detail: msg || "Could not start WebRTC. Try refreshing the page." });
      }
      console.error("[call] createOffer failed:", e);
      return;
    }

    // ── Step 2: encrypt SDP (falls back to plaintext if crypto unavailable) ─
    let signalData: string;
    try {
      const encryptedOffer = await encryptSDP(offer, myAddress, receiver);
      signalData = `${mode}:${encryptedOffer}`;
    } catch (e) {
      // crypto.subtle not available (HTTP non-localhost) — send plaintext with mode prefix
      console.warn("[call] SDP encryption unavailable, sending plaintext:", e);
      signalData = `${mode}:${offer}`;
    }

    // ── Step 3: open wallet to sign ───────────────────────────────────────
    setPreparingStep("signing");
    let hash: `0x${string}`;
    try {
      hash = await walletClient.writeContract({
        address:      CALLFI_ADDRESS,
        abi:          CALLFI_ABI,
        functionName: "initiateCall",
        args:         [receiver, signalData],
      } as any);
    } catch (e: any) {
      setPreparingStep(null);
      const msg = e?.message ?? String(e);
      if (msg.includes("rejected") || msg.includes("denied") || msg.includes("User denied")) {
        // User cancelled — no error toast needed
      } else {
        setCallError({ title: "Transaction failed", detail: msg || "Could not send the call transaction." });
      }
      console.error("[call] writeContract failed:", e);
      return;
    }

    // ── Step 4: wait for receipt & set callId ────────────────────────────
    setPreparingStep(null);
    setCurrentCall({ callId: 0n, peer: receiver, duration: 0 });
    setCallState("calling");

    try {
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      const callId  = BigInt((receipt.logs?.[0] as any)?.topics?.[1] ?? "0x0");
      setCurrentCall({ callId, peer: receiver, duration: 0 });
    } catch (e) {
      // Receipt timeout is non-fatal — call is already showing as ringing
      console.warn("[call] waitForTransactionReceipt failed:", e);
    }
  }, [walletClient, publicClient, webrtc, myAddress]);

  // ── Accept call — decrypt offer, create answer, encrypt answer ────────────
  const acceptCall = useCallback(async () => {
    if (!walletClient || !incomingCall || !myAddress) return;
    const cid = incomingCall.callId;

    setBusyLabel("Gathering connection info…");
    const decryptedOffer  = await decryptSDP(incomingCall.offer, incomingCall.caller, myAddress);
    const answer          = await webrtc.createAnswer(decryptedOffer);
    const encryptedAnswer = await encryptSDP(answer, incomingCall.caller, myAddress);

    setBusyLabel("Sign to accept call");
    await walletClient.writeContract({
      address:      CALLFI_ADDRESS,
      abi:          CALLFI_ABI,
      functionName: "acceptCall",
      args:         [cid, encryptedAnswer],
    } as any);

    setBusyLabel(null);
    setCurrentCall({ callId: cid, peer: incomingCall.caller, duration: 0 });
    setIncomingCall(null);
    setCallState("active");
    playAnswerSound();
  }, [walletClient, incomingCall, webrtc, myAddress]);

  // ── Decline call ──────────────────────────────────────────────────────────
  const declineCall = useCallback(async () => {
    if (!walletClient || !incomingCall) return;

    setBusyLabel("Sign to decline");
    await walletClient.writeContract({
      address:      CALLFI_ADDRESS,
      abi:          CALLFI_ABI,
      functionName: "declineCall",
      args:         [incomingCall.callId],
    } as any);

    setBusyLabel(null);
    setIncomingCall(null);
    setCallState("idle");
    playDeclineSound();
  }, [walletClient, incomingCall]);

  // ── End call ──────────────────────────────────────────────────────────────
  const endCall = useCallback(async () => {
    if (!walletClient || !currentCall) return;
    webrtc.hangUp();
    playHangupSound();

    if (currentCall.callId !== 0n) {
      setBusyLabel("Sign to end call");
      await walletClient.writeContract({
        address:      CALLFI_ADDRESS,
        abi:          CALLFI_ABI,
        functionName: "endCall",
        args:         [currentCall.callId],
      } as any).catch(() => {});
      setBusyLabel(null);
    }

    setCallState("ended");
    setTimeout(() => setCallState("idle"), 3000);
  }, [walletClient, currentCall, webrtc]);

  // ── Send tip — routed through contract so receiver gets Reactivity event ──
  const sendPayment = useCallback(async (amountStt: string) => {
    if (!walletClient || !currentCall || currentCall.callId === 0n) return;
    setBusyLabel("Sign to send tip");
    try {
      await walletClient.writeContract({
        address:      CALLFI_ADDRESS,
        abi:          CALLFI_ABI,
        functionName: "tip",
        args:         [currentCall.callId, currentCall.peer as `0x${string}`],
        value:        parseEther(amountStt),
      } as any);
      playPaymentSound();
      setPayments(p => [...p, { type: "sent", amount: amountStt }]);
    } catch (e) {
      console.warn("[call] tip failed:", e);
    } finally {
      setBusyLabel(null);
    }
  }, [walletClient, currentCall]);

  // ── Request payment ───────────────────────────────────────────────────────
  const requestPayment = useCallback(async (amountStt: string) => {
    if (!walletClient || !currentCall) return;
    await walletClient.writeContract({
      address:      CALLFI_ADDRESS,
      abi:          CALLFI_ABI,
      functionName: "requestPayment",
      args:         [currentCall.callId, currentCall.peer as `0x${string}`, parseEther(amountStt)],
    } as any);
    setPayments(p => [...p, { type: "request_out", amount: amountStt }]);
  }, [walletClient, currentCall]);

  // ── Accept payment request — on-chain so requester sees it via Reactivity ─
  const acceptPaymentRequest = useCallback(async (requestId: bigint, req: PendingRequest) => {
    if (!walletClient) return;
    setBusyLabel("Sign to pay");
    try {
      await walletClient.writeContract({
        address:      CALLFI_ADDRESS,
        abi:          CALLFI_ABI,
        functionName: "acceptPaymentRequest",
        args:         [requestId],
        value:        req.amount,
      } as any);
      setPendingRequests(m => { const n = new Map(m); n.delete(requestId); return n; });
      setPayments(p => [...p, { type: "request_resolved", amount: formatEther(req.amount), accepted: true, requestId }]);
    } catch (e) {
      console.warn("[call] accept payment request failed:", e);
    } finally {
      setBusyLabel(null);
    }
  }, [walletClient]);

  // ── Decline payment request ───────────────────────────────────────────────
  const declinePaymentRequest = useCallback(async (requestId: bigint) => {
    if (!walletClient) return;
    await walletClient.writeContract({
      address:      CALLFI_ADDRESS,
      abi:          CALLFI_ABI,
      functionName: "declinePaymentRequest",
      args:         [requestId],
    } as any);
  }, [walletClient]);

  // ── Sound-aware mute / hold ───────────────────────────────────────────────
  const toggleMuteWithSound = useCallback(() => {
    playClickSound();
    webrtc.toggleMute();
  }, [webrtc]);

  const toggleHoldWithSound = useCallback(() => {
    playClickSound();
    webrtc.toggleHold();
  }, [webrtc]);

  return {
    callState, currentCall, incomingCall,
    payments, pendingRequests, elapsed, preparingStep,
    busyLabel, callMode, callError,
    dismissError: () => setCallError(null),
    localStream:  webrtc.localStream,
    remoteStream: webrtc.remoteStream,
    isMuted:       webrtc.isMuted,
    isOnHold:      webrtc.isOnHold,
    isSpeaker:     webrtc.isSpeaker,
    isCameraOff:     webrtc.isCameraOff,
    isReconnecting:  webrtc.isReconnecting,
    toggleMute:    toggleMuteWithSound,
    toggleHold:    toggleHoldWithSound,
    toggleSpeaker: webrtc.toggleSpeaker,
    toggleCamera:  webrtc.toggleCamera,
    initiateCall, acceptCall, declineCall, endCall,
    sendPayment, requestPayment,
    acceptPaymentRequest, declinePaymentRequest,
  };
}
