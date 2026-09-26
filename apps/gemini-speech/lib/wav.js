export function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Wrap 16-bit little-endian mono PCM in a RIFF WAV header. */
export function pcm16ToWav(pcm, sampleRate) {
  const data = pcm instanceof Uint8Array ? pcm : new Uint8Array(pcm);
  const even = data.length - (data.length % 2);
  const body = data.subarray(0, even);
  const out = new Uint8Array(44 + body.length);
  const view = new DataView(out.buffer);
  writeAscii(out, 0, "RIFF");
  view.setUint32(4, 36 + body.length, true);
  writeAscii(out, 8, "WAVE");
  writeAscii(out, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(out, 36, "data");
  view.setUint32(40, body.length, true);
  out.set(body, 44);
  return out;
}

/** Pull PCM frames out of a WAV file. Raw bytes pass through. */
export function pcmFromWavOrRaw(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (data.length < 12 || ascii(data, 0, 4) !== "RIFF" || ascii(data, 8, 4) !== "WAVE") {
    return data;
  }
  let offset = 12;
  while (offset + 8 <= data.length) {
    const id = ascii(data, offset, 4);
    const size = new DataView(data.buffer, data.byteOffset + offset + 4, 4).getUint32(0, true);
    const start = offset + 8;
    if (id === "data") return data.subarray(start, Math.min(start + size, data.length));
    offset = start + size + (size % 2);
  }
  return data.subarray(Math.min(44, data.length));
}

function writeAscii(bytes, offset, text) {
  for (let i = 0; i < text.length; i++) bytes[offset + i] = text.charCodeAt(i);
}

function ascii(bytes, offset, length) {
  let text = "";
  for (let i = 0; i < length; i++) text += String.fromCharCode(bytes[offset + i]);
  return text;
}
