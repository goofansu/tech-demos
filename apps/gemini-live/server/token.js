import { GoogleGenAI } from "@google/genai";
import { buildSessionRequest } from "../lib/config.js";
import { explainError } from "../lib/errors.js";

export function apiKey() {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key || "";
}

export async function createSessionToken(input) {
  const built = buildSessionRequest(input);
  if (built.error) {
    const error = new Error(built.error);
    error.statusCode = 422;
    throw error;
  }
  const key = apiKey();
  if (!key) {
    const error = new Error("No API key is set. Add GEMINI_API_KEY on the server and reload.");
    error.statusCode = 503;
    throw error;
  }

  const client = new GoogleGenAI({ apiKey: key });
  let token;
  try {
    token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: built.model,
          config: built.config,
        },
      },
    });
  } catch (err) {
    const error = new Error(explainError(err, key));
    error.statusCode = 502;
    throw error;
  }
  if (!token?.name) {
    const error = new Error("The token service did not return a token.");
    error.statusCode = 502;
    throw error;
  }

  return {
    token: token.name,
    model: built.model,
    config: built.config,
    scheduling: built.scheduling,
    behavior: built.behavior,
    thinkingLevel: built.thinkingLevel,
    voice: built.voice,
    apiVersion: "v1alpha",
  };
}
