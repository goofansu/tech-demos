export function explainError(err, secret) {
  const raw = err instanceof Error ? err.message : String(err ?? "Request failed");
  const redact = (value) => (secret && value.includes(secret) ? value.split(secret).join("[key]") : value);
  const message = jsonMessage(raw);
  if (message) return redact(message).slice(0, 500);
  const trimmed = raw.trim();
  return redact(trimmed).slice(0, 500) || "The live request failed.";
}

function jsonMessage(raw) {
  const start = raw.indexOf("{");
  if (start < 0) return "";
  const slice = raw.slice(start);
  const end = slice.lastIndexOf("}");
  const candidates = end > 0 ? [slice.slice(0, end + 1), slice] : [slice];
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
