/**
 * CallFi — Sound Engine
 * All sounds generated via Web Audio API — zero audio files, works offline.
 */

let _ctx: AudioContext | null = null;
function ctx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  if (_ctx.state === "suspended") _ctx.resume();
  return _ctx;
}

// ── Ring tone (outgoing + incoming) ──────────────────────────────────────────
let _ringing = false;
let _ringTimeout: ReturnType<typeof setTimeout> | null = null;

function _playRingBurst() {
  if (!_ringing) return;
  const c = ctx();

  // Classic double-ring pattern at 440Hz + 480Hz
  [0, 0.5].forEach((offset) => {
    const t = c.currentTime + offset;
    [440, 480].forEach((freq) => {
      const osc  = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.04);
      gain.gain.setValueAtTime(0.22, t + 0.38);
      gain.gain.linearRampToValueAtTime(0, t + 0.42);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  });

  _ringTimeout = setTimeout(_playRingBurst, 3000);
}

export function startRing() {
  if (typeof window === "undefined" || _ringing) return;
  _ringing = true;
  _playRingBurst();
}

export function stopRing() {
  _ringing = false;
  if (_ringTimeout) { clearTimeout(_ringTimeout); _ringTimeout = null; }
}

// ── Answer sound (ascending chime — call connected) ──────────────────────────
export function playAnswerSound() {
  if (typeof window === "undefined") return;
  const c = ctx();
  [523.25, 659.25, 783.99].forEach((freq, i) => {
    const t    = c.currentTime + i * 0.11;
    const osc  = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.28, t + 0.04);
    gain.gain.linearRampToValueAtTime(0,    t + 0.22);
    osc.start(t);
    osc.stop(t + 0.25);
  });
}

// ── Hangup sound (descending — call ended) ───────────────────────────────────
export function playHangupSound() {
  if (typeof window === "undefined") return;
  const c = ctx();
  [480, 400, 330].forEach((freq, i) => {
    const t    = c.currentTime + i * 0.09;
    const osc  = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.24, t + 0.03);
    gain.gain.linearRampToValueAtTime(0,    t + 0.16);
    osc.start(t);
    osc.stop(t + 0.18);
  });
}

// ── Decline sound (short two-tone drop) ──────────────────────────────────────
export function playDeclineSound() {
  if (typeof window === "undefined") return;
  const c = ctx();
  [400, 300].forEach((freq, i) => {
    const t    = c.currentTime + i * 0.14;
    const osc  = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.04);
    gain.gain.linearRampToValueAtTime(0,   t + 0.18);
    osc.start(t);
    osc.stop(t + 0.2);
  });
}

// ── Click (mute / hold toggle) ───────────────────────────────────────────────
export function playClickSound() {
  if (typeof window === "undefined") return;
  const c    = ctx();
  const buf  = c.createBuffer(1, Math.floor(c.sampleRate * 0.03), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.005));
  }
  const src  = c.createBufferSource();
  const gain = c.createGain();
  src.buffer = buf;
  src.connect(gain);
  gain.connect(c.destination);
  gain.gain.value = 0.35;
  src.start();
}

// ── Payment ping (payment received) ─────────────────────────────────────────
export function playPaymentSound() {
  if (typeof window === "undefined") return;
  const c = ctx();
  [880, 1108].forEach((freq, i) => {
    const t    = c.currentTime + i * 0.08;
    const osc  = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.frequency.value = freq;
    osc.type = "triangle";
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.03);
    gain.gain.linearRampToValueAtTime(0,    t + 0.28);
    osc.start(t);
    osc.stop(t + 0.3);
  });
}
