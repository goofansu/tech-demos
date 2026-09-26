export async function getStatus() {
  const res = await fetch("/api/status");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Status check failed.");
  return data;
}

export async function speak(body, handlers = {}) {
  const res = await fetch("/api/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: handlers.signal,
  });
  const type = res.headers.get("content-type") || "";
  if (type.includes("text/event-stream")) {
    if (!res.ok) throw new Error(`Speech failed (${res.status}).`);
    return { streamed: true, ...(await readSse(res, handlers)) };
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Speech failed (${res.status}).`);
  return data;
}

export function listVoices(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) query.append(key, item);
    } else if (value) {
      query.set(key, value);
    }
  }
  return requestJson(`/api/voices?${query}`);
}

export function createVoice(body, signal) {
  return requestJson("/api/voices", { method: "POST", body, signal });
}

export function fetchVoice(id, signal) {
  return requestJson(`/api/voices/${encodeURIComponent(id)}`, { signal });
}

export function removeVoice(id) {
  return requestJson(`/api/voices/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function elapsed(onTick) {
  const start = performance.now();
  const id = setInterval(() => onTick((performance.now() - start) / 1000), 200);
  return () => clearInterval(id);
}

async function requestJson(url, { method = "GET", body, signal } = {}) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status}).`);
  return data;
}

async function readSse(res, handlers) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let donePayload = {};
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let split = buffer.indexOf("\n\n");
    while (split !== -1) {
      const raw = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);
      const event = parseEvent(raw);
      if (event.name === "meta") handlers.onMeta?.(event.data);
      if (event.name === "chunk") handlers.onChunk?.(event.data);
      if (event.name === "done") {
        donePayload = event.data;
        handlers.onDone?.(event.data);
      }
      if (event.name === "error") throw new Error(event.data.error || "The stream failed.");
      split = buffer.indexOf("\n\n");
    }
  }
  return donePayload;
}

function parseEvent(raw) {
  let name = "message";
  const dataLines = [];
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) name = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  let data = {};
  if (dataLines.length) {
    try {
      data = JSON.parse(dataLines.join("\n"));
    } catch {
      data = {};
    }
  }
  return { name, data };
}
