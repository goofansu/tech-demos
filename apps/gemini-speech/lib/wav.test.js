import { describe, expect, test } from "bun:test";
import { audioFromInteraction, explainError } from "./audio-parts.js";
import { alawToPcm16, mulawToPcm16 } from "./codecs.js";
import { concatBytes, pcm16ToWav, pcmFromWavOrRaw } from "./wav.js";

describe("wav", () => {
  test("writes a playable RIFF header and reads the frames back", () => {
    const pcm = new Uint8Array([0, 0, 0x00, 0x10, 0xff, 0x7f]);
    const wav = pcm16ToWav(pcm, 8000);
    expect(String.fromCharCode(...wav.subarray(0, 4))).toBe("RIFF");
    expect(new DataView(wav.buffer).getUint32(24, true)).toBe(8000);
    expect(pcmFromWavOrRaw(wav)).toEqual(pcm);
    expect(pcmFromWavOrRaw(pcm)).toEqual(pcm);
  });

  test("concatenates frames in order", () => {
    expect(concatBytes([new Uint8Array([1, 2]), new Uint8Array([3])])).toEqual(
      new Uint8Array([1, 2, 3]),
    );
  });
});

describe("telephony codecs", () => {
  test("μ-law silence is zero and other bytes stay in range", () => {
    const decoded = mulawToPcm16(new Uint8Array([0xff, 0x00, 0x7f]));
    expect(decoded[0]).toBe(0);
    for (const sample of decoded) {
      expect(sample).toBeGreaterThanOrEqual(-32768);
      expect(sample).toBeLessThanOrEqual(32767);
    }
  });

  test("A-law bytes stay in range", () => {
    const decoded = alawToPcm16(new Uint8Array([0xd5, 0x2a, 0xff]));
    for (const sample of decoded) {
      expect(sample).toBeGreaterThanOrEqual(-32768);
      expect(sample).toBeLessThanOrEqual(32767);
    }
  });
});

describe("audio parts", () => {
  test("reads output_audio and falls back to the last step", () => {
    expect(
      audioFromInteraction({
        output_audio: { type: "audio", data: "abc", mime_type: "audio/wav", sample_rate: 24000 },
      }),
    ).toEqual({ base64: "abc", mimeType: "audio/wav", sampleRate: 24000 });

    expect(
      audioFromInteraction({
        steps: [
          { type: "model_output", content: [{ type: "text", text: "no" }] },
          { type: "model_output", content: [{ type: "audio", data: "zzz", mime_type: "audio/l16" }] },
        ],
      }).base64,
    ).toBe("zzz");
  });

  test("explains API JSON and hides the key", () => {
    const err = new Error('request failed {"error":{"message":"quota"}} secret-key');
    expect(explainError(err, "secret-key")).toBe("quota");
  });
});
