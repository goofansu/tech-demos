import { GoogleGenAI } from "@google/genai";
import { interpret } from "../lib/messages.js";
import { runTool } from "../lib/tools.js";

export function createLiveClient({ onEvent, onSocket }) {
  let session = null;
  let generation = 0;
  let scheduling = null;
  const cancelled = new Set();

  async function connect(payload) {
    const gen = ++generation;
    await closeSocket();
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Could not open a session.");
    if (gen !== generation) return null;

    scheduling = body.scheduling || null;
    const ai = new GoogleGenAI({
      apiKey: body.token,
      httpOptions: { apiVersion: body.apiVersion || "v1alpha" },
    });
    session = await ai.live.connect({
      model: body.model,
      config: body.config,
      callbacks: {
        onopen: () => {
          if (gen === generation) onSocket?.({ type: "open" });
        },
        onmessage: (message) => {
          if (gen !== generation) return;
          for (const event of interpret(message)) {
            if (event.type === "tool-cancel") {
              for (const id of event.ids) cancelled.add(id);
            }
            onEvent?.(event);
          }
          const calls = message.toolCall?.functionCalls;
          if (calls?.length) void fulfill(calls, gen);
        },
        onerror: (event) => {
          if (gen !== generation) return;
          onSocket?.({
            type: "error",
            message: event?.message || "The live socket reported an error.",
          });
        },
        onclose: (event) => {
          if (gen !== generation) return;
          session = null;
          onSocket?.({
            type: "close",
            code: event?.code ?? 0,
            reason: event?.reason || "",
          });
        },
      },
    });
    if (gen !== generation) {
      await closeSocket();
      return null;
    }
    return body;
  }

  async function fulfill(calls, gen) {
    await Promise.all(calls.map(async (call) => {
      const id = call.id || `${call.name || "tool"}-${Date.now()}`;
      const started = performance.now();
      onEvent?.({ type: "tool-start", id, name: call.name || "", args: call.args || {} });
      let result;
      try {
        result = await runTool(call.name, call.args || {});
      } catch (err) {
        result = { error: err instanceof Error ? err.message : "The tool failed." };
      }
      const latencyMs = Math.round(performance.now() - started);
      if (gen !== generation) return;
      if (cancelled.has(id) || !session) {
        onEvent?.({ type: "tool-end", id, name: call.name || "", cancelled: true, latencyMs });
        return;
      }
      const functionResponse = {
        id: call.id,
        name: call.name,
        response: result,
      };
      if (scheduling) functionResponse.scheduling = scheduling;
      try {
        session.sendToolResponse({ functionResponses: [functionResponse] });
      } catch (err) {
        onSocket?.({
          type: "error",
          message: err instanceof Error ? err.message : "Could not return the tool result.",
        });
      }
      onEvent?.({ type: "tool-end", id, name: call.name || "", result, latencyMs });
    }));
  }

  function requireSession() {
    if (!session) throw new Error("Tap a question or Start talking first.");
    return session;
  }

  return {
    connect,
    setScheduling(value) {
      scheduling = value || null;
    },
    sendText(text) {
      requireSession().sendClientContent({
        turns: [{ role: "user", parts: [{ text }] }],
        turnComplete: true,
      });
    },
    sendFrame(data) {
      requireSession().sendRealtimeInput({
        video: { data, mimeType: "image/jpeg" },
      });
    },
    sendAudio(data) {
      requireSession().sendRealtimeInput({
        audio: { data, mimeType: "audio/pcm;rate=16000" },
      });
    },
    endAudio() {
      session?.sendRealtimeInput({ audioStreamEnd: true });
    },
    async end() {
      generation += 1;
      await closeSocket();
    },
    get connected() {
      return Boolean(session);
    },
  };

  async function closeSocket() {
    const current = session;
    session = null;
    if (!current) return;
    try {
      current.close();
    } catch {
      /* The socket is already gone. */
    }
  }
}
