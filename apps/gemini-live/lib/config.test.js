import { describe, expect, test } from "bun:test";
import { MODELS, SYSTEM_INSTRUCTION } from "./catalog.js";
import { buildSessionRequest, sessionFingerprint } from "./config.js";

describe("buildSessionRequest", () => {
  test("keeps thinking config off the low-latency model", () => {
    const built = buildSessionRequest({
      model: "gemini-3.8-live",
      thinkingLevel: "high",
      behavior: "BLOCKING",
    });
    expect(built.error).toBeUndefined();
    expect(built.model).toBe("gemini-3.8-live");
    expect(built.config.thinkingConfig).toBeUndefined();
    expect(built.behavior).toBe("BLOCKING");
    expect(built.scheduling).toBeNull();
    expect(built.config.responseModalities).toEqual(["AUDIO"]);
    expect(built.config.systemInstruction).toBe(SYSTEM_INSTRUCTION);
    expect(built.config.proactivity).toBeUndefined();
    expect(built.config.enableAffectiveDialog).toBeUndefined();
    expect(built.config.tools[0].functionDeclarations.every((fn) => fn.behavior === "BLOCKING")).toBe(true);
  });

  test("configures background reasoning and non-blocking tools", () => {
    const built = buildSessionRequest({
      model: "gemini-3.8-live-extended-thinking",
      thinkingLevel: "high",
      behavior: "BLOCKING",
      scheduling: "INTERRUPT",
      search: true,
      voice: "Puck",
    });
    expect(built.thinkingLevel).toBe("HIGH");
    expect(built.config.thinkingConfig).toEqual({ thinkingLevel: "HIGH" });
    expect(built.behavior).toBe("NON_BLOCKING");
    expect(built.scheduling).toBeNull();
    expect(built.voice).toBe("Puck");
    expect(built.config.tools.map((tool) => Object.keys(tool)[0])).toEqual([
      "googleSearch",
      "functionDeclarations",
    ]);
    expect(built.config.tools[1].functionDeclarations.every((fn) => fn.behavior === "NON_BLOCKING")).toBe(true);
    expect(built.config.sessionResumption).toEqual({});
    expect(built.config.contextWindowCompression).toEqual({ slidingWindow: {} });
    expect(built.config.inputAudioTranscription).toEqual({});
    expect(built.config.outputAudioTranscription).toEqual({});
  });

  test("rejects a minimal thinking level and unknown choices", () => {
    expect(buildSessionRequest({
      model: "gemini-3.8-live-extended-thinking",
      thinkingLevel: "minimal",
    }).error).toMatch(/low, medium, or high/);
    expect(buildSessionRequest({ model: "gemini-2.0" }).error).toMatch(/Choose/);
    expect(buildSessionRequest({ voice: "Custom" }).error).toMatch(/voice/);
    expect(buildSessionRequest({ scheduling: "SOON" }).error).toMatch(/Scheduling/);
    expect(buildSessionRequest({ resumeHandle: "bad\nhandle" }).error).toMatch(/handle/);
  });

  test("passes a resumption handle and can omit studio tools", () => {
    const built = buildSessionRequest({
      tools: false,
      search: true,
      scheduling: "SILENT",
      resumeHandle: "abc123",
    });
    expect(built.config.sessionResumption).toEqual({ handle: "abc123" });
    expect(built.config.tools).toEqual([{ googleSearch: {} }]);
    expect(built.scheduling).toBe("SILENT");
    expect(built.tools).toBe(false);
  });

  test("defaults to Live, Kore, non-blocking, and when-idle", () => {
    const built = buildSessionRequest();
    expect(built.model).toBe(MODELS[0].id);
    expect(built.voice).toBe("Kore");
    expect(built.behavior).toBe("NON_BLOCKING");
    expect(built.scheduling).toBe("WHEN_IDLE");
    expect(built.thinkingLevel).toBeNull();
  });
});

describe("sessionFingerprint", () => {
  test("ignores scheduling and changes when the model changes", () => {
    const base = sessionFingerprint({ model: "gemini-3.8-live", scheduling: "SILENT" });
    const same = sessionFingerprint({ model: "gemini-3.8-live", scheduling: "INTERRUPT" });
    const other = sessionFingerprint({ model: "gemini-3.8-live-extended-thinking" });
    expect(base).toBe(same);
    expect(base).not.toBe(other);
  });
});
