import {
  BEHAVIORS,
  MODELS,
  SCHEDULES,
  SYSTEM_INSTRUCTION,
  THINKING_LEVELS,
  VOICES,
  modelById,
} from "./catalog.js";
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

  const tools = input.tools !== false;
  const search = Boolean(input.search);
  let behavior = "NON_BLOCKING";
  if (!model.thinking && input.behavior === "BLOCKING") behavior = "BLOCKING";
  if (!BEHAVIORS.some((item) => item.id === behavior)) {
    return { error: "Tool behavior must be blocking or non-blocking." };
  }

  let scheduling = null;
  if (!model.thinking && behavior === "NON_BLOCKING") {
    const raw = input.scheduling || "WHEN_IDLE";
    if (!SCHEDULES.some((item) => item.id === raw)) {
      return { error: "Scheduling must be when idle, interrupt, or silent." };
    }
    scheduling = raw;
  }

  let resumeHandle = "";
  if (input.resumeHandle) {
    resumeHandle = String(input.resumeHandle);
    if (resumeHandle.length > 8192 || /[\u0000-\u001f]/.test(resumeHandle)) {
      return { error: "That resumption handle is not usable." };
    }
  }

  const config = {
    responseModalities: ["AUDIO"],
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: voice.id } },
    },
    systemInstruction: instructionWithPrior(input.priorTalk),
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    sessionResumption: resumeHandle ? { handle: resumeHandle } : {},
    contextWindowCompression: { slidingWindow: {} },
    mediaResolution: "MEDIA_RESOLUTION_MEDIUM",
  };
  if (thinkingLevel) config.thinkingConfig = { thinkingLevel };

  const toolList = [];
  if (search) toolList.push({ googleSearch: {} });
  if (tools) toolList.push({ functionDeclarations: functionDeclarations(behavior) });
  if (toolList.length) config.tools = toolList;

  return {
    model: model.id,
    config,
    scheduling,
    behavior,
    thinkingLevel,
    search,
    tools,
    voice: voice.id,
  };
}

export function sessionFingerprint(input = {}) {
  const level = THINKING_LEVELS.some((item) => item.id === input.thinkingLevel)
    ? input.thinkingLevel
    : "medium";
  return [
    input.model || MODELS[0].id,
    input.voice || "Kore",
    level,
    input.tools === false ? "0" : "1",
    input.search ? "1" : "0",
    input.behavior === "BLOCKING" ? "BLOCKING" : "NON_BLOCKING",
  ].join("|");
}

function instructionWithPrior(priorTalk) {
  const prior = String(priorTalk || "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim();
  if (!prior) return SYSTEM_INSTRUCTION;
  const clipped = prior.length > 6000 ? prior.slice(prior.length - 6000) : prior;
  return `${SYSTEM_INSTRUCTION}\n\nContinue this same conversation. The voice changed, and you already heard this:\n${clipped}\nRespond to what the person says next. Do not greet them as if you just met.`;
}
