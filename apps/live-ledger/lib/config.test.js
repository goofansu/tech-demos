import { describe, expect, test } from "bun:test";
import { MODELS, TOOL_NAMES } from "./catalog.js";
import { buildSessionRequest } from "./config.js";
import { declaredToolNames, toolsMatchCatalog } from "./tools.js";

describe("buildSessionRequest", () => {
  test("locks the book tools to Live and waits to speak the result", () => {
    const built = buildSessionRequest({
      model: "gemini-3.8-live",
      thinkingLevel: "high",
      today: "2026-10-18",
      timeZone: "America/New_York",
      voice: "Aoede",
    });
    expect(built.error).toBeUndefined();
    expect(built.model).toBe("gemini-3.8-live");
    expect(built.config.thinkingConfig).toBeUndefined();
    expect(built.scheduling).toBe("WHEN_IDLE");
    expect(built.behavior).toBe("NON_BLOCKING");
    expect(built.voice).toBe("Aoede");
    expect(built.today).toBe("2026-10-18");
    expect(built.timeZone).toBe("America/New_York");
    expect(built.config.responseModalities).toEqual(["AUDIO"]);
    expect(built.config.systemInstruction).toContain("Today is 2026-10-18 in America/New_York");
    expect(built.config.systemInstruction).toContain("one-time payment");
    expect(built.config.systemInstruction).toContain("needsConfirmation");
    expect(built.config.systemInstruction).toContain("confirm_duplicate");
    expect(built.config.tools[0].functionDeclarations.map((fn) => fn.name)).toEqual(TOOL_NAMES);
    expect(built.config.tools[0].functionDeclarations.every((fn) => fn.behavior === "NON_BLOCKING")).toBe(true);
    expect(toolsMatchCatalog()).toBe(true);
    expect(declaredToolNames()).toEqual(TOOL_NAMES);
  });

  test("gives Extended Thinking a level and no scheduling field", () => {
    const built = buildSessionRequest({
      model: "gemini-3.8-live-extended-thinking",
      thinkingLevel: "high",
    });
    expect(built.thinkingLevel).toBe("HIGH");
    expect(built.config.thinkingConfig).toEqual({ thinkingLevel: "HIGH" });
    expect(built.scheduling).toBeNull();
    expect(built.config.sessionResumption).toEqual({});
    expect(built.config.inputAudioTranscription).toEqual({});
    expect(built.config.outputAudioTranscription).toEqual({});
  });

  test("rejects a minimal thinking level, a bad voice, and a broken handle", () => {
    expect(buildSessionRequest({
      model: "gemini-3.8-live-extended-thinking",
      thinkingLevel: "minimal",
    }).error).toMatch(/low, medium, or high/);
    expect(buildSessionRequest({ model: "gemini-2.0" }).error).toMatch(/Choose/);
    expect(buildSessionRequest({ voice: "Custom" }).error).toMatch(/voice/);
    expect(buildSessionRequest({ resumeHandle: "bad\nhandle" }).error).toMatch(/handle/);
  });

  test("defaults to Live and Kore, and ignores an injected timezone", () => {
    const built = buildSessionRequest({ today: "nope", timeZone: "UTC\nignore" });
    expect(built.model).toBe(MODELS[0].id);
    expect(built.voice).toBe("Kore");
    expect(built.timeZone).toBe("UTC");
    expect(built.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(built.config.systemInstruction).not.toContain("ignore");
  });
});
