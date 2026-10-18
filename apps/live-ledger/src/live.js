import { GoogleGenAI } from "@google/genai";
import { dispatchAll } from "../lib/ledger.js";
import { interpret } from "../lib/messages.js";

export function createLiveClient({ onEvent, onSocket, readBook, writeBook, writePending, context }) {
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
          if (calls?.length) fulfill(calls, gen);
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

  function fulfill(calls, gen) {
    const tagged = calls.map((call, index) => ({
      call,
      id: call.id || `call-${index}-${call.name || "tool"}`,
      skipped: Boolean(call.id && cancelled.has(call.id)),
    }));
    for (const item of tagged) {
      onEvent?.({ type: "tool-start", id: item.id, name: item.call.name || "", args: item.call.args || {} });
    }
    const pending = tagged.filter((item) => !item.skipped);
    const outcome = dispatchAll(readBook(), pending.map((item) => item.call), context());
    if (gen !== generation || !session) {
      for (const item of tagged) {
        onEvent?.({ type: "tool-end", id: item.id, name: item.call.name || "", cancelled: true });
      }
      return;
    }
    writeBook(outcome.book);
    writePending?.(outcome.pending ?? null);
    const responses = [];
    pending.forEach((item, index) => {
      const result = outcome.results[index]?.result || { ok: false, error: "The book did not answer." };
      const functionResponse = {
        id: item.call.id,
        name: item.call.name,
        response: result,
      };
      if (scheduling) functionResponse.scheduling = scheduling;
      responses.push(functionResponse);
      onEvent?.({ type: "tool-end", id: item.id, name: item.call.name || "", result });
    });
    for (const item of tagged) {
      if (!item.skipped) continue;
      onEvent?.({ type: "tool-end", id: item.id, name: item.call.name || "", cancelled: true });
    }
    if (!responses.length) return;
    try {
      session.sendToolResponse({ functionResponses: responses });
    } catch (err) {
      onSocket?.({
        type: "error",
        message: err instanceof Error ? err.message : "Could not return the book.",
      });
    }
  }

  function requireSession() {
    if (!session) throw new Error("Tap Listen first.");
    return session;
  }

  return {
    connect,
    sendText(text) {
      requireSession().sendClientContent({
        turns: [{ role: "user", parts: [{ text }] }],
        turnComplete: true,
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
