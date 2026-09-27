import { MODELS } from "../lib/catalog.js";
import { explainError } from "../lib/errors.js";
import { apiKey, createSessionToken } from "./token.js";

const MAX_BODY = 64 * 1024;

export function liveApi() {
  const attach = (middlewares) => {
    middlewares.use("/api", (req, res, next) => {
      handle(req, res).catch((err) => {
        if (res.headersSent) return next(err);
        const status = Number(err?.statusCode) || 500;
        sendJson(res, status, { error: explainError(err, apiKey()) });
      });
    });
  };
  return {
    name: "gemini-live-api",
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
  const path = url.pathname.replace(/^\/api/, "") || "/";
  if (path === "/status") return status(req, res);
  if (path === "/session") return session(req, res);
  sendJson(res, 404, { error: "No such route." });
}

function status(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "Use GET." });
  sendJson(res, 200, {
    ready: Boolean(apiKey()),
    models: MODELS.map((model) => model.id),
  });
}

async function session(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST." });
  const body = await readJson(req);
  const created = await createSessionToken(body);
  sendJson(res, 200, created);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error("That request is too large."), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(Object.assign(new Error("Send a JSON body."), { statusCode: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}
