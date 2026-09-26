import { describe, expect, test } from "bun:test";
import { buildJoinRequests, buildSpeechRequest } from "./request.js";

const line = {
  model: "gemini-3.8-flash-tts",
  format: "wav-24",
  speakers: [{ name: "Narrator", voice: "Kore" }],
  turns: [{ speaker: "Narrator", text: "Have a wonderful day!", style: "cheerful and friendly" }],
};

describe("buildSpeechRequest", () => {
  test("builds a single-speaker interactions body", () => {
    const built = buildSpeechRequest(line);
    expect(built.error).toBeUndefined();
    expect(built.request).toEqual({
      model: "gemini-3.8-flash-tts",
      input: [
        {
          type: "user_input",
          content: [
            {
              type: "text",
              text: "Have a wonderful day!",
              annotations: [{ type: "speech_metadata", style: "cheerful and friendly" }],
            },
          ],
        },
      ],
      response_format: { type: "audio", mime_type: "audio/wav", sample_rate: 24000 },
      generation_config: { speech_config: [{ voice: "Kore" }] },
    });
    expect(built.joinTurns).toBe(false);
  });

  test("omits an empty style so the transcript stays plain", () => {
    const built = buildSpeechRequest({
      ...line,
      turns: [{ text: "Hello there." }],
    });
    expect(built.request.input[0].content[0].annotations).toBeUndefined();
  });

  test("builds a conversational two-speaker scene", () => {
    const built = buildSpeechRequest({
      model: "gemini-3.8-flash-lite-tts",
      format: "pcm-16",
      speakers: [
        { name: "Joe", voice: "Puck" },
        { name: "Jane", voice: "Kore" },
      ],
      turns: [
        { speaker: "Joe", text: "How's it going today Jane?", style: "cheerful and friendly" },
        { speaker: "Jane", text: "Not too bad.", style: "" },
      ],
    });
    expect(built.request.generation_config.speech_config).toEqual({
      mode: "conversational",
      speakers: [
        { speaker: "Joe", voice: "Puck" },
        { speaker: "Jane", voice: "Kore" },
      ],
    });
    expect(built.request.input[0].content[1].annotations).toEqual([
      { type: "speech_metadata", speaker: "Jane" },
    ]);
    expect(built.request.response_format.mime_type).toBe("audio/l16");
    expect(built.request.response_format.sample_rate).toBe(16000);
  });

  test("streams as 24 kHz PCM even if a file format was selected", () => {
    const built = buildSpeechRequest({ ...line, stream: true, format: "mulaw-8" });
    expect(built.stream).toBe(true);
    expect(built.request.response_format).toEqual({
      type: "audio",
      mime_type: "audio/l16",
      sample_rate: 24000,
    });
  });

  test("joins a scene that mixes a designed voice", () => {
    const built = buildSpeechRequest({
      model: "gemini-3.8-flash-tts",
      speakers: [
        { name: "Ada", voice: "voice_abc123" },
        { name: "Bea", voice: "Kore" },
      ],
      turns: [
        { speaker: "Ada", text: "I kept the lamp on." },
        { speaker: "Bea", text: "Then we can see the steps." },
      ],
    });
    expect(built.joinTurns).toBe(true);
    const pieces = buildJoinRequests(built);
    expect(pieces).toHaveLength(2);
    expect(pieces[0].request.generation_config.speech_config).toEqual([{ voice: "voice_abc123" }]);
    expect(pieces[1].request.response_format.mime_type).toBe("audio/l16");
    expect(pieces[1].joinTurns).toBe(false);
  });

  test("rejects a third speaker, a blank line, and an unknown model", () => {
    expect(
      buildSpeechRequest({
        ...line,
        speakers: [
          { name: "A", voice: "Kore" },
          { name: "B", voice: "Puck" },
          { name: "C", voice: "Charon" },
        ],
      }).error,
    ).toBeTruthy();
    expect(buildSpeechRequest({ ...line, turns: [{ text: "   " }] }).error).toBeTruthy();
    expect(buildSpeechRequest({ ...line, model: "gemini-2.5-pro" }).error).toBeTruthy();
    expect(
      buildSpeechRequest({
        ...line,
        speakers: [
          { name: "A", voice: "Kore" },
          { name: "B", voice: "Puck" },
        ],
        turns: [{ speaker: "C", text: "Hello" }],
      }).error,
    ).toBeTruthy();
  });
});
