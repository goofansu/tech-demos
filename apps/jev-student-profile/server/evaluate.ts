import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin, Connect } from "vite";
import type {
  ApiStatus,
  EvaluateRequest,
  EvaluateResponse,
  JevAnswer,
  JevQuestion,
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
    mode: apiKey() ? "live" : "mock",
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
    const answers = mockAnswers(request);
    const payload: EvaluateResponse = {
      model: "mock (no TYPESAFE_API_KEY)",
      answers,
      usage: { input_tokens: 0, output_tokens: 0 },
      mock: true,
      latencyMs: Math.round(performance.now() - started),
    };
    return sendJson(res, 200, payload);
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
    mock: false,
    latencyMs: Math.round(performance.now() - started),
  };
  sendJson(res, 200, payload);
}

function upstreamMessage(status: number): string {
  switch (status) {
    case 401:
      return "TypeSafe rejected the API key (401). Check TYPESAFE_API_KEY.";
    case 422:
      return "TypeSafe rejected the request body (422). See detail.";
    case 429:
      return "TypeSafe rate limit hit (429). Retry shortly.";
    case 529:
      return "TypeSafe is overloaded (529). Retry shortly.";
    default:
      return `TypeSafe returned HTTP ${status}.`;
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

// ---- mock mode --------------------------------------------------------------

/**
 * Deterministic stand-in answers so the UI is fully explorable without a key.
 * Shapes match Jev exactly; values come from a hash of the state and ids.
 */
function mockAnswers(request: EvaluateRequest): Record<string, JevAnswer> {
  const stateText = Object.entries(request.state)
    .map(([k, v]) => `${k}:${v}`)
    .join("\n");
  const answers: Record<string, JevAnswer> = {};

  for (const [id, q] of Object.entries(request.questions)) {
    const rng = seeded(`${id}::${stateText}`);
    switch (q.type) {
      case "noul": {
        answers[id] = { type: "noul", noul: round(skew(rng())) };
        break;
      }
      case "choice": {
        const keys = Object.keys(q.criteria);
        const probs = peakedDistribution(keys.length, rng);
        const probabilities: Record<string, number> = {};
        keys.forEach((k, i) => (probabilities[k] = probs[i]));
        const top = keys.reduce((a, b) => (probabilities[a] >= probabilities[b] ? a : b));
        answers[id] = {
          type: "choice",
          choice: top,
          confidence: confidenceOf(probs),
          probabilities,
        };
        break;
      }
      case "score": {
        const probs = peakedDistribution(q.criteria.length, rng);
        const probabilities: Record<string, number> = {};
        const legend: Record<string, string> = {};
        let score = 0;
        q.criteria.forEach((label, i) => {
          probabilities[String(i)] = probs[i];
          legend[String(i)] = label;
          score += i * probs[i];
        });
        answers[id] = {
          type: "score",
          score: round(score),
          confidence: confidenceOf(probs),
          legend,
          probabilities,
        };
        break;
      }
    }
  }
  return answers;
}

function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Push uniform values toward the ends so mock nouls look decisive. */
function skew(u: number): number {
  const centered = u * 2 - 1;
  return (Math.sign(centered) * Math.pow(Math.abs(centered), 0.6) + 1) / 2;
}

function peakedDistribution(n: number, rng: () => number): number[] {
  const peak = Math.floor(rng() * n);
  const sharpness = 1.2 + rng() * 2.5;
  const raw = Array.from({ length: n }, (_, i) =>
    Math.exp(-sharpness * Math.abs(i - peak)) * (0.6 + rng() * 0.8),
  );
  const sum = raw.reduce((a, b) => a + b, 0);
  const probs = raw.map((v) => round(v / sum));
  const drift = round(1 - probs.reduce((a, b) => a + b, 0));
  probs[peak] = round(probs[peak] + drift);
  return probs;
}

function confidenceOf(probs: number[]): number {
  const sorted = probs.toSorted((a, b) => b - a);
  return round(sorted[0] - (sorted[1] ?? 0));
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
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
