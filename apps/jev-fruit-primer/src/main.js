import { fetchStatus } from "./api.js";
import "./style.css";
import { lessonFromHash, lessons, planned } from "./lessons/index.js";
import { mountPlayer } from "./player.js";

const nav = document.querySelector("#nav");
const lede = document.querySelector("#lede");
const status = document.querySelector("#status");
const missing = document.querySelector("#missing");

const dom = {
  stage: document.querySelector("#stage"),
  fruit: document.querySelector("#fruit"),
  fruitCard: document.querySelector("#fruit-card"),
  request: document.querySelector("#request"),
  response: document.querySelector("#response"),
  reqNoteText: document.querySelector("#req-note-text"),
  resNoteText: document.querySelector("#res-note-text"),
  sendDot: document.querySelector("#send-dot"),
  bars: document.querySelector("#bars"),
  scale: document.querySelector("#scale"),
  scaleFill: document.querySelector("#scale-fill"),
  scaleLabels: document.querySelector("#scale-labels"),
  scaleValue: document.querySelector("#scale-value"),
  weights: document.querySelector("#weights"),
  meter: document.querySelector("#meter"),
  fill: document.querySelector("#meter-fill"),
  mark: document.querySelector("#meter-mark"),
  meterValue: document.querySelector("#meter-value"),
  step: document.querySelector("#step-label"),
  title: document.querySelector("#cap-title"),
  body: document.querySelector("#cap-body"),
  prev: document.querySelector("#prev"),
  next: document.querySelector("#next"),
  play: document.querySelector("#play"),
  ticks: document.querySelector("#ticks"),
};

let stop = () => {};

renderNav();
boot(location.hash);
window.addEventListener("hashchange", () => boot(location.hash));

fetchStatus()
  .then((data) => {
    if (data.ready) return;
    status.hidden = false;
    status.textContent = "No API key is set, so this page cannot ask Jev.";
  })
  .catch(() => {
    status.hidden = false;
    status.textContent = "This page could not check whether Jev is reachable.";
  });

function boot(hash) {
  stop();
  const lesson = lessonFromHash(hash);
  if (!lesson) {
    const id = (hash || "").replace(/^#/, "");
    const plannedItem = planned.find((item) => item.id === id);
    missing.hidden = false;
    document.querySelector("#stage").hidden = true;
    document.querySelector("#caption").hidden = true;
    lede.textContent = plannedItem
      ? `${plannedItem.label} is the next lesson. It uses the same request shape, with a different question type.`
      : "That lesson is not on this primer.";
    missing.textContent = "Open Noul to watch a live request get built.";
    renderNav();
    return;
  }
  missing.hidden = true;
  document.querySelector("#stage").hidden = false;
  document.querySelector("#caption").hidden = false;
  lede.textContent = lesson.lede;
  document.title = `${lesson.label} · Fruit primer`;
  renderNav();
  stop = mountPlayer(lesson, dom);
}

function renderNav() {
  const current = (location.hash || "#noul").replace(/^#/, "") || "noul";
  nav.replaceChildren();
  planned.forEach((item, index) => {
    const ready = lessons.some((lesson) => lesson.id === item.id);
    if (!ready) {
      const span = document.createElement("span");
      span.className = "nav-soon";
      span.textContent = `${index + 1} ${item.label}`;
      span.title = "Next lesson";
      nav.append(span);
      return;
    }
    const link = document.createElement("a");
    link.href = `#${item.id}`;
    link.textContent = `${index + 1} ${item.label}`;
    if (item.id === current) link.setAttribute("aria-current", "page");
    nav.append(link);
  });
}
