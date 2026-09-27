import { describe, expect, test } from "bun:test";
import { explainError } from "./errors.js";
import {
  appendTranscript,
  derivePhase,
  formatWire,
  interpret,
  noteWire,
  phaseLabel,
} from "./messages.js";

describe("interpret", () => {
  test("reads transcripts, audio, status, and tool calls", () => {
    const events = interpret({
      setupComplete: { sessionId: "s1" },
      serverContent: {
        outputTranscription: { text: "Hello" },
        interimInputTranscription: { text: "hel" },
        inputTranscription: { text: "hello" },
        modelTurn: {
          parts: [
            { inlineData: { mimeType: "audio/pcm;rate=24000", data: "AAAA" } },
            { thought: true, text: "checking" },
          ],
        },
        generationComplete: true,
        turnComplete: true,
        interactionStatus: "IN_PROGRESS",
        groundingMetadata: {
          webSearchQueries: ["world cup"],
          groundingChunks: [{ web: { title: "Fifa", uri: "https://example.com/a" } }],
        },
      },
      toolCall: { functionCalls: [{ id: "c1", name: "city_desk", args: { city: "Lisbon" } }] },
      usageMetadata: { totalTokenCount: 42 },
    });
    expect(events.map((event) => event.type)).toEqual([
      "setup",
      "usage",
      "input-text",
      "input-text",
      "output-text",
      "audio",
      "thought",
      "grounding",
      "generation-complete",
      "turn-complete",
      "tool-call",
    ]);
    expect(events.find((event) => event.type === "turn-complete").status).toBe("IN_PROGRESS");
    expect(events.find((event) => event.type === "input-text" && event.final).text).toBe("hello");
    expect(events.find((event) => event.type === "audio").bytes).toBe(3);
    expect(events.find((event) => event.type === "tool-call").calls[0].args.city).toBe("Lisbon");
  });

  test("keeps interrupt, go-away, cancellation, and a bare status", () => {
    const events = interpret({
      goAway: { timeLeft: "10s" },
      sessionResumptionUpdate: { newHandle: "h", resumable: true },
      serverContent: { interrupted: true, interactionStatus: "IDLE" },
      toolCallCancellation: { ids: ["c1"] },
    });
    expect(events.map((event) => event.type)).toEqual([
      "resume",
      "goaway",
      "interrupted",
      "status",
      "tool-cancel",
    ]);
  });
});

describe("transcript and phase", () => {
  test("appends deltas and replaces a cumulative transcript", () => {
    expect(appendTranscript("Let me check ", "the stage clock")).toBe("Let me check the stage clock");
    expect(appendTranscript("Hello", "Hello there")).toBe("Hello there");
    expect(appendTranscript("Hello there", "there")).toBe("Hello there");
  });

  test("describes the session lamp", () => {
    expect(derivePhase({ connecting: true })).toEqual({ phase: "connecting", working: false });
    expect(derivePhase({ connected: true, playing: true, serverStatus: "IN_PROGRESS", toolsInFlight: 1 })).toEqual({
      phase: "speaking",
      working: true,
    });
    expect(phaseLabel({ phase: "speaking", working: true })).toBe("Speaking, still working");
    expect(derivePhase({ connected: true, serverStatus: "IDLE", toolsInFlight: 0 })).toEqual({
      phase: "listening",
      working: false,
    });
    expect(derivePhase({})).toEqual({ phase: "idle", working: false });
  });
});

describe("wire log", () => {
  test("coalesces audio chunks and formats a line", () => {
    const log = [];
    noteWire(log, { type: "audio", bytes: 100 });
    noteWire(log, { type: "audio", bytes: 50 });
    noteWire(log, { type: "turn-complete", detail: "IN_PROGRESS" });
    expect(log).toHaveLength(2);
    expect(log[0]).toMatchObject({ chunks: 2, bytes: 150 });
    expect(formatWire(log[0])).toBe("Audio out · 2 chunks · 150 B");
    expect(formatWire(log[1])).toBe("Turn complete · IN_PROGRESS");
    expect(formatWire({ type: "note", detail: "Socket open" })).toBe("Socket open");
  });

  test("redacts the API key from an error", () => {
    expect(explainError(new Error('{"error":{"message":"bad key secret-key"}}'), "secret-key")).toBe("bad key [key]");
  });
});
