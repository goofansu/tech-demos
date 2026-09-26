import { AUDITION_LINE, LIBRARY_CONTEXTS, LIBRARY_LANGUAGES } from "../lib/catalog.js";
import { MODELS } from "../lib/request.js";
import { listVoices, speak } from "./api.js";
import { unlockAudio } from "./audio.js";
import { button, describeTake, setActionPending } from "./format.js";
import { mountPlayer } from "./player.js";

let player;
let nextToken = "";
let loaded = false;
let onUse = () => {};

export function initLibrary({ onUseVoice }) {
  onUse = onUseVoice;
  player = mountPlayer(document.getElementById("lib-player"), "Audition");
  fillSelect("lib-language", LIBRARY_LANGUAGES);
  fillSelect("lib-context", LIBRARY_CONTEXTS.map((value) => [value, value || "Any context"]));
  document.getElementById("lib-form").addEventListener("submit", (event) => {
    event.preventDefault();
    search();
  });
  document.getElementById("lib-more").addEventListener("click", () => search(nextToken));
  document.getElementById("lib-results").addEventListener("click", onResultClick);
}

export function showLibrary() {
  if (!loaded) {
    loaded = true;
    search();
  }
}

function fillSelect(id, pairs) {
  const select = document.getElementById(id);
  for (const [value, label] of pairs) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
  }
}

function filters(pageToken) {
  const params = { page_size: "24", type: [document.getElementById("lib-type").value || "prebuilt"] };
  const search = document.getElementById("lib-search").value.trim();
  const language = document.getElementById("lib-language").value;
  const gender = document.getElementById("lib-gender").value;
  const pitch = document.getElementById("lib-pitch").value;
  const context = document.getElementById("lib-context").value;
  if (search) params.search = search;
  if (language) params.language_code = [language];
  if (gender) params.gender = [gender];
  if (pitch) params.pitch = [pitch];
  if (context) params.contexts = [context];
  if (pageToken) params.page_token = pageToken;
  return params;
}

async function search(pageToken = "") {
  const errorEl = document.getElementById("lib-error");
  const results = document.getElementById("lib-results");
  const more = document.getElementById("lib-more");
  errorEl.textContent = "";
  if (!pageToken) {
    results.replaceChildren();
    results.append(hint("Looking through the catalog…"));
  }
  more.hidden = true;
  try {
    const page = await listVoices(filters(pageToken));
    if (!pageToken) results.replaceChildren();
    const voices = page.voices || [];
    if (!voices.length && !pageToken) results.append(hint("No voices matched those filters."));
    for (const voice of voices) results.append(card(voice));
    nextToken = page.nextPageToken || "";
    more.hidden = !nextToken;
  } catch (err) {
    if (!pageToken) results.replaceChildren();
    errorEl.textContent = err.message;
  }
}

function card(voice) {
  const article = document.createElement("article");
  article.className = "voice-card";
  article.dataset.id = voice.id;
  article.dataset.name = voice.name || voice.id;
  const title = document.createElement("h3");
  title.textContent = voice.name || voice.id;
  const meta = document.createElement("p");
  meta.className = "hint";
  meta.textContent = [voice.language, voice.accent, voice.gender, voice.pitch, voice.context]
    .filter(Boolean)
    .join(" · ");
  const blurb = document.createElement("p");
  blurb.textContent = voice.description || voice.persona || "Catalog voice";
  const actions = document.createElement("div");
  actions.className = "row-actions";
  const audition = button("ghost", "Audition");
  audition.dataset.action = "audition";
  const use = button("ghost", "Use in Speak");
  use.dataset.action = "use";
  actions.append(audition, use);
  article.append(title, meta, blurb, actions);
  return article;
}

function hint(text) {
  const p = document.createElement("p");
  p.className = "hint";
  p.textContent = text;
  return p;
}

async function onResultClick(event) {
  const control = event.target.closest("button");
  const cardEl = event.target.closest(".voice-card");
  if (!control || !cardEl) return;
  const id = cardEl.dataset.id;
  const name = cardEl.dataset.name;
  if (control.dataset.action === "use") {
    onUse({ id, name });
    return;
  }
  setActionPending(control, true);
  player.setStatus(`Auditioning ${name}…`);
  try {
    await unlockAudio();
    const take = await speak({
      model: MODELS[0].id,
      format: "wav-24",
      speakers: [{ name: "Narrator", voice: id }],
      turns: [{ speaker: "Narrator", text: AUDITION_LINE, style: "" }],
    });
    await player.loadTake({
      audioBase64: take.audioBase64,
      mimeType: take.mimeType,
      sampleRate: take.sampleRate,
      meta: `${name} · ${describeTake(take)}`,
      note: AUDITION_LINE,
    });
  } catch (err) {
    player.fail(err.message);
  } finally {
    setActionPending(control, false);
  }
}
