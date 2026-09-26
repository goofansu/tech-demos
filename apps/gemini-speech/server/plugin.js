import { MODELS } from "../lib/request.js";
import { buildSpeechRequest } from "../lib/request.js";
import {
  apiKey,
  createVoice,
  deleteVoice,
  failMessage,
  getVoice,
  listVoices,
  synthesize,
  synthesizeJoined,
  synthesizeStream,
} from "./gemini.js";

const MAX_BODY = 256 * 1024;
const NO_KEY =
  "No API key is set, so this booth cannot speak. Add GEMINI_API_KEY on the server and reload.";

const GENDERS = new Set(["female", "male", "neutral"]);
const PITCHES = new Set(["low", "medium", "high"]);
const VOICE_TYPES = new Set(["prebuilt", "prompted", "replicated"]);
const LANGUAGE_RE = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/;
const VOICE_ID_RE = /^voice_[A-Za-z0-9_-]{1,128}$/;
const TOKEN_RE = /^[A-Za-z0-9_\-=+/]{1,2048}$/;

export function speechApi() {
  const attach = (middlewares) => {
    middlewares.use("/api", (req, res, next) => {
      handle(req, res).catch((err) => {
        if (res.headersSent) return next(err);
        const status = Number(err?.statusCode) || 500;
        sendJson(res, status, { error: failMessage(err) });
      });
    });
  };
  return {
    name: "gemini-speech-api",
    configureServer(server) {
      attach(server.middlewares);
    },
    configurePreviewServer(server) {
      attach(server.middlewares);
    },
  };
}

async function handle(req, res) {
  const url = new URL(req.url || "/", "http://localhost");
  let path = url.pathname;
  if (path.startsWith("/api/")) path = path.slice(4);
  else if (path === "/api") path = "/";

  if (path === "/status") return status(req, res);
  if (path === "/speak") return speak(req, res);
  if (path === "/voices") return voices(req, res, url);
  if (path.startsWith("/voices/")) return voiceItem(req, res, decodeURIComponent(path.slice("/voices/".length)));
  sendJson(res, 404, { error: "No such route." });
}

function status(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "Use GET." });
  sendJson(res, 200, {
    ready: Boolean(apiKey()),
    models: MODELS.map((model) => model.id),
  });
}

async function speak(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST." });
  const body = await readJson(req);
  const built = buildSpeechRequest(body);
  if (built.error) return sendJson(res, 422, { error: built.error });
  if (!apiKey()) return sendJson(res, 503, { error: NO_KEY });

  if (built.stream) {
    if (built.joinTurns) {
      return sendJson(res, 422, {
        error: "A scene with a designed voice is joined after each turn, so it cannot stream.",
      });
    }
    return streamSpeak(res, built);
  }

  try {
    const take = built.joinTurns ? await synthesizeJoined(built) : await synthesize(built.request);
    sendJson(res, 200, {
      audioBase64: take.base64,
      mimeType: take.mimeType,
      sampleRate: take.sampleRate,
      latencyMs: take.latencyMs,
      usage: take.usage,
      joined: Boolean(take.joined),
      model: built.request.model,
    });
  } catch (err) {
    sendJson(res, 502, { error: failMessage(err) });
  }
}

async function streamSpeak(res, built) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  send("meta", {
    mimeType: "audio/l16",
    sampleRate: 24000,
    model: built.request.model,
  });
  try {
    const result = await synthesizeStream(built.request, (chunk) => {
      send("chunk", chunk);
    });
    send("done", { latencyMs: result.latencyMs, usage: result.usage, model: built.request.model });
  } catch (err) {
    send("error", { error: failMessage(err) });
  }
  res.end();
}

async function voices(req, res, url) {
  if (req.method === "GET") return list(req, res, url);
  if (req.method === "POST") return design(req, res);
  sendJson(res, 405, { error: "Use GET or POST." });
}

async function list(req, res, url) {
  if (!apiKey()) return sendJson(res, 503, { error: NO_KEY });
  const filter = parseVoiceFilter(url);
  if (filter.error) return sendJson(res, 422, { error: filter.error });
  try {
    sendJson(res, 200, await listVoices(filter.query));
  } catch (err) {
    sendJson(res, 502, { error: failMessage(err) });
  }
}

async function design(req, res) {
  const body = await readJson(req);
  const voice = parseDesign(body);
  if (voice.error) return sendJson(res, 422, { error: voice.error });
  if (!apiKey()) return sendJson(res, 503, { error: NO_KEY });
  try {
    sendJson(res, 200, await createVoice(voice));
  } catch (err) {
    sendJson(res, 502, { error: failMessage(err) });
  }
}

async function voiceItem(req, res, id) {
  if (!VOICE_ID_RE.test(id)) return sendJson(res, 422, { error: "That is not a stored voice id." });
  if (!apiKey()) return sendJson(res, 503, { error: NO_KEY });
  try {
    if (req.method === "GET") return sendJson(res, 200, await getVoice(id));
    if (req.method === "DELETE") {
      await deleteVoice(id);
      return sendJson(res, 200, { deleted: id });
    }
    sendJson(res, 405, { error: "Use GET or DELETE." });
  } catch (err) {
    sendJson(res, 502, { error: failMessage(err) });
  }
}

function parseDesign(body) {
  const displayName = String(body?.displayName ?? "").trim();
  const gender = String(body?.gender ?? "").trim();
  const languageCode = String(body?.languageCode ?? "").trim();
  const prompt = String(body?.prompt ?? "").trim();
  const model = String(body?.model ?? "").trim();
  if (!MODELS.some((item) => item.id === model)) return { error: "Choose Flash or Flash-Lite." };
  if (displayName.length < 1 || displayName.length > 60) {
    return { error: "Give the voice a name of up to 60 characters." };
  }
  if (!GENDERS.has(gender)) return { error: "Choose female, male, or neutral." };
  if (!LANGUAGE_RE.test(languageCode)) return { error: "Use a language code such as en-US." };
  if (prompt.length < 12 || prompt.length > 600) {
    return { error: "Describe the voice in one or two sentences." };
  }
  return { displayName, gender, languageCode, prompt, model };
}

function parseVoiceFilter(url) {
  const pageSize = Number(url.searchParams.get("page_size") || "24");
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 48) {
    return { error: "Ask for 1 to 48 voices at a time." };
  }
  const pageToken = url.searchParams.get("page_token") || "";
  if (pageToken && !TOKEN_RE.test(pageToken)) return { error: "That page token is not usable." };
  const search = (url.searchParams.get("search") || "").trim();
  if (search.length > 200) return { error: "Shorten the search." };

  const query = { page_size: pageSize };
  if (pageToken) query.page_token = pageToken;
  if (search) query.search = search;

  const lists = [
    ["language_code", (value) => LANGUAGE_RE.test(value)],
    ["gender", (value) => GENDERS.has(value)],
    ["pitch", (value) => PITCHES.has(value)],
    ["type", (value) => VOICE_TYPES.has(value)],
    ["contexts", (value) => value.length > 0 && value.length <= 40],
    ["accent", (value) => value.length > 0 && value.length <= 40],
  ];
  for (const [key, ok] of lists) {
    const values = url.searchParams.getAll(key).map((value) => value.trim()).filter(Boolean);
    if (values.length > 4) return { error: "Too many filters." };
    if (values.some((value) => !ok(value))) return { error: `Check the ${key} filter.` };
    if (values.length) query[key] = values;
  }
  return { query };
}

async function readJson(req) {
  const text = await readBody(req);
  try {
    return JSON.parse(text || "{}");
  } catch {
    const error = new Error("The request body was not JSON.");
    error.statusCode = 400;
    throw error;
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error("That request is too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
  });
  res.end(payload);
}
