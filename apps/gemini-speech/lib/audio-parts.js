export function toBase64(data) {
  if (typeof data === "string") return data;
  if (data == null) return "";
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  return Buffer.from(bytes).toString("base64");
}

export function fromBase64(value) {
  return new Uint8Array(Buffer.from(value, "base64"));
}

export function audioFromInteraction(interaction) {
  const direct = interaction?.output_audio;
  if (direct?.data) {
    return {
      base64: toBase64(direct.data),
      mimeType: direct.mime_type || "",
      sampleRate: direct.sample_rate || 0,
    };
  }
  const steps = interaction?.steps || [];
  for (let i = steps.length - 1; i >= 0; i--) {
    const content = steps[i]?.content || [];
    for (let j = content.length - 1; j >= 0; j--) {
      const part = content[j];
      if (part?.type === "audio" && part.data) {
        return {
          base64: toBase64(part.data),
          mimeType: part.mime_type || "",
          sampleRate: part.sample_rate || 0,
        };
      }
    }
  }
  return null;
}

export function explainError(err, secret) {
  const raw = err instanceof Error ? err.message : String(err ?? "Request failed");
  const redact = (value) =>
    secret && value.includes(secret) ? value.split(secret).join("[key]") : value;
  const message = jsonMessage(raw);
  if (message) return redact(message);
  return redact(raw.trim()) || "The speech request failed.";
}

function jsonMessage(raw) {
  const start = raw.indexOf("{");
  if (start < 0) return "";
  const slice = raw.slice(start);
  const candidates = [slice];
  const end = slice.lastIndexOf("}");
  if (end > 0) candidates.push(slice.slice(0, end + 1));
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      const message = parsed?.error?.message || parsed?.message;
      if (typeof message === "string" && message.trim()) return message.trim();
    } catch {
      /* Try the next slice. */
    }
  }
  return "";
}

export function slimUsage(usage) {
  if (!usage) return undefined;
  const input = usage.total_input_tokens;
  const output = usage.total_output_tokens;
  if (input == null && output == null) return undefined;
  return { inputTokens: input ?? null, outputTokens: output ?? null };
}
