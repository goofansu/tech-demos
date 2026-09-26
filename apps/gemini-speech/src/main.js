import { getStatus } from "./api.js";
import { initDesign, showDesign } from "./design.js";
import { initLibrary, showLibrary } from "./library.js";
import { initScene } from "./scene.js";
import { initSpeak, setSpeakVoice } from "./speak.js";

const tabs = ["speak", "scene", "design", "library"];

initSpeak();
initScene();
initDesign({ onUseVoice: useVoice });
initLibrary({ onUseVoice: useVoice });

for (const tab of document.querySelectorAll("[role='tab']")) {
  tab.addEventListener("click", () => show(tab.dataset.tab));
}

document.querySelector("[role='tablist']").addEventListener("keydown", (event) => {
  const current = tabs.indexOf(document.querySelector("[role='tab'][aria-selected='true']")?.dataset.tab);
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
  event.preventDefault();
  const next = event.key === "ArrowRight" ? (current + 1) % tabs.length : (current + tabs.length - 1) % tabs.length;
  show(tabs[next]);
  document.getElementById(`tab-${tabs[next]}`).focus();
});

const initial = location.hash.replace("#", "");
show(tabs.includes(initial) ? initial : "speak");

getStatus()
  .then((status) => {
    const node = document.getElementById("key-status");
    node.textContent = status.ready ? "Key ready" : "No API key";
    node.classList.toggle("is-ready", Boolean(status.ready));
    node.classList.toggle("is-missing", !status.ready);
    if (!status.ready) {
      document.getElementById("key-banner").hidden = false;
    }
  })
  .catch((err) => {
    document.getElementById("key-status").textContent = err.message;
  });

function show(id) {
  for (const tab of tabs) {
    const on = tab === id;
    document.getElementById(`panel-${tab}`).hidden = !on;
    const button = document.getElementById(`tab-${tab}`);
    button.setAttribute("aria-selected", String(on));
    button.tabIndex = on ? 0 : -1;
  }
  if (id === "design") showDesign();
  if (id === "library") showLibrary();
  if (location.hash !== `#${id}`) history.replaceState(null, "", `#${id}`);
}

function useVoice(voice) {
  setSpeakVoice(voice);
  show("speak");
}
