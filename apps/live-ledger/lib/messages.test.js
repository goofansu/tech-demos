import { describe, expect, test } from "bun:test";
import { appendTranscript, derivePhase, interpret, phaseLabel } from "./messages.js";

describe("interpret", () => {
  test("reads a tool call, a transcript, and the end of a turn", () => {
    const events = interpret({
      toolCall: {
        functionCalls: [{ id: "c1", name: "record_payment", args: { name: "Mug", amount: 12 } }],
      },
      serverContent: {
        outputTranscription: { text: "Recorded." },
        turnComplete: true,
        interactionStatus: "IDLE",
      },
    });
    expect(events.map((event) => event.type)).toEqual(["output-text", "turn-complete", "tool-call"]);
    expect(events[2].calls[0]).toEqual({ id: "c1", name: "record_payment", args: { name: "Mug", amount: 12 } });
    expect(events[1].status).toBe("IDLE");
  });

  test("joins growing transcripts and names the writing phase", () => {
    expect(appendTranscript("Recorded", "Recorded the mug")).toBe("Recorded the mug");
    expect(appendTranscript("Hello", " there")).toBe("Hello there");
    const view = derivePhase({
      connected: true,
      connecting: false,
      playing: false,
      serverStatus: "IN_PROGRESS",
      toolsInFlight: 1,
    });
    expect(phaseLabel(view)).toBe("Writing the book");
  });
});
