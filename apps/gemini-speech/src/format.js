import { buildSpeechRequest } from "../lib/request.js";

export function modelLabel(id) {
  if (!id) return "";
  if (id.includes("lite")) return "Flash-Lite";
  return "Flash";
}

export function describeTake({ mimeType, sampleRate, latencyMs, usage, model }) {
  const parts = [];
  if (model) parts.push(modelLabel(model));
  if (mimeType) parts.push(formatLabel(mimeType, sampleRate));
  if (latencyMs != null) parts.push(`${(latencyMs / 1000).toFixed(1)}s`);
  if (usage?.inputTokens != null || usage?.outputTokens != null) {
    parts.push(`${usage.inputTokens ?? "–"} in / ${usage.outputTokens ?? "–"} out`);
  }
  return parts.join(" · ");
}

export function previewRequest(input) {
  const built = buildSpeechRequest(input);
  if (built.error) return built.error;
  const shown = built.stream ? { ...built.request, stream: true } : built.request;
  const json = JSON.stringify(shown, null, 2);
  if (!built.joinTurns) return json;
  return `${json}\n\nA designed voice cannot share a two-speaker request. Each turn is spoken alone, then the audio is joined.`;
}

function formatLabel(mimeType, sampleRate) {
  const mime = mimeType.toLowerCase();
  const rate = sampleRate ? `${Math.round(sampleRate / 1000)} kHz` : "";
  if (mime.includes("wav")) return `WAV ${rate}`.trim();
  if (mime.includes("mulaw")) return `μ-law ${rate}`.trim();
  if (mime.includes("alaw")) return `A-law ${rate}`.trim();
  if (mime.includes("l16") || mime.includes("pcm")) return `PCM ${rate}`.trim();
  return mimeType;
}

export function insertTag(textarea, tag) {
  const snippet = `<${tag}>`;
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  const lead = before && !/\s$/.test(before) ? " " : "";
  const trail = after.startsWith(" ") ? "" : " ";
  textarea.value = `${before}${lead}${snippet}${trail}${after}`;
  const cursor = before.length + lead.length + snippet.length + trail.length;
  textarea.focus();
  textarea.setSelectionRange(cursor, cursor);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

export function button(className, label) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = className;
  el.textContent = label;
  return el;
}

export function setActionPending(control, pending) {
  control.disabled = pending;
  control.setAttribute("aria-busy", pending ? "true" : "false");
}

export function field(tag, className) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}
