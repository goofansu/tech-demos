import { facingPair } from "../lib/cameras.js";
import { pcm16ToBase64, resamplePcm16, rms, takeFrame } from "../lib/pcm.js";

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
      const floats = resamplePcm16(base64ToAligned(base64), OUTPUT_RATE, context.sampleRate);
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

export async function readFacingPair() {
  if (!navigator.mediaDevices?.enumerateDevices) return null;
  const devices = await navigator.mediaDevices.enumerateDevices();
  return facingPair(devices.map(describeCamera));
}

export async function openCamera(face = "user") {
  const wanted = face === "environment" ? "environment" : "user";
  const pair = await readFacingPair().catch(() => null);
  const deviceId = pair?.[wanted];
  if (deviceId) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: { ideal: 960 } },
        audio: false,
      });
    } catch {
      /* The chosen id can go stale. Fall through to facingMode. */
    }
  }
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: wanted }, width: { ideal: 960 } },
    audio: false,
  });
}

function describeCamera(device) {
  let facingModes = [];
  if (typeof device.getCapabilities === "function") {
    try {
      facingModes = device.getCapabilities()?.facingMode || [];
    } catch {
      facingModes = [];
    }
  }
  return {
    kind: device.kind,
    label: device.label,
    deviceId: device.deviceId,
    facingModes,
  };
}

export function jpegFromVideo(video, maxWidth = 640) {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;
  return drawJpeg(width, height, maxWidth, (context, canvas) => {
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
  });
}

export function jpegFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const data = drawJpeg(image.naturalWidth, image.naturalHeight, 640, (context, canvas) => {
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
      });
      resolve({ data, url: URL.createObjectURL(file) });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file is not an image the page can read."));
    };
    image.src = url;
  });
}

function drawJpeg(width, height, maxWidth, paint) {
  const scale = Math.min(1, maxWidth / width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d", { alpha: false });
  paint(context, canvas);
  const url = canvas.toDataURL("image/jpeg", 0.72);
  const comma = url.indexOf(",");
  return comma >= 0 ? url.slice(comma + 1) : "";
}

function base64ToAligned(base64) {
  const binary = atob(base64);
  const length = binary.length - (binary.length % 2);
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}
