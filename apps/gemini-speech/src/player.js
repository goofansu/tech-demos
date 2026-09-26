import {
  audioContext,
  bufferFromTake,
  claimPlayback,
  concatBytes,
  decodeBase64,
  downloadBytes,
  encodingOf,
  extensionFor,
  pcm16ToWav,
  pcmToBuffer,
  peaksFromChannel,
  unlockAudio,
} from "./audio.js";

export function mountPlayer(host, title = "") {
  host.classList.add("player");
  host.replaceChildren();

  const heading = document.createElement("p");
  heading.className = "player-title";
  heading.hidden = !title;
  heading.textContent = title;

  const canvas = document.createElement("canvas");
  canvas.className = "wave";
  canvas.setAttribute("aria-hidden", "true");

  const bar = document.createElement("div");
  bar.className = "player-bar";

  const play = document.createElement("button");
  play.type = "button";
  play.className = "play";
  play.textContent = "Play";
  play.disabled = true;

  const time = document.createElement("span");
  time.className = "time";
  time.textContent = "0:00";

  const meta = document.createElement("span");
  meta.className = "meta";

  const save = document.createElement("button");
  save.type = "button";
  save.className = "ghost";
  save.textContent = "Download";
  save.disabled = true;

  const status = document.createElement("p");
  status.className = "player-status";
  status.textContent = "Nothing recorded yet.";

  bar.append(play, time, meta, save);
  host.append(heading, canvas, bar, status);

  const state = {
    buffer: null,
    offset: 0,
    startedAt: 0,
    playing: false,
    source: null,
    liveSources: [],
    liveNext: 0,
    liveParts: [],
    livePending: new Uint8Array(0),
    livePeaks: [],
    liveRate: 24000,
    live: false,
    file: null,
    raf: 0,
  };

  function release() {
    stopReplay();
    stopLive();
    state.playing = false;
      play.textContent = "Play";
    cancelAnimationFrame(state.raf);
  }

  function stopReplay() {
    const source = state.source;
    if (!source) return;
    state.source = null;
    try {
      source.stop();
    } catch {
      /* already stopped */
    }
  }

  function stopLive() {
    for (const source of state.liveSources) {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
    }
    state.liveSources = [];
    state.liveNext = 0;
  }

  function draw(peaks, live = false) {
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 640;
    const height = canvas.clientHeight || 76;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    const g = canvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, width, height);
    const gap = 3;
    const count = Math.max(peaks.length, 1);
    const barWidth = Math.max(2, (width - gap * (count - 1)) / count);
    peaks.forEach((peak, index) => {
      const h = Math.max(3, Math.min(1, peak) * (height - 10));
      const x = index * (barWidth + gap);
      const y = (height - h) / 2;
      g.fillStyle = live ? "#e8a15a" : "#7dcec4";
      g.beginPath();
      if (g.roundRect) g.roundRect(x, y, barWidth, h, 2);
      else g.rect(x, y, barWidth, h);
      g.fill();
    });
  }

  function paintBuffer() {
    if (!state.buffer) {
      draw([0.04]);
      return;
    }
    draw(peaksFromChannel(state.buffer.getChannelData(0)));
  }

  function tick() {
    if (!state.playing || !state.buffer) return;
    const ctx = audioContext();
    const at = Math.min(state.buffer.duration, state.offset + (ctx.currentTime - state.startedAt));
    time.textContent = clock(at);
    state.raf = requestAnimationFrame(tick);
  }

  function playFrom(offset) {
    if (!state.buffer) return;
    const ctx = audioContext();
    claimPlayback(release);
    stopReplay();
    const source = ctx.createBufferSource();
    source.buffer = state.buffer;
    source.connect(ctx.destination);
    state.source = source;
    state.offset = offset;
    state.startedAt = ctx.currentTime;
    state.playing = true;
    play.textContent = "Pause";
    source.onended = () => {
      if (state.source !== source) return;
      state.playing = false;
      state.offset = 0;
      play.textContent = "Play";
      time.textContent = clock(state.buffer.duration);
    };
    source.start(0, offset);
    tick();
  }

  play.addEventListener("click", () => {
    unlockAudio();
    if (!state.buffer) return;
    if (state.playing) {
      const ctx = audioContext();
      state.offset = Math.min(state.buffer.duration, state.offset + (ctx.currentTime - state.startedAt));
      release();
      time.textContent = clock(state.offset);
      return;
    }
    if (state.offset >= state.buffer.duration - 0.05) state.offset = 0;
    playFrom(state.offset);
  });

  save.addEventListener("click", () => {
    if (!state.file) return;
    downloadBytes(state.file.bytes, state.file.mimeType, state.file.name);
  });

  new ResizeObserver(() => {
    if (state.live) draw(state.livePeaks.length ? squash(state.livePeaks) : [0.08], true);
    else paintBuffer();
  }).observe(canvas);

  draw([0.04]);

  return {
    setTitle(text) {
      heading.hidden = !text;
      heading.textContent = text || "";
    },
    setStatus(text) {
      status.textContent = text || "";
    },
    setMeta(text) {
      meta.textContent = text || "";
    },
    fail(message) {
      release();
      state.live = false;
      play.disabled = !state.buffer;
      play.textContent = "Play";
      status.textContent = message;
    },
    reset() {
      release();
      state.buffer = null;
      state.offset = 0;
      state.file = null;
      state.live = false;
      state.liveParts = [];
      state.livePending = new Uint8Array(0);
      state.livePeaks = [];
      play.disabled = true;
      save.disabled = true;
      play.textContent = "Play";
      time.textContent = "0:00";
      meta.textContent = "";
      status.textContent = "Nothing recorded yet.";
      draw([0.04]);
    },
    async loadTake({ audioBase64, mimeType, sampleRate, meta: metaLabel, note, autoplay = true, filename }) {
      release();
      state.live = false;
      const bytes = decodeBase64(audioBase64);
      const encoding = encodingOf(mimeType, bytes);
      const ctx = audioContext();
      await unlockAudio();
      state.buffer = await bufferFromTake(ctx, bytes, mimeType, sampleRate || 24000);
      state.offset = 0;
      state.file = {
        bytes,
        mimeType: mimeType || "application/octet-stream",
        name: filename || `speech-studio.${extensionFor(encoding)}`,
      };
      play.disabled = false;
      save.disabled = false;
      time.textContent = clock(0);
      meta.textContent = metaLabel || "";
      status.textContent =
        note ||
        (encoding === "mulaw" || encoding === "alaw"
          ? "Playing a converted preview. Download keeps the telephony file."
          : "Take ready.");
      paintBuffer();
      if (autoplay) playFrom(0);
      else time.textContent = clock(state.buffer.duration);
    },
    beginLive() {
      release();
      state.buffer = null;
      state.file = null;
      state.live = true;
      state.liveParts = [];
      state.livePending = new Uint8Array(0);
      state.livePeaks = [];
      state.liveRate = 24000;
      state.liveNext = 0;
      play.disabled = true;
      save.disabled = true;
      play.textContent = "Live";
      time.textContent = "0:00";
      status.textContent = "Streaming…";
      draw([0.08], true);
      unlockAudio();
    },
    pushLive(base64, sampleRate) {
      if (!state.live || !base64) return;
      if (sampleRate) state.liveRate = sampleRate;
      const incoming = decodeBase64(base64);
      const merged = state.livePending.length ? concatBytes([state.livePending, incoming]) : incoming;
      const even = merged.length - (merged.length % 2);
      state.livePending = merged.slice(even);
      const pcm = merged.slice(0, even);
      if (!pcm.length) return;
      state.liveParts.push(pcm);
      const ctx = audioContext();
      const buffer = pcmToBuffer(ctx, pcm, state.liveRate);
      const channel = buffer.getChannelData(0);
      let peak = 0;
      for (let i = 0; i < channel.length; i += 8) peak = Math.max(peak, Math.abs(channel[i]));
      state.livePeaks.push(peak || 0.05);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      const start = Math.max(ctx.currentTime + 0.06, state.liveNext);
      source.start(start);
      state.liveNext = start + buffer.duration;
      state.liveSources.push(source);
      time.textContent = clock(state.liveParts.reduce((sum, part) => sum + part.length / 2, 0) / state.liveRate);
      draw(squash(state.livePeaks), true);
    },
    endLive({ meta: metaLabel, note } = {}) {
      state.live = false;
      const pcm = concatBytes(state.liveParts.length ? state.liveParts : [new Uint8Array(0)]);
      if (pcm.length < 2) {
        this.fail("The stream ended before any audio arrived.");
        return;
      }
      const ctx = audioContext();
      state.buffer = pcmToBuffer(ctx, pcm, state.liveRate);
      const wav = pcm16ToWav(pcm, state.liveRate);
      state.file = { bytes: wav, mimeType: "audio/wav", name: "speech-studio.wav" };
      play.disabled = false;
      save.disabled = false;
      play.textContent = "Replay";
      if (metaLabel) meta.textContent = metaLabel;
      status.textContent = note || "Stream finished. Replay plays the whole take.";
      paintBuffer();
    },
  };
}

function squash(peaks) {
  const bars = 88;
  if (peaks.length <= bars) return peaks;
  const block = peaks.length / bars;
  const out = [];
  for (let i = 0; i < bars; i++) {
    const start = Math.floor(i * block);
    const end = Math.floor((i + 1) * block);
    let max = 0;
    for (let j = start; j < end; j++) max = Math.max(max, peaks[j]);
    out.push(max);
  }
  return out;
}

function clock(seconds) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}
