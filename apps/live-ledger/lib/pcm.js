const BASE64_CHUNK = 0x8000;

export function floatToPcm16(samples) {
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    pcm[i] = clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
  }
  return pcm;
}

export function downsample(input, inputRate, outputRate) {
  if (!(inputRate > 0) || !(outputRate > 0)) throw new Error("Sample rates must be positive.");
  if (outputRate === inputRate) return Float32Array.from(input);
  if (outputRate > inputRate) throw new Error("Output rate must be lower than the input rate.");
  const ratio = inputRate / outputRate;
  const length = Math.floor(input.length / ratio);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += input[j];
    const count = end - start;
    out[i] = count ? sum / count : 0;
  }
  return out;
}

export function takeFrame(pending, chunk, inputRate, outputRate, minSamples) {
  const merged = new Float32Array(pending.length + chunk.length);
  merged.set(pending, 0);
  merged.set(chunk, pending.length);
  const ratio = inputRate / outputRate;
  const whole = Math.floor(merged.length / ratio);
  if (whole < minSamples) return { pcm: null, rest: merged };
  const used = Math.floor(whole * ratio);
  const pcm = floatToPcm16(downsample(merged.subarray(0, used), inputRate, outputRate));
  return { pcm, rest: merged.slice(used) };
}

export function pcm16ToBase64(pcm) {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let binary = "";
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK) {
    const slice = bytes.subarray(i, i + BASE64_CHUNK);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

export function base64ToPcm16(base64) {
  const binary = atob(base64);
  const length = binary.length - (binary.length % 2);
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}

export function resamplePcm16(pcm, srcRate, dstRate) {
  if (!(srcRate > 0) || !(dstRate > 0)) throw new Error("Sample rates must be positive.");
  if (!pcm.length) return new Float32Array(0);
  if (srcRate === dstRate) {
    const out = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i += 1) out[i] = pcm[i] / 32768;
    return out;
  }
  const length = Math.max(1, Math.round((pcm.length * dstRate) / srcRate));
  const out = new Float32Array(length);
  const scale = (pcm.length - 1) / Math.max(1, length - 1);
  for (let i = 0; i < length; i += 1) {
    const x = i * scale;
    const i0 = Math.floor(x);
    const i1 = Math.min(pcm.length - 1, i0 + 1);
    const mix = x - i0;
    const s0 = pcm[i0] / 32768;
    const s1 = pcm[i1] / 32768;
    out[i] = s0 + (s1 - s0) * mix;
  }
  return out;
}

export function rms(samples) {
  if (!samples.length) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

export function base64Bytes(data) {
  if (!data) return 0;
  const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((data.length * 3) / 4) - padding);
}
