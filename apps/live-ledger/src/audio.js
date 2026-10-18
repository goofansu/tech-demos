import { base64ToPcm16, pcm16ToBase64, resamplePcm16, rms, takeFrame } from "../lib/pcm.js";

const OUTPUT_RATE = 24000;
const INPUT_RATE = 16000;
const FRAME_SAMPLES = 1600;

let sharedContext;

export function audioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!sharedContext) sharedContext = new AudioCtx();
  if (sharedContext.state === "suspended") void sharedContext.resume();
  return sharedContext;
}

export function createPlayback(onchange) {
  const context = audioContext();
  const gain = context.createGain();
  gain.gain.value = 0.9;
  gain.connect(context.destination);
  const active = new Set();
  let next = 0;
  let playing = false;

  const refresh = () => {
    const live = next > context.currentTime + 0.02;
    if (live !== playing) {
      playing = live;
      onchange?.(playing);
    }
  };

  return {
    enqueue(base64) {
      const floats = resamplePcm16(base64ToPcm16(base64), OUTPUT_RATE, context.sampleRate);
      if (!floats.length) return 0;
      const buffer = context.createBuffer(1, floats.length, context.sampleRate);
      buffer.copyToChannel(floats, 0);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(gain);
      const start = Math.max(context.currentTime + 0.04, next);
      source.start(start);
      next = start + buffer.duration;
      active.add(source);
      source.onended = () => {
        active.delete(source);
        refresh();
      };
      if (!playing) {
        playing = true;
        onchange?.(true);
      }
      return rms(floats);
    },
    stop() {
      for (const source of active) {
        try {
          source.stop();
        } catch {
          /* Already stopped. */
        }
      }
      active.clear();
      next = 0;
      if (playing) {
        playing = false;
        onchange?.(false);
      }
    },
    get playing() {
      return playing;
    },
  };
}

export async function startMicrophone(onChunk) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });
  const context = audioContext();
  await context.audioWorklet.addModule(new URL("./capture-worklet.js", import.meta.url));
  const source = context.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(context, "capture-processor");
  const mute = context.createGain();
  mute.gain.value = 0;
  let pending = new Float32Array(0);
  node.port.onmessage = (event) => {
    const chunk = new Float32Array(event.data);
    const taken = takeFrame(pending, chunk, context.sampleRate, INPUT_RATE, FRAME_SAMPLES);
    pending = taken.rest;
    if (taken.pcm) onChunk(pcm16ToBase64(taken.pcm), rms(chunk));
  };
  source.connect(node);
  node.connect(mute);
  mute.connect(context.destination);
  return {
    stop() {
      node.port.onmessage = null;
      node.disconnect();
      source.disconnect();
      mute.disconnect();
      for (const track of stream.getTracks()) track.stop();
    },
  };
}
