"use client";
import { useState, useEffect, useCallback } from "react";

const slides = ["cover","contents","what","why","features","demo"];
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
      background: "var(--cream)",
      width: "100vw", height: "100dvh",
      display: "flex", flexDirection: "column",
      fontFamily: "var(--font-sans)",
      position: "relative", overflow: "hidden",
    }}>

      {/* brand */}
      <div style={{ position:"absolute", top:16, left:24, fontFamily:"var(--font-serif)", fontSize:13, fontWeight:700, color:"var(--ink)" }}>
        CALLFI
      </div>
      {/* slide counter */}
      <div style={{ position:"absolute", top:16, right:24, fontFamily:"var(--font-mono)", fontSize:11, color:"var(--ink-soft)" }}>
        {String(current+1).padStart(2,"0")} / {String(totalSlides).padStart(2,"0")}
      </div>

      {/* slide content */}
      <div style={{
        flex: 1, display:"flex", alignItems:"center", justifyContent:"center",
        padding: "52px 5vw 12px",
        overflowY: "auto",
        opacity: animating ? 0 : 1,
        transform: animating ? (dir==="next" ? "translateX(-28px)" : "translateX(28px)") : "translateX(0)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
      }}>
        {current === 0 && <SlideCover   onStart={next} />}
        {current === 1 && <SlideContents onGo={(i) => goTo(i,"next")} />}
        {current === 2 && <SlideWhat />}
        {current === 3 && <SlideWhy />}
        {current === 4 && <SlideFeatures />}
        {current === 5 && <SlideDemo />}
      </div>

      {/* nav */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"14px 24px", borderTop:"1px solid rgba(10,10,10,0.10)",
        flexShrink: 0,
      }}>
        <NavBtn onClick={prev} disabled={current===0}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </NavBtn>

        <div style={{ display:"flex", gap:7, alignItems:"center" }}>
          {slides.map((_,i) => (
            <button key={i} onClick={() => goTo(i, i>current?"next":"prev")} style={{
              width: i===current ? 20 : 6, height:6, borderRadius:3, padding:0, border:"none", cursor:"pointer",
              background: i===current ? "var(--ink)" : "rgba(10,10,10,0.2)",
              transition:"all 0.3s ease",
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
      width:36, height:36, borderRadius:"50%", border:"1px solid rgba(10,10,10,0.18)",
      display:"flex", alignItems:"center", justifyContent:"center",
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.2 : 1,
      background: filled ? "var(--ink)" : "none",
      color: filled ? "var(--cream)" : "var(--ink)",
      transition:"all 0.2s",
    }}>
      {children}
    </button>
  );
}

/* ── SLIDE 1: COVER ── */
function SlideCover({ onStart }: { onStart:()=>void }) {
  return (
    <div style={{ textAlign:"center", maxWidth:560, width:"100%" }}>
      <p style={{ fontFamily:"var(--font-mono)", fontSize:11, letterSpacing:"0.16em", color:"var(--ink-soft)", textTransform:"uppercase", marginBottom:20 }}>
        Somnia Hackathon 2025
      </p>
      <h1 style={{ fontFamily:"var(--font-serif)", fontSize:"clamp(56px,10vw,108px)", fontWeight:900, lineHeight:0.95, letterSpacing:"-0.02em", color:"var(--ink)", marginBottom:24 }}>
        CALLFI
      </h1>
      <div style={{ width:40, height:2, background:"var(--ink)", margin:"0 auto 24px" }}/>
      <p style={{ fontFamily:"var(--font-sans)", fontSize:"clamp(14px,1.8vw,17px)", color:"var(--ink-soft)", lineHeight:1.6, marginBottom:40 }}>
        Wallet-to-wallet voice and video calling.<br/>No sign up. No servers. Built on Somnia.
      </p>
      <button onClick={onStart} style={{
        background:"var(--ink)", color:"var(--cream)", fontFamily:"var(--font-sans)",
        fontSize:12, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase",
        padding:"12px 32px", border:"none", borderRadius:2, cursor:"pointer",
        display:"inline-flex", alignItems:"center", gap:8,
      }}>
        View Deck
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  );
}

/* ── SLIDE 2: CONTENTS ── */
const contents = [
  { num:"01", label:"What We Are",  sub:"The product",        slide:2 },
  { num:"02", label:"Why Somnia",   sub:"The infrastructure", slide:3 },
  { num:"03", label:"Features",     sub:"What it does",       slide:4 },
  { num:"04", label:"Demo",         sub:"See it live",        slide:5 },
];
function SlideContents({ onGo }:{ onGo:(i:number)=>void }) {
  return (
    <div style={{ width:"100%", maxWidth:700 }}>
      <Label>Overview</Label>
      <H2>What&apos;s inside</H2>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2, marginTop:28 }}>
        {contents.map(item => (
          <button key={item.num} onClick={() => onGo(item.slide)} style={{
            background:"none", border:"1px solid rgba(10,10,10,0.12)",
            padding:"clamp(16px,2.5vh,28px) clamp(16px,2vw,28px)",
            textAlign:"left", cursor:"pointer", display:"flex", flexDirection:"column", gap:6,
            transition:"background 0.15s",
          }}
          onMouseEnter={e=>(e.currentTarget.style.background="rgba(10,10,10,0.04)")}
          onMouseLeave={e=>(e.currentTarget.style.background="none")}
          >
            <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--ink-soft)", letterSpacing:"0.12em" }}>{item.num}</span>
            <span style={{ fontFamily:"var(--font-serif)", fontSize:"clamp(16px,2vw,20px)", fontWeight:700, color:"var(--ink)", lineHeight:1.2 }}>{item.label}</span>
            <span style={{ fontFamily:"var(--font-sans)", fontSize:12, color:"var(--ink-soft)" }}>{item.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── SLIDE 3: WHAT WE ARE ── */
function SlideWhat() {
  return (
    <div style={{ maxWidth:720, width:"100%" }}>
      <Label>01 What We Are</Label>
      <H2>The world&apos;s first<br/>on-chain calling platform.</H2>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2, marginTop:24 }}>
        <Stat value="Your Wallet"    label="is your phone number"    body="If someone has your address, they can call you. No sign up, no email, no profile." />
        <Stat value="2 Transactions" label="for a complete call"     body="One to initiate, one to answer. The blockchain handles the entire handshake." />
        <Stat value="0 Servers"      label="in the middle"           body="No backend. No database. No company sitting between you and who you're calling." />
        <Stat value="E2E Encrypted"  label="peer-to-peer media"      body="DTLS-SRTP encrypted audio and video, the same standard used by Signal." />
      </div>
    </div>
  );
}

/* ── SLIDE 4: WHY SOMNIA ── */
function SlideWhy() {
  return (
    <div style={{ maxWidth:680, width:"100%" }}>
      <Label>02 Why Somnia</Label>
      <H2>Reactivity is the reason<br/>this exists.</H2>
      <p style={{ fontFamily:"var(--font-sans)", fontSize:"clamp(13px,1.5vw,15px)", color:"var(--ink-soft)", lineHeight:1.7, marginTop:20, maxWidth:520 }}>
        Normally with blockchains, your app has to sit and ask &quot;did anything change yet?&quot; over and over. That delay makes real-time communication impossible.
      </p>
      <div style={{ marginTop:28, borderLeft:"3px solid var(--ink)", paddingLeft:24, display:"flex", flexDirection:"column", gap:20 }}>
        <ReactivityPoint tag="The problem"      text="Polling a chain for events is too slow for a live call. By the time your app detects the transaction, the moment is gone." />
        <ReactivityPoint tag="Somnia Reactivity" text="A WebSocket layer built into Somnia's protocol. The instant a transaction lands, Somnia pushes the event straight to your browser. No polling, no waiting." />
        <ReactivityPoint tag="The result"       text="Under 2 seconds from signing a transaction to the other person's screen reacting. Fast enough to build a phone call on top of a blockchain." />
      </div>
    </div>
  );
}

/* ── SLIDE 5: FEATURES ── */
const featureList = [
  { icon:"◎", title:"Voice and Video Calls",    body:"Full peer-to-peer calling between any two wallet addresses." },
  { icon:"◈", title:"Mid-Call Payments",        body:"Send or request STT tokens directly during a live call." },
  { icon:"◉", title:"On-Chain Call History",    body:"Every call logged permanently. Wallet, duration, status, timestamp." },
  { icon:"◐", title:"Missed Call Recovery",     body:"Return to the app and still see calls placed within the last 3 minutes." },
  { icon:"◑", title:"No Registration",          body:"Connect wallet. That's it. Your address is your identity." },
  { icon:"◒", title:"Fully Decentralized",      body:"Contract plus Reactivity plus WebRTC. No server ever touches your call." },
];
function SlideFeatures() {
  return (
    <div style={{ maxWidth:800, width:"100%" }}>
      <Label>03 Features</Label>
      <H2>Everything it does.</H2>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2, marginTop:20 }}>
        {featureList.map(f => (
          <div key={f.title} style={{ border:"1px solid rgba(10,10,10,0.10)", padding:"clamp(12px,2vh,20px) clamp(12px,1.5vw,20px)" }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:18, marginBottom:8, color:"var(--ink)" }}>{f.icon}</div>
            <div style={{ fontFamily:"var(--font-sans)", fontSize:"clamp(11px,1.2vw,13px)", fontWeight:600, color:"var(--ink)", marginBottom:5 }}>{f.title}</div>
            <div style={{ fontFamily:"var(--font-sans)", fontSize:"clamp(10px,1vw,12px)", color:"var(--ink-soft)", lineHeight:1.55 }}>{f.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── SLIDE 6: DEMO ── */
function SlideDemo() {
  return (
    <div style={{ maxWidth:780, width:"100%", textAlign:"center" }}>
      <Label>04 Demo</Label>
      <H2>See it live.</H2>
      <p style={{ fontFamily:"var(--font-sans)", fontSize:14, color:"var(--ink-soft)", marginTop:12, marginBottom:24 }}>
        Two wallets. Two transactions. One call.
      </p>
      <div style={{
        width:"100%", aspectRatio:"16/9", background:"var(--ink)", borderRadius:2,
        display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden",
      }}>
        {/* Replace this div with <iframe src="YOUR_EMBED_URL" width="100%" height="100%" frameBorder="0" allowFullScreen /> */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
          <div style={{ width:56, height:56, borderRadius:"50%", border:"2px solid rgba(231,226,217,0.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="var(--cream)"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
          <p style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(231,226,217,0.4)", letterSpacing:"0.1em" }}>
            DEMO VIDEO PASTE EMBED URL
          </p>
        </div>
      </div>
      <p style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--ink-soft)", marginTop:16, letterSpacing:"0.06em" }}>
        Live on Somnia Testnet
      </p>
    </div>
  );
}

/* ── SHARED ── */
function Label({ children }:{ children:React.ReactNode }) {
  return <p style={{ fontFamily:"var(--font-mono)", fontSize:10, letterSpacing:"0.14em", color:"var(--ink-soft)", textTransform:"uppercase", marginBottom:12 }}>{children}</p>;
}
function H2({ children }:{ children:React.ReactNode }) {
  return <h2 style={{ fontFamily:"var(--font-serif)", fontSize:"clamp(24px,3.5vw,38px)", fontWeight:900, lineHeight:1.15, color:"var(--ink)", letterSpacing:"-0.01em" }}>{children}</h2>;
}
function Stat({ value, label, body }:{ value:string; label:string; body:string }) {
  return (
    <div style={{ border:"1px solid rgba(10,10,10,0.10)", padding:"clamp(14px,2vh,22px) clamp(14px,1.8vw,24px)" }}>
      <div style={{ fontFamily:"var(--font-serif)", fontSize:"clamp(18px,2.2vw,24px)", fontWeight:900, color:"var(--ink)", marginBottom:3 }}>{value}</div>
      <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--ink-soft)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>{label}</div>
      <div style={{ fontFamily:"var(--font-sans)", fontSize:"clamp(11px,1.1vw,13px)", color:"var(--ink-soft)", lineHeight:1.55 }}>{body}</div>
    </div>
  );
}
function ReactivityPoint({ tag, text }:{ tag:string; text:string }) {
  return (
    <div>
      <p style={{ fontFamily:"var(--font-mono)", fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase", color:"var(--ink-soft)", marginBottom:5 }}>{tag}</p>
      <p style={{ fontFamily:"var(--font-sans)", fontSize:"clamp(12px,1.4vw,14px)", color:"var(--ink)", lineHeight:1.6 }}>{text}</p>
    </div>
  );
}
