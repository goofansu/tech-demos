import { DESIGN_LANGUAGES, PERSONAS } from "../lib/catalog.js";
import { MODELS } from "../lib/request.js";
import { createVoice, elapsed, fetchVoice, listVoices, removeVoice, speak } from "./api.js";
import { unlockAudio } from "./audio.js";
import { button, describeTake } from "./format.js";
import { mountPlayer } from "./player.js";

let samplePlayer;
let linePlayer;
let abort;
let stopClock = () => {};
let loaded = false;

export function initDesign({ onUseVoice }) {
  samplePlayer = mountPlayer(document.getElementById("design-sample"), "Sample");
  linePlayer = mountPlayer(document.getElementById("design-line-player"), "Line");

  const languages = document.getElementById("design-language");
  for (const [code, label] of DESIGN_LANGUAGES) {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = label;
    languages.append(option);
  }
  const models = document.getElementById("design-model");
  for (const model of MODELS) {
    const option = document.createElement("option");
    option.value = model.id;
    option.textContent = model.label;
    models.append(option);
  }
  const presets = document.getElementById("design-presets");
  for (const persona of PERSONAS) {
    const chip = button("chip", persona.name);
    chip.addEventListener("click", () => applyPersona(persona));
    presets.append(chip);
  }
  applyPersona(PERSONAS[0]);

  document.getElementById("design-go").addEventListener("click", () => design());
  document.getElementById("design-say").addEventListener("click", () => sayLine(onUseVoice));
  document.getElementById("design-use").addEventListener("click", () => {
    const id = document.getElementById("design-id").value;
    if (!id) return;
    onUseVoice({ id, name: document.getElementById("design-name").value || id });
  });

  const list = document.getElementById("design-stored");
  list.addEventListener("click", (event) => onStoredClick(event, onUseVoice));
}

export function showDesign() {
  if (!loaded) {
    loaded = true;
    refreshStored();
  }
}

function applyPersona(persona) {
  document.getElementById("design-name").value = persona.name;
  document.getElementById("design-gender").value = persona.gender;
  document.getElementById("design-language").value = persona.language;
  document.getElementById("design-prompt").value = persona.prompt;
  document.getElementById("design-line").value = persona.line;
  document.getElementById("design-style").value = persona.style;
}

function formVoice() {
  return {
    displayName: document.getElementById("design-name").value.trim(),
    gender: document.getElementById("design-gender").value,
    languageCode: document.getElementById("design-language").value,
    prompt: document.getElementById("design-prompt").value.trim(),
    model: document.getElementById("design-model").value,
  };
}

async function design() {
  const errorEl = document.getElementById("design-error");
  errorEl.textContent = "";
  const go = document.getElementById("design-go");
  abort?.abort();
  abort = new AbortController();
  go.disabled = true;
  stopClock();
  const started = performance.now();
  stopClock = elapsed(() => {
    go.textContent = `Designing… ${((performance.now() - started) / 1000).toFixed(1)}s`;
  });
  samplePlayer.setStatus("Designing a voice and its preview…");
  try {
    await unlockAudio();
    const voice = await createVoice(formVoice(), abort.signal);
    document.getElementById("design-id").value = voice.id;
    document.getElementById("design-current").hidden = false;
    document.getElementById("design-current-name").textContent = voice.name || voice.id;
    document.getElementById("design-current-id").textContent = voice.id;
    if (voice.sampleBase64) {
      await samplePlayer.loadTake({
        audioBase64: voice.sampleBase64,
        mimeType: voice.sampleMimeType || "audio/wav",
        sampleRate: 24000,
        meta: voice.id,
        note: "This preview came back with the new voice.",
      });
    } else {
      samplePlayer.setStatus("Voice saved. The preview audio was empty, so say a line below.");
    }
    await refreshStored();
  } catch (err) {
    if (err.name !== "AbortError") {
      errorEl.textContent = err.message;
      samplePlayer.fail(err.message);
    }
  } finally {
    stopClock();
    go.disabled = false;
    go.textContent = "Design voice";
  }
}

async function sayLine() {
  const errorEl = document.getElementById("design-say-error");
  errorEl.textContent = "";
  const id = document.getElementById("design-id").value.trim();
  if (!id) {
    errorEl.textContent = "Design a voice first.";
    return;
  }
  const say = document.getElementById("design-say");
  say.disabled = true;
  linePlayer.setStatus("Speaking with the designed voice…");
  try {
    await unlockAudio();
    const take = await speak({
      model: document.getElementById("design-model").value,
      format: "wav-24",
      speakers: [{ name: "Persona", voice: id }],
      turns: [
        {
          speaker: "Persona",
          text: document.getElementById("design-line").value,
          style: document.getElementById("design-style").value,
        },
      ],
    });
    await linePlayer.loadTake({
      audioBase64: take.audioBase64,
      mimeType: take.mimeType,
      sampleRate: take.sampleRate,
      meta: describeTake(take),
      note: "Same persona, this line, this style.",
    });
  } catch (err) {
    errorEl.textContent = err.message;
    linePlayer.fail(err.message);
  } finally {
    say.disabled = false;
  }
}

async function refreshStored() {
  const host = document.getElementById("design-stored");
  const note = document.getElementById("design-stored-note");
  host.replaceChildren();
  try {
    const page = await listVoices({ type: ["prompted"], page_size: "30" });
    const voices = (page.voices || []).filter((voice) => voice.type === "prompted" || voice.id?.startsWith("voice_"));
    note.textContent = voices.length
      ? "Stored on this API key for up to a year. Delete the ones you are done with."
      : "No designed voices stored on this key yet.";
    for (const voice of voices) host.append(storedRow(voice));
  } catch (err) {
    note.textContent = err.message;
  }
}

function storedRow(voice) {
  const row = document.createElement("article");
  row.className = "stored";
  row.dataset.id = voice.id;
  const title = document.createElement("h3");
  title.textContent = voice.name || voice.id;
  const meta = document.createElement("p");
  meta.className = "hint";
  meta.textContent = [voice.language, voice.gender, voice.id].filter(Boolean).join(" · ");
  const blurb = document.createElement("p");
  blurb.textContent = voice.description || "";
  const actions = document.createElement("div");
  actions.className = "row-actions";
  for (const [action, label] of [
    ["sample", "Play sample"],
    ["use", "Use in Speak"],
    ["delete", "Delete"],
  ]) {
    const control = button("ghost", label);
    control.dataset.action = action;
    actions.append(control);
  }
  row.append(title, meta, blurb, actions);
  return row;
}

async function onStoredClick(event, onUseVoice) {
  const control = event.target.closest("button");
  if (!control) return;
  const row = control.closest(".stored");
  const id = row?.dataset.id;
  if (!id) return;
  const action = control.dataset.action;
  if (action === "use") {
    const name = row.querySelector("h3")?.textContent || id;
    onUseVoice({ id, name });
    return;
  }
  if (action === "delete") {
    if (control.dataset.armed !== "yes") {
      control.dataset.armed = "yes";
      control.textContent = "Confirm delete";
      setTimeout(() => {
        if (control.isConnected) {
          control.dataset.armed = "";
          control.textContent = "Delete";
        }
      }, 4000);
      return;
    }
    control.disabled = true;
    try {
      await removeVoice(id);
      if (document.getElementById("design-id").value === id) {
        document.getElementById("design-id").value = "";
        document.getElementById("design-current").hidden = true;
      }
      await refreshStored();
    } catch (err) {
      document.getElementById("design-stored-note").textContent = err.message;
      control.disabled = false;
    }
    return;
  }
  if (action === "sample") {
    control.disabled = true;
    try {
      await unlockAudio();
      const voice = await fetchVoice(id);
      if (!voice.sampleBase64) {
        samplePlayer.setStatus("This voice has no stored preview. Say a line with it instead.");
        return;
      }
      await samplePlayer.loadTake({
        audioBase64: voice.sampleBase64,
        mimeType: voice.sampleMimeType || "audio/wav",
        sampleRate: 24000,
        meta: voice.name || id,
      });
    } catch (err) {
      samplePlayer.fail(err.message);
    } finally {
      control.disabled = false;
    }
  }
}
