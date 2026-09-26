import { alawToPcm16, mulawToPcm16, pcm16ToBytes } from "../lib/codecs.js";
import { concatBytes, pcm16ToWav } from "../lib/wav.js";

let context;
const releasers = new Set();

export function audioContext() {
  if (!context) context = new AudioContext();
  return context;
}

export function unlockAudio() {
  const ctx = audioContext();
  if (ctx.state === "suspended") return ctx.resume();
  return Promise.resolve();
}

export function claimPlayback(release) {
  for (const stop of releasers) {
    if (stop !== release) stop();
  }
  releasers.add(release);
}

export function decodeBase64(value) {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function encodingOf(mimeType, bytes) {
  const mime = (mimeType || "").toLowerCase();
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mulaw")) return "mulaw";
  if (mime.includes("alaw")) return "alaw";
  if (mime.includes("l16") || mime.includes("pcm")) return "l16";
  if (bytes && bytes.length > 4 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    return "wav";
  }
  return "";
}

export function extensionFor(encoding) {
  if (encoding === "wav") return "wav";
  if (encoding === "mulaw") return "mulaw";
  if (encoding === "alaw") return "alaw";
  return "pcm";
}

export async function bufferFromTake(ctx, bytes, mimeType, sampleRate) {
  const encoding = encodingOf(mimeType, bytes);
  if (!encoding) throw new Error("This audio format cannot be played in the browser.");
  if (encoding === "wav") {
    const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    return ctx.decodeAudioData(copy);
  }
  const pcm = encoding === "mulaw" ? pcm16ToBytes(mulawToPcm16(bytes)) : encoding === "alaw" ? pcm16ToBytes(alawToPcm16(bytes)) : bytes;
  return pcmToBuffer(ctx, pcm, sampleRate || 24000);
}

export function pcmToBuffer(ctx, bytes, sampleRate) {
  const even = bytes.subarray(0, bytes.length - (bytes.length % 2));
  const view = new DataView(even.buffer, even.byteOffset, even.byteLength);
  const samples = even.byteLength / 2;
  const buffer = ctx.createBuffer(1, Math.max(1, samples), sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < samples; i++) channel[i] = view.getInt16(i * 2, true) / 32768;
  return buffer;
}

export function downloadBytes(bytes, mimeType, filename) {
  const blob = new Blob([bytes], { type: mimeType || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function peaksFromChannel(channel, bars = 88) {
  if (!channel?.length) return [0.04];
  const block = Math.max(1, Math.floor(channel.length / bars));
  const peaks = [];
  for (let i = 0; i < bars; i++) {
    let max = 0;
    const start = i * block;
    const end = Math.min(channel.length, start + block);
    for (let j = start; j < end; j += 4) max = Math.max(max, Math.abs(channel[j]));
    peaks.push(max);
  }
  return peaks;
}

export { concatBytes, pcm16ToWav };
