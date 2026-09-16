import "./style.css";
import { GALLERY, PALETTES, renderBotSvg } from "./bots.js";
import { isMuted, loadMutePreference, playPeekaboo, setMuted } from "./audio.js";

const zoo = document.getElementById("zoo");
const live = document.getElementById("peek-live");
const muteBtn = document.getElementById("mute-toggle");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const PEEK_MS = 1400;
const PEEK_MS_REDUCED = 280;
const PEEK_STYLES = ["lid", "paws", "duck"];

function prefersReduced() {
  return reduceMotion.matches;
}

function syncMuteButton() {
  const on = !isMuted();
  muteBtn.setAttribute("aria-pressed", String(!on));
  muteBtn.querySelector(".pill-icon").textContent = on ? "🔊" : "🔇";
  muteBtn.querySelector(".pill-label").textContent = on ? "Sound on" : "Muted";
}

function announce(text) {
  live.textContent = "";
  requestAnimationFrame(() => {
    live.textContent = text;
  });
}

function cardTemplate([shape, color], index) {
  const pal = PALETTES[color];
  const style = PEEK_STYLES[index % PEEK_STYLES.length];
  const article = document.createElement("button");
  article.type = "button";
  article.className = "bot-card";
  article.dataset.shape = shape;
  article.dataset.color = color;
  article.dataset.peek = style;
  article.style.setProperty("--bot-base", pal.base);
  article.style.setProperty("--bot-light", pal.light);
  article.style.setProperty("--bot-dark", pal.dark);
  article.setAttribute(
    "aria-label",
    `Play peekaboo with the ${color} ${shape} bot`,
  );

  article.innerHTML = `
    <span class="stage">
      <span class="sparkles" aria-hidden="true">
        <i></i><i></i><i></i>
      </span>
      <span class="figure">${renderBotSvg(shape, color)}</span>
      <span class="lid" aria-hidden="true"></span>
      <span class="paws" aria-hidden="true">
        <span class="paw left"></span>
        <span class="paw right"></span>
      </span>
    </span>
    <span class="meta">
      <span class="shape-name">${shape}</span>
      <span class="color-chip">${color}</span>
    </span>
  `;
  return article;
}

function playCard(card) {
  if (card.classList.contains("playing")) return;

  const reduced = prefersReduced();
  const duration = reduced ? PEEK_MS_REDUCED : PEEK_MS;
  const shape = card.dataset.shape;
  const color = card.dataset.color;

  card.classList.add("playing");
  if (reduced) card.classList.add("reduced");

  announce(`Peekaboo! The ${color} ${shape} hid and came back.`);
  playPeekaboo();

  window.setTimeout(() => {
    card.classList.remove("playing", "reduced");
  }, duration);
}

function mount() {
  const frag = document.createDocumentFragment();
  for (const [i, pair] of GALLERY.entries()) {
    frag.appendChild(cardTemplate(pair, i));
  }
  zoo.appendChild(frag);

  zoo.addEventListener("click", (event) => {
    const card = event.target.closest(".bot-card");
    if (card) playCard(card);
  });

  zoo.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest(".bot-card");
    if (!card) return;
    event.preventDefault();
    playCard(card);
  });
}

loadMutePreference();
syncMuteButton();
muteBtn.addEventListener("click", () => {
  setMuted(!isMuted());
  syncMuteButton();
});

mount();
