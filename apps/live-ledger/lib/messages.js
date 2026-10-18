import { base64Bytes } from "./pcm.js";

export function interpret(message) {
  const events = [];
  if (!message || typeof message !== "object") return events;
  const content = message.serverContent;

  if (message.setupComplete) {
    events.push({ type: "setup", sessionId: message.setupComplete.sessionId || "" });
  }
  if (message.sessionResumptionUpdate) {
    events.push({
      type: "resume",
      handle: message.sessionResumptionUpdate.newHandle || "",
      resumable: Boolean(message.sessionResumptionUpdate.resumable),
    });
  }
  if (message.goAway) {
    events.push({ type: "goaway", timeLeft: message.goAway.timeLeft || "" });
  }
  if (message.usageMetadata) {
    events.push({
      type: "usage",
      total: message.usageMetadata.totalTokenCount ?? null,
    });
  }
  if (content?.interimInputTranscription?.text) {
    events.push({ type: "input-text", text: content.interimInputTranscription.text, final: false });
  }
  if (content?.inputTranscription?.text) {
    events.push({ type: "input-text", text: content.inputTranscription.text, final: true });
  }
  if (content?.outputTranscription?.text) {
    events.push({ type: "output-text", text: content.outputTranscription.text });
  }
  for (const part of content?.modelTurn?.parts || []) {
    const data = part.inlineData?.data;
    const mime = part.inlineData?.mimeType || "";
    if (typeof data === "string" && mime.startsWith("audio/")) {
      events.push({ type: "audio", data, bytes: base64Bytes(data), mime });
    }
  }
  if (content?.interrupted) events.push({ type: "interrupted" });
  if (content?.generationComplete) events.push({ type: "generation-complete" });
  if (content?.turnComplete) {
    events.push({ type: "turn-complete", status: content.interactionStatus || "" });
  } else if (content?.interactionStatus) {
    events.push({ type: "status", status: content.interactionStatus });
  }
  if (message.toolCall?.functionCalls?.length) {
    events.push({
      type: "tool-call",
      calls: message.toolCall.functionCalls.map((call) => ({
        id: call.id || "",
        name: call.name || "",
        args: call.args || {},
      })),
    });
  }
  if (message.toolCallCancellation?.ids?.length) {
    events.push({ type: "tool-cancel", ids: message.toolCallCancellation.ids });
  }
  return events;
}

export function appendTranscript(previous, chunk) {
  if (!chunk) return previous || "";
  if (!previous) return chunk;
  if (chunk.startsWith(previous)) return chunk;
  if (previous.endsWith(chunk)) return previous;
  return previous + chunk;
}

export function derivePhase({ connected, connecting, playing, serverStatus, toolsInFlight }) {
  if (connecting) return { phase: "connecting", working: false };
  if (!connected) return { phase: "idle", working: false };
  const working = serverStatus === "IN_PROGRESS" || toolsInFlight > 0;
  if (playing) return { phase: "speaking", working };
  if (working) return { phase: "working", working: true };
  return { phase: "listening", working: false };
}

export function phaseLabel(view) {
  if (view.phase === "speaking" && view.working) return "Speaking, still writing";
  if (view.phase === "connecting") return "Starting…";
  if (view.phase === "listening") return "Listening";
  if (view.phase === "speaking") return "Speaking";
  if (view.phase === "working") return "Checking the book";
  return "Not connected";
}
