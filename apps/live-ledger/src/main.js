import { MODELS, THINKING_LEVELS, VOICES, modelById } from "../lib/catalog.js";
import { entryMeta, formatDate, formatMoney, statusLabel } from "../lib/format.js";
import { localDateISO, sortBook, summarize } from "../lib/ledger.js";
import { appendTranscript, derivePhase, phaseLabel } from "../lib/messages.js";
import { loadBook, saveBook } from "../lib/store.js";
import { audioContext, createPlayback, startMicrophone } from "./audio.js";
import { createLiveClient } from "./live.js";

const $ = (id) => document.getElementById(id);
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "subscription", label: "Subscriptions" },
  { id: "once", label: "Paid once" },
];

const state = {
  ready: false,
  connecting: false,
  connected: false,
  model: MODELS[0].id,
  thinkingLevel: "medium",
  voice: "Kore",
  playing: false,
  serverStatus: "",
  toolsInFlight: 0,
  mic: false,
  turns: [],
  book: browserBook(),
  pending: null,
  question: "",
  filter: "all",
  resumeHandle: "",
  banner: "",
  bannerTone: "error",
};

let playback;
let micHandle = null;
let opening = null;
let turnSeq = 0;

const client = createLiveClient({
  onEvent: handleEvent,
  onSocket: handleSocket,
  readBook: () => state.book,
  writeBook(book) {
    state.book = book;
    persist(book);
    renderBook();
  },
  writePending(pending) {
    state.pending = pending;
  },
  context: () => ({
    today: todayISO(),
    timeZone,
    now: new Date(),
    pending: state.pending,
  }),
});

mount();
void loadStatus();

function mount() {
  const models = $("models");
  for (const model of MODELS) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "model";
    input.value = model.id;
    input.checked = model.id === state.model;
    input.addEventListener("change", () => {
      if (!input.checked) return;
      state.model = model.id;
      renderVoice();
    });
    label.append(input, document.createTextNode(model.thinking ? "Extended" : "Live"));
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

  const voice = $("voice");
  for (const item of VOICES) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.id;
    voice.append(option);
  }
  voice.value = state.voice;
  voice.addEventListener("change", () => {
    state.voice = voice.value;
  });

  const filters = $("filters");
  for (const filter of FILTERS) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.filter = filter.id;
    button.textContent = filter.label;
    button.addEventListener("click", () => {
      state.filter = filter.id;
      renderBook();
    });
    filters.append(button);
  }

  $("mic").addEventListener("click", () => void toggleMic());
  $("fresh").addEventListener("click", () => void fresh());
  $("erase").addEventListener("click", () => eraseBrowserCopy());
  renderBook();
  renderVoice();
}

async function loadStatus() {
  try {
    const response = await fetch("/api/status");
    const body = await response.json();
    state.ready = Boolean(body.ready);
  } catch {
    state.ready = false;
  }
  $("key").textContent = state.ready ? "Ready" : "No API key";
}

function settings() {
  return {
    model: state.model,
    voice: state.voice,
    thinkingLevel: state.thinkingLevel,
    today: todayISO(),
    timeZone,
    resumeHandle: state.resumeHandle,
  };
}

async function openSession() {
  if (client.connected) return true;
  if (opening) return opening;
  opening = startSession().finally(() => {
    opening = null;
  });
  return opening;
}

async function startSession() {
  state.connecting = true;
  clearBanner();
  renderVoice();
  try {
    const body = await client.connect(settings());
    state.connecting = false;
    if (!body) {
      renderVoice();
      return false;
    }
    state.connected = true;
    renderVoice();
    return true;
  } catch (err) {
    state.connecting = false;
    state.connected = false;
    setBanner(err instanceof Error ? err.message : "Could not open a session.");
    return false;
  }
}

async function toggleMic() {
  if (micHandle) {
    stopMic();
    client.endAudio();
    renderVoice();
    return;
  }
  ensurePlayback();
  const opened = await openSession();
  if (!opened) return;
  try {
    micHandle = await startMicrophone((data, level) => {
      setMeter("in-meter", level);
      if (client.connected) client.sendAudio(data);
    });
    state.mic = true;
    clearBanner();
    renderVoice();
  } catch (err) {
    setBanner(err instanceof Error ? err.message : "The microphone is unavailable.");
  }
}

function stopMic() {
  micHandle?.stop();
  micHandle = null;
  state.mic = false;
  setMeter("in-meter", 0);
}

async function fresh() {
  await client.end();
  stopMic();
  playback?.stop();
  state.connected = false;
  state.connecting = false;
  state.playing = false;
  state.serverStatus = "";
  state.toolsInFlight = 0;
  state.turns = [];
  state.pending = null;
  state.question = "";
  state.resumeHandle = "";
  clearBanner();
  renderVoice();
}

function eraseBrowserCopy() {
  if (!state.book.length) return;
  if (!window.confirm("Clear every entry stored in this browser?")) return;
  state.book = [];
  state.pending = null;
  state.question = "";
  persist([]);
  $("book-live").textContent = "Cleared the book in this browser.";
  renderBook();
  renderVoice();
}

function handleSocket(event) {
  if (event.type === "open") return;
  if (event.type === "error") {
    setBanner(event.message);
    return;
  }
  state.connected = false;
  state.connecting = false;
  state.serverStatus = "";
  state.toolsInFlight = 0;
  state.playing = false;
  stopMic();
  playback?.stop();
  if (event.reason) setBanner(event.reason);
  else renderVoice();
}

function handleEvent(event) {
  if (event.type === "setup") {
    state.connected = true;
    state.connecting = false;
  } else if (event.type === "resume") {
    if (event.handle) state.resumeHandle = event.handle;
  } else if (event.type === "goaway") {
    setBanner("This conversation is about to close. Listen again to continue.", "warn");
  } else if (event.type === "input-text") {
    applyInput(event.text, event.final);
  } else if (event.type === "output-text") {
    const turn = openModelTurn();
    turn.text = appendTranscript(turn.text, event.text);
  } else if (event.type === "audio") {
    const level = ensurePlayback().enqueue(event.data);
    state.playing = true;
    setMeter("out-meter", level);
    renderVoice();
    return;
  } else if (event.type === "interrupted") {
    const turn = lastOpenModel();
    if (turn) {
      turn.interrupted = true;
      turn.open = false;
    }
    playback?.stop();
    state.playing = false;
  } else if (event.type === "turn-complete") {
    state.serverStatus = event.status || (state.toolsInFlight > 0 ? "IN_PROGRESS" : "");
    const turn = lastOpenModel();
    if (turn) {
      turn.open = false;
      if (!turn.text.trim()) state.turns.pop();
    }
    closeSpeech();
  } else if (event.type === "status") {
    state.serverStatus = event.status;
  } else if (event.type === "tool-start") {
    state.toolsInFlight += 1;
    state.serverStatus = "IN_PROGRESS";
  } else if (event.type === "tool-end") {
    state.toolsInFlight = Math.max(0, state.toolsInFlight - 1);
    noteResult(event.result);
  }
  while (state.turns.length > 40) state.turns.shift();
  renderVoice();
}

function noteResult(result) {
  if (!result) return;
  if (result.needsConfirmation && result.ask) {
    state.question = result.ask;
    $("book-live").textContent = result.ask;
    return;
  }
  if (result.ok && result.line && result.action !== "list" && result.action !== "totals") {
    state.question = "";
    $("book-live").textContent = result.line;
  }
}

function applyInput(text, final) {
  let turn = [...state.turns].reverse().find((item) => item.role === "user" && item.open);
  if (!turn) {
    turn = { id: nextId(), role: "user", text: "", interim: "", open: true };
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
  const turn = { id: nextId(), role: "model", text: "", open: true, interrupted: false };
  state.turns.push(turn);
  return turn;
}

function lastOpenModel() {
  const last = state.turns.at(-1);
  return last?.role === "model" && last.open ? last : null;
}

function closeSpeech() {
  for (const turn of state.turns) {
    if (turn.role === "user" && turn.open) turn.open = false;
  }
}

function renderBook() {
  const summary = summarize(state.book, todayISO());
  const showSubs = state.filter !== "once";
  const showOnce = state.filter !== "subscription";
  const subs = sortBook(state.book).filter((entry) => entry.kind === "subscription");
  const once = sortBook(state.book).filter((entry) => entry.kind === "once");

  for (const button of $("filters").querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button.dataset.filter === state.filter));
  }

  const stats = $("stats");
  stats.replaceChildren();
  if (summary.empty) {
    stats.append(h("p", "empty", "Nothing recorded yet."));
  } else {
    for (const row of summary.byCurrency) stats.append(statBlock(row, summary.byCurrency.length > 1));
  }

  const quiet = summary.empty && state.filter === "all";
  $("subs-section").hidden = !showSubs || quiet;
  $("once-section").hidden = !showOnce || quiet;
  $("subs-title").textContent = subs.length ? `Subscriptions · ${subs.length}` : "Subscriptions";
  $("once-title").textContent = once.length ? `Paid once · ${once.length}` : "Paid once";
  renderEntries($("subs"), subs, "No subscriptions.");
  renderEntries($("once"), once, "No one-time payments.");
  $("erase").hidden = state.book.length === 0;
}

function statBlock(row, showCode) {
  const block = h("div", "stat-block");
  if (showCode) block.append(h("p", "stat-code", row.currency));
  const grid = h("div", "stat-grid");
  grid.append(
    figure("Month", formatMoney(row.monthly, row.currency)),
    figure("Year", formatMoney(row.yearly, row.currency)),
    figure("Once this month", formatMoney(row.onceThisMonth, row.currency)),
    figure("Active", String(row.activeCount), row.pausedCount ? `${row.pausedCount} paused` : ""),
  );
  block.append(grid);
  if (row.upcoming.length) {
    const list = h("ul", "due");
    for (const item of row.upcoming) {
      list.append(h("li", "", `${item.name} · ${formatMoney(item.amount, row.currency)} · ${formatDate(item.renewsOn)}`));
    }
    const wrap = h("div", "");
    wrap.append(h("p", "kicker", "Due in 30 days"), list);
    block.append(wrap);
  }
  return block;
}

function figure(label, value, note) {
  const node = h("div", "stat");
  node.append(h("span", "", label), h("strong", "", value || "—"));
  if (note) node.append(h("small", "", note));
  return node;
}

function renderEntries(root, entries, empty) {
  root.replaceChildren();
  if (!entries.length) {
    root.append(h("p", "none", empty));
    return;
  }
  for (const entry of entries) {
    const row = h("article", `entry${entry.status === "canceled" ? " canceled" : ""}`);
    row.append(
      h("strong", "", entry.name),
      h("p", "amt", formatMoney(entry.amount, entry.currency)),
      h("p", "meta", entryMeta(entry)),
      h("p", `status status-${entry.status}`, statusLabel(entry.status)),
    );
    if (entry.notes) row.append(h("p", "notes", entry.notes));
    root.append(row);
  }
}

function renderVoice() {
  const locked = state.connected || state.connecting;
  const thinking = Boolean(modelById(state.model)?.thinking);
  for (const input of $("models").querySelectorAll("input")) input.disabled = locked;
  $("thinking-field").hidden = !thinking;
  $("thinking-field").disabled = locked;
  for (const input of $("thinking").querySelectorAll("input")) input.disabled = locked;
  $("voice").disabled = locked;
  $("mic").textContent = state.mic ? "Stop" : "Listen";
  $("mic").setAttribute("aria-pressed", String(state.mic));
  $("fresh").disabled = !state.connected && !state.turns.length;
  const view = derivePhase(state);
  let label = phaseLabel(view);
  if (!state.mic && !state.connecting && view.phase === "listening") label = "Not listening";
  if (!state.connected && !state.connecting && !state.playing) label = "Not listening";
  $("phase").textContent = label;
  const banner = $("banner");
  banner.hidden = !state.banner;
  banner.textContent = state.banner;
  banner.className = state.bannerTone === "warn" ? "banner warn" : "banner";
  const question = $("question");
  question.hidden = !state.question;
  question.textContent = state.question;
  renderTranscript();
}

function renderTranscript() {
  const list = $("transcript");
  const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 48;
  list.replaceChildren();
  list.hidden = state.turns.length === 0;
  for (const turn of state.turns) {
    const item = document.createElement("li");
    item.className = "bubble";
    const body = h("p");
    body.textContent = turn.text || "";
    if (turn.interim) body.append(h("span", "interim", `${turn.text ? " " : ""}${turn.interim}`));
    item.append(h("p", "who", turn.role === "user" ? "You" : "Answer"), body);
    list.append(item);
  }
  if (nearBottom) list.scrollTop = list.scrollHeight;
}

function ensurePlayback() {
  audioContext();
  if (playback) return playback;
  playback = createPlayback((playing) => {
    state.playing = playing;
    if (!playing) setMeter("out-meter", 0);
    renderVoice();
  });
  return playback;
}

function setMeter(id, level) {
  const node = $(id);
  if (!node) return;
  node.style.transform = `scaleX(${Math.max(0, Math.min(1, Number(level) || 0))})`;
}

function setBanner(message, tone = "error") {
  state.banner = message;
  state.bannerTone = tone;
  renderVoice();
}

function clearBanner() {
  state.banner = "";
  state.bannerTone = "error";
}

function todayISO() {
  return localDateISO(new Date(), timeZone);
}

function browserBook() {
  try {
    return loadBook(localStorage);
  } catch {
    return [];
  }
}

function persist(book) {
  try {
    saveBook(localStorage, book);
  } catch {
    setBanner("This browser blocked saving the book.");
  }
}

function nextId() {
  turnSeq += 1;
  return `t${turnSeq}`;
}

function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
