let ctx;
let muted = false;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(context, { freq, start, dur = 0.18, type = "sine", gain = 0.07, slide }) {
  const osc = context.createOscillator();
  const g = context.createGain();
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1800;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slide) {
    osc.frequency.exponentialRampToValueAtTime(slide, start + dur * 0.8);
  }
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(filter);
  filter.connect(g);
  g.connect(context.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

export function setMuted(next) {
  muted = next;
  try {
    localStorage.setItem("peekaboo-muted", muted ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function isMuted() {
  return muted;
}

export function loadMutePreference() {
  try {
    muted = localStorage.getItem("peekaboo-muted") === "1";
  } catch {
    muted = false;
  }
  return muted;
}

/** Soft hide-then-peek chime. Safe to skip if audio is unavailable. */
export function playPeekaboo() {
  if (muted) return;
  const context = audio();
  if (!context) return;
  const t = context.currentTime + 0.01;
  tone(context, { freq: 392, start: t, dur: 0.16, type: "triangle", gain: 0.05, slide: 294 });
  tone(context, { freq: 523, start: t + 0.42, dur: 0.14, type: "sine", gain: 0.06 });
  tone(context, { freq: 659, start: t + 0.54, dur: 0.16, type: "sine", gain: 0.055 });
  tone(context, { freq: 784, start: t + 0.7, dur: 0.22, type: "triangle", gain: 0.045 });
}
