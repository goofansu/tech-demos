import { PREBUILT, SCENES, VOCAL_TAGS } from "../lib/catalog.js";
import { MODELS, buildSpeechRequest } from "../lib/request.js";
import { elapsed, speak } from "./api.js";
import { unlockAudio } from "./audio.js";
import { button, describeTake, insertTag, previewRequest } from "./format.js";
import { mountPlayer } from "./player.js";

let scene = structuredClone(SCENES[0]);
let model = MODELS[0].id;
let focused = null;
let abort;
let stopClock = () => {};
let player;
let noteEl;
let errorEl;
let requestEl;
let goEl;
let stopEl;

export function initScene() {
  noteEl = document.getElementById("scene-note");
  errorEl = document.getElementById("scene-error");
  requestEl = document.getElementById("scene-request");
  goEl = document.getElementById("scene-go");
  stopEl = document.getElementById("scene-stop");
  player = mountPlayer(document.getElementById("scene-player"), "Scene");

  const presets = document.getElementById("scene-presets");
  for (const item of SCENES) {
    const chip = button("chip", item.label);
    chip.dataset.scene = item.id;
    chip.addEventListener("click", () => {
      scene = structuredClone(item);
      render();
    });
    presets.append(chip);
  }

  const models = document.getElementById("scene-model");
  for (const item of MODELS) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.label} — ${item.blurb}`;
    models.append(option);
  }
  models.addEventListener("change", () => {
    model = models.value;
    refresh();
  });

  const tags = document.getElementById("scene-tags");
  for (const [tag, label] of VOCAL_TAGS) {
    const chip = button("tag", label);
    chip.addEventListener("click", () => {
      const target = focused || document.querySelector("#scene-turns textarea");
      if (target) insertTag(target, tag);
    });
    tags.append(chip);
  }

  document.getElementById("scene-speakers").addEventListener("input", onSpeakerInput);
  document.getElementById("scene-speakers").addEventListener("change", onSpeakerInput);
  document.getElementById("scene-speakers").addEventListener("click", (event) => {
    if (event.target.closest("[data-action='drop-speaker']")) onSpeakerInput(event);
  });
  document.getElementById("scene-turns").addEventListener("input", onTurnInput);
  document.getElementById("scene-turns").addEventListener("change", onTurnInput);
  document.getElementById("scene-turns").addEventListener("focusin", (event) => {
    if (event.target.dataset.field === "text") focused = event.target;
  });
  document.getElementById("scene-turns").addEventListener("click", onTurnClick);
  document.getElementById("scene-add-speaker").addEventListener("click", addSpeaker);
  document.getElementById("scene-add-turn").addEventListener("click", () => {
    scene.turns.push({
      speaker: scene.speakers[0].name,
      style: "",
      text: "",
    });
    render();
    document.querySelector("#scene-turns textarea:last-of-type")?.focus();
  });
  goEl.addEventListener("click", run);
  stopEl.addEventListener("click", () => abort?.abort());
  render();
}

function payload() {
  return {
    model,
    format: "wav-24",
    speakers: scene.speakers.map((speaker) => ({
      name: speaker.name,
      voice: speaker.custom?.trim() || speaker.voice,
    })),
    turns: scene.turns.map((turn) => ({
      speaker: turn.speaker,
      text: turn.text,
      style: turn.style,
    })),
  };
}

function refresh() {
  const body = payload();
  const built = buildSpeechRequest(body);
  requestEl.textContent = previewRequest(body);
  const preset = SCENES.find((item) => item.id === scene.id);
  const bits = [scene.note || preset?.note || ""];
  if (built.joinTurns) {
    bits.push("A designed voice is in this scene, so each turn is spoken alone and then joined. Pipes and overlap need two studio voices in one request.");
  }
  noteEl.textContent = bits.filter(Boolean).join(" ");
  for (const chip of document.querySelectorAll("#scene-presets .chip")) {
    chip.setAttribute("aria-pressed", String(chip.dataset.scene === scene.id));
  }
}

function render() {
  renderSpeakers();
  renderTurns();
  refresh();
}

function renderSpeakers() {
  const host = document.getElementById("scene-speakers");
  host.replaceChildren();
  scene.speakers.forEach((speaker, index) => {
    const card = document.createElement("div");
    card.className = "speaker";
    card.dataset.index = String(index);

    const name = document.createElement("input");
    name.dataset.field = "name";
    name.value = speaker.name;
    name.maxLength = 40;
    name.setAttribute("aria-label", `Speaker ${index + 1} name`);

    const voice = document.createElement("select");
    voice.dataset.field = "voice";
    voice.setAttribute("aria-label", `${speaker.name} voice`);
    const voices = PREBUILT.map((item) => item.name);
    if (speaker.voice && !voices.includes(speaker.voice)) voices.unshift(speaker.voice);
    for (const item of voices) {
      const option = document.createElement("option");
      option.value = item;
      option.textContent = item;
      option.selected = item === speaker.voice;
      voice.append(option);
    }

    const custom = document.createElement("input");
    custom.dataset.field = "custom";
    custom.placeholder = "voice_…";
    custom.value = speaker.custom || "";
    custom.setAttribute("aria-label", `${speaker.name} custom voice id`);
    custom.spellcheck = false;

    card.append(name, voice, custom);
    if (scene.speakers.length > 1) {
      const drop = button("ghost", "Drop");
      drop.dataset.action = "drop-speaker";
      card.append(drop);
    }
    host.append(card);
  });
  document.getElementById("scene-add-speaker").hidden = scene.speakers.length >= 2;
}

function renderTurns() {
  const host = document.getElementById("scene-turns");
  host.replaceChildren();
  scene.turns.forEach((turn, index) => {
    const row = document.createElement("article");
    row.className = "turn";
    row.dataset.index = String(index);

    const who = document.createElement("select");
    who.dataset.field = "speaker";
    who.setAttribute("aria-label", `Turn ${index + 1} speaker`);
    for (const speaker of scene.speakers) {
      const option = document.createElement("option");
      option.value = speaker.name;
      option.textContent = speaker.name;
      option.selected = speaker.name === turn.speaker;
      who.append(option);
    }

    const style = document.createElement("input");
    style.dataset.field = "style";
    style.placeholder = "Style for this turn";
    style.value = turn.style;
    style.setAttribute("aria-label", `Turn ${index + 1} style`);

    const text = document.createElement("textarea");
    text.dataset.field = "text";
    text.dir = "auto";
    text.rows = 3;
    text.value = turn.text;
    text.setAttribute("aria-label", `Turn ${index + 1} line`);

    const drop = button("ghost", "Remove");
    drop.dataset.action = "drop-turn";
    drop.hidden = scene.turns.length === 1;

    const head = document.createElement("div");
    head.className = "turn-head";
    head.append(who, style, drop);
    row.append(head, text);
    host.append(row);
  });
}

function onSpeakerInput(event) {
  const card = event.target.closest("[data-index]");
  if (!card) return;
  const index = Number(card.dataset.index);
  const speaker = scene.speakers[index];
  const field = event.target.dataset.field;
  if (field === "name") {
    const previous = speaker.name;
    speaker.name = event.target.value;
    for (const turn of scene.turns) {
      if (turn.speaker === previous) turn.speaker = speaker.name;
    }
    for (const select of document.querySelectorAll('#scene-turns [data-field="speaker"]')) {
      const selected = scene.turns[Number(select.closest("[data-index]").dataset.index)].speaker;
      select.replaceChildren();
      for (const item of scene.speakers) {
        const option = document.createElement("option");
        option.value = item.name;
        option.textContent = item.name || "…";
        option.selected = item.name === selected;
        select.append(option);
      }
    }
  } else if (field === "voice") speaker.voice = event.target.value;
  else if (field === "custom") speaker.custom = event.target.value;
  else if (event.target.dataset.action === "drop-speaker") {
    const removed = scene.speakers[index].name;
    scene.speakers.splice(index, 1);
    for (const turn of scene.turns) {
      if (turn.speaker === removed) turn.speaker = scene.speakers[0].name;
    }
    scene.id = "";
    render();
    return;
  }
  scene.id = "";
  refresh();
}

function onTurnInput(event) {
  const row = event.target.closest("[data-index]");
  if (!row) return;
  const turn = scene.turns[Number(row.dataset.index)];
  const field = event.target.dataset.field;
  if (!field) return;
  turn[field] = event.target.value;
  scene.id = "";
  refresh();
}

function onTurnClick(event) {
  if (event.target.dataset.action !== "drop-turn") return;
  const index = Number(event.target.closest("[data-index]").dataset.index);
  scene.turns.splice(index, 1);
  scene.id = "";
  render();
}

function addSpeaker() {
  if (scene.speakers.length >= 2) return;
  const name = scene.speakers.some((speaker) => speaker.name === "Guest") ? "Guest 2" : "Guest";
  scene.speakers.push({ name, voice: "Puck", custom: "" });
  scene.id = "";
  render();
}

async function run() {
  errorEl.textContent = "";
  const body = payload();
  const built = buildSpeechRequest(body);
  if (built.error) {
    errorEl.textContent = built.error;
    return;
  }
  abort?.abort();
  abort = new AbortController();
  setBusy(true);
  player.setStatus(built.joinTurns ? "Recording each turn…" : "In the booth…");
  try {
    await unlockAudio();
    const take = await speak(body, { signal: abort.signal });
    await player.loadTake({
      audioBase64: take.audioBase64,
      mimeType: take.mimeType,
      sampleRate: take.sampleRate,
      meta: describeTake(take),
      note: take.joined ? "Each turn was spoken alone, then joined." : "Scene ready.",
    });
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

function setBusy(busy) {
  stopClock();
  goEl.disabled = busy;
  stopEl.hidden = !busy;
  if (!busy) {
    goEl.textContent = "Play scene";
    return;
  }
  const started = performance.now();
  stopClock = elapsed(() => {
    goEl.textContent = `Playing scene… ${((performance.now() - started) / 1000).toFixed(1)}s`;
  });
}
