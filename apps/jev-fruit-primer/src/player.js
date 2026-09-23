import { evaluate } from "./api.js";
import { drawings } from "./fruits.js";
import { mountJson } from "./json-view.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function mountPlayer(lesson, dom) {
  const updateRequest = mountJson(dom.request);
  const updateResponse = mountJson(dom.response);
  const bag = { results: {}, errors: {} };
  let index = 0;
  let playing = !reduceMotion;
  let timer = 0;
  let token = 0;
  let meterValue = 0;
  let scaleRatio = 0;
  let shownFruit = null;
  let cancelled = false;

  for (const id of lesson.calls) {
    evaluate(lesson.payload(id))
      .then((data) => {
        if (cancelled) return;
        bag.results[id] = data;
        if (lesson.scenes[index]?.needs === id) show(index);
      })
      .catch((err) => {
        if (cancelled) return;
        bag.errors[id] = err instanceof Error ? err.message : String(err);
        if (lesson.scenes[index]?.needs === id) show(index);
      });
  }

  const onPrev = () => step(-1);
  const onNext = () => step(1);
  const onTick = (event) => {
    const button = event.target.closest("button[data-index]");
    if (!button) return;
    playing = false;
    syncPlayLabel();
    go(Number(button.dataset.index));
  };
  dom.prev.addEventListener("click", onPrev);
  dom.next.addEventListener("click", onNext);
  dom.play.addEventListener("click", toggle);
  dom.ticks.addEventListener("click", onTick);
  window.addEventListener("keydown", onKey);

  renderTicks();
  show(0);
  syncPlayLabel();

  return () => {
    cancelled = true;
    window.clearTimeout(timer);
    window.removeEventListener("keydown", onKey);
    dom.prev.removeEventListener("click", onPrev);
    dom.next.removeEventListener("click", onNext);
    dom.play.removeEventListener("click", toggle);
    dom.ticks.removeEventListener("click", onTick);
  };

  function onKey(event) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    } else if (event.key === " ") {
      event.preventDefault();
      toggle();
    }
  }

  function step(delta) {
    playing = false;
    syncPlayLabel();
    go(index + delta);
  }

  function toggle() {
    if (index >= lesson.scenes.length - 1 && !playing) {
      playing = true;
      syncPlayLabel();
      go(0);
      return;
    }
    playing = !playing;
    syncPlayLabel();
    if (playing) arm();
    else window.clearTimeout(timer);
  }

  function go(next) {
    index = Math.max(0, Math.min(lesson.scenes.length - 1, next));
    show(index);
  }

  function show(next) {
    index = next;
    token += 1;
    const mine = token;
    const scene = lesson.scenes[index];
    const view = lesson.present(scene, bag);
    paint(view, scene);
    window.clearTimeout(timer);
    if (!playing) return;
    if (view.pending) return;
    arm(mine);
  }

  function arm(mine = token) {
    const scene = lesson.scenes[index];
    const wait = reduceMotion ? 0 : scene.dwell ?? 4000;
    timer = window.setTimeout(() => {
      if (mine !== token || !playing) return;
      if (index < lesson.scenes.length - 1) show(index + 1);
      else {
        playing = false;
        syncPlayLabel();
      }
    }, wait);
  }

  function paint(view, scene) {
    paintFruit(view);
    updateRequest(view.request, view.requestFocus === "fruit" ? null : view.requestFocus);
    updateResponse(view.response, view.responseFocus);
    dom.step.textContent = `Step ${index + 1} of ${lesson.scenes.length}`;
    dom.title.textContent = view.title;
    setRich(dom.body, view.error ? `${view.body} ${view.error}` : view.body);
    dom.prev.disabled = index === 0;
    dom.next.disabled = index === lesson.scenes.length - 1;
    paintNotes(view);
    paintMeter(view);
    paintBars(view);
    paintScale(view);
    paintWeights(view);
    renderTicks();
    dom.stage.dataset.phase = view.phase;
    dom.stage.dataset.scene = scene.id;
    revealFocus();
  }

  function revealFocus() {
    if (!window.matchMedia("(max-width: 900px)").matches) return;
    const target = [...dom.stage.querySelectorAll(
      ".line.hot, .fact.hot, .bar-row.hot, .meter.hot, .scale-track.hot, .weights.notice, .card.hot",
    )].find((el) => !el.hidden && el.getClientRects().length > 0);
    if (!target) return;
    const stage = dom.stage;
    const behavior = reduceMotion ? "auto" : "smooth";
    if (stage.scrollHeight > stage.clientHeight + 2) {
      const stageRect = stage.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const visible = targetRect.top >= stageRect.top - 1 && targetRect.bottom <= stageRect.bottom + 1;
      if (visible) return;
      const delta = targetRect.top - stageRect.top;
      stage.scrollTo({ top: Math.max(0, stage.scrollTop + delta - 12), behavior });
      return;
    }
    const caption = document.querySelector(".caption");
    const captionH = caption ? caption.getBoundingClientRect().height : 0;
    const targetRect = target.getBoundingClientRect();
    const visibleBottom = window.innerHeight - captionH - 8;
    if (targetRect.top >= 8 && targetRect.bottom <= visibleBottom) return;
    window.scrollTo({
      top: Math.max(0, window.scrollY + targetRect.top - 12),
      behavior,
    });
  }

  function paintFruit(view) {
    const fruit = lesson.fruit(view.fruitId);
    const hot = view.requestFocus === "fruit";
    const factHot = hotFacts(view.requestFocus);
    dom.fruitCard.classList.toggle("hot", hot);
    if (shownFruit !== fruit.id) {
      shownFruit = fruit.id;
      dom.fruit.replaceChildren();
      const body = document.createElement("div");
      body.className = "fruit-body";
      if (!reduceMotion) body.classList.add("rise");
      const drawing = document.createElement("div");
      drawing.className = "drawing";
      drawing.innerHTML = drawings[fruit.drawing || fruit.id] ?? "";
      const name = document.createElement("p");
      name.className = "fruit-name";
      name.textContent = fruit.name;
      const list = document.createElement("dl");
      list.className = "facts";
      body.append(drawing, name, list);
      dom.fruit.append(body);
    }
    const list = dom.fruit.querySelector(".facts");
    list.replaceChildren();
    for (const [key, value] of Object.entries(fruit.state)) {
      const row = document.createElement("div");
      row.className = "fact";
      if (factHot === "all" || factHot.has(key)) row.classList.add("hot");
      const term = document.createElement("dt");
      term.textContent = key;
      const def = document.createElement("dd");
      def.textContent = value;
      row.append(term, def);
      list.append(row);
    }
  }

  function paintNotes(view) {
    dom.sendDot.hidden = view.phase !== "send";
    if (view.phase === "send") {
      dom.reqNoteText.textContent = view.pending ? "Asking Jev…" : "POST /v1/systemone";
    } else if (!view.request) {
      dom.reqNoteText.textContent = "The request is built one field at a time.";
    } else {
      dom.reqNoteText.textContent = "";
    }

    if (view.error) {
      dom.resNoteText.textContent = "The call did not return an answer.";
      return;
    }
    if (view.pending) {
      dom.resNoteText.textContent = "Asking Jev…";
      return;
    }
    if (view.response?.model) {
      dom.resNoteText.textContent = `Live reply · ${view.response.model}`;
      return;
    }
    dom.resNoteText.textContent = "The reply will land here.";
  }

  function paintMeter(view) {
    if (!view.meter) {
      dom.meter.hidden = true;
      return;
    }
    dom.meter.hidden = false;
    dom.meter.classList.toggle("hot", view.meter.hot);
    dom.mark.hidden = !view.meter.mark;
    const from = meterValue;
    const to = view.meter.value;
    meterValue = to;
    dom.meterValue.textContent = JSON.stringify(to);
    if (reduceMotion) {
      dom.fill.style.transform = `scaleX(${to})`;
      return;
    }
    dom.fill.style.transform = `scaleX(${from})`;
    requestAnimationFrame(() => {
      dom.fill.style.transform = `scaleX(${to})`;
    });
  }

  function paintBars(view) {
    if (!view.bars) {
      dom.bars.hidden = true;
      return;
    }
    dom.bars.hidden = false;
    const signature = view.bars.rows.map((row) => row.key).join("|");
    const fresh = dom.bars.dataset.keys !== signature;
    if (fresh) {
      dom.bars.dataset.keys = signature;
      dom.bars.replaceChildren();
      for (const row of view.bars.rows) {
        const item = document.createElement("div");
        item.className = "bar-row";
        item.dataset.key = row.key;
        const key = document.createElement("span");
        key.className = "bar-key";
        key.textContent = row.key;
        const track = document.createElement("span");
        track.className = "bar-track";
        const fill = document.createElement("span");
        fill.className = "bar-fill";
        track.append(fill);
        const prob = document.createElement("span");
        prob.className = "bar-p";
        item.append(key, track, prob);
        dom.bars.append(item);
      }
      const sum = document.createElement("p");
      sum.className = "bar-sum";
      dom.bars.append(sum);
    }
    dom.bars.classList.toggle("notice", view.bars.mode === "all");
    for (const row of view.bars.rows) {
      const item = dom.bars.querySelector(`[data-key="${CSS.escape(row.key)}"]`);
      if (!item) continue;
      const winner = view.bars.mode === "winner" && row.picked;
      item.classList.toggle("hot", winner);
      item.querySelector(".bar-p").textContent = JSON.stringify(row.p);
      const fill = item.querySelector(".bar-fill");
      const next = `scaleX(${row.p})`;
      if (reduceMotion || !fresh) {
        fill.style.transform = next;
      } else {
        fill.style.transform = "scaleX(0)";
        requestAnimationFrame(() => {
          fill.style.transform = next;
        });
      }
    }
    const total = view.bars.rows.reduce((sum, row) => sum + row.p, 0);
    const sum = dom.bars.querySelector(".bar-sum");
    const shown = Math.abs(total - 1) < 0.001 ? "1" : String(Math.round(total * 1000) / 1000);
    sum.textContent = `${view.bars.rows.map((row) => JSON.stringify(row.p)).join(" + ")} = ${shown}`;
  }

  function paintScale(view) {
    if (!view.scale) {
      dom.scale.hidden = true;
      return;
    }
    dom.scale.hidden = false;
    dom.scale.classList.toggle("hot", view.scale.hot);
    const max = view.scale.max;
    if (dom.scaleLabels.childElementCount !== max + 1) {
      dom.scaleLabels.replaceChildren();
      for (let level = 0; level <= max; level += 1) {
        const tick = document.createElement("span");
        tick.textContent = String(level);
        dom.scaleLabels.append(tick);
      }
    }
    const ratio = max === 0 ? 0 : view.scale.score / max;
    const from = scaleRatio;
    scaleRatio = ratio;
    dom.scaleValue.textContent = JSON.stringify(view.scale.score);
    if (reduceMotion) {
      dom.scaleFill.style.transform = `scaleX(${ratio})`;
      return;
    }
    dom.scaleFill.style.transform = `scaleX(${from})`;
    requestAnimationFrame(() => {
      dom.scaleFill.style.transform = `scaleX(${ratio})`;
    });
  }

  function paintWeights(view) {
    if (!view.weights) {
      dom.weights.hidden = true;
      return;
    }
    dom.weights.hidden = false;
    dom.weights.classList.toggle("notice", view.weights.mode === "math");
    const signature = view.weights.rows.map((row) => row.level).join("|");
    const fresh = dom.weights.dataset.keys !== signature;
    if (fresh) {
      dom.weights.dataset.keys = signature;
      dom.weights.replaceChildren();
      for (const row of view.weights.rows) {
        const item = document.createElement("div");
        item.className = "weight-row";
        item.dataset.level = String(row.level);
        item.title = row.text;
        const level = document.createElement("span");
        level.className = "weight-level";
        level.textContent = String(row.level);
        const times = document.createElement("span");
        times.className = "weight-op";
        times.textContent = "×";
        const prob = document.createElement("span");
        prob.className = "weight-p";
        const track = document.createElement("span");
        track.className = "weight-track";
        const fill = document.createElement("span");
        fill.className = "weight-fill";
        track.append(fill);
        const product = document.createElement("span");
        product.className = "weight-product";
        item.append(level, times, prob, track, product);
        dom.weights.append(item);
      }
      const total = document.createElement("p");
      total.className = "weight-total";
      dom.weights.append(total);
    }
    for (const row of view.weights.rows) {
      const item = dom.weights.querySelector(`[data-level="${row.level}"]`);
      if (!item) continue;
      item.querySelector(".weight-p").textContent = JSON.stringify(row.p);
      item.querySelector(".weight-product").textContent = showProduct(row.product);
      const fill = item.querySelector(".weight-fill");
      const next = `scaleX(${row.p})`;
      if (reduceMotion || !fresh) fill.style.transform = next;
      else {
        fill.style.transform = "scaleX(0)";
        requestAnimationFrame(() => {
          fill.style.transform = next;
        });
      }
    }
    const total = view.weights.rows.reduce((sum, row) => sum + row.product, 0);
    dom.weights.querySelector(".weight-total").textContent = `added up  ${showProduct(total)}`;
  }

  function renderTicks() {
    dom.ticks.replaceChildren();
    lesson.scenes.forEach((scene, sceneIndex) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.index = String(sceneIndex);
      button.className = "tick";
      if (sceneIndex === index) button.classList.add("now");
      else if (sceneIndex < index) button.classList.add("done");
      button.setAttribute("aria-label", `Step ${sceneIndex + 1}: ${scene.title}`);
      if (sceneIndex === index) button.setAttribute("aria-current", "step");
      dom.ticks.append(button);
    });
  }

  function syncPlayLabel() {
    const atEnd = index >= lesson.scenes.length - 1 && !playing;
    dom.play.textContent = atEnd ? "Replay" : playing ? "Pause" : "Play";
    dom.play.setAttribute("aria-pressed", playing ? "true" : "false");
  }
}

function showProduct(n) {
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 1000) / 1000);
}

function setRich(el, text) {
  el.replaceChildren();
  for (const part of text.split(/(`[^`]+`)/g)) {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      const code = document.createElement("code");
      code.textContent = part.slice(1, -1);
      el.append(code);
    } else if (part) {
      el.append(part);
    }
  }
}

function hotFacts(focus) {
  if (!focus || focus === "fruit") return new Set();
  if (focus === "state.*") return "all";
  if (focus.startsWith("state.")) return new Set([focus.slice("state.".length).replace(/\.\*$/, "")]);
  return new Set();
}
