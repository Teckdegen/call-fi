"use client";
import { formatEther }  from "viem";
import { useEffect, useRef } from "react";
import type { CallState, PaymentEvent, PendingRequest } from "../hooks/useCall";

function shortAddr(a: string) { return `${a.slice(0,6)}…${a.slice(-4)}`; }
function addrColor(a: string) {
  const hue = parseInt(a.slice(2, 8), 16) % 360;
  return `hsl(${hue}, 45%, 42%)`;
}
function fmt(s: number) {
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m}:${sec}` : `${m}:${sec}`;
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const IconMicOn = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);
const IconMicOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
    <line x1="1" y1="1" x2="23" y2="23"/>
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);
const IconSpeakerOn = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>
);
const IconSpeakerOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <line x1="23" y1="9" x2="17" y2="15"/>
    <line x1="17" y1="9" x2="23" y2="15"/>
  </svg>
);
const IconPause = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={22} height={22}>
    <rect x="6" y="4" width="4" height="16" rx="1"/>
    <rect x="14" y="4" width="4" height="16" rx="1"/>
  </svg>
);
const IconPhoneEnd = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={28} height={28}>
    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1-.2 1.1.37 2.3.57 3.6.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.6.1.32.03.7-.2 1L6.6 10.8z" transform="rotate(135 12 12)"/>
  </svg>
);
const IconSend = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={17} height={17}>
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const IconRequest = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={17} height={17}>
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);

// ── Feed / bubble icons ───────────────────────────────────────────────────────
const FeedArrowUp = ({ color }: { color: string }) => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"/>
    <polyline points="5 12 12 5 19 12"/>
  </svg>
);
const FeedArrowDown = ({ color }: { color: string }) => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <polyline points="19 12 12 19 5 12"/>
  </svg>
);
const FeedClock = ({ color }: { color: string }) => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);
const FeedDollar = ({ color }: { color: string }) => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);
const FeedCheck = ({ color }: { color: string }) => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const FeedX = ({ color }: { color: string }) => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const BubbleDollar = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);
const IconVideo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={22} height={22}>
    <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.723v6.554a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
  </svg>
);
const IconVideoOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
    <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34"/>
    <path d="M23 7l-7 5 7 5V7z"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

// ── Call button component ─────────────────────────────────────────────────────
function CallBtn({
  onClick, label, children, size = 66, variant = "default", active = false, videoMode = false,
}: {
  onClick:    () => void;
  label:      string;
  children:   React.ReactNode;
  size?:      number;
  variant?:   "default" | "danger" | "active" | "warning";
  active?:    boolean;
  videoMode?: boolean; // solid dark buttons over video background
}) {
  // In video mode: solid dark glass buttons so they're visible over video
  if (videoMode && variant !== "danger") {
    const chosen: React.CSSProperties = {
      background: active ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.52)",
      color:      active ? "#fff" : "rgba(255,255,255,0.85)",
      boxShadow:  "0 4px 16px rgba(0,0,0,0.3)",
      border:     active ? "1px solid rgba(255,255,255,0.35)" : "1px solid rgba(255,255,255,0.12)",
      backdropFilter: "blur(8px)",
    };
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
        <button
          onClick={onClick}
          style={{
            width: size, height: size, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "transform 0.1s ease, box-shadow 0.15s ease",
            cursor: "pointer", ...chosen,
          }}
          onMouseDown={e => (e.currentTarget.style.transform = "scale(0.93)")}
          onMouseUp={e   => (e.currentTarget.style.transform = "scale(1)")}
          onTouchStart={e => (e.currentTarget.style.transform = "scale(0.93)")}
          onTouchEnd={e   => (e.currentTarget.style.transform = "scale(1)")}
        >
          {children}
        </button>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: "0.48rem",
          letterSpacing: "0.13em", color: "rgba(255,255,255,0.6)",
          fontWeight: active ? 700 : 400,
          textShadow: "0 1px 4px rgba(0,0,0,0.5)",
        }}>
          {label}
        </span>
      </div>
    );
  }

  const styles: Record<string, React.CSSProperties> = {
    default: {
      background: active ? "rgba(10,10,10,0.09)" : "rgba(10,10,10,0.05)",
      color:      "rgba(10,10,10,0.65)",
      boxShadow:  "0 2px 8px rgba(10,10,10,0.08)",
      border:     "1px solid rgba(10,10,10,0.12)",
    },
    warning: {
      background: active ? "rgba(180,120,0,0.12)" : "rgba(180,120,0,0.06)",
      color:      active ? "#b47800" : "rgba(10,10,10,0.45)",
      boxShadow:  active ? "0 2px 12px rgba(180,120,0,0.15)" : "0 2px 8px rgba(10,10,10,0.06)",
      border:     active ? "1px solid rgba(180,120,0,0.3)" : "1px solid rgba(10,10,10,0.1)",
    },
    danger: {
      background: "#dc2626",
      color:      "#fff",
      boxShadow:  "0 8px 28px rgba(220,38,38,0.4)",
      border:     "none",
    },
    active: {
      background: "rgba(10,10,10,0.09)",
      color:      "var(--ink)",
      boxShadow:  "0 2px 8px rgba(10,10,10,0.1)",
      border:     "1px solid rgba(10,10,10,0.18)",
    },
  };

  const chosen = variant === "danger" ? styles.danger
               : variant === "warning" ? styles.warning
               : active ? styles.active
               : styles.default;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
      <button
        onClick={onClick}
        style={{
          width: size, height: size,
          borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform 0.1s ease, box-shadow 0.15s ease",
          cursor: "pointer",
          ...chosen,
        }}
        onMouseDown={e => (e.currentTarget.style.transform = "scale(0.93)")}
        onMouseUp={e   => (e.currentTarget.style.transform = "scale(1)")}
        onTouchStart={e => (e.currentTarget.style.transform = "scale(0.93)")}
        onTouchEnd={e   => (e.currentTarget.style.transform = "scale(1)")}
      >
        {children}
      </button>
      <span style={{
        fontFamily:    "var(--font-mono)",
        fontSize:      "0.48rem",
        letterSpacing: "0.13em",
        color: variant === "warning" && active
          ? "#b47800"
          : "rgba(10,10,10,0.35)",
        fontWeight: active ? 700 : 400,
      }}>
        {label}
      </span>
    </div>
  );
}

// ── Pulse bars ────────────────────────────────────────────────────────────────
function PulseBars({ active, color }: { active: boolean; color: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 3, height: 18,
      opacity: active ? 1 : 0, transition: "opacity 0.4s",
    }}>
      {[1, 1.6, 0.8, 1.4, 1].map((h, i) => (
        <div
          key={i}
          style={{
            width: 3, borderRadius: 2,
            background: color,
            animation: `pulse-bar ${0.7 + i * 0.15}s ease-in-out infinite alternate`,
            height: `${h * 10}px`,
            opacity: 0.6,
          }}
        />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ActiveCall({
  peer, elapsed, isMuted, isOnHold, isSpeaker, isCameraOff, callState,
  payments, pendingRequests,
  onMute, onHold, onSpeaker, onToggleCamera, onEnd,
  onSendPayment, onRequestPayment,
  onAcceptRequest, onDeclineRequest,
  isVideo, localStream, remoteStream, busyLabel, isReconnecting,
}: {
  peer: string; elapsed: number;
  isMuted: boolean; isOnHold: boolean; isSpeaker: boolean; isCameraOff: boolean;
  callState: CallState;
  payments: PaymentEvent[];
  pendingRequests: Map<bigint, PendingRequest>;
  onMute: () => void; onHold: () => void; onSpeaker: () => void;
  onToggleCamera: () => void; onEnd: () => void;
  onSendPayment: () => void; onRequestPayment: () => void;
  onAcceptRequest: (id: bigint, req: PendingRequest) => void;
  onDeclineRequest: (id: bigint) => void;
  isVideo:         boolean;
  localStream:     MediaStream | null;
  remoteStream:    MediaStream | null;
  busyLabel:       string | null;
  isReconnecting:  boolean;
}) {
  const calling = callState === "calling";
  const active  = callState === "active" && !isOnHold;
  const color   = peer.length > 5 ? addrColor(peer) : "#555";

  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef  = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  return (
    <>
      <style>{`
        @keyframes pulse-bar {
          from { transform: scaleY(0.4); opacity: 0.4; }
          to   { transform: scaleY(1);   opacity: 0.8; }
        }
        @keyframes ring-out {
          0%   { transform: scale(1);   opacity: 0.5; }
          100% { transform: scale(1.9); opacity: 0;   }
        }
        @keyframes dot-blink {
          0%,100% { opacity: 1;   }
          50%     { opacity: 0.2; }
        }
        @keyframes slide-up-fade {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0);    }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Video layer (video calls only) ──────────────────────────────── */}
      {isVideo && (
        <>
          {/* Remote video - full screen background */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted={false}
            style={{
              position: "fixed", inset: 0, zIndex: 95,
              width: "100%", height: "100%",
              objectFit: "cover",
              background: "#000",
              maxWidth: 480, margin: "0 auto",
            }}
          />
          {/* Local video pip — top right, with camera-off fallback */}
          <div style={{
            position: "fixed", top: 68, right: 16,
            width: 88, height: 118, borderRadius: 12,
            zIndex: 200, overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.2)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            background: "#111",
          }}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%", height: "100%",
                objectFit: "cover",
                display: isCameraOff ? "none" : "block",
              }}
            />
            {isCameraOff && (
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "#1a1a1a",
                color: "rgba(255,255,255,0.4)",
              }}>
                <IconVideoOff />
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Pending payment request bubbles — fixed top ──────────────────────── */}
      {Array.from(pendingRequests.entries()).map(([id, req], idx) => (
        <div key={id.toString()} style={{
          position: "fixed", top: 72 + idx * 140, left: "50%",
          transform: "translateX(-50%)",
          width: "calc(100% - 40px)", maxWidth: 420,
          zIndex: 300,
          animation: "slide-up-fade 0.3s ease",
          background: "var(--cream)",
          border: "1px solid rgba(10,10,10,0.14)",
          borderRadius: 20,
          boxShadow: "0 8px 32px rgba(10,10,10,0.12)",
          padding: "18px 18px 16px",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(10,10,10,0.06)",
              border: "1px solid rgba(10,10,10,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "rgba(10,10,10,0.55)",
            }}><BubbleDollar /></div>
            <div>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: "0.46rem",
                letterSpacing: "0.18em", color: "rgba(10,10,10,0.35)", marginBottom: 2,
              }}>PAYMENT REQUEST</div>
              <div style={{
                fontFamily: "var(--font-serif)", fontWeight: 900,
                fontSize: "1.25rem", color: "var(--ink)", lineHeight: 1,
              }}>
                {formatEther(req.amount)} STT
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => onAcceptRequest(id, req)}
              style={{
                flex: 1, padding: "13px 0", borderRadius: 12,
                background: "var(--ink)", border: "none", color: "var(--cream)",
                fontFamily: "var(--font-mono)", fontSize: "0.56rem",
                letterSpacing: "0.14em", fontWeight: 700,
                cursor: "pointer",
              }}
            >PAY NOW</button>
            <button
              onClick={() => onDeclineRequest(id)}
              style={{
                flex: 1, padding: "13px 0", borderRadius: 12,
                background: "transparent",
                border: "1px solid rgba(10,10,10,0.14)",
                color: "rgba(10,10,10,0.4)",
                fontFamily: "var(--font-mono)", fontSize: "0.56rem",
                letterSpacing: "0.14em",
                cursor: "pointer",
              }}
            >DECLINE</button>
          </div>
        </div>
      ))}

      {/* ── Main screen ──────────────────────────────────────────────────────── */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 100,
        display: "flex", flexDirection: "column",
        maxWidth: 480, margin: "0 auto",
        background: isVideo ? "transparent" : "var(--cream)",
        color: "var(--ink)",
        transition: "background 0.6s ease",
      }}>

        {/* Top bar */}
        <div style={{
          height: 56, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 22px",
          borderBottom: "1px solid rgba(10,10,10,0.08)",
          background: isVideo ? "rgba(231,226,217,0.85)" : "transparent",
          backdropFilter: isVideo ? "blur(8px)" : "none",
          WebkitBackdropFilter: isVideo ? "blur(8px)" : "none",
        }}>
          <span style={{
            fontFamily: "var(--font-serif)", fontWeight: 900,
            fontSize: "1.05rem", letterSpacing: "-0.02em",
          }}>
            Call<span style={{
              background: "rgba(10,10,10,0.1)",
              padding: "1px 7px 2px", marginLeft: 2, borderRadius: 4,
            }}>Fi</span>
          </span>

          {/* Status pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            background: "rgba(10,10,10,0.05)",
            border: "1px solid rgba(10,10,10,0.1)",
            borderRadius: 24, padding: "6px 14px",
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: isOnHold ? "#b47800" : calling ? "#4a90d9" : "#16a34a",
              boxShadow: isOnHold
                ? "0 0 8px #b47800"
                : calling
                  ? "0 0 8px #4a90d9"
                  : "0 0 8px #16a34a",
              animation: (!calling && !isOnHold) ? "dot-blink 2s ease-in-out infinite" : "none",
            }} />
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: "0.5rem",
              letterSpacing: "0.15em", color: "rgba(10,10,10,0.5)",
            }}>
              {calling ? "CALLING" : isOnHold ? "ON HOLD" : "LIVE"}
            </span>
          </div>
        </div>

        {/* Centre */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "0 24px 12px",
          overflowY: "auto",
        }}>

          {/* Avatar + rings */}
          <div style={{ position: "relative", marginBottom: 24 }}>
            {calling && [1, 2].map(n => (
              <div key={n} style={{
                position: "absolute",
                inset: -(n * 18),
                borderRadius: "50%",
                border: `1.5px solid ${color}`,
                opacity: 0,
                animation: `ring-out ${1.3 + n * 0.3}s ease-out ${n * 0.35}s infinite`,
              }} />
            ))}

            <div style={{
              width: 116, height: 116, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: `${color}18`,
              border: `2px solid ${color}50`,
              boxShadow: `0 0 36px ${color}20, 0 16px 40px rgba(10,10,10,0.1)`,
            }}>
              <span style={{
                fontFamily: "var(--font-serif)", fontWeight: 900,
                fontSize: "2.5rem", color,
              }}>
                {peer.length > 2 ? peer.slice(2, 4).toUpperCase() : "??"}
              </span>
            </div>
          </div>

          {/* Address */}
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: "1.05rem",
            fontWeight: 700, letterSpacing: "0.08em",
            color: "var(--ink)", marginBottom: 10,
          }}>
            {shortAddr(peer)}
          </div>

          {/* Timer / status */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            marginBottom: 24,
          }}>
            {calling ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                fontFamily: "var(--font-mono)", fontSize: "0.68rem",
                letterSpacing: "0.22em", color: "rgba(10,10,10,0.38)",
              }}>
                <span>RINGING</span>
                <div style={{ display: "flex", gap: 3 }}>
                  {[0, 0.2, 0.4].map((d, i) => (
                    <div key={i} style={{
                      width: 4, height: 4, borderRadius: "50%",
                      background: "rgba(10,10,10,0.3)",
                      animation: `dot-blink 1.2s ${d}s ease-in-out infinite`,
                    }} />
                  ))}
                </div>
              </div>
            ) : isOnHold ? (
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: "0.7rem",
                letterSpacing: "0.2em", color: "#b47800", fontWeight: 700,
              }}>ON HOLD</div>
            ) : (
              <>
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: "2.1rem",
                  fontWeight: 200, letterSpacing: "0.06em",
                  color: "rgba(10,10,10,0.8)",
                }}>
                  {fmt(elapsed)}
                </div>
                <PulseBars active={active} color={color} />
              </>
            )}
          </div>

          {/* Sub-label */}
          {!calling && (
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: "0.5rem",
              letterSpacing: "0.08em", color: "rgba(10,10,10,0.22)",
              textAlign: "center", lineHeight: 1.7, marginBottom: 16,
            }}>
              On-chain · End-to-end encrypted · Somnia
            </div>
          )}

          {/* Payment feed */}
          {payments.length > 0 && !calling && (
            <div style={{ width: "100%", maxWidth: 300, marginBottom: 8 }}>
              {payments.slice(-3).map((p, i) => (
                <div key={i} style={{
                  animation: "slide-up-fade 0.3s ease",
                  background: "rgba(10,10,10,0.04)",
                  border: "1px solid rgba(10,10,10,0.08)",
                  borderRadius: 10, padding: "9px 14px", marginBottom: 6,
                  fontFamily: "var(--font-mono)", fontSize: "0.68rem",
                  display: "flex", alignItems: "center", gap: 9,
                  color: "rgba(10,10,10,0.55)",
                }}>
                  {p.type === "sent"             && <><FeedArrowUp color="#dc2626" /><span>{p.amount} STT sent</span></>}
                  {p.type === "received"         && <><FeedArrowDown color="#16a34a" /><span>{p.amount} STT received</span></>}
                  {p.type === "request_out"      && <><FeedClock color="#b47800" /><span>Requested {p.amount} STT</span></>}
                  {p.type === "request_in"       && <><FeedDollar color="#b47800" /><span>{shortAddr(p.from!)} wants {p.amount} STT</span></>}
                  {p.type === "request_resolved" && (p.accepted
                    ? <><FeedCheck color="#16a34a" /><span>Request paid</span></>
                    : <><FeedX color="#dc2626" /><span>Request declined</span></>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* On-hold banner */}
        {isOnHold && (
          <div style={{
            margin: "0 24px 10px",
            padding: "11px 16px",
            borderRadius: 12,
            background: "rgba(180,120,0,0.08)",
            border: "1px solid rgba(180,120,0,0.2)",
            textAlign: "center",
            fontFamily: "var(--font-mono)", fontSize: "0.5rem",
            letterSpacing: "0.16em", color: "#b47800",
          }}>
            CALL IS ON HOLD — TAP HOLD TO RESUME
          </div>
        )}

        {/* Payment strip (active only) */}
        {!calling && !isOnHold && (
          <div style={{
            display: "flex", margin: "0 24px 14px",
            background: "rgba(10,10,10,0.04)",
            border: "1px solid rgba(10,10,10,0.09)",
            borderRadius: 16, overflow: "hidden",
          }}>
            {[
              { label: "SEND STT",    icon: <IconSend />,    action: onSendPayment    },
              { label: "REQUEST STT", icon: <IconRequest />, action: onRequestPayment },
            ].map((btn, i) => (
              <button key={i} onClick={btn.action} style={{
                flex: 1, padding: "14px 0",
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 7,
                background: "transparent",
                color: "rgba(10,10,10,0.38)",
                borderRight: i === 0 ? "1px solid rgba(10,10,10,0.08)" : "none",
                fontFamily: "var(--font-mono)", fontSize: "0.46rem",
                letterSpacing: "0.15em", border: "none", cursor: "pointer",
              }}>
                {btn.icon}
                {btn.label}
              </button>
            ))}
          </div>
        )}

        {/* Controls */}
        <div style={{ padding: "0 28px 52px" }}>
          {/* Row 1: mute, speaker, hold/camera */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isVideo ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr",
            justifyItems: "center",
            marginBottom: 28,
          }}>
            <CallBtn onClick={onMute} label={isMuted ? "UNMUTE" : "MUTE"} active={isMuted} videoMode={isVideo}>
              {isMuted ? <IconMicOff /> : <IconMicOn />}
            </CallBtn>

            <CallBtn onClick={onSpeaker} label={isSpeaker ? "SPEAKER" : "EARPIECE"} active={isSpeaker} videoMode={isVideo}>
              {isSpeaker ? <IconSpeakerOn /> : <IconSpeakerOff />}
            </CallBtn>

            {/* Camera toggle — video calls only */}
            {isVideo && (
              <CallBtn onClick={onToggleCamera} label={isCameraOff ? "CAM ON" : "CAM OFF"} active={isCameraOff} videoMode>
                {isCameraOff ? <IconVideoOff /> : <IconVideo />}
              </CallBtn>
            )}

            {!calling ? (
              <CallBtn onClick={onHold} label={isOnHold ? "RESUME" : "HOLD"} active={isOnHold} variant="warning" videoMode={isVideo}>
                <IconPause />
              </CallBtn>
            ) : (
              <div />
            )}
          </div>

          {/* Row 2: End call */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <CallBtn onClick={onEnd} label={calling ? "CANCEL" : "END CALL"} size={78} variant="danger">
              <IconPhoneEnd />
            </CallBtn>
          </div>
        </div>
      </div>

      {/* ── Reconnecting overlay ─────────────────────────────────────────── */}
      {isReconnecting && !busyLabel && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 390,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(10,10,10,0.55)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}>
          <div style={{
            background: "var(--cream)", padding: "28px 32px",
            textAlign: "center", maxWidth: 280,
            border: "var(--border-ink)",
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              border: "3px solid var(--ink)", borderTopColor: "transparent",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }} />
            <div style={{
              fontFamily: "var(--font-serif)", fontWeight: 900,
              fontSize: "1.15rem", color: "var(--ink)", marginBottom: 6,
            }}>
              Reconnecting…
            </div>
            <div style={{
              fontFamily: "var(--font-sans)", fontSize: "0.82rem",
              color: "var(--ink-soft)", lineHeight: 1.5,
            }}>
              Connection dropped. Switching to a faster path automatically.
            </div>
          </div>
        </div>
      )}

      {/* TX signing overlay */}
      {busyLabel && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 400,
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          background: "rgba(10,10,10,0.35)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          maxWidth: 480, margin: "0 auto",
        }}>
          <div style={{
            width: "100%",
            background: "var(--cream)",
            borderRadius: "20px 20px 0 0",
            padding: "28px 28px 48px",
            borderTop: "1px solid rgba(10,10,10,0.1)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                border: "2.5px solid var(--ink)",
                borderTopColor: "transparent",
                animation: "spin 0.8s linear infinite",
                flexShrink: 0,
              }} />
              <div>
                <div style={{
                  fontFamily: "var(--font-serif)", fontWeight: 900,
                  fontSize: "1.1rem", color: "var(--ink)", marginBottom: 3,
                }}>
                  Waiting for Transaction
                </div>
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: "0.6rem",
                  letterSpacing: "0.06em", color: "rgba(10,10,10,0.45)",
                }}>
                  {busyLabel}
                </div>
              </div>
            </div>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: "0.5rem",
              letterSpacing: "0.1em", color: "rgba(10,10,10,0.28)",
              marginTop: 4,
            }}>
              Don't close your wallet — confirm to continue
            </div>
          </div>
        </div>
      )}
    </>
  );
}
