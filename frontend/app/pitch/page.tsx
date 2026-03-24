"use client";
import { useState, useEffect, useCallback } from "react";

const slides = ["cover","intro","what","why","features","demo"];
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
        {current === 0 && <SlideCover    onStart={next} />}
        {current === 1 && <SlideIntro />}
        {current === 2 && <SlideWhat />}
        {current === 3 && <SlideWhy />}
        {current === 4 && <SlideFeatures />}
        {current === 5 && <SlideDemo />}
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

/* SLIDE 2: DEFINITION + VIDEO AGENDA */
function SlideIntro() {
  return (
    <div style={{ maxWidth:820, width:"100%" }}>
      <Label>What is CALLFI + What We Cover</Label>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2, marginTop:14 }}>

        {/* Left: Definition */}
        <div style={{ border:"1px solid rgba(10,10,10,0.10)", padding:"clamp(14px,2vh,22px) clamp(14px,1.5vw,20px)", display:"flex", flexDirection:"column", gap:10 }}>
          <p style={{ fontFamily:"var(--font-mono)", fontSize:10, letterSpacing:"0.12em", color:"var(--ink-soft)", textTransform:"uppercase" }}>Definition</p>
          <h2 style={{ fontFamily:"var(--font-serif)", fontSize:"clamp(18px,2.2vw,26px)", fontWeight:900, color:"var(--ink)", lineHeight:1.2 }}>
            A calling protocol<br/>built on the blockchain.
          </h2>
          <p style={{ fontFamily:"var(--font-sans)", fontSize:"clamp(11px,1.1vw,13px)", color:"var(--ink-soft)", lineHeight:1.7 }}>
            CALLFI lets any two people make voice and video calls directly through their crypto wallets. No account. No phone number. No middleman. Your wallet address is all you need to make and receive calls from anywhere in the world.
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2, marginTop:4 }}>
            {[
              { tag:"Identity",    text:"Your wallet is your phone number" },
              { tag:"Handshake",   text:"2 transactions, fully on-chain" },
              { tag:"Privacy",     text:"Zero data collected or stored" },
              { tag:"Media",       text:"Direct peer-to-peer, encrypted" },
            ].map(item => (
              <div key={item.tag} style={{ background:"rgba(10,10,10,0.03)", padding:"8px 10px", borderLeft:"2px solid rgba(10,10,10,0.12)" }}>
                <p style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--ink-soft)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:3 }}>{item.tag}</p>
                <p style={{ fontFamily:"var(--font-sans)", fontSize:"clamp(10px,1vw,11px)", color:"var(--ink)", lineHeight:1.4 }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Video Agenda */}
        <div style={{ border:"1px solid rgba(10,10,10,0.10)", padding:"clamp(14px,2vh,22px) clamp(14px,1.5vw,20px)", display:"flex", flexDirection:"column", gap:10 }}>
          <p style={{ fontFamily:"var(--font-mono)", fontSize:10, letterSpacing:"0.12em", color:"var(--ink-soft)", textTransform:"uppercase" }}>What We Cover in This Video</p>
          <h2 style={{ fontFamily:"var(--font-serif)", fontSize:"clamp(18px,2.2vw,26px)", fontWeight:900, color:"var(--ink)", lineHeight:1.2 }}>
            Full walkthrough,<br/>start to finish.
          </h2>
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:4 }}>
            {[
              { n:"01", text:"What is CALLFI" },
              { n:"02", text:"What We Are" },
              { n:"03", text:"Why Somnia" },
              { n:"04", text:"Features" },
              { n:"05", text:"Demo" },
            ].map(item => (
              <div key={item.n} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"6px 0", borderBottom:"1px solid rgba(10,10,10,0.06)" }}>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--ink-soft)", letterSpacing:"0.1em", flexShrink:0, marginTop:2 }}>{item.n}</span>
                <span style={{ fontFamily:"var(--font-sans)", fontSize:"clamp(10px,1vw,12px)", color:"var(--ink)", lineHeight:1.5 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

/* SLIDE 3: WHAT WE ARE */
function SlideWhat() {
  return (
    <div style={{ maxWidth:720, width:"100%" }}>
      <Label>01 What We Are</Label>
      <H2>The first on-chain<br/>calling platform.</H2>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2, marginTop:18 }}>
        <Stat value="Your Wallet"    label="is your phone number"  body="If someone has your address, they can call you. No sign up, no email, no profile to set up." />
        <Stat value="2 Transactions" label="for a complete call"   body="One to initiate, one to answer. The blockchain handles the entire handshake." />
        <Stat value="0 Servers"      label="in the middle"         body="No backend. No database. No company sitting between you and the person you are calling." />
        <Stat value="E2E Encrypted"  label="peer-to-peer media"    body="DTLS-SRTP encrypted audio and video, the same standard used by Signal. Nothing leaks." />
      </div>
    </div>
  );
}

/* SLIDE 4: WHY SOMNIA */
function SlideWhy() {
  return (
    <div style={{ maxWidth:720, width:"100%" }}>
      <Label>02 Why Somnia</Label>
      <H2>Speed is not a feature.<br/>It is the product.</H2>
      <p style={{ fontFamily:"var(--font-sans)", fontSize:"clamp(11px,1.3vw,13px)", color:"var(--ink-soft)", lineHeight:1.7, marginTop:12, maxWidth:560 }}>
        For a call to feel real, the other person has to ring in under 2 seconds. On most chains that is impossible. Your app has to wait for a block, then keep checking if anything changed. That alone takes 10 to 15 seconds. By the time the other person sees the call, the moment is gone. A calling app on those chains is not usable.
      </p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2, marginTop:14 }}>
        <div style={{ border:"1px solid rgba(10,10,10,0.10)", padding:"clamp(12px,1.8vh,18px) clamp(12px,1.4vw,18px)", background:"rgba(10,10,10,0.03)" }}>
          <p style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--ink-soft)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>Other Chains</p>
          <p style={{ fontFamily:"var(--font-serif)", fontSize:"clamp(20px,2.8vw,30px)", fontWeight:900, color:"#b91c1c", marginBottom:6 }}>10 to 15 sec</p>
          <p style={{ fontFamily:"var(--font-sans)", fontSize:"clamp(10px,1vw,12px)", color:"var(--ink-soft)", lineHeight:1.6 }}>
            App polls the chain repeatedly waiting for the event to land. Slow block times make real-time communication completely unusable.
          </p>
        </div>
        <div style={{ border:"2px solid var(--ink)", padding:"clamp(12px,1.8vh,18px) clamp(12px,1.4vw,18px)" }}>
          <p style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--ink-soft)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>Somnia with Reactivity</p>
          <p style={{ fontFamily:"var(--font-serif)", fontSize:"clamp(20px,2.8vw,30px)", fontWeight:900, color:"#1a6b3a", marginBottom:6 }}>Under 2 sec</p>
          <p style={{ fontFamily:"var(--font-sans)", fontSize:"clamp(10px,1vw,12px)", color:"var(--ink-soft)", lineHeight:1.6 }}>
            Somnia Reactivity is a WebSocket built into the protocol. The second a transaction lands, it pushes the event straight to the browser. No polling. No block wait.
          </p>
        </div>
      </div>
      <div style={{ marginTop:12, padding:"clamp(8px,1.2vh,14px) clamp(12px,1.4vw,16px)", background:"rgba(10,10,10,0.04)", borderLeft:"3px solid var(--ink)" }}>
        <p style={{ fontFamily:"var(--font-sans)", fontSize:"clamp(10px,1.1vw,12px)", color:"var(--ink)", lineHeight:1.65 }}>
          <strong>Why speed matters:</strong> A 15 second delay is not a slow app. It is a broken one. Communication only works when it feels instant. Somnia Reactivity is the only reason CALLFI can exist as a real product and not just a concept.
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
  { icon:"◒", title:"Fully Encrypted",        body:"DTLS-SRTP encrypted end to end. Your calls and conversations never leak." },
];
function SlideFeatures() {
  return (
    <div style={{ maxWidth:800, width:"100%" }}>
      <Label>03 Features</Label>
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
    <div style={{ maxWidth:780, width:"100%", textAlign:"center" }}>
      <Label>04 Demo</Label>
      <H2>See it live.</H2>
      <p style={{ fontFamily:"var(--font-sans)", fontSize:13, color:"var(--ink-soft)", marginTop:8, marginBottom:18 }}>
        Two wallets. Two transactions. One call.
      </p>
      <div style={{
        width:"100%", aspectRatio:"16/9", background:"var(--ink)", borderRadius:2,
        display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden",
        maxHeight:"55vh",
      }}>
        {/* Replace with: <iframe src="YOUR_EMBED_URL" width="100%" height="100%" frameBorder="0" allowFullScreen /> */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
          <div style={{ width:52, height:52, borderRadius:"50%", border:"2px solid rgba(231,226,217,0.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="var(--cream)"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
          <p style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(231,226,217,0.4)", letterSpacing:"0.1em" }}>
            DEMO VIDEO PASTE EMBED URL
          </p>
        </div>
      </div>
      <p style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--ink-soft)", marginTop:14, letterSpacing:"0.06em" }}>
        Live on Somnia Testnet
      </p>
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
function Stat({ value, label, body }:{ value:string; label:string; body:string }) {
  return (
    <div style={{ border:"1px solid rgba(10,10,10,0.10)", padding:"clamp(12px,1.8vh,20px) clamp(12px,1.6vw,22px)" }}>
      <div style={{ fontFamily:"var(--font-serif)", fontSize:"clamp(16px,2vw,22px)", fontWeight:900, color:"var(--ink)", marginBottom:2 }}>{value}</div>
      <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--ink-soft)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>{label}</div>
      <div style={{ fontFamily:"var(--font-sans)", fontSize:"clamp(10px,1vw,12px)", color:"var(--ink-soft)", lineHeight:1.55 }}>{body}</div>
    </div>
  );
}
