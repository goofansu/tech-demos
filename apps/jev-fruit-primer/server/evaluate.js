import { JEV_MODEL } from "./model.js";

const JEV_URL = "https://api.typesafe.ai/v1/systemone";
const MAX_BODY_BYTES = 512 * 1024;
const SCORE_LEVEL_MIN = 2;
const SCORE_LEVEL_MAX = 10;

const NO_API_KEY_MESSAGE =
  "No API key is set, so this page cannot ask Jev. Add TYPESAFE_API_KEY on the server and reload.";

export function evaluateApi() {
  const attach = (middlewares) => {
    middlewares.use("/api/status", wrap(handleStatus));
    middlewares.use("/api/evaluate", wrap(handleEvaluate));
  };
  return {
    name: "jev-evaluate-api",
    configureServer(server) {
      attach(server.middlewares);
    },
    configurePreviewServer(server) {
      attach(server.middlewares);
    },
  };
}

function apiKey() {
  const key = process.env.TYPESAFE_API_KEY?.trim();
  return key ? key : undefined;
}

function wrap(handler) {
  return (req, res, next) => {
    handler(req, res).catch((err) => {
      if (res.headersSent) return next(err);
      sendJson(res, 500, {
        error: err instanceof Error ? err.message : "Unexpected server error",
      });
    });
  };
}

async function handleStatus(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "Use GET" });
  sendJson(res, 200, { ready: Boolean(apiKey()), model: JEV_MODEL });
}

async function handleEvaluate(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST" });

  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch (err) {
    return sendJson(res, 400, {
      error: err instanceof Error ? err.message : "Invalid JSON body",
    });
  }

  const validation = validateRequest(body);
  if ("error" in validation) return sendJson(res, 422, validation);

  const key = apiKey();
  if (!key) return sendJson(res, 503, { error: NO_API_KEY_MESSAGE });

  const started = performance.now();
  let upstream;
  try {
    upstream = await fetch(JEV_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: JEV_MODEL,
        state: validation.request.state,
        questions: validation.request.questions,
      }),
    });
  } catch (err) {
    return sendJson(res, 502, {
      error: `Could not reach TypeSafe: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  const text = await upstream.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!upstream.ok) {
    return sendJson(res, upstream.status, {
      error: upstreamMessage(upstream.status),
      status: upstream.status,
      detail: data,
    });
  }

  const result = data && typeof data === "object" ? data : {};
  sendJson(res, 200, {
    model: result.model ?? JEV_MODEL,
    answers: result.answers ?? {},
    usage: result.usage,
    latencyMs: Math.round(performance.now() - started),
  });
}

function upstreamMessage(status) {
  switch (status) {
    case 401:
      return "TypeSafe didn't accept the API key. Check the key on the server and try again.";
    case 422:
      return "Jev couldn't read this request. Check the question types and try again.";
    case 429:
      return "Jev is rate-limiting us right now. Wait a moment and try again.";
    case 529:
      return "Jev is busy right now. Wait a moment and try again.";
    default:
      return `Jev returned an unexpected response (${status}).`;
  }
}

export function validateRequest(body) {
  if (!isRecord(body)) return { error: "Body must be a JSON object." };

  const { state, questions } = body;
  if (!isRecord(state) || Object.keys(state).length === 0) {
    return { error: "`state` must be a non-empty object of strings." };
  }
  const cleanState = {};
  for (const [k, v] of Object.entries(state)) {
    if (typeof v !== "string") return { error: `state.${k} must be a string.` };
    cleanState[k] = v;
  }

  if (!isRecord(questions) || Object.keys(questions).length === 0) {
    return { error: "`questions` must contain at least one question." };
  }

  const clean = {};
  for (const [id, q] of Object.entries(questions)) {
    if (!/^[a-z0-9_]+$/i.test(id)) {
      return { error: `Question id "${id}" must be alphanumeric/underscore.` };
    }
    if (!isRecord(q) || typeof q.instructions !== "string" || !q.instructions.trim()) {
      return { error: `Question "${id}" needs instructions.` };
    }
    switch (q.type) {
      case "noul": {
        const c = q.criteria;
        if (c !== undefined) {
          if (!isRecord(c) || typeof c.true !== "string" || typeof c.false !== "string") {
            return { error: `Noul "${id}" criteria must be { true, false } strings.` };
          }
          clean[id] = {
            type: "noul",
            instructions: q.instructions,
            criteria: { true: c.true, false: c.false },
          };
        } else {
          clean[id] = { type: "noul", instructions: q.instructions };
        }
        break;
      }
      case "choice": {
        const c = q.criteria;
        if (!isRecord(c)) return { error: `Choice "${id}" needs criteria options.` };
        const keys = Object.keys(c);
        if (keys.length < 2 || keys.length > 255) {
          return { error: `Choice "${id}" needs 2–255 options.` };
        }
        const criteria = {};
        for (const k of keys) {
          const v = c[k];
          if (v !== null && typeof v !== "string") {
            return { error: `Choice "${id}" option "${k}" must be a string or null.` };
          }
          criteria[k] = v;
        }
        clean[id] = { type: "choice", instructions: q.instructions, criteria };
        break;
      }
      case "score": {
        const c = q.criteria;
        if (!Array.isArray(c) || c.length < SCORE_LEVEL_MIN || c.length > SCORE_LEVEL_MAX) {
          return { error: `Score "${id}" needs ${SCORE_LEVEL_MIN}–${SCORE_LEVEL_MAX} ordered levels.` };
        }
        if (!c.every((l) => typeof l === "string" && l.trim())) {
          return { error: `Score "${id}" levels must be non-empty strings.` };
        }
        clean[id] = { type: "score", instructions: q.instructions, criteria: c };
        break;
      }
      default:
        return { error: `Question "${id}" has unknown type.` };
    }
  }

  return { request: { state: cleanState, questions: clean } };
}

function isRecord(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}
