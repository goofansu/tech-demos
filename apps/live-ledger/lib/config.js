import { MODELS, VOICES, modelById, systemInstruction } from "./catalog.js";
import { localDateISO } from "./ledger.js";
import { functionDeclarations } from "./tools.js";

const LEVEL_VALUES = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
};

export function buildSessionRequest(input = {}) {
  const model = modelById(String(input.model || MODELS[0].id));
  if (!model) return { error: "Choose Gemini 3.8 Live or Extended Thinking." };

  const voiceId = input.voice || "Kore";
  const voice = VOICES.find((item) => item.id === voiceId);
  if (!voice) return { error: "Choose a prebuilt Live voice." };

  let thinkingLevel = null;
  if (model.thinking) {
    const raw = String(input.thinkingLevel || "medium").toLowerCase();
    if (raw === "minimal") {
      return { error: "Extended Thinking accepts low, medium, or high. Minimal is not supported." };
    }
    if (!LEVEL_VALUES[raw]) return { error: "Thinking level must be low, medium, or high." };
    thinkingLevel = LEVEL_VALUES[raw];
  }

  let resumeHandle = "";
  if (input.resumeHandle) {
    resumeHandle = String(input.resumeHandle);
    if (resumeHandle.length > 8192 || /[\u0000-\u001f]/.test(resumeHandle)) {
      return { error: "That resumption handle is not usable." };
    }
  }

  const today = resolveToday(input.today);
  const timeZone = resolveZone(input.timeZone);
  const behavior = "NON_BLOCKING";
  const scheduling = model.thinking ? null : "WHEN_IDLE";

  const config = {
    responseModalities: ["AUDIO"],
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: voice.id } },
    },
    systemInstruction: systemInstruction({ today, timeZone }),
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    sessionResumption: resumeHandle ? { handle: resumeHandle } : {},
    contextWindowCompression: { slidingWindow: {} },
    tools: [{ functionDeclarations: functionDeclarations(behavior) }],
  };
  if (thinkingLevel) config.thinkingConfig = { thinkingLevel };

  return {
    model: model.id,
    config,
    scheduling,
    behavior,
    thinkingLevel,
    voice: voice.id,
    today,
    timeZone,
  };
}

function resolveToday(value) {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [y, m, d] = text.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d && y >= 1990 && y <= 2100) {
      return text;
    }
  }
  return localDateISO(new Date(), "UTC");
}

function resolveZone(zone) {
  const value = String(zone || "UTC").trim();
  if (!/^[A-Za-z0-9_+\-/]{1,64}$/.test(value)) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return value;
  } catch {
    return "UTC";
  }
}
