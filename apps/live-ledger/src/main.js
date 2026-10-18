import { MODELS, PROMPTS, THINKING_LEVELS, VOICES, modelById } from "../lib/catalog.js";
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
  activity: [],
  book: browserBook(),
  filter: "all",
  resumeHandle: "",
  banner: "",
  bannerTone: "error",
  usage: null,
};

let playback;
let micHandle = null;
let opening = null;
let sending = false;
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
  context: () => ({ today: todayISO(), timeZone, now: new Date() }),
});

mount();
void loadStatus();

function mount() {
  const models = $("models");
  for (const model of MODELS) {
    const label = document.createElement("label");
    label.className = "plate";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "model";
    input.value = model.id;
    input.checked = model.id === state.model;
    input.addEventListener("change", () => {
      if (!input.checked) return;
      state.model = model.id;
      renderClerk();
    });
    label.append(
      input,
      h("span", "plate-kicker", model.kicker),
      h("span", "plate-name", model.label),
      h("span", "plate-id", model.id),
      h("span", "plate-copy", model.copy),
    );
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
    option.textContent = `${item.id} · ${item.hint}`;
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

  const prompts = $("prompts");
  for (const prompt of PROMPTS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.textContent = prompt.label;
    button.addEventListener("click", () => {
      $("draft").value = prompt.text;
      void say(prompt.text);
    });
    prompts.append(button);
  }

  $("say").addEventListener("submit", (event) => {
    event.preventDefault();
    void say($("draft").value);
  });
  $("mic").addEventListener("click", () => void toggleMic());
  $("fresh").addEventListener("click", () => void fresh());
  $("erase").addEventListener("click", () => eraseBrowserCopy());
  renderBook();
  renderClerk();
}

async function loadStatus() {
  try {
    const response = await fetch("/api/status");
    const body = await response.json();
    state.ready = Boolean(body.ready);
  } catch {
    state.ready = false;
  }
  $("key").textContent = state.ready ? "Key on the server" : "Add GEMINI_API_KEY on the server";
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
  renderClerk();
  try {
    const body = await client.connect(settings());
    state.connecting = false;
    if (!body) {
      renderClerk();
      return false;
    }
    state.connected = true;
    renderClerk();
    return true;
  } catch (err) {
    state.connecting = false;
    state.connected = false;
    setBanner(err instanceof Error ? err.message : "Could not open a session.");
    return false;
  }
}

async function say(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed || sending) return;
  sending = true;
  renderClerk();
  try {
    const opened = await openSession();
    if (!opened) {
      $("draft").value = trimmed;
      return;
    }
    ensurePlayback();
    client.sendText(trimmed);
    $("draft").value = "";
    state.turns.push({ id: nextId(), role: "user", source: "text", text: trimmed, interim: "", open: false });
    clearBanner();
  } catch (err) {
    $("draft").value = trimmed;
    setBanner(err instanceof Error ? err.message : "Could not send that.");
  } finally {
    sending = false;
    renderClerk();
  }
}

async function toggleMic() {
  if (micHandle) {
    stopMic();
    client.endAudio();
    renderClerk();
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
    renderClerk();
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
  state.activity = [];
  state.resumeHandle = "";
  state.usage = null;
  clearBanner();
  renderClerk();
}

function eraseBrowserCopy() {
  if (!state.book.length) return;
  if (!window.confirm("Erase every entry stored in this browser?")) return;
  state.book = [];
  persist([]);
  $("book-live").textContent = "Erased the book stored in this browser.";
  renderBook();
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
  else renderClerk();
}

function handleEvent(event) {
  if (event.type === "setup") {
    state.connected = true;
    state.connecting = false;
  } else if (event.type === "resume") {
    if (event.handle) state.resumeHandle = event.handle;
  } else if (event.type === "goaway") {
    setBanner("The server is closing this conversation. Send again to continue.", "warn");
  } else if (event.type === "usage") {
    state.usage = event.total;
  } else if (event.type === "input-text") {
    applyInput(event.text, event.final);
  } else if (event.type === "output-text") {
    const turn = openModelTurn();
    turn.text = appendTranscript(turn.text, event.text);
  } else if (event.type === "audio") {
    const level = ensurePlayback().enqueue(event.data);
    state.playing = true;
    setMeter("out-meter", level);
    renderClerk();
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
    rememberActivity(event);
  }
  while (state.turns.length > 80) state.turns.shift();
  renderClerk();
}

function applyInput(text, final) {
  let turn = [...state.turns].reverse().find((item) => item.role === "user" && item.source === "speech" && item.open);
  if (!turn) {
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
    open: true,
    interrupted: false,
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

function rememberActivity(event) {
  if (event.cancelled) return;
  const result = event.result || {};
  const line = result.line || result.error || event.name || "The book answered.";
  state.activity.unshift({
    id: event.id || nextId(),
    line,
    ok: result.ok !== false && !result.error,
    result,
  });
  while (state.activity.length > 12) state.activity.pop();
  if (result.ok && result.line && result.action !== "list" && result.action !== "totals") {
    $("book-live").textContent = result.line;
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
    stats.append(h("p", "empty", "The book is empty. Tell the desk about a subscription, or something you paid once."));
  } else {
    for (const row of summary.byCurrency) stats.append(statBlock(row, summary.byCurrency.length > 1));
  }

  const quiet = summary.empty && state.filter === "all";
  $("subs-section").hidden = !showSubs || quiet;
  $("once-section").hidden = !showOnce || quiet;
  $("subs-title").textContent = `Subscriptions${subs.length ? ` · ${subs.length}` : ""}`;
  $("once-title").textContent = `Paid once${once.length ? ` · ${once.length}` : ""}`;
  renderEntries($("subs"), subs, "No subscriptions yet.");
  renderEntries($("once"), once, "No one-time payments yet.");
  $("erase").hidden = state.book.length === 0;
}

function statBlock(row, showCode) {
  const block = h("div", "stat-block");
  if (showCode) block.append(h("p", "stat-code", row.currency));
  const grid = h("div", "stat-grid");
  grid.append(
    figure("A month", formatMoney(row.monthly, row.currency), "Active subscriptions"),
    figure("A year", formatMoney(row.yearly, row.currency), "Same active rows"),
    figure("Paid once", formatMoney(row.onceThisMonth, row.currency), "This month"),
    figure("Active", String(row.activeCount), row.pausedCount ? `${row.pausedCount} paused` : "In the monthly total"),
  );
  block.append(grid);
  if (row.upcoming.length) {
    const list = h("ul", "due");
    for (const item of row.upcoming) {
      list.append(h("li", "", `${item.name} · ${formatMoney(item.amount, row.currency)} · ${formatDate(item.renewsOn)}`));
    }
    const wrap = h("div", "due-wrap");
    wrap.append(h("p", "kicker", "Due within 30 days"), list);
    block.append(wrap);
  }
  return block;
}

function figure(label, value, note) {
  const node = h("div", "stat");
  node.append(h("span", "", label), h("strong", "", value || "—"), h("small", "", note));
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
    const name = h("strong", "", entry.name);
    const amount = h("p", "amt", formatMoney(entry.amount, entry.currency));
    const meta = h("p", "meta", entryMeta(entry));
    const status = h("p", `status status-${entry.status}`, statusLabel(entry.status));
    row.append(name, amount, meta, status);
    if (entry.notes) row.append(h("p", "notes", entry.notes));
    root.append(row);
  }
}

function renderClerk() {
  const locked = state.connected || state.connecting;
  const thinking = Boolean(modelById(state.model)?.thinking);
  for (const input of $("models").querySelectorAll("input")) input.disabled = locked;
  $("thinking-field").hidden = !thinking;
  $("thinking-field").disabled = locked;
  for (const input of $("thinking").querySelectorAll("input")) input.disabled = locked;
  $("voice").disabled = locked;
  $("mic").textContent = state.mic ? "Stop talking" : "Start talking";
  $("mic").setAttribute("aria-pressed", String(state.mic));
  $("mic").disabled = sending;
  $("say").querySelector("button").disabled = sending;
  $("draft").disabled = sending;
  $("fresh").disabled = !state.connected && !state.turns.length && !state.activity.length;
  const view = derivePhase(state);
  $("lamp").dataset.phase = view.phase;
  $("phase").textContent = phaseLabel(view);
  $("usage").textContent = state.usage == null ? "" : `${Number(state.usage).toLocaleString()} tokens`;
  const banner = $("banner");
  banner.hidden = !state.banner;
  banner.textContent = state.banner;
  banner.className = state.bannerTone === "warn" ? "banner warn" : "banner";
  renderTranscript();
  renderActivity();
}

function renderTranscript() {
  const list = $("transcript");
  const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
  list.replaceChildren();
  if (!state.turns.length) {
    const item = document.createElement("li");
    item.append(h("p", "hint", "The desk is quiet. Send a line, or start talking."));
    list.append(item);
    return;
  }
  for (const turn of state.turns) {
    const item = document.createElement("li");
    item.className = `bubble ${turn.role === "user" ? "user" : "model"}`;
    const who = turn.role === "user" ? (turn.source === "speech" ? "You" : "You typed") : "Desk";
    const body = h("p");
    const spoken = turn.text || "";
    body.textContent = spoken;
    if (turn.interim) {
      const interim = h("span", "interim", `${spoken ? " " : ""}${turn.interim}`);
      body.append(interim);
    }
    if (turn.interrupted) body.append(h("span", "interim", " Interrupted."));
    item.append(h("p", "who", who), body);
    list.append(item);
  }
  if (nearBottom) list.scrollTop = list.scrollHeight;
}

function renderActivity() {
  const list = $("activity");
  list.replaceChildren();
  if (!state.activity.length) {
    list.append(h("li", "", "Nothing written yet."));
    return;
  }
  for (const item of state.activity) {
    const row = h("li", item.ok ? "" : "bad");
    row.append(h("p", "", item.line));
    if (item.result) {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = "Result";
      const pre = document.createElement("pre");
      pre.textContent = JSON.stringify(item.result, null, 2);
      details.append(summary, pre);
      row.append(details);
    }
    list.append(row);
  }
}

function ensurePlayback() {
  audioContext();
  if (playback) return playback;
  playback = createPlayback((playing) => {
    state.playing = playing;
    if (!playing) setMeter("out-meter", 0);
    renderClerk();
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
  renderClerk();
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
