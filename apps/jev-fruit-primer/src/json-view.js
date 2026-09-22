/**
 * Split a JSON value into stable lines so the player can reveal and highlight
 * one field at a time. Line ids follow the path: `$.state.fruit`.
 */
export function linesFrom(value) {
  if (value == null) return [];
  const rows = JSON.stringify(value, null, 2).split("\n");
  const lines = [];
  const stack = [{ path: "$" }];

  for (const text of rows) {
    const depth = Math.floor((text.length - text.trimStart().length) / 2);
    const trim = text.trim();
    const keyMatch = trim.match(/^"((?:\\.|[^"\\])*)"\s*:/);
    const frame = stack.at(-1);

    if (trim === "{" || trim === "[") {
      lines.push({ id: `${frame.path}.$open`, text, depth, valuePath: null });
      continue;
    }

    if (trim === "}" || trim === "}," || trim === "]" || trim === "],") {
      lines.push({ id: `${frame.path}.$close`, text, depth, valuePath: null });
      stack.pop();
      continue;
    }

    if (keyMatch && !frame.array) {
      const key = JSON.parse(`"${keyMatch[1]}"`);
      const path = `${frame.path}.${key}`;
      const opensObject = trim.endsWith("{");
      const opensArray = trim.endsWith("[");
      lines.push({ id: path, text, depth, valuePath: opensObject || opensArray ? null : path });
      if (opensObject) stack.push({ path });
      if (opensArray) stack.push({ path, array: true, index: 0 });
      continue;
    }

    if (frame.array) {
      const path = `${frame.path}.${frame.index}`;
      frame.index += 1;
      lines.push({ id: path, text, depth, valuePath: path });
      continue;
    }

    lines.push({
      id: `${frame.path}.$item${lines.length}`,
      text,
      depth,
      valuePath: null,
    });
  }

  return lines;
}

function cssEscape(value) {
  return window.CSS?.escape ? window.CSS.escape(value) : value.replace(/"/g, '\\"');
}

/** `focus` is a path (`state.fruit`) or a branch (`state.*`). */
export function lineIsHot(line, focus) {
  if (!focus || !line) return false;
  const branch = focus.endsWith(".*");
  const raw = branch ? focus.slice(0, -2) : focus;
  const path = raw.startsWith("$.") ? raw : `$.${raw}`;
  if (branch) return line.id === path || line.id.startsWith(`${path}.`);
  return line.id === path;
}

export function mountJson(host) {
  const list = document.createElement("ol");
  list.className = "json";
  host.replaceChildren(list);
  const nodes = new Map();

  return function update(value, focus) {
    const lines = linesFrom(value);
    const live = new Set(lines.map((line) => line.id));

    for (const [id, el] of nodes) {
      if (live.has(id)) continue;
      el.classList.remove("on");
      nodes.delete(id);
      const remove = () => {
        if (nodes.get(id) === el) return;
        if (!el.classList.contains("on")) el.remove();
      };
      el.addEventListener("transitionend", (event) => {
        if (event.target === el && event.propertyName === "opacity") remove();
      });
      window.setTimeout(remove, 500);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    lines.forEach((line, index) => {
      let el = nodes.get(line.id);
      if (!el) {
        el = list.querySelector(`[data-id="${cssEscape(line.id)}"]`);
        if (el) nodes.set(line.id, el);
      }
      if (!el) {
        el = document.createElement("li");
        el.className = "line";
        el.dataset.id = line.id;
        const clip = document.createElement("div");
        clip.className = "clip";
        const src = document.createElement("div");
        src.className = "src";
        clip.append(src);
        el.append(clip);
        nodes.set(line.id, el);
        list.append(el);
        if (reduce) el.classList.add("on");
        else requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("on")));
      }

      const src = el.querySelector(".src");
      if (el.dataset.text !== line.text) {
        const known = el.dataset.text != null;
        src.textContent = line.text;
        el.dataset.text = line.text;
        if (known && line.valuePath) {
          el.classList.add("flash");
          window.setTimeout(() => el.classList.remove("flash"), 700);
        }
      }
      el.classList.toggle("hot", lineIsHot(line, focus));
      el.dataset.order = String(index);
    });

    let cursor = list.firstElementChild;
    for (const line of lines) {
      const el = nodes.get(line.id);
      if (!el) continue;
      if (cursor !== el) list.insertBefore(el, cursor);
      else cursor = cursor.nextElementSibling;
    }
  };
}
