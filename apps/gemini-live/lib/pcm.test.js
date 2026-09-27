import { describe, expect, test } from "bun:test";
import { base64Bytes, base64ToPcm16, downsample, floatToPcm16, pcm16ToBase64, resamplePcm16, takeFrame } from "./pcm.js";

describe("pcm", () => {
  test("converts float samples to 16-bit and back through base64", () => {
    const pcm = floatToPcm16(new Float32Array([0, 1, -1, 2]));
    expect(Array.from(pcm)).toEqual([0, 32767, -32768, 32767]);
    const restored = base64ToPcm16(pcm16ToBase64(pcm));
    expect(Array.from(restored)).toEqual(Array.from(pcm));
    expect(base64Bytes(pcm16ToBase64(pcm))).toBe(pcm.byteLength);
  });

  test("averages blocks when lowering the sample rate", () => {
    const input = new Float32Array([0, 2, 4, 6, 8, 10]);
    expect(Array.from(downsample(input, 3, 1))).toEqual([2, 8]);
    expect(() => downsample(input, 1, 2)).toThrow();
  });

  test("keeps a partial capture buffer until a frame is ready", () => {
    const first = takeFrame(new Float32Array(0), new Float32Array(1000), 16000, 16000, 1600);
    expect(first.pcm).toBeNull();
    expect(first.rest.length).toBe(1000);
    const second = takeFrame(first.rest, new Float32Array(800).fill(0.5), 16000, 16000, 1600);
    expect(second.pcm?.length).toBe(1800);
    expect(second.rest.length).toBe(0);
  });

  test("resamples 24 kHz playback toward the context rate", () => {
    const pcm = new Int16Array([0, 16384, 32767, -16384]);
    const same = resamplePcm16(pcm, 24000, 24000);
    expect(same.length).toBe(4);
    expect(same[2]).toBeCloseTo(32767 / 32768, 5);
    const stretched = resamplePcm16(pcm, 24000, 48000);
    expect(stretched.length).toBe(8);
  });
});
