/** G.711 μ-law to 16-bit PCM. */
export function mulawToPcm16(bytes) {
  const out = new Int16Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    let value = ~bytes[i] & 0xff;
    const sign = value & 0x80;
    const exponent = (value >> 4) & 0x07;
    const mantissa = value & 0x0f;
    let sample = ((mantissa << 3) + 0x84) << exponent;
    sample -= 0x84;
    out[i] = sign ? -sample : sample;
  }
  return out;
}

/** G.711 A-law to 16-bit PCM. */
export function alawToPcm16(bytes) {
  const out = new Int16Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    const value = bytes[i] ^ 0x55;
    const sign = value & 0x80;
    const exponent = (value >> 4) & 0x07;
    const mantissa = value & 0x0f;
    let sample =
      exponent === 0 ? (mantissa << 4) + 8 : ((mantissa << 4) + 0x108) << (exponent - 1);
    out[i] = sign ? -sample : sample;
  }
  return out;
}

export function pcm16ToBytes(samples) {
  const out = new Uint8Array(samples.length * 2);
  const view = new DataView(out.buffer);
  for (let i = 0; i < samples.length; i++) view.setInt16(i * 2, samples[i], true);
  return out;
}
