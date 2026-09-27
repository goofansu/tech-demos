export function formatPriorTalk(turns) {
  const lines = [];
  for (const turn of turns || []) {
    const text = String(turn.text || "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (turn.role === "user") lines.push(`Person: ${text}`);
    else if (turn.role === "model") lines.push(`Voice: ${text}`);
  }
  const joined = lines.join("\n");
  if (!joined) return "";
  return joined.length > 6000 ? joined.slice(joined.length - 6000) : joined;
}
