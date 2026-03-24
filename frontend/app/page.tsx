"use client";
import { useState, useEffect }        from "react";
import { useAccount }                 from "wagmi";
import { readContract }               from "@wagmi/core";
import { useWeb3Modal }               from "@web3modal/wagmi/react";
import { useCall }                    from "../hooks/useCall";
import { ActiveCall }                 from "../components/ActiveCall";
import { IncomingCall }               from "../components/IncomingCall";
import { PaymentModal }               from "../components/PaymentModal";
import { CALLFI_ADDRESS, CALLFI_ABI } from "../lib/contract";
import { wagmiConfig }                from "../lib/wagmi";

// ── Helpers ───────────────────────────────────────────────────────────────────
function shortAddr(a: string) { return `${a.slice(0,6)}···${a.slice(-4)}`; }
function fmtDur(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}
function timeAgo(ts: number) {
  const d = Math.floor(Date.now() / 1000) - ts;
  if (d < 60)    return `${d}s ago`;
  if (d < 3600)  return `${Math.floor(d/60)}m ago`;
  if (d < 86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
}
function addrColor(a: string) {
  const hue = parseInt(a.slice(2, 8), 16) % 360;
  return `hsl(${hue}, 50%, 38%)`;
}

// Contract enum: 0=Pending 1=Active 2=Ended 3=Declined 4=Missed
const STATUS = (s: number, out: boolean) => {
  if (s === 0) return { label: "Ringing",                             color: "var(--ink-soft)" };
  if (s === 1) return { label: "Active",                              color: "#1a6b3a"         };
  if (s === 2) return { label: out ? "Outgoing"  : "Incoming",        color: "var(--ink-soft)" };
  if (s === 3) return { label: out ? "No Answer" : "Declined",        color: "#b91c1c"         };
  if (s === 4) return { label: out ? "No Answer" : "Missed",          color: "#b91c1c"         };
  return       { label: out ? "Outgoing" : "Incoming",                color: "var(--ink-soft)" };
};

interface LogEntry {
  callId: bigint; peer: string; duration: number;
  status: number; isOutgoing: boolean; startTime: number;
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const PhoneCallIcon = ({ size = 18, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/>
  </svg>
);
const BackspaceIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
    <line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/>
  </svg>
);
const ArrowOutgoing = ({ color }: { color: string }) => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <line x1="7" y1="17" x2="17" y2="7"/>
    <polyline points="7 7 17 7 17 17"/>
  </svg>
);
const ArrowIncoming = ({ color }: { color: string }) => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <line x1="17" y1="7" x2="7" y2="17"/>
    <polyline points="17 17 7 17 7 7"/>
  </svg>
);
const VideoCallIcon = ({ size = 22, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.723v6.554a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
  </svg>
);

// ── Connect screen ────────────────────────────────────────────────────────────
function ConnectScreen() {
  const { open } = useWeb3Modal();
  const [totalOnChain, setTotalOnChain] = useState<number | null>(null);
  const [displayCount, setDisplayCount] = useState(0);

  const fetchTotal = () =>
    readContract(wagmiConfig, {
      address: CALLFI_ADDRESS, abi: CALLFI_ABI,
      functionName: "totalCalls", args: [],
    } as any)
      .then((n) => setTotalOnChain(Number(n)))
      .catch(() => {});

  useEffect(() => {
    fetchTotal();
    const t = setInterval(fetchTotal, 30_000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (totalOnChain === null || totalOnChain === 0) return;
    let cur = 0;
    const step = Math.max(1, Math.ceil(totalOnChain / 60));
    const t = setInterval(() => {
      cur = Math.min(cur + step, totalOnChain);
      setDisplayCount(cur);
      if (cur >= totalOnChain) clearInterval(t);
    }, 20);
    return () => clearInterval(t);
  }, [totalOnChain]);

  const features = [
    {
      title: "Real-time Reactivity",
      desc:  "Somnia validator-pushed events deliver ring notifications in milliseconds. Zero polling.",
    },
    {
      title: "Blockchain Signaling",
      desc:  "WebRTC offer and answer SDP stored immutably on Somnia. No centralised server needed.",
    },
    {
      title: "E2E Media Encryption",
      desc:  "DTLS-SRTP secures every audio and video packet peer-to-peer. Nobody can intercept.",
    },
    {
      title: "Smart ICE Fallback",
      desc:  "Automatically switches Direct to STUN to TURN so calls connect on any network.",
    },
    {
      title: "On-chain Payments",
      desc:  "Tip or request STT mid-call. Every transfer emits an on-chain receipt instantly.",
    },
  ] as const;

  return (
    <div style={{ minHeight:"100dvh", background:"var(--cream)", overflowX:"hidden" }}>
      <style>{`
        @keyframes lp-dot  { 0%,100%{opacity:1} 50%{opacity:.25} }
        @keyframes lp-pulse{ 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.05)} }
        @keyframes lp-in   { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes lp-in2  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes lp-fade { from{opacity:0} to{opacity:1} }
        .lp-cta:hover   { opacity:.86; }
        .lp-feat-sm:hover{ background:rgba(255,255,255,0.05); }
        @media(max-width:700px){
          .lp-hero-title  { font-size:clamp(2.8rem,12vw,4rem) !important; }
          .lp-stats-row   { flex-direction:column !important; }
          .lp-feat-grid   { grid-template-columns:1fr !important; }
          .lp-hero-pad    { padding:52px 20px 40px !important; }
          .lp-pad         { padding-left:20px !important; padding-right:20px !important; }
        }
      `}</style>

      {/* ── HERO ── */}
      <div className="lp-hero-pad lp-pad" style={{
        maxWidth:1100, margin:"0 auto", padding:"96px 36px 72px",
        animation:"lp-in .55s ease both",
      }}>
        {/* Badge */}
        <div style={{
          display:"inline-flex", alignItems:"center", gap:7,
          border:"1px solid rgba(10,10,10,0.14)",
          padding:"5px 13px 5px 9px", marginBottom:40,
        }}>
          <span style={{
            width:6, height:6, borderRadius:"50%", background:"var(--ink)",
            display:"inline-block", animation:"lp-dot 2s ease-in-out infinite",
          }}/>
          <span style={{
            fontFamily:"var(--font-mono)", fontSize:"0.47rem",
            letterSpacing:"0.18em", color:"rgba(10,10,10,0.5)",
          }}>BUILT ON SOMNIA NETWORK</span>
        </div>

        {/* Headline */}
        <h1 className="lp-hero-title" style={{
          fontFamily:"var(--font-serif)", fontWeight:900,
          fontSize:"clamp(3.4rem,7.5vw,7rem)",
          letterSpacing:"-0.045em", color:"var(--ink)",
          lineHeight:0.92, margin:"0 0 30px", maxWidth:820,
        }}>
          Make calls between<br/>any two wallets.
        </h1>

        {/* Subtitle */}
        <p style={{
          fontFamily:"var(--font-sans)", fontSize:"1.05rem",
          color:"rgba(10,10,10,0.52)", lineHeight:1.7,
          maxWidth:520, margin:"0 0 42px",
        }}>
          On-chain WebRTC signaling. End-to-end encrypted media.
          Send tips and payments during live calls. All on Somnia.
        </p>

        {/* CTA */}
        <div style={{ display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
          <button onClick={() => open()} className="lp-cta" style={{
            background:"var(--ink)", color:"var(--cream)",
            fontFamily:"var(--font-mono)", fontSize:"0.7rem",
            letterSpacing:"0.18em", fontWeight:700,
            border:"none", padding:"17px 34px", cursor:"pointer",
            display:"flex", alignItems:"center", gap:10,
          }}>
            <PhoneCallIcon size={15} color="var(--cream)" />
            START CALLING
          </button>
          <span style={{
            fontFamily:"var(--font-mono)", fontSize:"0.46rem",
            letterSpacing:"0.08em", color:"rgba(10,10,10,0.32)",
          }}>MetaMask · WalletConnect · Coinbase · +200 wallets</span>
        </div>
      </div>

      {/* ── STATS BAND (ink bg) ── */}
      <div style={{
        background:"var(--ink)",
        animation:"lp-in2 .65s .1s ease both",
      }}>
        <div className="lp-pad" style={{ maxWidth:1100, margin:"0 auto", padding:"0 36px" }}>

          {/* Big counter row */}
          <div style={{
            display:"flex", alignItems:"center",
            borderBottom:"1px solid rgba(255,255,255,0.08)",
            padding:"52px 0 48px", gap:40, flexWrap:"wrap",
          }}>
            {/* Counter */}
            <div style={{ flex:"0 0 auto" }}>
              <div style={{
                fontFamily:"var(--font-mono)", fontSize:"0.44rem",
                letterSpacing:"0.2em", color:"rgba(255,255,255,0.3)",
                marginBottom:14,
              }}>TOTAL ON-CHAIN CALLS</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:14 }}>
                <span style={{
                  fontFamily:"var(--font-serif)", fontWeight:900,
                  fontSize:"clamp(3.5rem,8vw,6rem)", letterSpacing:"-0.05em",
                  color:"var(--cream)", lineHeight:1,
                }}>
                  {totalOnChain === null
                    ? <span style={{opacity:0.15}}>0</span>
                    : displayCount.toLocaleString()}
                </span>
                <div>
                  <div style={{
                    fontFamily:"var(--font-mono)", fontSize:"0.42rem",
                    letterSpacing:"0.1em", color:"rgba(255,255,255,0.28)",
                    marginBottom:4,
                  }}>ALL TIME</div>
                  {totalOnChain !== null && (
                    <div style={{
                      display:"flex", alignItems:"center", gap:5,
                      fontFamily:"var(--font-mono)", fontSize:"0.4rem",
                      letterSpacing:"0.1em", color:"rgba(255,255,255,0.55)",
                    }}>
                      <span style={{
                        width:5, height:5, borderRadius:"50%",
                        background:"rgba(255,255,255,0.7)",
                        display:"inline-block",
                        animation:"lp-dot 1.8s ease-in-out infinite",
                      }}/>
                      LIVE
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{
              width:1, alignSelf:"stretch",
              background:"rgba(255,255,255,0.08)",
              flexShrink:0, minHeight:60,
            }}/>

            {/* 3 badges */}
            <div className="lp-stats-row" style={{
              display:"flex", gap:0, flex:1, flexWrap:"wrap",
            }}>
              {[
                { label:"ENCRYPTION",    value:"E2E",  sub:"AES-GCM + DTLS-SRTP"      },
                { label:"ROUTING",       value:"P2P",  sub:"Direct + STUN + TURN"      },
                { label:"MIDDLEMEN",     value:"0",    sub:"No central server"          },
              ].map((s, i, arr) => (
                <div key={s.label} style={{
                  flex:"1 1 120px", padding:"0 32px",
                  borderRight: i < arr.length - 1
                    ? "1px solid rgba(255,255,255,0.08)" : "none",
                }}>
                  <div style={{
                    fontFamily:"var(--font-mono)", fontSize:"0.42rem",
                    letterSpacing:"0.18em", color:"rgba(255,255,255,0.28)",
                    marginBottom:10,
                  }}>{s.label}</div>
                  <div style={{
                    fontFamily:"var(--font-serif)", fontWeight:900,
                    fontSize:"2.2rem", letterSpacing:"-0.03em",
                    color:"var(--cream)", lineHeight:1, marginBottom:6,
                  }}>{s.value}</div>
                  <div style={{
                    fontFamily:"var(--font-mono)", fontSize:"0.41rem",
                    letterSpacing:"0.06em", color:"rgba(255,255,255,0.32)",
                  }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Contract bar */}
          <div style={{
            padding:"16px 0",
            fontFamily:"var(--font-mono)", fontSize:"0.43rem",
            letterSpacing:"0.08em", color:"rgba(255,255,255,0.22)",
            display:"flex", alignItems:"center", gap:6,
          }}>
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.22)" strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            CONTRACT {CALLFI_ADDRESS.slice(0,8)}...{CALLFI_ADDRESS.slice(-6)} · SOMNIA CHAIN 50312
          </div>
        </div>
      </div>

      {/* ── REACTIVITY HERO FEATURE (cream) ── */}
      <div style={{ animation:"lp-fade .8s .15s ease both" }}>
        <div className="lp-pad" style={{
          maxWidth:1100, margin:"0 auto", padding:"72px 36px",
          display:"flex", alignItems:"center", gap:60, flexWrap:"wrap",
        }}>
          {/* Left: text */}
          <div style={{ flex:"1 1 320px" }}>
            <div style={{
              fontFamily:"var(--font-mono)", fontSize:"0.44rem",
              letterSpacing:"0.2em", color:"rgba(10,10,10,0.35)",
              marginBottom:18,
            }}>POWERED BY SOMNIA</div>
            <h2 style={{
              fontFamily:"var(--font-serif)", fontWeight:900,
              fontSize:"clamp(2.2rem,5vw,4rem)",
              letterSpacing:"-0.04em", color:"var(--ink)",
              lineHeight:0.93, margin:"0 0 20px",
            }}>
              Real-time<br/>Reactivity.
            </h2>
            <p style={{
              fontFamily:"var(--font-sans)", fontSize:"1rem",
              color:"rgba(10,10,10,0.52)", lineHeight:1.7, margin:"0 0 28px",
            }}>
              Somnia validator-pushed events deliver ring notifications
              in milliseconds. No polling. No delays. Your call reaches
              the other wallet the instant you dial.
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {[
                "Sub-100ms event delivery via Somnia WS",
                "On-chain SDP offer triggers ring instantly",
                "No REST polling or server middlemen",
              ].map((t,i) => (
                <div key={i} style={{
                  display:"flex", alignItems:"center", gap:12,
                  fontFamily:"var(--font-mono)", fontSize:"0.58rem",
                  letterSpacing:"0.04em", color:"rgba(10,10,10,0.6)",
                }}>
                  <div style={{
                    width:22, height:22, border:"1.5px solid var(--ink)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    flexShrink:0,
                  }}>
                    <svg width={10} height={10} viewBox="0 0 24 24" fill="none"
                      stroke="var(--ink)" strokeWidth={3}
                      strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* Right: visual */}
          <div style={{
            flex:"0 0 auto", width:280, height:280,
            background:"var(--ink)", position:"relative",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            {/* Pulse rings */}
            {[1.8, 1.45, 1.1].map((scale, i) => (
              <div key={i} style={{
                position:"absolute",
                width:`${scale * 100}%`, height:`${scale * 100}%`,
                border:"1px solid rgba(250,247,242,0.12)",
                animation:`lp-pulse ${2.2 + i * 0.6}s ${i * 0.4}s ease-in-out infinite`,
              }}/>
            ))}
            <div style={{
              width:80, height:80, border:"2px solid rgba(250,247,242,0.4)",
              display:"flex", alignItems:"center", justifyContent:"center",
              position:"relative", zIndex:1,
            }}>
              <svg width={32} height={32} viewBox="0 0 24 24" fill="none"
                stroke="rgba(250,247,242,0.8)" strokeWidth={1.5}
                strokeLinecap="round" strokeLinejoin="round">
                <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <div style={{
              position:"absolute", bottom:20, left:20,
              fontFamily:"var(--font-mono)", fontSize:"0.4rem",
              letterSpacing:"0.1em", color:"rgba(250,247,242,0.25)",
            }}>SOMNIA REACTIVITY</div>
          </div>
        </div>

        <div style={{ height:1, background:"rgba(10,10,10,0.07)" }}/>
      </div>

      {/* ── 4 REMAINING FEATURES (ink bg grid) ── */}
      <div style={{ background:"var(--ink)", animation:"lp-fade .9s .2s ease both" }}>
        <div className="lp-pad" style={{ maxWidth:1100, margin:"0 auto", padding:"0 36px" }}>

          {/* Section label */}
          <div style={{
            borderBottom:"1px solid rgba(255,255,255,0.08)",
            padding:"40px 0 32px",
            display:"flex", alignItems:"center", justifyContent:"space-between",
            flexWrap:"wrap", gap:12,
          }}>
            <span style={{
              fontFamily:"var(--font-serif)", fontWeight:900,
              fontSize:"clamp(1.6rem,3.5vw,2.8rem)",
              letterSpacing:"-0.035em", color:"var(--cream)", lineHeight:1,
            }}>The Calling Stack.</span>
            <span style={{
              fontFamily:"var(--font-mono)", fontSize:"0.44rem",
              letterSpacing:"0.14em", color:"rgba(255,255,255,0.3)",
              border:"1px solid rgba(255,255,255,0.1)",
              padding:"6px 14px",
            }}>4 FEATURES</span>
          </div>

          {/* 2x2 grid */}
          <div className="lp-feat-grid" style={{
            display:"grid", gridTemplateColumns:"repeat(2,1fr)",
          }}>
            {features.filter(f => f.title !== "Real-time Reactivity").map((f, i) => (
              <div key={i} className="lp-feat-sm" style={{
                padding:"40px 36px",
                borderRight:  i % 2 === 0 ? "1px solid rgba(255,255,255,0.07)" : "none",
                borderBottom: i < 2       ? "1px solid rgba(255,255,255,0.07)" : "none",
                transition:"background .2s",
              }}>
                <div style={{
                  fontFamily:"var(--font-mono)", fontSize:"0.44rem",
                  letterSpacing:"0.2em", color:"rgba(255,255,255,0.2)",
                  marginBottom:18,
                }}>0{i + 1}</div>
                <div style={{
                  fontFamily:"var(--font-serif)", fontWeight:900,
                  fontSize:"1.35rem", letterSpacing:"-0.025em",
                  color:"var(--cream)", lineHeight:1.05, marginBottom:12,
                }}>{f.title}</div>
                <div style={{
                  width:28, height:2,
                  background:"rgba(255,255,255,0.2)",
                  marginBottom:16,
                }}/>
                <div style={{
                  fontFamily:"var(--font-sans)", fontSize:"0.88rem",
                  color:"rgba(255,255,255,0.4)", lineHeight:1.65,
                }}>{f.desc}</div>
              </div>
            ))}
          </div>

          {/* CTA strip */}
          <div style={{
            borderTop:"1px solid rgba(255,255,255,0.08)",
            padding:"28px 0",
            display:"flex", alignItems:"center", justifyContent:"space-between",
            flexWrap:"wrap", gap:14,
          }}>
            <span style={{
              fontFamily:"var(--font-mono)", fontSize:"0.43rem",
              letterSpacing:"0.08em", color:"rgba(255,255,255,0.2)",
            }}>CALLFI · SOMNIA NETWORK · OPEN SOURCE</span>
            <button onClick={() => open()} className="lp-cta" style={{
              background:"var(--cream)", color:"var(--ink)",
              fontFamily:"var(--font-mono)", fontSize:"0.62rem",
              letterSpacing:"0.16em", fontWeight:700,
              border:"none", padding:"13px 28px", cursor:"pointer",
              display:"flex", alignItems:"center", gap:9,
            }}>
              <PhoneCallIcon size={13} color="var(--ink)" />
              CONNECT WALLET
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main app ──────────────────────────────────────────────────────────────────
export default function Home() {
  const { address, isConnected } = useAccount();
  const { open }                 = useWeb3Modal();

  const [dialInput,    setDialInput]    = useState("");
  const [callLog,      setCallLog]      = useState<LogEntry[]>([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payMode,      setPayMode]      = useState<"send" | "request">("send");
  const [loadingLog,   setLoadingLog]   = useState(false);

  const call = useCall(address);

  useEffect(() => {
    if (!address) return;
    setLoadingLog(true);
    readContract(wagmiConfig, {
      address: CALLFI_ADDRESS, abi: CALLFI_ABI,
      functionName: "getUserCalls", args: [address],
    } as any).then(async (ids) => {
      const entries = await Promise.all((ids as bigint[]).map(async (callId) => {
        const c = await readContract(wagmiConfig, {
          address: CALLFI_ADDRESS, abi: CALLFI_ABI,
          functionName: "getCall", args: [callId],
        } as any) as any;
        return {
          callId,
          peer: c.caller.toLowerCase() === address.toLowerCase() ? c.receiver : c.caller,
          duration:   Number(c.duration),
          status:     Number(c.status),
          isOutgoing: c.caller.toLowerCase() === address.toLowerCase(),
          startTime:  Number(c.startTime),
        } as LogEntry;
      }));
      setCallLog(entries.reverse());
    }).finally(() => setLoadingLog(false));
  }, [address, call.callState]);

  if (!isConnected) return <ConnectScreen />;

  const isInCall = call.callState === "active" || call.callState === "calling";
  const canDial  = dialInput.startsWith("0x") && dialInput.length === 42;

  return (
    <>
      <style>{`
        @keyframes row-in {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes dot-blink-prep {
          0%,100% { opacity: 1; }
          50%     { opacity: 0.3; }
        }
      `}</style>

      {/* ── Call error toast ── */}
      {call.callError && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          zIndex: 500, width: "calc(100% - 32px)", maxWidth: 440,
          background: "var(--cream)", border: "2px solid #b91c1c",
          padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start",
        }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
            stroke="#b91c1c" strokeWidth={2.2} strokeLinecap="round"
            strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: "0.65rem",
              fontWeight: 700, letterSpacing: "0.05em", color: "#b91c1c", marginBottom: 3,
            }}>
              {call.callError.title.toUpperCase()}
            </div>
            <div style={{
              fontFamily: "var(--font-sans)", fontSize: "0.82rem",
              color: "var(--ink-soft)", lineHeight: 1.4,
            }}>
              {call.callError.detail}
            </div>
          </div>
          <button onClick={call.dismissError} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--ink-soft)", fontSize: "1.1rem", lineHeight: 1, padding: 2,
          }}>✕</button>
        </div>
      )}

      {/* ── Preparing overlay ── */}
      {call.preparingStep && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 150,
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          background: "rgba(10,10,10,0.25)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}>
          <div style={{
            width: "100%", maxWidth: 480,
            background: "var(--cream)",
            borderTop: "var(--border)",
            borderRadius: "20px 20px 0 0",
            padding: "28px 28px 44px",
          }}>
            <div style={{
              fontFamily: "var(--font-serif)", fontWeight: 900,
              fontSize: "1.3rem", color: "var(--ink)", marginBottom: 6,
            }}>
              {call.preparingStep === "connecting" ? "Setting up call…" : "Open your wallet"}
            </div>
            <div style={{
              fontFamily: "var(--font-sans)", fontSize: "0.88rem",
              color: "var(--ink-soft)", lineHeight: 1.6, marginBottom: 24,
            }}>
              {call.preparingStep === "connecting"
                ? "Gathering connection info — your wallet will open next."
                : "Sign the transaction to connect. Don't close your wallet."}
            </div>

            {/* Steps */}
            {[
              { label: "Prepare connection", done: call.preparingStep === "signing" },
              { label: "Sign transaction",   done: false, active: call.preparingStep === "signing" },
            ].map((s, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, marginBottom: 12,
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  background: s.done ? "var(--ink)" : s.active ? "var(--ink)" : "rgba(10,10,10,0.08)",
                  border: s.done || s.active ? "none" : "var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {s.done ? (
                    <svg width={11} height={11} viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="var(--cream)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : s.active ? (
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: "var(--cream)",
                      animation: "dot-blink-prep 1s ease-in-out infinite",
                    }} />
                  ) : (
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: "0.5rem",
                      color: "rgba(10,10,10,0.3)",
                    }}>{i + 1}</span>
                  )}
                </div>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: "0.58rem",
                  letterSpacing: "0.06em",
                  color: s.done || s.active ? "var(--ink)" : "rgba(10,10,10,0.3)",
                  fontWeight: s.active ? 700 : 400,
                }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Overlays ── */}
      {call.callState === "incoming" && call.incomingCall && (
        <IncomingCall
          caller={call.incomingCall.caller}
          isVideo={call.callMode === "video"}
          busyLabel={call.busyLabel}
          onAccept={call.acceptCall}
          onDecline={call.declineCall}
        />
      )}

      {isInCall && call.currentCall && (
        <ActiveCall
          peer={call.currentCall.peer}
          elapsed={call.elapsed}
          isMuted={call.isMuted}
          isOnHold={call.isOnHold}
          isSpeaker={call.isSpeaker}
          isCameraOff={call.isCameraOff ?? false}
          callState={call.callState}
          payments={call.payments}
          pendingRequests={call.pendingRequests}
          onMute={call.toggleMute}
          onHold={call.toggleHold}
          onSpeaker={call.toggleSpeaker}
          onToggleCamera={call.toggleCamera ?? (() => {})}
          onEnd={call.endCall}
          onSendPayment={()    => { setPayMode("send");    setShowPayModal(true); }}
          onRequestPayment={() => { setPayMode("request"); setShowPayModal(true); }}
          onAcceptRequest={call.acceptPaymentRequest}
          onDeclineRequest={call.declinePaymentRequest}
          isVideo={call.callMode === "video"}
          localStream={call.localStream}
          remoteStream={call.remoteStream}
          busyLabel={call.busyLabel}
          isReconnecting={call.isReconnecting ?? false}
        />
      )}

      {showPayModal && (
        <PaymentModal
          mode={payMode}
          onConfirm={(amount) => {
            payMode === "send"
              ? call.sendPayment(amount)
              : call.requestPayment(amount);
            setShowPayModal(false);
          }}
          onClose={() => setShowPayModal(false)}
        />
      )}

      {/* ── Shell ── */}
      <div style={{
        minHeight: "100dvh", background: "var(--cream)",
        display: "flex", flexDirection: "column",
        maxWidth: 480, margin: "0 auto",
      }}>

        {/* ── Top bar ── */}
        <div style={{
          height: 56, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 20px", borderBottom: "var(--border)",
        }}>
          <span style={{
            fontFamily: "var(--font-serif)", fontWeight: 900,
            fontSize: "1.05rem", letterSpacing: "-0.02em", color: "var(--ink)",
          }}>
            Call<span style={{
              background: "var(--ink)", color: "var(--cream)",
              padding: "0 5px", marginLeft: 2,
            }}>Fi</span>
          </span>

          <button
            onClick={() => open({ view: "Account" })}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--white)",
              border: "var(--border)",
              borderRadius: 20, padding: "5px 12px 5px 6px",
              cursor: "pointer",
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: "50%",
              background: addrColor(address!),
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.52rem", fontFamily: "var(--font-mono)", fontWeight: 700,
              color: "#fff",
            }}>
              {address!.slice(2, 4).toUpperCase()}
            </div>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: "0.56rem",
              letterSpacing: "0.06em", color: "var(--ink-soft)",
            }}>
              {shortAddr(address!)}
            </span>
          </button>
        </div>

        {/* ── Dialer card ── */}
        <div style={{
          margin: "14px 16px 0",
          background: "var(--white)",
          border: "var(--border)",
          borderRadius: 16, overflow: "hidden",
        }}>
          {/* Address input */}
          <div style={{
            padding: "18px 18px 14px",
            borderBottom: "var(--border)",
          }}>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: "0.44rem",
              letterSpacing: "0.2em", color: "var(--ink-soft)",
              marginBottom: 10,
            }}>
              ENTER WALLET ADDRESS
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--cream)",
              border: "var(--border)",
              borderRadius: 10, padding: "0 12px",
            }}>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "0.88rem",
                color: "var(--ink-soft)", flexShrink: 0,
              }}>0x</span>
              <input
                value={dialInput.startsWith("0x") ? dialInput.slice(2) : dialInput}
                onChange={e => setDialInput("0x" + e.target.value.replace(/^0x/, ""))}
                placeholder="paste wallet address..."
                style={{
                  flex: 1, background: "transparent", border: "none",
                  color: "var(--ink)", fontSize: "0.88rem",
                  padding: "13px 0", fontFamily: "var(--font-mono)",
                  outline: "none",
                }}
              />
              {dialInput.length > 2 && (
                <button
                  onClick={() => setDialInput("")}
                  style={{
                    background: "transparent", border: "none",
                    color: "var(--ink-soft)", cursor: "pointer",
                    padding: "4px", display: "flex", alignItems: "center",
                  }}
                >
                  <BackspaceIcon />
                </button>
              )}
            </div>
          </div>

          {/* Call buttons — voice + video */}
          <div style={{ padding: "16px 18px 20px", display: "flex", justifyContent: "center", gap: 20 }}>
            {/* Voice call */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => { if (canDial) { call.initiateCall(dialInput as `0x${string}`, "voice"); setDialInput(""); } }}
                disabled={!canDial}
                style={{
                  width: 68, height: 68, borderRadius: "50%",
                  background: canDial ? "var(--green)" : "rgba(10,10,10,0.07)",
                  border: "none", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: canDial ? "0 6px 24px rgba(26,107,58,0.35)" : "none",
                  cursor: canDial ? "pointer" : "not-allowed",
                  transition: "all 0.18s",
                }}
                onMouseDown={e => canDial && (e.currentTarget.style.transform = "scale(0.92)")}
                onMouseUp={e   => (e.currentTarget.style.transform = "scale(1)")}
                onTouchStart={e => canDial && (e.currentTarget.style.transform = "scale(0.92)")}
                onTouchEnd={e   => (e.currentTarget.style.transform = "scale(1)")}
              >
                <PhoneCallIcon size={26} color={canDial ? "#fff" : "rgba(10,10,10,0.25)"} />
              </button>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "0.46rem",
                letterSpacing: "0.14em", color: "rgba(10,10,10,0.35)",
              }}>VOICE</span>
            </div>

            {/* Video call */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => { if (canDial) { call.initiateCall(dialInput as `0x${string}`, "video"); setDialInput(""); } }}
                disabled={!canDial}
                style={{
                  width: 68, height: 68, borderRadius: "50%",
                  background: canDial ? "#1a6b9a" : "rgba(10,10,10,0.07)",
                  border: "none", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: canDial ? "0 6px 24px rgba(26,107,154,0.35)" : "none",
                  cursor: canDial ? "pointer" : "not-allowed",
                  transition: "all 0.18s",
                }}
                onMouseDown={e => canDial && (e.currentTarget.style.transform = "scale(0.92)")}
                onMouseUp={e   => (e.currentTarget.style.transform = "scale(1)")}
                onTouchStart={e => canDial && (e.currentTarget.style.transform = "scale(0.92)")}
                onTouchEnd={e   => (e.currentTarget.style.transform = "scale(1)")}
              >
                <VideoCallIcon size={24} color={canDial ? "#fff" : "rgba(10,10,10,0.25)"} />
              </button>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "0.46rem",
                letterSpacing: "0.14em", color: "rgba(10,10,10,0.35)",
              }}>VIDEO</span>
            </div>
          </div>
        </div>

        {/* ── Recents ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 16px 0" }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 10,
          }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: "0.5rem",
              letterSpacing: "0.18em", color: "var(--ink-soft)",
            }}>
              RECENT CALLS
            </span>
            {callLog.length > 0 && (
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "0.46rem",
                color: "var(--ink-soft)",
                background: "rgba(10,10,10,0.06)",
                padding: "3px 8px", borderRadius: 10,
              }}>
                {callLog.length}
              </span>
            )}
          </div>

          {loadingLog && (
            <div style={{
              padding: "48px 0", textAlign: "center",
              fontFamily: "var(--font-mono)", fontSize: "0.62rem",
              letterSpacing: "0.1em", color: "var(--ink-soft)",
            }}>
              Loading...
            </div>
          )}

          {!loadingLog && callLog.length === 0 && (
            <div style={{
              padding: "56px 24px", textAlign: "center",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: "rgba(10,10,10,0.05)",
                border: "var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <PhoneCallIcon size={20} color="rgba(10,10,10,0.25)" />
              </div>
              <div>
                <div style={{
                  fontFamily: "var(--font-serif)", fontWeight: 900,
                  fontSize: "1.1rem", color: "var(--ink)", marginBottom: 6,
                }}>
                  No calls yet
                </div>
                <div style={{
                  fontFamily: "var(--font-sans)", fontSize: "0.82rem",
                  color: "var(--ink-soft)", lineHeight: 1.6,
                }}>
                  Paste a wallet address above to make your first on-chain call.
                </div>
              </div>
            </div>
          )}

          {callLog.map((entry, i) => {
            const st    = STATUS(entry.status, entry.isOutgoing);
            const color = addrColor(entry.peer);
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "11px 14px", marginBottom: 6,
                background: "var(--white)",
                border: "var(--border)",
                borderRadius: 14,
                animation: `row-in 0.22s ${i * 0.04}s ease both`,
              }}>
                {/* Avatar */}
                <div style={{
                  width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                  background: `${color}15`,
                  border: `1.5px solid ${color}40`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontWeight: 700,
                    fontSize: "0.7rem", color,
                  }}>
                    {entry.peer.slice(2, 4).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "var(--font-mono)", fontSize: "0.82rem",
                    fontWeight: 700, color: "var(--ink)", marginBottom: 3,
                  }}>
                    {shortAddr(entry.peer)}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                    {entry.isOutgoing
                      ? <ArrowOutgoing color={st.color} />
                      : <ArrowIncoming color={st.color} />
                    }
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: "0.5rem",
                      color: st.color, letterSpacing: "0.05em",
                    }}>
                      {st.label}
                    </span>
                    {entry.duration > 0 && (
                      <>
                        <span style={{ color: "rgba(10,10,10,0.18)" }}>·</span>
                        <span style={{
                          fontFamily: "var(--font-mono)", fontSize: "0.5rem",
                          color: "var(--ink-soft)",
                        }}>
                          {fmtDur(entry.duration)}
                        </span>
                      </>
                    )}
                    {entry.startTime > 0 && (
                      <>
                        <span style={{ color: "rgba(10,10,10,0.18)" }}>·</span>
                        <span style={{
                          fontFamily: "var(--font-mono)", fontSize: "0.5rem",
                          color: "var(--ink-soft)",
                        }}>
                          {timeAgo(entry.startTime)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Call back */}
                <button
                  onClick={() => call.initiateCall(entry.peer as `0x${string}`, "voice")}
                  style={{
                    width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                    background: "var(--green-bg)",
                    border: "1px solid rgba(26,107,58,0.2)",
                    color: "var(--green)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "var(--green)";
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "var(--green-bg)";
                    e.currentTarget.style.color = "var(--green)";
                  }}
                  title="Call back"
                >
                  <PhoneCallIcon size={15} color="currentColor" />
                </button>
              </div>
            );
          })}

          <div style={{ height: 20 }} />
        </div>

        {/* ── Footer ── */}
        <div style={{
          height: 40, flexShrink: 0, borderTop: "var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <div style={{
            width: 5, height: 5, borderRadius: "50%",
            background: "var(--green)",
          }} />
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: "0.44rem",
            letterSpacing: "0.12em", color: "var(--ink-soft)",
          }}>
            CALLFI · ON SOMNIA · END-TO-END ENCRYPTED
          </span>
        </div>
      </div>
    </>
  );
}
