"use client";
import { useEffect, useState } from "react";

function shortAddr(a: string) { return `${a.slice(0,6)}···${a.slice(-4)}`; }
function addrColor(a: string) {
  const hue = parseInt(a.slice(2, 8), 16) % 360;
  return `hsl(${hue}, 45%, 42%)`;
}

const PhoneIcon = ({ size = 26 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/>
  </svg>
);
const PhoneOffIcon = ({ size = 26 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z" transform="rotate(135 12 12)"/>
  </svg>
);
const VideoIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.723v6.554a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
  </svg>
);

export function IncomingCall({
  caller, isVideo, busyLabel, onAccept, onDecline,
}: {
  caller:     string;
  isVideo:    boolean;
  busyLabel:  string | null;
  onAccept:   () => void;
  onDecline:  () => void;
}) {
  const [tick, setTick] = useState(0);
  const color = addrColor(caller);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <style>{`
        @keyframes in-ring {
          0%   { transform: scale(1);   opacity: 0.4; }
          100% { transform: scale(1.9); opacity: 0;   }
        }
        @keyframes in-btn-pulse {
          0%, 100% { box-shadow: 0 0 0 0   rgba(10,10,10,0.15); }
          50%      { box-shadow: 0 0 0 14px rgba(10,10,10,0);   }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{
        position: "fixed", inset: 0, zIndex: 200,
        display: "flex", flexDirection: "column",
        maxWidth: 480, margin: "0 auto",
        background: "var(--cream)", color: "var(--ink)",
      }}>

        {/* Top bar */}
        <div style={{
          height: 56, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 22px",
          borderBottom: "1px solid rgba(10,10,10,0.08)",
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
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            fontFamily: "var(--font-mono)", fontSize: "0.46rem",
            letterSpacing: "0.2em", color: isVideo ? "#1a6b3a" : "rgba(10,10,10,0.35)",
            background: isVideo ? "rgba(26,107,58,0.08)" : "rgba(10,10,10,0.06)",
            border: isVideo ? "1px solid rgba(26,107,58,0.2)" : "1px solid rgba(10,10,10,0.1)",
            padding: "5px 12px", borderRadius: 20,
          }}>
            {isVideo && <VideoIcon size={11} />}
            {isVideo ? "VIDEO CALL" : "INCOMING CALL"}
          </div>
        </div>

        {/* Centre */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "0 32px",
        }}>
          <div style={{ position: "relative", marginBottom: 30 }}>
            {[1, 2].map(n => (
              <div key={n} style={{
                position: "absolute", inset: -(n * 20), borderRadius: "50%",
                border: `1.5px solid ${color}`,
                opacity: 0,
                animation: `in-ring ${1.4 + n * 0.3}s ease-out ${n * 0.35}s infinite`,
              }} />
            ))}
            <div style={{
              width: 108, height: 108, borderRadius: "50%",
              background: `${color}18`,
              border: `2px solid ${color}50`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 40px ${color}20, 0 16px 40px rgba(10,10,10,0.1)`,
            }}>
              <span style={{
                fontFamily: "var(--font-serif)", fontWeight: 900,
                fontSize: "2.2rem", color,
              }}>
                {caller.slice(2, 4).toUpperCase()}
              </span>
            </div>
          </div>

          <div style={{
            fontFamily: "var(--font-mono)", fontSize: "1.05rem",
            fontWeight: 700, letterSpacing: "0.06em",
            color: "var(--ink)", marginBottom: 10,
          }}>
            {shortAddr(caller)}
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#16a34a", boxShadow: "0 0 8px #16a34a",
            }} />
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: "0.6rem",
              letterSpacing: "0.18em", color: "#16a34a",
            }}>
              {isVideo ? "VIDEO CALLING YOU" : "CALLING YOU"}
            </span>
          </div>

          <div style={{
            fontFamily: "var(--font-mono)", fontSize: "0.52rem",
            letterSpacing: "0.08em", color: "rgba(10,10,10,0.22)",
            textAlign: "center", lineHeight: 1.7,
          }}>
            On-chain · End-to-end encrypted · Somnia
          </div>
        </div>

        {/* Buttons */}
        <div style={{
          padding: "0 52px 64px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <button
              onClick={onDecline}
              disabled={!!busyLabel}
              style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "#dc2626", border: "none", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 8px 28px rgba(220,38,38,0.4)",
                cursor: busyLabel ? "not-allowed" : "pointer",
                opacity: busyLabel ? 0.5 : 1,
                transition: "transform 0.1s",
              }}
              onMouseDown={e => !busyLabel && (e.currentTarget.style.transform = "scale(0.92)")}
              onMouseUp={e   => (e.currentTarget.style.transform = "scale(1)")}
              onTouchStart={e => !busyLabel && (e.currentTarget.style.transform = "scale(0.92)")}
              onTouchEnd={e   => (e.currentTarget.style.transform = "scale(1)")}
            >
              <PhoneOffIcon />
            </button>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: "0.48rem",
              letterSpacing: "0.14em", color: "rgba(10,10,10,0.3)",
            }}>DECLINE</span>
          </div>

          <div style={{
            fontFamily: "var(--font-mono)", fontSize: "0.42rem",
            letterSpacing: "0.1em", color: "rgba(10,10,10,0.2)",
          }}>OR</div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <button
              onClick={onAccept}
              disabled={!!busyLabel}
              style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "var(--ink)", border: "none", color: "var(--cream)",
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: busyLabel ? "none" : "in-btn-pulse 2s ease-in-out infinite",
                cursor: busyLabel ? "not-allowed" : "pointer",
                opacity: busyLabel ? 0.5 : 1,
                transition: "transform 0.1s",
              }}
              onMouseDown={e => !busyLabel && (e.currentTarget.style.transform = "scale(0.92)")}
              onMouseUp={e   => (e.currentTarget.style.transform = "scale(1)")}
              onTouchStart={e => !busyLabel && (e.currentTarget.style.transform = "scale(0.92)")}
              onTouchEnd={e   => (e.currentTarget.style.transform = "scale(1)")}
            >
              {isVideo ? <VideoIcon size={26} /> : <PhoneIcon />}
            </button>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: "0.48rem",
              letterSpacing: "0.14em", color: "rgba(10,10,10,0.5)",
            }}>ACCEPT</span>
          </div>
        </div>
      </div>

      {/* TX signing overlay */}
      {busyLabel && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 250,
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          background: "rgba(10,10,10,0.3)",
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
