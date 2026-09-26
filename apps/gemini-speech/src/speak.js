import { LANGUAGES, PREBUILT, SPEAK_PRESETS, STYLES, VOCAL_TAGS } from "../lib/catalog.js";
import { MODELS, buildSpeechRequest, visibleFormats } from "../lib/request.js";
import { elapsed, speak } from "./api.js";
import { unlockAudio } from "./audio.js";
import { button, describeTake, insertTag, previewRequest } from "./format.js";
import { mountPlayer } from "./player.js";

const opening = SPEAK_PRESETS[0];

const state = {
  model: MODELS[0].id,
  voice: opening.voice,
  voiceName: opening.voice,
  custom: false,
  format: opening.format,
  stream: false,
};

let textEl;
let styleEl;
let errorEl;
let requestEl;
let countEl;
let formatHint;
let streamHint;
let formatEl;
let customEl;
let gridEl;
let filterEl;
let goEl;
let compareEl;
let stopEl;
let player;
let flashPlayer;
let litePlayer;
let compareRow;
let abort;
let stopClock = () => {};

export function initSpeak() {
  textEl = document.getElementById("speak-text");
  styleEl = document.getElementById("speak-style");
  errorEl = document.getElementById("speak-error");
  requestEl = document.getElementById("speak-request");
  countEl = document.getElementById("speak-count");
  formatHint = document.getElementById("format-hint");
  streamHint = document.getElementById("stream-hint");
  formatEl = document.getElementById("speak-format");
  customEl = document.getElementById("custom-voice");
  gridEl = document.getElementById("voice-grid");
  filterEl = document.getElementById("voice-filter");
  goEl = document.getElementById("speak-go");
  compareEl = document.getElementById("speak-compare");
  stopEl = document.getElementById("speak-stop");
  compareRow = document.getElementById("compare-row");
  player = mountPlayer(document.getElementById("speak-player"), "Take");
  flashPlayer = mountPlayer(document.getElementById("compare-flash"), "Flash");
  litePlayer = mountPlayer(document.getElementById("compare-lite"), "Flash-Lite");

  textEl.value = opening.text;
  styleEl.value = opening.style;

  renderPresets();
  renderTags();
  renderLanguages();
  renderModels();
  renderStyles();
  renderVoices();
  renderFormats();
  renderCustom();
  refresh();

  textEl.addEventListener("input", refresh);
  styleEl.addEventListener("input", () => {
    paintStyles();
    refresh();
  });
  filterEl.addEventListener("input", renderVoices);
  formatEl.addEventListener("change", () => {
    state.format = formatEl.value;
    refresh();
  });
  document.getElementById("speak-stream").addEventListener("change", (event) => {
    state.stream = event.target.checked;
    formatEl.disabled = state.stream;
    streamHint.hidden = !state.stream;
    refresh();
  });
  goEl.addEventListener("click", () => run(false));
  compareEl.addEventListener("click", () => run(true));
  stopEl.addEventListener("click", () => abort?.abort());
}

export function setSpeakVoice(voice) {
  const id = voice.id || voice.name;
  const studio = PREBUILT.find((item) => item.name.toLowerCase() === String(id).toLowerCase());
  state.voice = studio ? studio.name : id;
  state.voiceName = studio ? studio.name : voice.name || id;
  state.custom = !studio;
  renderVoices();
  renderCustom();
  refresh();
  document.getElementById("speak-text")?.focus();
}

function payload(extra = {}) {
  return {
    model: state.model,
    format: state.format,
    stream: state.stream,
    speakers: [{ name: "Narrator", voice: state.voice }],
    turns: [{ speaker: "Narrator", text: textEl.value, style: styleEl.value }],
    ...extra,
  };
}

function refresh() {
  const body = payload();
  const built = previewRequest(body);
  requestEl.textContent = built;
  const length = textEl.value.trim().length;
  countEl.textContent = `${length} characters`;
  const format = visibleFormats().find((item) => item.id === state.format);
  formatHint.textContent = state.stream
    ? "A stream is 24 kHz PCM as it arrives. Download is a WAV of that take."
    : format?.hint || "";
  const tooLong = length > 500;
  compareEl.disabled = state.stream || tooLong || length === 0;
  compareEl.title = state.stream
    ? "Comparison uses a finished file, not a stream."
    : tooLong
      ? "Comparison is for a short line, under 500 characters."
      : "Speak the same line with Flash and Flash-Lite.";
  paintStyles();
}

async function run(compare) {
  errorEl.textContent = "";
  const body = payload();
  const built = buildSpeechRequest(body);
  if (built.error) {
    errorEl.textContent = built.error;
    return;
  }
  abort?.abort();
  abort = new AbortController();
  setBusy(true, compare ? "Comparing…" : "Speaking…", compare ? "compare" : "go");
  compareRow.hidden = !compare;
  try {
    await unlockAudio();
    if (compare) await runCompare(abort.signal);
    else if (state.stream) await runStream(abort.signal);
    else await runOnce(body, player, abort.signal, true);
  } catch (err) {
    if (err.name === "AbortError") player.fail("Stopped.");
    else {
      errorEl.textContent = err.message;
      player.fail(err.message);
    }
  } finally {
    setBusy(false);
  }
}

async function runOnce(body, target, signal, autoplay) {
  target.setStatus("In the booth…");
  const take = await speak({ ...body, stream: false }, { signal });
  await target.loadTake({
    audioBase64: take.audioBase64,
    mimeType: take.mimeType,
    sampleRate: take.sampleRate,
    meta: describeTake(take),
    autoplay,
    note: take.joined ? "Turns were recorded separately and joined." : undefined,
  });
}

async function runStream(signal) {
  player.beginLive();
  let done = {};
  const result = await speak(payload(), {
    signal,
    onChunk(chunk) {
      player.pushLive(chunk.base64, chunk.sampleRate);
    },
    onDone(payloadDone) {
      done = payloadDone;
    },
  });
  player.endLive({
    meta: describeTake({ ...result, ...done, mimeType: "audio/wav", sampleRate: 24000 }),
  });
}

async function runCompare(signal) {
  flashPlayer.reset();
  litePlayer.reset();
  const base = payload({ stream: false });
  await runOnce({ ...base, model: MODELS[0].id }, flashPlayer, signal, false);
  await runOnce({ ...base, model: MODELS[1].id }, litePlayer, signal, false);
  flashPlayer.setStatus("Same words, Flash voice.");
  litePlayer.setStatus("Same words, Flash-Lite voice. Press play on either take.");
}

function setBusy(busy, label, actor = "go") {
  stopClock();
  goEl.disabled = busy;
  goEl.setAttribute("aria-busy", busy && actor === "go" ? "true" : "false");
  compareEl.disabled = busy || compareEl.disabled;
  compareEl.setAttribute("aria-busy", busy && actor === "compare" ? "true" : "false");
  stopEl.hidden = !busy;
  if (!busy) {
    goEl.textContent = "Speak";
    refresh();
    return;
  }
  const started = performance.now();
  goEl.textContent = label;
  stopClock = elapsed(() => {
    goEl.textContent = `${label} ${((performance.now() - started) / 1000).toFixed(1)}s`;
  });
}

function renderPresets() {
  const host = document.getElementById("speak-presets");
  for (const preset of SPEAK_PRESETS) {
    const chip = button("chip", preset.label);
    chip.addEventListener("click", () => {
      textEl.value = preset.text;
      styleEl.value = preset.style;
      state.format = preset.format;
      formatEl.value = preset.format;
      state.stream = false;
      document.getElementById("speak-stream").checked = false;
      formatEl.disabled = false;
      streamHint.hidden = true;
      setSpeakVoice({ id: preset.voice, name: preset.voice });
    });
    host.append(chip);
  }
}

function renderTags() {
  const host = document.getElementById("speak-tags");
  for (const [tag, label] of VOCAL_TAGS) {
    const chip = button("tag", label);
    chip.addEventListener("click", () => insertTag(textEl, tag));
    host.append(chip);
  }
}

function renderLanguages() {
  const host = document.getElementById("speak-langs");
  for (const language of LANGUAGES) {
    const chip = button("chip chip-quiet", language.label);
    chip.addEventListener("click", () => {
      textEl.value = language.text;
      refresh();
    });
    host.append(chip);
  }
}

function renderModels() {
  const host = document.getElementById("speak-models");
  for (const model of MODELS) {
    const label = document.createElement("label");
    label.className = "choice";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "speak-model";
    input.value = model.id;
    input.checked = model.id === state.model;
    input.addEventListener("change", () => {
      state.model = model.id;
      refresh();
    });
    const text = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = model.label;
    const blurb = document.createElement("small");
    blurb.textContent = model.blurb;
    text.append(name, blurb);
    label.append(input, text);
    host.append(label);
  }
}

function renderStyles() {
  const host = document.getElementById("speak-styles");
  for (const [value, label] of STYLES) {
    const chip = button("chip", label);
    chip.dataset.style = value;
    chip.addEventListener("click", () => {
      styleEl.value = value;
      paintStyles();
      refresh();
    });
    host.append(chip);
  }
  paintStyles();
}

function paintStyles() {
  const current = styleEl.value.trim();
  for (const chip of document.querySelectorAll("#speak-styles .chip")) {
    chip.setAttribute("aria-pressed", String(chip.dataset.style === current));
  }
}

function renderFormats() {
  for (const format of visibleFormats()) {
    const option = document.createElement("option");
    option.value = format.id;
    option.textContent = format.label;
    option.selected = format.id === state.format;
    formatEl.append(option);
  }
}

function renderVoices() {
  const query = filterEl.value.trim().toLowerCase();
  gridEl.replaceChildren();
  for (const voice of PREBUILT) {
    const hay = `${voice.name} ${voice.trait}`.toLowerCase();
    if (query && !hay.includes(query)) continue;
    const chip = button("voice", "");
    chip.setAttribute("aria-pressed", String(!state.custom && state.voice === voice.name));
    const name = document.createElement("strong");
    name.textContent = voice.name;
    const trait = document.createElement("span");
    trait.textContent = voice.trait;
    chip.append(name, trait);
    chip.addEventListener("click", () => setSpeakVoice({ id: voice.name, name: voice.name }));
    gridEl.append(chip);
  }
  if (!gridEl.childElementCount) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = "No studio voice matches that filter.";
    gridEl.append(empty);
  }
}

function renderCustom() {
  if (!state.custom) {
    customEl.hidden = true;
    customEl.replaceChildren();
    return;
  }
  customEl.hidden = false;
  customEl.replaceChildren();
  const text = document.createElement("span");
  text.textContent = `Using ${state.voiceName}`;
  const id = document.createElement("code");
  id.textContent = state.voice;
  const back = button("ghost", "Studio voices");
  back.addEventListener("click", () => setSpeakVoice({ id: "Kore", name: "Kore" }));
  customEl.append(text, id, back);
}
