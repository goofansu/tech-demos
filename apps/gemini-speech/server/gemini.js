import { GoogleGenAI } from "@google/genai";
import { audioFromInteraction, explainError, fromBase64, slimUsage, toBase64 } from "../lib/audio-parts.js";
import { buildJoinRequests } from "../lib/request.js";
import { concatBytes, pcm16ToWav, pcmFromWavOrRaw } from "../lib/wav.js";

const CALL = { timeout: 180000, timeout_ms: 180000 };

let client;

export function apiKey() {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key || undefined;
}

function ai() {
  const key = apiKey();
  if (!key) return null;
  if (!client) client = new GoogleGenAI({ apiKey: key });
  return client;
}

export function failMessage(err) {
  return explainError(err, apiKey());
}

export async function synthesize(request) {
  const genai = ai();
  if (!genai) throw new Error("GEMINI_API_KEY is not set.");
  const started = performance.now();
  const interaction = await genai.interactions.create(request, CALL);
  const audio = audioFromInteraction(interaction);
  if (!audio?.base64) throw new Error("The model returned no audio.");
  return {
    ...audio,
    mimeType: audio.mimeType || request.response_format.mime_type,
    sampleRate: audio.sampleRate || request.response_format.sample_rate,
    latencyMs: Math.round(performance.now() - started),
    usage: slimUsage(interaction.usage),
  };
}

export async function synthesizeStream(request, onChunk) {
  const genai = ai();
  if (!genai) throw new Error("GEMINI_API_KEY is not set.");
  const started = performance.now();
  const stream = await genai.interactions.create({ ...request, stream: true }, CALL);
  let usage;
  for await (const event of stream) {
    if (event.event_type === "error") {
      throw new Error(event.error?.message || "The stream failed.");
    }
    if (event.event_type === "step.delta" && event.delta?.type === "audio" && event.delta.data) {
      onChunk({
        base64: toBase64(event.delta.data),
        mimeType: event.delta.mime_type || "audio/l16",
        sampleRate: event.delta.sample_rate || request.response_format.sample_rate || 24000,
      });
    }
    if (event.event_type === "interaction.completed") {
      usage = slimUsage(event.interaction?.usage) || usage;
    }
    if (event.metadata?.total_usage) usage = slimUsage(event.metadata.total_usage);
  }
  return { latencyMs: Math.round(performance.now() - started), usage };
}

/** Record each turn alone, then join the PCM. Designed voices cannot share one scene request. */
export async function synthesizeJoined(built) {
  const pieces = buildJoinRequests(built);
  const frames = [];
  let latencyMs = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let sawUsage = false;
  for (const piece of pieces) {
    if (piece.error) throw new Error(piece.error);
    const take = await synthesize(piece.request);
    latencyMs += take.latencyMs;
    if (take.usage) {
      sawUsage = true;
      inputTokens += take.usage.inputTokens || 0;
      outputTokens += take.usage.outputTokens || 0;
    }
    const bytes = fromBase64(take.base64);
    const pcm =
      take.mimeType === "audio/wav" || String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF"
        ? pcmFromWavOrRaw(bytes)
        : bytes;
    frames.push(pcm);
  }
  const wav = pcm16ToWav(concatBytes(frames), 24000);
  return {
    base64: Buffer.from(wav).toString("base64"),
    mimeType: "audio/wav",
    sampleRate: 24000,
    latencyMs,
    usage: sawUsage ? { inputTokens, outputTokens } : undefined,
    joined: true,
  };
}

export async function createVoice(voice) {
  const genai = ai();
  if (!genai) throw new Error("GEMINI_API_KEY is not set.");
  const created = await genai.voices.create(
    {
      store: true,
      voice: {
        // Prompted design rejects Flash-Lite. Flash creates the persona; either TTS model can speak it.
        model: "gemini-3.8-flash-tts",
        type: "prompted",
        display_name: voice.displayName,
        gender: voice.gender,
        language_code: voice.languageCode,
        prompted: { input: voice.prompt },
      },
    },
    CALL,
  );
  return slimVoice(created, { withSample: true });
}

export async function listVoices(filter) {
  const genai = ai();
  if (!genai) throw new Error("GEMINI_API_KEY is not set.");
  const response = await genai.voices.list(filter, CALL);
  if (Array.isArray(response?.voices)) {
    return {
      voices: response.voices.map((voice) => slimVoice(voice)),
      nextPageToken: response.next_page_token || "",
    };
  }
  const voices = [];
  if (response && typeof response[Symbol.asyncIterator] === "function") {
    for await (const voice of response) voices.push(slimVoice(voice));
  }
  return { voices, nextPageToken: "" };
}

export async function getVoice(id) {
  const genai = ai();
  if (!genai) throw new Error("GEMINI_API_KEY is not set.");
  return slimVoice(await genai.voices.get(id, undefined, CALL), { withSample: true });
}

export async function deleteVoice(id) {
  const genai = ai();
  if (!genai) throw new Error("GEMINI_API_KEY is not set.");
  await genai.voices.delete(id, undefined, CALL);
}

function slimVoice(voice, { withSample = false } = {}) {
  const sample = withSample ? voice.sample_audio : undefined;
  return {
    id: voice.id || voice.key || "",
    name: voice.display_name || voice.id || "",
    description: voice.description || voice.prompted?.input || "",
    language: voice.language_code || "",
    accent: voice.accent || "",
    gender: voice.gender || "",
    pitch: voice.pitch || "",
    persona: voice.persona || "",
    context: voice.context || "",
    type: voice.type || "",
    sampleBase64: sample?.data ? toBase64(sample.data) : "",
    sampleMimeType: sample?.mime_type || "",
  };
}
