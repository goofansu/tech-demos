import {
  BEHAVIORS,
  MODELS,
  SCENES,
  SCHEDULES,
  THINKING_LEVELS,
  VOICES,
  modelById,
} from "../lib/catalog.js";
import {
  appendTranscript,
  derivePhase,
  formatWire,
  noteWire,
  phaseLabel,
} from "../lib/messages.js";
import { TOOLS } from "../lib/tools.js";
import {
  audioContext,
  createPlayback,
  jpegFromFile,
  jpegFromVideo,
  openCamera,
  startMicrophone,
} from "./audio.js";
import { createLiveClient } from "./live.js";

const $ = (id) => document.getElementById(id);

const state = {
  ready: false,
  connecting: false,
  connected: false,
  model: MODELS[0].id,
  thinkingLevel: "medium",
  voice: "Kore",
  tools: true,
  search: false,
  behavior: "NON_BLOCKING",
  scheduling: "WHEN_IDLE",
  withFrame: false,
  streamFrames: false,
  playing: false,
  serverStatus: "",
  toolsInFlight: 0,
  turns: [],
  wire: [],
  usage: null,
  resumeHandle: "",
  sceneId: "",
  resumable: false,
  banner: "",
  bannerTone: "error",
  sessionLabel: "",
  mic: false,
  camera: false,
};

let playback;
let micHandle;
let cameraStream;
let frameTimer = 0;
let latestFrame = "";
let stillUrl = "";
let turnSeq = 0;

const client = createLiveClient({
  onEvent: handleEvent,
  onSocket: handleSocket,
});

let statusPromise = Promise.resolve();

mount();
statusPromise = loadStatus();

function mount() {
  const models = $("models");
  for (const model of MODELS) {
    const label = document.createElement("label");
    label.className = `plate plate-${model.thinking ? "think" : "live"}`;
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "model";
    input.value = model.id;
    input.checked = model.id === state.model;
    input.addEventListener("change", () => {
      if (!input.checked) return;
      state.model = model.id;
      renderChrome();
    });
    label.append(input, text("span", "plate-kicker", model.kicker), text("span", "plate-name", model.label), text("span", "plate-id", model.id), text("span", "plate-copy", model.copy));
    models.append(label);
  }

  const thinking = $("thinking");
  for (const level of THINKING_LEVELS) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "thinking";
    input.value = level.id;
    input.checked = level.id === state.thinkingLevel;
    input.addEventListener("change", () => {
      if (input.checked) state.thinkingLevel = level.id;
    });
    label.append(input, document.createTextNode(level.label));
    thinking.append(label);
  }

  fillSelect($("voice"), VOICES.map((voice) => ({ id: voice.id, label: `${voice.id} · ${voice.hint}` })));
  fillSelect($("behavior"), BEHAVIORS);
  fillSelect($("scheduling"), SCHEDULES);
  $("voice").value = state.voice;
  $("behavior").value = state.behavior;
  $("scheduling").value = state.scheduling;
  $("voice").addEventListener("change", () => {
    state.voice = $("voice").value;
  });
  $("behavior").addEventListener("change", () => {
    state.behavior = $("behavior").value;
    renderChrome();
  });
  $("scheduling").addEventListener("change", () => {
    state.scheduling = $("scheduling").value;
    if (state.connected && !modelById(state.model).thinking && state.behavior === "NON_BLOCKING") {
      client.setScheduling(state.scheduling);
    }
    renderChrome();
  });

  const scenes = $("scenes");
  for (const scene of SCENES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "scene";
    button.dataset.scene = scene.id;
    button.append(text("strong", "", scene.title), text("small", "", scene.detail));
    button.addEventListener("click", () => void runScene(scene));
    scenes.append(button);
  }

  $("tools").addEventListener("change", () => {
    state.tools = $("tools").checked;
  });
  $("search").addEventListener("change", () => {
    state.search = $("search").checked;
  });
  $("stream-frames").addEventListener("change", () => {
    state.streamFrames = $("stream-frames").checked;
    syncFrames();
  });
  $("session").addEventListener("click", () => void toggleSession());
  $("resume").addEventListener("click", () => void resumeSession());
  $("mic").addEventListener("click", () => void toggleMic());
  $("quiet").addEventListener("click", () => quiet());
  $("camera-toggle").addEventListener("click", () => void toggleCamera());
  $("file").addEventListener("change", () => {
    const file = $("file").files?.[0];
    if (file) void chooseStill(file);
  });
  const preview = $("photo");
  preview.addEventListener("dragover", (event) => {
    event.preventDefault();
    preview.classList.add("drag");
  });
  preview.addEventListener("dragleave", () => preview.classList.remove("drag"));
  preview.addEventListener("drop", (event) => {
    event.preventDefault();
    preview.classList.remove("drag");
    const file = event.dataTransfer?.files?.[0];
    if (file) void chooseStill(file);
  });

  renderChrome();
  renderConversation();
}

async function loadStatus() {
  try {
    const response = await fetch("/api/status");
    const body = await response.json();
    state.ready = Boolean(body.ready);
  } catch {
    state.ready = false;
  }
  $("key-status").textContent = state.ready ? "Ready to talk" : "Add an API key on the server";
  renderChrome();
}

function settings() {
  return {
    model: state.model,
    thinkingLevel: state.thinkingLevel,
    voice: state.voice,
    tools: state.tools,
    search: state.search,
    behavior: state.behavior,
    scheduling: state.scheduling,
  };
}

async function toggleSession() {
  if (state.connected || state.connecting) await endSession("Ended");
}

async function resumeSession() {
  if (!state.resumeHandle) return;
  if (state.connected) await endSession("");
  await openSession({ resume: true });
}

async function openSession({ resume = false } = {}) {
  if (state.connecting) return false;
  if (!state.ready) {
    await statusPromise;
  }
  if (!state.ready) {
    setBanner("Add GEMINI_API_KEY on the server and reload.");
    renderChrome();
    return false;
  }
  ensurePlayback();
  state.connecting = true;
  clearBanner();
  renderChrome();
  try {
    const body = await client.connect({
      ...settings(),
      resumeHandle: resume ? state.resumeHandle : undefined,
    });
    if (!body) {
      state.connecting = false;
      renderChrome();
      return false;
    }
    state.connected = true;
    state.connecting = false;
    state.serverStatus = "";
    state.sessionLabel = describeSession(body);
    client.setScheduling(body.scheduling);
    log({ type: "note", detail: state.sessionLabel });
    syncFrames();
    renderChrome();
    renderConversation();
    return true;
  } catch (err) {
    state.connecting = false;
    state.connected = false;
    setBanner(err instanceof Error ? err.message : "Could not open a session.");
    renderChrome();
    return false;
  }
}

async function endSession(detail) {
  await client.end();
  state.connected = false;
  state.connecting = false;
  state.serverStatus = "";
  state.toolsInFlight = 0;
  state.playing = false;
  stopMic();
  stopFrames();
  playback?.stop();
  if (detail) log({ type: "note", detail });
  renderChrome();
  renderConversation();
}

let sceneChain = Promise.resolve();

function runScene(scene) {
  const job = sceneChain.then(() => startScene(scene));
  sceneChain = job.then(() => {}, () => {});
  return job;
}

async function startScene(scene) {
  if (scene.frame) {
    capturePreview();
    if (!latestFrame) {
      revealCamera();
      setBanner("Turn the camera on or choose a photo, then tap Look over again.");
      renderChrome();
      return;
    }
  }
  if (scene.tools) state.tools = true;
  if (scene.search) state.search = true;
  $("tools").checked = state.tools;
  $("search").checked = state.search;
  if (state.connected || state.connecting) await client.end();
  stopMic();
  stopFrames();
  playback?.stop();
  state.connected = false;
  state.connecting = false;
  state.playing = false;
  state.serverStatus = "";
  state.toolsInFlight = 0;
  state.sceneId = scene.id;
  resetConversation();
  const opened = await openSession();
  if (!opened) return;
  await deliver(scene.text, { frame: Boolean(scene.frame || state.withFrame) });
}

function resetConversation() {
  state.turns = [];
  state.wire = [];
  state.usage = null;
  state.sessionLabel = "";
  state.resumeHandle = "";
  state.serverStatus = "";
  state.toolsInFlight = 0;
  state.playing = false;
  renderConversation();
  renderChrome();
}

async function deliver(text, { frame = false } = {}) {
  const trimmed = text.trim();
  if (!trimmed) return;
  if (frame) capturePreview();
  if (frame && !latestFrame) {
    revealCamera();
    setBanner("Turn the camera on or choose a photo, then tap the button again.");
    renderChrome();
    return;
  }
  if (!state.connected) {
    const opened = await openSession();
    if (!opened) return;
  }
  ensurePlayback();
  if (frame && latestFrame) {
    client.sendFrame(latestFrame);
    log({ type: "note", detail: "Photo sent" });
  }
  client.sendText(trimmed);
  state.turns.push({ id: nextId(), role: "user", source: "text", text: trimmed, open: false });
  clearBanner();
  renderConversation();
}

async function toggleMic() {
  if (micHandle) {
    stopMic();
    client.endAudio();
    renderChrome();
    return;
  }
  ensurePlayback();
  if (!state.connected) {
    const opened = await openSession();
    if (!opened) return;
  }
  try {
    micHandle = await startMicrophone((data, level) => {
      setMeter("in-meter", level);
      if (client.connected) client.sendAudio(data);
    });
    state.mic = true;
    renderChrome();
  } catch (err) {
    setBanner(err instanceof Error ? err.message : "The microphone is unavailable.");
    renderChrome();
  }
}

function stopMic() {
  micHandle?.stop();
  micHandle = null;
  state.mic = false;
  setMeter("in-meter", 0);
}

async function toggleCamera() {
  if (cameraStream) {
    stopCamera();
    renderChrome();
    return;
  }
  try {
    cameraStream = await openCamera();
    const video = $("camera");
    video.srcObject = cameraStream;
    video.hidden = false;
    $("still").hidden = true;
    await video.play();
    state.camera = true;
    state.withFrame = true;
    syncFrames();
    renderChrome();
  } catch (err) {
    setBanner(err instanceof Error ? err.message : "The camera is unavailable.");
    renderChrome();
  }
}

function stopCamera() {
  for (const track of cameraStream?.getTracks() || []) track.stop();
  cameraStream = null;
  state.camera = false;
  const video = $("camera");
  video.pause();
  video.srcObject = null;
  video.hidden = true;
  if ($("still").hidden) {
    latestFrame = null;
    state.withFrame = false;
  }
  stopFrames();
}

async function chooseStill(file) {
  try {
    if (cameraStream) stopCamera();
    const image = await jpegFromFile(file);
    if (stillUrl) URL.revokeObjectURL(stillUrl);
    stillUrl = image.url;
    latestFrame = image.data;
    const still = $("still");
    still.src = stillUrl;
    still.hidden = false;
    state.withFrame = true;
    clearBanner();
    renderChrome();
  } catch (err) {
    setBanner(err instanceof Error ? err.message : "Could not read that image.");
    renderChrome();
  }
}

function capturePreview() {
  if (!cameraStream) return;
  const data = jpegFromVideo($("camera"));
  if (data) latestFrame = data;
}

function syncFrames() {
  stopFrames();
  if (!state.streamFrames || !cameraStream || !state.connected) return;
  frameTimer = window.setInterval(() => {
    const data = jpegFromVideo($("camera"));
    if (!data || !client.connected) return;
    latestFrame = data;
    client.sendFrame(data);
  }, 1000);
}

function stopFrames() {
  if (frameTimer) window.clearInterval(frameTimer);
  frameTimer = 0;
}

function quiet() {
  ensurePlayback();
  playback.stop();
  state.playing = false;
  setMeter("out-meter", 0);
  renderLamp();
}

function ensurePlayback() {
  audioContext();
  if (playback) return playback;
  playback = createPlayback((playing) => {
    state.playing = playing;
    if (!playing) setMeter("out-meter", 0);
    renderLamp();
  });
  return playback;
}

function handleSocket(event) {
  if (event.type === "open") {
    log({ type: "note", detail: "Connected" });
    return;
  }
  if (event.type === "error") {
    setBanner(event.message, "error");
    log({ type: "error", detail: event.message });
    renderChrome();
    return;
  }
  state.connected = false;
  state.connecting = false;
  state.serverStatus = "";
  state.toolsInFlight = 0;
  state.playing = false;
  stopMic();
  stopFrames();
  playback?.stop();
  const detail = event.reason ? `Disconnected · ${event.reason}` : "Disconnected";
  log({ type: "note", detail });
  if (event.reason) setBanner(event.reason);
  renderChrome();
}

function handleEvent(event) {
  if (event.type === "setup") {
    state.connected = true;
    state.connecting = false;
    log({ type: "setup", detail: event.sessionId || "" });
  } else if (event.type === "resume") {
    if (event.handle) state.resumeHandle = event.handle;
    state.resumable = event.resumable;
    log({ type: "resume", detail: event.resumable ? "resumable" : "hold" });
  } else if (event.type === "goaway") {
    setBanner(`The server will close this socket in ${event.timeLeft || "a moment"}. Resume keeps the same conversation.`, "warn");
    log({ type: "goaway", detail: event.timeLeft || "" });
  } else if (event.type === "usage") {
    state.usage = event.total;
    log({ type: "usage", detail: event.total == null ? "" : `${Number(event.total).toLocaleString()} tokens` });
  } else if (event.type === "input-text") {
    applyInput(event.text, event.final);
  } else if (event.type === "output-text") {
    const turn = openModelTurn();
    turn.text = appendTranscript(turn.text, event.text);
  } else if (event.type === "audio") {
    const level = ensurePlayback().enqueue(event.data);
    state.playing = true;
    setMeter("out-meter", level);
    log({ type: "audio", bytes: event.bytes }, { conversation: false });
    return;
  } else if (event.type === "thought") {
    const turn = openModelTurn();
    turn.thought = appendTranscript(turn.thought || "", event.text);
  } else if (event.type === "grounding") {
    openModelTurn().grounding = event;
    log({ type: "grounding", detail: (event.queries || []).join(", ") });
  } else if (event.type === "interrupted") {
    const turn = lastOpenModel();
    if (turn) {
      turn.interrupted = true;
      turn.open = false;
    }
    playback?.stop();
    state.playing = false;
    log({ type: "interrupted" });
  } else if (event.type === "turn-complete") {
    state.serverStatus = event.status || (state.toolsInFlight > 0 ? "IN_PROGRESS" : "IDLE");
    const turn = lastOpenModel();
    if (turn) {
      turn.open = false;
      turn.filler = event.status === "IN_PROGRESS" && Boolean(turn.text.trim());
      if (!turn.text.trim() && !turn.grounding && !turn.thought) state.turns.pop();
    }
    closeSpeech();
    log({ type: "turn-complete", detail: event.status || "idle" });
  } else if (event.type === "status") {
    state.serverStatus = event.status;
    log({ type: "status", detail: event.status });
  } else if (event.type === "tool-start") {
    state.toolsInFlight += 1;
    state.serverStatus = "IN_PROGRESS";
    state.turns.push({
      id: event.id || nextId(),
      role: "tool",
      name: event.name,
      args: event.args,
      pending: true,
    });
    log({ type: "tool-start", detail: toolDetail(event.name, event.args) });
  } else if (event.type === "tool-end") {
    state.toolsInFlight = Math.max(0, state.toolsInFlight - 1);
    if (!state.toolsInFlight && state.serverStatus === "IN_PROGRESS" && !modelById(state.model).thinking) {
      state.serverStatus = "";
    }
    const row = [...state.turns].reverse().find((turn) => turn.role === "tool" && turn.id === event.id);
    if (row) {
      row.pending = false;
      row.cancelled = Boolean(event.cancelled);
      row.result = event.result;
      row.latencyMs = event.latencyMs;
    }
    log({ type: "tool-end", detail: toolEndDetail(event) });
  } else if (event.type === "tool-cancel") {
    log({ type: "tool-cancel", detail: event.ids.join(", ") });
  }
  while (state.turns.length > 80) state.turns.shift();
  renderConversation();
  renderLamp();
  renderUsage();
  renderResume();
}

function applyInput(text, final) {
  let turn = state.turns.at(-1);
  if (!turn || turn.role !== "user" || turn.source !== "speech" || !turn.open) {
    turn = { id: nextId(), role: "user", source: "speech", text: "", interim: "", open: true };
    state.turns.push(turn);
  }
  if (final) {
    turn.text = appendTranscript(turn.text, text);
    turn.interim = "";
  } else {
    turn.interim = text;
  }
}

function openModelTurn() {
  const last = lastOpenModel();
  if (last) return last;
  const turn = {
    id: nextId(),
    role: "model",
    text: "",
    thought: "",
    open: true,
    filler: false,
    interrupted: false,
    grounding: null,
    modelLabel: modelById(state.model)?.label || "Model",
  };
  state.turns.push(turn);
  return turn;
}

function lastOpenModel() {
  const last = state.turns.at(-1);
  return last?.role === "model" && last.open ? last : null;
}

function closeSpeech() {
  for (const turn of state.turns) {
    if (turn.role === "user" && turn.source === "speech" && turn.open) turn.open = false;
  }
}

function log(event, options = {}) {
  noteWire(state.wire, event, Date.now());
  renderWire();
  if (options.conversation !== false) renderLamp();
}

function renderChrome() {
  const locked = state.connected || state.connecting;
  const thinking = Boolean(modelById(state.model)?.thinking);
  for (const input of $("models").querySelectorAll("input")) input.disabled = locked;
  const thinkingField = $("thinking-field");
  thinkingField.hidden = !thinking;
  thinkingField.disabled = locked;
  for (const input of $("thinking").querySelectorAll("input")) input.disabled = locked;
  $("thinking-note").hidden = !thinking;
  $("thinking-note").textContent = locked
    ? "Tap End, next to the status light, to change this."
    : "Low is quicker. High spends longer on harder questions.";
  $("voice").disabled = locked;
  $("behavior-field").hidden = thinking;
  $("behavior").disabled = locked;
  const scheduleUseful = !thinking && state.behavior === "NON_BLOCKING";
  $("schedule-field").hidden = !scheduleUseful;
  $("scheduling").disabled = locked || !scheduleUseful;
  $("tools").disabled = locked;
  $("search").disabled = locked;
  $("tools").checked = state.tools;
  $("search").checked = state.search;
  $("model-note").textContent = modelNote(thinking);
  $("behavior-note").hidden = thinking;
  $("behavior-note").textContent = behaviorNote(thinking);
  $("session-label").textContent = state.sessionLabel;
  $("session").hidden = !state.connected;
  for (const button of document.querySelectorAll(".scene")) {
    button.setAttribute("aria-pressed", button.dataset.scene === state.sceneId ? "true" : "false");
  }
  $("mic").setAttribute("aria-pressed", state.mic ? "true" : "false");
  $("mic").textContent = state.mic ? "Stop talking" : "Start talking";
  $("talk-hint").textContent = state.mic
    ? "The microphone is on. Speak now, then tap Stop talking."
    : "Tap Start talking and speak. Your voice goes out as you talk.";
  $("camera-toggle").textContent = state.camera ? "Camera off" : "Camera";
  $("camera-toggle").setAttribute("aria-pressed", state.camera ? "true" : "false");
  const photoShowing = state.camera || !$("still").hidden;
  $("photo-preview").hidden = !photoShowing;
  $("stream-field").hidden = !state.camera;
  state.withFrame = photoShowing;
  renderLamp();
  renderResume();
  renderBanner();
  renderUsage();
  if (!state.turns.length) renderTranscript();
}

function renderConversation() {
  renderTranscript();
  renderWire();
  renderLamp();
}

function renderLamp() {
  const view = derivePhase({
    connected: state.connected,
    connecting: state.connecting,
    playing: state.playing,
    serverStatus: state.serverStatus,
    toolsInFlight: state.toolsInFlight,
  });
  const lamp = $("lamp");
  lamp.dataset.phase = view.phase;
  lamp.classList.toggle("working", view.working);
  $("phase").textContent = phaseLabel(view);
  $("quiet").hidden = !state.playing;
}

function renderTranscript() {
  const list = $("transcript");
  const stick = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
  list.replaceChildren();
  if (!state.turns.length) {
    list.append(text("li", "empty", emptyTranscript()));
    return;
  }
  for (const turn of state.turns) list.append(renderTurn(turn));
  if (stick) list.scrollTop = list.scrollHeight;
}

function renderTurn(turn) {
  const item = document.createElement("li");
  item.className = `bubble ${turn.role === "user" ? "user" : turn.role === "tool" ? "tool" : "model"}`;
  const head = document.createElement("header");
  head.append(document.createTextNode(turnLabel(turn)));
  if (turn.filler) head.append(text("span", "badge", "Still working"));
  if (turn.interrupted) head.append(text("span", "badge", "Interrupted"));
  item.append(head);
  const body = document.createElement("p");
  if (turn.role === "tool") {
    body.textContent = turn.pending ? "Running…" : toolSummary(turn);
  } else {
    const spoken = `${turn.text || ""}${turn.interim ? turn.interim : ""}`.trim();
    body.textContent = spoken || (turn.open ? "…" : "");
  }
  item.append(body);
  if (turn.thought) {
    const thought = document.createElement("p");
    thought.className = "grounding";
    thought.textContent = turn.thought;
    item.append(thought);
  }
  if (turn.grounding) item.append(renderGrounding(turn.grounding));
  return item;
}

function renderGrounding(grounding) {
  const paragraph = document.createElement("p");
  paragraph.className = "grounding";
  const bits = [];
  if (grounding.queries?.length) bits.push(`Searched ${grounding.queries.join(", ")}`);
  paragraph.append(document.createTextNode(bits.join(". ")));
  for (const link of grounding.links || []) {
    const href = safeUrl(link.uri);
    if (!href) continue;
    paragraph.append(document.createTextNode(" "));
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.textContent = link.title || href;
    paragraph.append(anchor);
  }
  return paragraph;
}

function renderWire() {
  const list = $("wire");
  const stick = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
  list.replaceChildren();
  if (!state.wire.length) {
    const item = document.createElement("li");
    item.append(document.createElement("time"), text("span", "", "Nothing yet."));
    list.append(item);
    return;
  }
  for (const entry of state.wire) {
    const item = document.createElement("li");
    const time = document.createElement("time");
    time.dateTime = new Date(entry.at).toISOString();
    time.textContent = clock(entry.at);
    const span = document.createElement("span");
    span.textContent = formatWire(entry);
    item.append(time, span);
    list.append(item);
  }
  if (stick) list.scrollTop = list.scrollHeight;
}

function renderBanner() {
  const banner = $("banner");
  banner.hidden = !state.banner;
  banner.textContent = state.banner;
  banner.classList.toggle("warn", state.bannerTone === "warn");
}

function renderResume() {
  const button = $("resume");
  const show = Boolean(state.resumeHandle) && !state.connected && !state.connecting;
  button.hidden = !show;
}

function renderUsage() {
  $("usage").textContent = state.usage == null ? "No usage yet" : `${Number(state.usage).toLocaleString()} tokens`;
}

function setBanner(text, tone = "error") {
  state.banner = text;
  state.bannerTone = tone;
}

function clearBanner() {
  state.banner = "";
}

function revealCamera() {
  $("photo").scrollIntoView({ block: "nearest" });
}

function emptyTranscript() {
  if (state.connecting) return "Starting. The reply will show up here.";
  if (state.connected) return "You're connected. Tap Start talking and speak, or tap a button above.";
  return "Tap a button above. That starts the session and asks the question for you.";
}

function modelNote(thinking) {
  if (thinking) {
    return "This model keeps talking while it looks things up. The light stays orange until it is finished.";
  }
  return "This model answers as soon as it can.";
}

function behaviorNote(thinking) {
  if (thinking) return "";
  if (state.behavior === "BLOCKING") return "The model waits for a lookup to finish before it speaks.";
  if (state.scheduling === "INTERRUPT") return "A lookup result cuts in while the model is still talking.";
  if (state.scheduling === "SILENT") return "A lookup result is saved and does not start a new reply.";
  return "The model finishes its sentence, then speaks the lookup result.";
}

function describeSession(body) {
  const model = modelById(body.model);
  const bits = [model?.label || body.model, body.voice];
  if (body.thinkingLevel) bits.push(body.thinkingLevel.toLowerCase());
  return bits.join(" · ");
}

function turnLabel(turn) {
  if (turn.role === "user") return turn.source === "speech" ? "You · speech" : "You";
  if (turn.role === "tool") return TOOLS.find((tool) => tool.name === turn.name)?.label || turn.name || "Tool";
  return turn.modelLabel || "Model";
}

function toolSummary(turn) {
  if (turn.cancelled) return "Cancelled";
  const result = turn.result || {};
  if (result.error) return result.error;
  const latency = turn.latencyMs == null ? "" : formatLatency(turn.latencyMs);
  const suffix = latency ? ` · ${latency}` : "";
  if (result.time) return `${result.time}${suffix}`;
  if (result.verdict) {
    const readings = (result.readings || []).map((reading) => `${reading.sensor} ${reading.value}`).join(", ");
    return `${result.verdict} ${readings}${suffix}`;
  }
  if (result.weather) {
    return [`Weather: ${result.weather}`, `Flight: ${result.flight}`, `Table: ${result.table}`, result.note, latency]
      .filter(Boolean)
      .join("\n");
  }
  return `${JSON.stringify(result)}${suffix}`;
}

function toolDetail(name, args) {
  return `${name} ${clip(JSON.stringify(args || {}))}`;
}

function toolEndDetail(event) {
  if (event.cancelled) return `${event.name} · cancelled`;
  const result = event.result || {};
  const summary = result.error || result.verdict || result.time || result.city || "ready";
  return `${event.name} · ${formatLatency(event.latencyMs)} · ${clip(String(summary))}`;
}

function formatLatency(ms) {
  if (ms == null) return "";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function fillSelect(select, options) {
  for (const option of options) {
    const item = document.createElement("option");
    item.value = option.id;
    item.textContent = option.label;
    select.append(item);
  }
}

function text(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = value;
  return node;
}

function setMeter(id, level) {
  const node = $(id);
  if (node) node.style.width = `${Math.min(100, Math.round(level * 220))}%`;
}

function clock(at) {
  const date = new Date(at || Date.now());
  const tenths = Math.floor(date.getMilliseconds() / 100);
  return `${date.toLocaleTimeString("en-GB", { hour12: false })}.${tenths}`;
}

function clip(value, max = 90) {
  const textValue = value.replace(/\s+/g, " ").trim();
  return textValue.length > max ? `${textValue.slice(0, max - 1)}…` : textValue;
}

function safeUrl(uri) {
  try {
    const url = new URL(uri);
    if (url.protocol === "https:" || url.protocol === "http:") return url.href;
  } catch {
    /* Ignore anything that is not a web link. */
  }
  return "";
}

function nextId() {
  turnSeq += 1;
  return `t${turnSeq}`;
}
