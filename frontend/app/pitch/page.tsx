"use client";
import { useState, useEffect, useCallback } from "react";

const slides = ["cover","why","demo"];
const totalSlides = slides.length;

export default function PitchDeck() {
  const [current, setCurrent] = useState(0);
  const [dir, setDir]         = useState<"next" | "prev">("next");
  const [animating, setAnimating] = useState(false);

  const goTo = useCallback((index: number, direction: "next" | "prev") => {
    if (animating || index < 0 || index >= totalSlides) return;
    setDir(direction);
    setAnimating(true);
    setTimeout(() => { setCurrent(index); setAnimating(false); }, 300);
  }, [animating]);

  const next = () => goTo(current + 1, "next");
  const prev = () => goTo(current - 1, "prev");

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next();
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   prev();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [current, animating]);

  return (
    <div style={{
      background: "var(--cream)", width: "100vw", height: "100dvh",
      display: "flex", flexDirection: "column",
      fontFamily: "var(--font-sans)", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position:"absolute", top:14, left:20, fontFamily:"var(--font-serif)", fontSize:13, fontWeight:700, color:"var(--ink)" }}>CALLFI</div>
      <div style={{ position:"absolute", top:14, right:20, fontFamily:"var(--font-mono)", fontSize:11, color:"var(--ink-soft)" }}>
        {String(current+1).padStart(2,"0")} / {String(totalSlides).padStart(2,"0")}
      </div>

      <div style={{
        flex:1, display:"flex", alignItems:"center", justifyContent:"center",
        padding:"44px 5vw 8px",
        opacity: animating ? 0 : 1,
        transform: animating ? (dir==="next" ? "translateX(-28px)" : "translateX(28px)") : "translateX(0)",
        transition:"opacity 0.3s ease, transform 0.3s ease",
        minHeight:0,
      }}>
        {current === 0 && <SlideCover onStart={next} />}
        {current === 1 && <SlideWhy />}
        {current === 2 && <SlideDemo />}
      </div>

      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"12px 20px", borderTop:"1px solid rgba(10,10,10,0.10)", flexShrink:0,
      }}>
        <NavBtn onClick={prev} disabled={current===0}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </NavBtn>
        <div style={{ display:"flex", gap:7, alignItems:"center" }}>
          {slides.map((_,i) => (
            <button key={i} onClick={() => goTo(i, i>current?"next":"prev")} style={{
              width:i===current?20:6, height:6, borderRadius:3, padding:0, border:"none", cursor:"pointer",
              background:i===current?"var(--ink)":"rgba(10,10,10,0.2)", transition:"all 0.3s ease",
            }}/>
          ))}
        </div>
        <NavBtn onClick={next} disabled={current===totalSlides-1} filled={current!==totalSlides-1}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </NavBtn>
      </div>
    </div>
  );
}

function NavBtn({ onClick, disabled, filled, children }: { onClick:()=>void; disabled:boolean; filled?:boolean; children:React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:34, height:34, borderRadius:"50%", border:"1px solid rgba(10,10,10,0.18)",
      display:"flex", alignItems:"center", justifyContent:"center",
      cursor:disabled?"default":"pointer", opacity:disabled?0.2:1,
      background:filled?"var(--ink)":"none", color:filled?"var(--cream)":"var(--ink)",
      transition:"all 0.2s",
    }}>
      {children}
    </button>
  );
}

/* SLIDE 1: COVER */
function SlideCover({ onStart }: { onStart:()=>void }) {
  return (
    <div style={{ textAlign:"center", maxWidth:520, width:"100%" }}>
      <p style={{ fontFamily:"var(--font-mono)", fontSize:11, letterSpacing:"0.16em", color:"var(--ink-soft)", textTransform:"uppercase", marginBottom:16 }}>
        Somnia Hackathon 2025
      </p>
      <h1 style={{ fontFamily:"var(--font-serif)", fontSize:"clamp(52px,9vw,100px)", fontWeight:900, lineHeight:0.95, letterSpacing:"-0.02em", color:"var(--ink)", marginBottom:20 }}>
        CALLFI
      </h1>
      <div style={{ width:36, height:2, background:"var(--ink)", margin:"0 auto 20px" }}/>
      <p style={{ fontFamily:"var(--font-sans)", fontSize:"clamp(13px,1.6vw,16px)", color:"var(--ink-soft)", lineHeight:1.6, marginBottom:36 }}>
        Wallet-to-wallet voice and video calling.<br/>No sign up. No servers. Built on Somnia.
      </p>
      <button onClick={onStart} style={{
        background:"var(--ink)", color:"var(--cream)", fontFamily:"var(--font-sans)",
        fontSize:12, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase",
        padding:"11px 28px", border:"none", borderRadius:2, cursor:"pointer",
        display:"inline-flex", alignItems:"center", gap:8,
      }}>
        View Deck
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  );
}

/* SLIDE 2: WHAT IS CALLFI + VIDEO AGENDA */
function SlideIntro() {
  return (
    <div style={{ maxWidth:820, width:"100%" }}>
      <Label>What is CALLFI + What We Cover</Label>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2, marginTop:14 }}>

        {/* Left: Definition */}
        <div style={{ border:"1px solid rgba(10,10,10,0.10)", padding:"clamp(14px,2vh,22px) clamp(14px,1.5vw,20px)", display:"flex", flexDirection:"column", gap:14 }}>
          <p style={{ fontFamily:"var(--font-mono)", fontSize:10, letterSpacing:"0.12em", color:"var(--ink-soft)", textTransform:"uppercase" }}>Definition</p>
          <h2 style={{ fontFamily:"var(--font-serif)", fontSize:"clamp(18px,2.2vw,26px)", fontWeight:900, color:"var(--ink)", lineHeight:1.2 }}>
            A decentralized calling platform built on Somnia.
          </h2>
          <p style={{ fontFamily:"var(--font-sans)", fontSize:"clamp(11px,1.1vw,13px)", color:"var(--ink-soft)", lineHeight:1.7 }}>
            CALLFI lets you call any wallet address directly. Your wallet is your identity. No sign up, no phone number, no account. Just connect your wallet and you are reachable.
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2 }}>
            {[
              { tag:"Identity",  text:"Your wallet is your phone number" },
              { tag:"Handshake", text:"2 transactions, fully on-chain" },
              { tag:"Privacy",   text:"SDP and ICE data encrypted on-chain" },
              { tag:"Media",     text:"Peer-to-peer, DTLS-SRTP encrypted" },
            ].map(item => (
              <div key={item.tag} style={{ background:"rgba(10,10,10,0.03)", padding:"8px 10px", borderLeft:"2px solid rgba(10,10,10,0.12)" }}>
                <p style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--ink-soft)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:3 }}>{item.tag}</p>
                <p style={{ fontFamily:"var(--font-sans)", fontSize:"clamp(10px,1vw,11px)", color:"var(--ink)", lineHeight:1.4 }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Video Agenda */}
        <div style={{ border:"1px solid rgba(10,10,10,0.10)", padding:"clamp(14px,2vh,22px) clamp(14px,1.5vw,20px)", display:"flex", flexDirection:"column", gap:14 }}>
          <p style={{ fontFamily:"var(--font-mono)", fontSize:10, letterSpacing:"0.12em", color:"var(--ink-soft)", textTransform:"uppercase" }}>What We Cover in This Video</p>
          <h2 style={{ fontFamily:"var(--font-serif)", fontSize:"clamp(18px,2.2vw,26px)", fontWeight:900, color:"var(--ink)", lineHeight:1.2 }}>
            Full walkthrough,<br/>start to finish.
          </h2>
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            {[
              { n:"01", text:"What is CALLFI" },
              { n:"02", text:"How the call works" },
              { n:"03", text:"Why Somnia" },
              { n:"04", text:"Features" },
              { n:"05", text:"Demo" },
            ].map(item => (
              <div key={item.n} style={{ display:"flex", gap:12, alignItems:"center", padding:"9px 0", borderBottom:"1px solid rgba(10,10,10,0.06)" }}>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--ink-soft)", letterSpacing:"0.1em", flexShrink:0 }}>{item.n}</span>
                <span style={{ fontFamily:"var(--font-sans)", fontSize:"clamp(11px,1.1vw,13px)", color:"var(--ink)", lineHeight:1.4 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

/* SLIDE 3: HOW IT WORKS */
function SlideHow() {
  return (
    <div style={{ maxWidth:780, width:"100%" }}>
      <Label>How It Works</Label>
      <H2>You create an event.<br/>Reactivity delivers it.</H2>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2, marginTop:20 }}>
        {[
          {
            step:"01",
            title:"You hit call",
            body:"Your browser creates a WebRTC offer and submits it on-chain as a transaction to the CALLFI smart contract on Somnia.",
          },
          {
            step:"02",
            title:"Somnia Reactivity fires",
            body:"The moment that transaction lands, Somnia Reactivity pushes the event straight to the receiver's browser. No polling. No waiting. Under 2 seconds.",
          },
          {
            step:"03",
            title:"Call connects",
            body:"The receiver accepts. Their answer goes back on-chain. Reactivity delivers it back. Two transactions. The call is live, peer-to-peer, fully encrypted.",
          },
        ].map(s => (
          <div key={s.step} style={{ border:"1px solid rgba(10,10,10,0.10)", padding:"clamp(14px,2vh,22px) clamp(14px,1.5vw,18px)", display:"flex", flexDirection:"column", gap:10 }}>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--ink-soft)", letterSpacing:"0.14em" }}>{s.step}</span>
            <div style={{ fontFamily:"var(--font-serif)", fontSize:"clamp(14px,1.5vw,18px)", fontWeight:900, color:"var(--ink)", lineHeight:1.2 }}>{s.title}</div>
            <div style={{ fontFamily:"var(--font-sans)", fontSize:"clamp(10px,1vw,12px)", color:"var(--ink-soft)", lineHeight:1.65 }}>{s.body}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop:12, padding:"clamp(10px,1.4vh,16px) clamp(12px,1.4vw,18px)", background:"rgba(10,10,10,0.04)", borderLeft:"3px solid var(--ink)", display:"flex", alignItems:"center", gap:14 }}>
        <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--ink-soft)", letterSpacing:"0.1em", textTransform:"uppercase", flexShrink:0 }}>No server touched</span>
        <span style={{ fontFamily:"var(--font-sans)", fontSize:"clamp(10px,1.1vw,12px)", color:"var(--ink)", lineHeight:1.6 }}>
          The blockchain is the signaling layer. One contract, one WebSocket, one browser API. That is the entire stack.
        </span>
      </div>
    </div>
  );
}

/* SLIDE 4: WHY SOMNIA */
function SlideWhy() {
  return (
    <div style={{ maxWidth:720, width:"100%" }}>
      <Label>Why Somnia</Label>
      <H2>Speed is not a feature.<br/>It is the product.</H2>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2, marginTop:18 }}>
        <div style={{ border:"1px solid rgba(10,10,10,0.10)", padding:"clamp(14px,2vh,22px) clamp(14px,1.5vw,20px)", background:"rgba(10,10,10,0.03)" }}>
          <p style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--ink-soft)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>Other Chains</p>
          <p style={{ fontFamily:"var(--font-serif)", fontSize:"clamp(24px,3vw,36px)", fontWeight:900, color:"#b91c1c", marginBottom:8 }}>10 to 15 sec</p>
          <p style={{ fontFamily:"var(--font-sans)", fontSize:"clamp(10px,1vw,12px)", color:"var(--ink-soft)", lineHeight:1.65 }}>
            Your app has to keep asking the chain if anything changed. By the time the event arrives, the moment is gone. Real-time communication on these chains is not usable.
          </p>
        </div>
        <div style={{ border:"2px solid var(--ink)", padding:"clamp(14px,2vh,22px) clamp(14px,1.5vw,20px)" }}>
          <p style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--ink-soft)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>Somnia with Reactivity</p>
          <p style={{ fontFamily:"var(--font-serif)", fontSize:"clamp(24px,3vw,36px)", fontWeight:900, color:"#1a6b3a", marginBottom:8 }}>Under 2 sec</p>
          <p style={{ fontFamily:"var(--font-sans)", fontSize:"clamp(10px,1vw,12px)", color:"var(--ink-soft)", lineHeight:1.65 }}>
            Somnia Reactivity is a WebSocket built into the protocol. The second a transaction lands, it pushes the event straight to the browser. Your browser subscribes. The call arrives.
          </p>
        </div>
      </div>
      <div style={{ marginTop:12, padding:"clamp(10px,1.4vh,16px) clamp(12px,1.4vw,18px)", background:"rgba(10,10,10,0.04)", borderLeft:"3px solid var(--ink)" }}>
        <p style={{ fontFamily:"var(--font-sans)", fontSize:"clamp(10px,1.1vw,12px)", color:"var(--ink)", lineHeight:1.65 }}>
          Reactivity is the only reason CALLFI exists as a real product. Without it, this is just a concept on a chain that is too slow.
        </p>
      </div>
    </div>
  );
}

/* SLIDE 5: FEATURES */
const featureList = [
  { icon:"◎", title:"Voice and Video Calls",  body:"Full peer-to-peer calling between any two wallets. No server routing the media." },
  { icon:"◈", title:"Mid-Call Payments",      body:"Send or request STT tokens directly during a live call, on-chain and instant." },
  { icon:"◉", title:"On-Chain Call History",  body:"Every call logged permanently on chain. Wallet, duration, status, timestamp." },
  { icon:"◐", title:"Missed Call Recovery",   body:"Come back within 3 minutes and a pending call will still ring. Nothing is lost." },
  { icon:"◑", title:"Zero Data Collected",    body:"No account, no profile, no metadata. Your identity is your wallet, nothing else." },
  { icon:"◒", title:"Fully Encrypted",        body:"SDP and ICE data encrypted on-chain. DTLS-SRTP for the media stream. Nothing leaks." },
];
function SlideFeatures() {
  return (
    <div style={{ maxWidth:800, width:"100%" }}>
      <Label>Features</Label>
      <H2>Everything it does.</H2>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2, marginTop:16 }}>
        {featureList.map(f => (
          <div key={f.title} style={{ border:"1px solid rgba(10,10,10,0.10)", padding:"clamp(10px,1.6vh,18px) clamp(10px,1.3vw,16px)" }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:16, marginBottom:6, color:"var(--ink)" }}>{f.icon}</div>
            <div style={{ fontFamily:"var(--font-sans)", fontSize:"clamp(11px,1.1vw,13px)", fontWeight:600, color:"var(--ink)", marginBottom:4 }}>{f.title}</div>
            <div style={{ fontFamily:"var(--font-sans)", fontSize:"clamp(10px,0.95vw,11px)", color:"var(--ink-soft)", lineHeight:1.55 }}>{f.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* SLIDE 6: DEMO */
function SlideDemo() {
  return (
    <div style={{ position:"fixed", inset:0, display:"flex", flexDirection:"column", background:"var(--ink)" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 20px", flexShrink:0, zIndex:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <span style={{ fontFamily:"var(--font-serif)", fontSize:13, fontWeight:700, color:"var(--cream)" }}>CALLFI</span>
          <span style={{ fontFamily:"var(--font-mono)", fontSize:10, letterSpacing:"0.14em", color:"rgba(231,226,217,0.4)", textTransform:"uppercase" }}>Demo</span>
        </div>
        <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(231,226,217,0.4)", letterSpacing:"0.06em" }}>Live on Somnia Testnet</span>
      </div>
      <div style={{ flex:1, width:"100%", minHeight:0, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
        {/* Replace with: <iframe src="YOUR_EMBED_URL" width="100%" height="100%" frameBorder="0" allowFullScreen style={{ display:"block" }} /> */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
          <div style={{ width:72, height:72, borderRadius:"50%", border:"2px solid rgba(231,226,217,0.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width={28} height={28} viewBox="0 0 24 24" fill="var(--cream)"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
          <p style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"rgba(231,226,217,0.35)", letterSpacing:"0.12em", textTransform:"uppercase" }}>
            Paste embed URL to show demo video
          </p>
        </div>
      </div>
    </div>
  );
}

/* SHARED */
function Label({ children }:{ children:React.ReactNode }) {
  return <p style={{ fontFamily:"var(--font-mono)", fontSize:10, letterSpacing:"0.14em", color:"var(--ink-soft)", textTransform:"uppercase", marginBottom:10 }}>{children}</p>;
}
function H2({ children }:{ children:React.ReactNode }) {
  return <h2 style={{ fontFamily:"var(--font-serif)", fontSize:"clamp(22px,3vw,36px)", fontWeight:900, lineHeight:1.15, color:"var(--ink)", letterSpacing:"-0.01em" }}>{children}</h2>;
}
