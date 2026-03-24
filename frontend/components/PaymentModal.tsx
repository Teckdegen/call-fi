"use client";
import { useState } from "react";

const QUICK = ["0.1", "0.5", "1", "5"];

const IconClose = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export function PaymentModal({
  mode, onConfirm, onClose,
}: {
  mode:      "send" | "request";
  onConfirm: (amount: string) => void;
  onClose:   () => void;
}) {
  const [amount, setAmount] = useState("");
  const isSend  = mode === "send";
  const isValid = parseFloat(amount) > 0;

  return (
    <>
      <style>{`
        @keyframes modal-pop {
          from { opacity: 0; transform: scale(0.88) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);     }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 20px",
        }}
      >
        {/* Floating bubble */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: 360,
            background: "rgba(18,18,22,0.92)",
            backdropFilter: "blur(32px)",
            WebkitBackdropFilter: "blur(32px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 28,
            boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset",
            animation: "modal-pop 0.22s cubic-bezier(0.34,1.56,0.64,1)",
            overflow: "hidden",
          }}
        >
          {/* Header band */}
          <div style={{
            padding: "22px 22px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: "0.48rem",
                letterSpacing: "0.22em", color: "rgba(255,255,255,0.3)",
                marginBottom: 6,
              }}>
                {isSend ? "SEND PAYMENT" : "REQUEST PAYMENT"}
              </div>
              <div style={{
                fontFamily: "var(--font-serif)", fontWeight: 900,
                fontSize: "1.15rem", color: "#fff",
                letterSpacing: "-0.01em",
              }}>
                {isSend ? "How much to send?" : "How much to request?"}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <IconClose />
            </button>
          </div>

          <div style={{ padding: "22px 22px 26px" }}>
            {/* Big amount display */}
            <div style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 16, padding: "18px 20px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 14,
            }}>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  fontFamily: "var(--font-mono)", fontSize: "2rem", fontWeight: 700,
                  color: "#fff", letterSpacing: "0.02em", width: 0,
                }}
              />
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "0.72rem",
                letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)",
                marginLeft: 10, flexShrink: 0,
              }}>
                STT
              </span>
            </div>

            {/* Quick amounts */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {QUICK.map(q => (
                <button
                  key={q}
                  onClick={() => setAmount(q)}
                  style={{
                    flex: 1, padding: "10px 0",
                    borderRadius: 10,
                    background: amount === q
                      ? (isSend ? "rgba(34,197,94,0.2)" : "rgba(96,165,250,0.2)")
                      : "rgba(255,255,255,0.05)",
                    border: `1px solid ${amount === q
                      ? (isSend ? "rgba(34,197,94,0.5)" : "rgba(96,165,250,0.5)")
                      : "rgba(255,255,255,0.08)"}`,
                    color: amount === q
                      ? (isSend ? "#4ade80" : "#93c5fd")
                      : "rgba(255,255,255,0.4)",
                    fontFamily: "var(--font-mono)", fontSize: "0.72rem",
                    fontWeight: amount === q ? 700 : 400,
                    transition: "all 0.12s", cursor: "pointer",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Note */}
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: "0.56rem",
              letterSpacing: "0.06em", color: "rgba(255,255,255,0.22)",
              marginBottom: 18, lineHeight: 1.65,
            }}>
              {isSend
                ? "Your wallet will ask for confirmation. STT goes directly to their address."
                : "They'll see a pop-up. If accepted, their wallet will send you the STT."}
            </div>

            {/* CTA */}
            <button
              onClick={() => { if (isValid) { onConfirm(amount); onClose(); } }}
              disabled={!isValid}
              style={{
                width: "100%", padding: "16px 0",
                borderRadius: 14,
                background: isValid
                  ? (isSend ? "rgba(34,197,94,0.9)" : "rgba(96,165,250,0.85)")
                  : "rgba(255,255,255,0.06)",
                border: "none",
                color: isValid ? "#fff" : "rgba(255,255,255,0.2)",
                fontFamily: "var(--font-mono)", fontSize: "0.7rem",
                letterSpacing: "0.18em", fontWeight: 700,
                boxShadow: isValid
                  ? (isSend
                    ? "0 8px 24px rgba(34,197,94,0.3)"
                    : "0 8px 24px rgba(96,165,250,0.3)")
                  : "none",
                transition: "all 0.15s",
                cursor: isValid ? "pointer" : "not-allowed",
              }}
            >
              {isSend
                ? `SEND ${amount || "0"} STT`
                : `REQUEST ${amount || "0"} STT`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
