import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin, Connect } from "vite";
import {
  NO_API_KEY_MESSAGE,
  type ApiStatus,
  type EvaluateRequest,
  type EvaluateResponse,
  type JevAnswer,
  type JevQuestion,
} from "../src/lib/types";

const JEV_URL = "https://api.typesafe.ai/v1/systemone";
const JEV_MODEL = "jev-latest";
const MAX_BODY_BYTES = 512 * 1024;

type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

/**
 * Vite plugin exposing `POST /api/evaluate` and `GET /api/status` on the dev
 * and preview servers. `TYPESAFE_API_KEY` is read from `process.env` here and
 * only here; Vite never ships non-`VITE_*` env to the browser.
 */
export function evaluateApi(): Plugin {
  const attach = (middlewares: Connect.Server) => {
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

function apiKey(): string | undefined {
  const key = process.env.TYPESAFE_API_KEY?.trim();
  return key ? key : undefined;
}

function wrap(handler: Handler): Connect.NextHandleFunction {
  return (req, res, next) => {
    handler(req, res).catch((err: unknown) => {
      if (res.headersSent) return next(err);
      sendJson(res, 500, {
        error: err instanceof Error ? err.message : "Unexpected server error",
      });
    });
  };
}

async function handleStatus(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "Use GET" });
  const status: ApiStatus = {
    ready: Boolean(apiKey()),
    model: JEV_MODEL,
  };
  sendJson(res, 200, status);
}

async function handleEvaluate(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST" });

  let body: unknown;
  try {
    body = JSON.parse(await readBody(req));
  } catch (err) {
    return sendJson(res, 400, {
      error: err instanceof Error ? err.message : "Invalid JSON body",
    });
  }

  const validation = validateRequest(body);
  if ("error" in validation) return sendJson(res, 422, validation);
  const request = validation.request;

  const key = apiKey();
  const started = performance.now();

  if (!key) {
    return sendJson(res, 503, { error: NO_API_KEY_MESSAGE });
  }

  let upstream: Response;
  try {
    upstream = await fetch(JEV_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: JEV_MODEL,
        state: request.state,
        questions: request.questions,
      }),
    });
  } catch (err) {
    return sendJson(res, 502, {
      error: `Could not reach TypeSafe: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  const text = await upstream.text();
  let data: unknown = null;
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

  const result = data as {
    model?: string;
    answers?: Record<string, JevAnswer>;
    usage?: EvaluateResponse["usage"];
  };
  const payload: EvaluateResponse = {
    model: result.model ?? JEV_MODEL,
    answers: result.answers ?? {},
    usage: result.usage,
    latencyMs: Math.round(performance.now() - started),
  };
  sendJson(res, 200, payload);
}

function upstreamMessage(status: number): string {
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

// ---- validation -------------------------------------------------------------

type Validation = { request: EvaluateRequest } | { error: string };

function validateRequest(body: unknown): Validation {
  if (!isRecord(body)) return { error: "Body must be a JSON object." };

  const { state, questions } = body;
  if (!isRecord(state) || Object.keys(state).length === 0) {
    return { error: "`state` must be a non-empty object of strings." };
  }
  const cleanState: Record<string, string> = {};
  for (const [k, v] of Object.entries(state)) {
    if (typeof v !== "string") return { error: `state.${k} must be a string.` };
    cleanState[k] = v;
  }

  if (!isRecord(questions) || Object.keys(questions).length === 0) {
    return { error: "`questions` must contain at least one question." };
  }

  const clean: Record<string, JevQuestion> = {};
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
        const criteria: Record<string, string | null> = {};
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
        if (!Array.isArray(c) || c.length < 2 || c.length > 10) {
          return { error: `Score "${id}" needs 2–10 ordered levels.` };
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

// ---- http helpers -----------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
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

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}
