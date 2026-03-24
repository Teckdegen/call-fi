"use client";
import { useEffect, useRef, useCallback } from "react";
import { createPublicClient, webSocket }  from "viem";
import { somniaTestnet }                  from "../lib/chain";
import { CALLFI_ADDRESS, CALLFI_ABI }     from "../lib/contract";

type Callbacks = {
  onCallInitiated?:          (callId: bigint, caller: string, signalOffer: string) => void;
  onCallAccepted?:           (callId: bigint, signalAnswer: string) => void;
  onCallDeclined?:           (callId: bigint) => void;
  onCallEnded?:              (callId: bigint, duration: bigint) => void;
  onTipSent?:                (callId: bigint, from: string, amount: bigint) => void;
  onPaymentRequested?:       (callId: bigint, requestId: bigint, requester: string, target: string, amount: bigint) => void;
  onPaymentRequestResolved?: (requestId: bigint, accepted: boolean) => void;
};

/**
 * useReactivity
 * ─────────────
 * Subscribes to CallFi v4 events via Somnia WebSocket.
 * Validators push events the instant they hit on-chain — no polling.
 *
 * Uses a callback-ref pattern so subscriptions are set up once per address
 * but always invoke the latest callback versions — no stale closures.
 */
export function useReactivity({
  myAddress,
  onCallInitiated,
  onCallAccepted,
  onCallDeclined,
  onCallEnded,
  onTipSent,
  onPaymentRequested,
  onPaymentRequestResolved,
}: { myAddress?: `0x${string}` } & Callbacks) {
  // Always-fresh ref — updated every render, no stale closure risk
  const cb = useRef<Callbacks>({});
  cb.current = {
    onCallInitiated, onCallAccepted, onCallDeclined,
    onCallEnded, onTipSent, onPaymentRequested, onPaymentRequestResolved,
  };

  const unsubsRef = useRef<Array<() => void>>([]);

  const cleanup = useCallback(() => {
    unsubsRef.current.forEach(u => u());
    unsubsRef.current = [];
  }, []);

  useEffect(() => {
    if (!myAddress) return;

    const client = createPublicClient({
      chain:     somniaTestnet,
      transport: webSocket("wss://dream-rpc.somnia.network/ws"),
    });

    const addr = myAddress.toLowerCase();
    const unsubs: Array<() => void> = [];

    // ── Incoming calls (filtered server-side by receiver) ──────────────────
    unsubs.push(client.watchContractEvent({
      address: CALLFI_ADDRESS, abi: CALLFI_ABI, eventName: "CallInitiated",
      args:    { receiver: myAddress },
      onLogs:  logs => logs.forEach(log => {
        const { callId, caller, signalOffer } = log.args as any;
        cb.current.onCallInitiated?.(callId, caller, signalOffer);
      }),
    }));

    // ── Call accepted — only process if WE are the caller (not the receiver) ─
    // receiver field = person who accepted; skip if that's us (we sent the answer)
    unsubs.push(client.watchContractEvent({
      address: CALLFI_ADDRESS, abi: CALLFI_ABI, eventName: "CallAccepted",
      onLogs:  logs => logs.forEach(log => {
        const { callId, receiver, signalAnswer } = log.args as any;
        if ((receiver as string).toLowerCase() === addr) return;
        cb.current.onCallAccepted?.(callId, signalAnswer);
      }),
    }));

    // ── Call declined ──────────────────────────────────────────────────────
    unsubs.push(client.watchContractEvent({
      address: CALLFI_ADDRESS, abi: CALLFI_ABI, eventName: "CallDeclined",
      onLogs:  logs => logs.forEach(log => {
        const { callId } = log.args as any;
        cb.current.onCallDeclined?.(callId);
      }),
    }));

    // ── Call ended ─────────────────────────────────────────────────────────
    unsubs.push(client.watchContractEvent({
      address: CALLFI_ADDRESS, abi: CALLFI_ABI, eventName: "CallEnded",
      onLogs:  logs => logs.forEach(log => {
        const { callId, duration } = log.args as any;
        cb.current.onCallEnded?.(callId, duration);
      }),
    }));

    // ── Tips received (only if we are the recipient) ───────────────────────
    unsubs.push(client.watchContractEvent({
      address: CALLFI_ADDRESS, abi: CALLFI_ABI, eventName: "TipSent",
      onLogs:  logs => logs.forEach(log => {
        const { callId, from, to, amount } = log.args as any;
        if ((to as string).toLowerCase() === addr) {
          cb.current.onTipSent?.(callId, from, amount);
        }
      }),
    }));

    // ── Payment requested (only if we are the target) ──────────────────────
    unsubs.push(client.watchContractEvent({
      address: CALLFI_ADDRESS, abi: CALLFI_ABI, eventName: "PaymentRequested",
      onLogs:  logs => logs.forEach(log => {
        const { callId, requestId, requester, target, amount } = log.args as any;
        if ((target as string).toLowerCase() === addr) {
          cb.current.onPaymentRequested?.(callId, requestId, requester, target, amount);
        }
      }),
    }));

    // ── Payment request resolved ───────────────────────────────────────────
    unsubs.push(client.watchContractEvent({
      address: CALLFI_ADDRESS, abi: CALLFI_ABI, eventName: "PaymentRequestResolved",
      onLogs:  logs => logs.forEach(log => {
        const { requestId, accepted } = log.args as any;
        cb.current.onPaymentRequestResolved?.(requestId, accepted);
      }),
    }));

    unsubsRef.current = unsubs;
    return cleanup;
  }, [myAddress, cleanup]);
}
