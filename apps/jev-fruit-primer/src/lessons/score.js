import { JEV_MODEL } from "../../server/model.js";

const QUESTION_ID = "ripeness";

const INSTRUCTIONS = "How ripe is this banana, using only `peel`, `flesh`, and `notes`?";

export const LEVELS = [
  "Still green and firm. Starchy, not ready to eat.",
  "Mostly yellow with some green. Just turning sweet.",
  "Fully yellow, with a few brown freckles. Sweet and soft.",
  "Heavily spotted or black. Very soft, past its best.",
];

export const fruits = {
  freckled: {
    id: "freckled",
    drawing: "banana",
    name: "Freckled banana",
    state: {
      fruit: "banana",
      peel: "yellow, covered with many brown freckles",
      flesh: "soft and very sweet",
      notes: "softer than a just-ripe banana, but the peel is not black",
    },
  },
  green: {
    id: "green",
    drawing: "banana",
    name: "Green-yellow banana",
    state: {
      fruit: "banana",
      peel: "half green and half yellow",
      flesh: "firm, only a little sweet",
      notes: "not ripe enough to be fully yellow",
    },
  },
};

export function payload(fruitId) {
  return {
    state: fruits[fruitId].state,
    questions: {
      [QUESTION_ID]: {
        type: "score",
        instructions: INSTRUCTIONS,
        criteria: LEVELS,
      },
    },
  };
}

const FULL_REQ = ["model", "state", "questions", "type", "instructions", "criteria"];
const FULL_RES = ["model", "answers", "type", "score", "probabilities", "legend", "confidence"];
const MAX = LEVELS.length - 1;

export const scenes = [
  {
    id: "intro",
    fruit: "freckled",
    request: [],
    response: [],
    focus: "fruit",
    phase: "compose",
    dwell: 5000,
    title: "Score places a fruit on a scale you write",
    body: "This banana is past just-ripe and not black. A score question does not invent a percent. You write the levels, low end first, and Jev returns a position on that list. The position may fall between two levels.",
  },
  {
    id: "model",
    fruit: "freckled",
    request: ["model"],
    response: [],
    focus: "model",
    phase: "compose",
    dwell: 3800,
    title: "Same request, third question type",
    body: "`model`, `state`, and `questions` do not change jobs. `type` will be `score`, and `criteria` will be an ordered list instead of a yes/no pair or a map of options.",
  },
  {
    id: "state",
    fruit: "freckled",
    request: ["model", "state"],
    response: [],
    focus: "state.*",
    phase: "compose",
    dwell: 4600,
    title: "state is the banana Jev is allowed to see",
    body: "Peel, flesh, and a note. If you want Jev to ignore a green tip, the note has to say so. Nothing outside `state` is in the call.",
  },
  {
    id: "name",
    fruit: "freckled",
    request: ["model", "state", "questions", "type"],
    response: [],
    focus: "questions.ripeness",
    phase: "compose",
    dwell: 4400,
    title: "ripeness is your label",
    body: "`ripeness` is not shown to Jev. The reply comes back under that same label. The word that sets the shape is `type`.",
  },
  {
    id: "type",
    fruit: "freckled",
    request: ["model", "state", "questions", "type"],
    response: [],
    focus: "questions.ripeness.type",
    phase: "compose",
    dwell: 4800,
    title: "type is score",
    body: "A score answer has a `score`, a probability for each level, a `legend` that repeats your sentences, and a `confidence`. Noul has only a probability. Choice has no order. Score is the ordered one.",
  },
  {
    id: "instructions",
    fruit: "freckled",
    request: ["model", "state", "questions", "type", "instructions"],
    response: [],
    focus: "questions.ripeness.instructions",
    phase: "compose",
    dwell: 4400,
    title: "instructions says what to judge",
    body: "The levels describe situations. `instructions` says which situation you mean: ripeness, using only the peel, the flesh, and the note.",
  },
  {
    id: "criteria",
    fruit: "freckled",
    request: FULL_REQ,
    response: [],
    focus: "questions.ripeness.criteria.*",
    phase: "compose",
    dwell: 6400,
    title: "criteria is ordered, low end first",
    body: "Four sentences. Index 0 is the least ripe. Index 3 is the most. You may send 2 to 10 levels. The score will run from 0 up to one less than the number of levels — here, 0 to 3. Write a situation for each level, not a vague word like \"medium.\"",
  },
  {
    id: "whole",
    fruit: "freckled",
    request: FULL_REQ,
    response: [],
    focus: null,
    phase: "compose",
    dwell: 4000,
    title: "That is the whole score request",
    body: "One state, one ordered list, one POST. The reply's score is a position on this list, not a new scale Jev invented.",
  },
  {
    id: "send",
    fruit: "freckled",
    request: FULL_REQ,
    response: [],
    focus: null,
    phase: "send",
    needs: "freckled",
    dwell: 2400,
    title: "Ask Jev where this banana sits",
    body: "The next number is the live reply. It is allowed to fall between two of the sentences you just wrote.",
  },
  {
    id: "score",
    fruit: "freckled",
    request: FULL_REQ,
    response: ["model", "answers", "type", "score"],
    focus: "answers.ripeness.score",
    phase: "read",
    needs: "freckled",
    scale: "hot",
    dwell: 6400,
    title: "score is a position, and it may be fractional",
    body: (bag) => {
      const answer = readAnswer(bag, "freckled");
      if (!answer) return "`score` runs from 0 to one less than the number of levels.";
      return `\`score\` is ${show(answer.score)}. ${placement(answer.score)} A whole number would mean it landed on one sentence. A fraction means the probability is shared by neighboring sentences.`;
    },
  },
  {
    id: "math",
    fruit: "freckled",
    request: FULL_REQ,
    response: ["model", "answers", "type", "score", "probabilities"],
    focus: "answers.ripeness.probabilities.*",
    phase: "read",
    needs: "freckled",
    scale: "quiet",
    weights: "math",
    dwell: 7600,
    title: "The score is the weighted position",
    body: (bag) => {
      const answer = readAnswer(bag, "freckled");
      if (!answer) return "Multiply each level's index by its probability, then add those up.";
      const rows = weightRows(answer);
      const sum = weightedSum(rows);
      const parts = rows
        .filter((row) => row.p > 0)
        .map((row) => `${row.level} × ${show(row.p)} = ${show(row.product)}`);
      return `Each level contributes its index times its probability. ${parts.join(". ")}. Those add to ${show(sum)}, which is Jev's score of ${show(answer.score)}. That position is along the sentences you wrote. It is not a percent ripe. A cutoff such as score > 2 is a fair use of it.`;
    },
  },
  {
    id: "legend",
    fruit: "freckled",
    request: FULL_REQ,
    response: ["model", "answers", "type", "score", "probabilities", "legend"],
    focus: "answers.ripeness.legend.*",
    phase: "read",
    needs: "freckled",
    scale: "quiet",
    weights: "quiet",
    dwell: 5600,
    title: "legend repeats your levels by index",
    body: "`legend` copies the sentences back under \"0\", \"1\", \"2\", and \"3\". A log can show the score next to those words without keeping the request around.",
  },
  {
    id: "confidence",
    fruit: "freckled",
    request: FULL_REQ,
    response: FULL_RES,
    focus: "answers.ripeness.confidence",
    phase: "read",
    needs: "freckled",
    scale: "quiet",
    weights: "quiet",
    dwell: 6800,
    title: "confidence is lower when the mass is split",
    body: (bag) => {
      const answer = readAnswer(bag, "freckled");
      if (!answer) return "`confidence` summarizes how piled onto one level the probabilities are.";
      return `\`confidence\` is ${show(answer.confidence)}. It is the same kind of summary as on a choice: one number from 0 to 1, derived from the probabilities. Jev has not published the formula. Here the probability is shared by neighboring levels, so confidence is not 1. Read the probabilities for the shape. Use confidence when you only need a threshold.`;
    },
  },
  {
    id: "swap",
    fruit: "green",
    request: FULL_REQ,
    response: [],
    focus: "state.*",
    phase: "send",
    needs: "green",
    dwell: 4600,
    title: "Same levels, a less ripe banana",
    body: "The sentences stay. The note changes to a banana that is still half green. The position on the scale should move toward 0.",
  },
  {
    id: "green",
    fruit: "green",
    request: FULL_REQ,
    response: FULL_RES,
    focus: "answers.ripeness.score",
    phase: "read",
    needs: "green",
    scale: "hot",
    weights: "quiet",
    dwell: 6800,
    title: "The score follows the peel",
    body: (bag) => {
      const ripe = readAnswer(bag, "freckled");
      const green = readAnswer(bag, "green");
      if (!green) return "The less ripe banana gets a lower position on the same levels.";
      const was = ripe ? ` The freckled banana was ${show(ripe.score)}.` : "";
      return `This banana's score is ${show(green.score)}.${was} Same four sentences, same question. The number moved because the note moved. ${placement(green.score)}`;
    },
  },
];

export const scoreLesson = {
  id: "score",
  label: "Score",
  lede: "A position on levels you order from low to high. The score can fall between two levels.",
  scenes,
  calls: ["freckled", "green"],
  fruit: (id) => fruits[id],
  payload,
  present,
};

export function present(scene, bag) {
  const result = scene.needs ? bag.results[scene.needs] : null;
  const error = scene.needs ? bag.errors[scene.needs] : null;
  const reading = scene.phase === "read";
  const answer = result ? readAnswer(bag, scene.fruit) : null;
  const score = typeof answer?.score === "number" ? answer.score : null;
  return {
    fruitId: scene.fruit,
    request: revealRequest(scene.fruit, scene.request),
    response: error ? null : revealResponse(result, scene.response),
    requestFocus: reading ? null : scene.focus,
    responseFocus: reading ? scene.focus : null,
    phase: scene.phase,
    title: scene.title,
    body: typeof scene.body === "function" ? scene.body(bag) : scene.body,
    bars: null,
    meter: null,
    scale: scene.scale && score != null ? { score, max: MAX, hot: scene.scale === "hot" } : null,
    weights: scene.weights && answer?.probabilities ? { rows: weightRows(answer), mode: scene.weights } : null,
    error,
    pending: Boolean(scene.needs) && !result && !error,
  };
}

export function revealRequest(fruitId, parts) {
  const wanted = new Set(parts);
  if (wanted.size === 0) return null;
  const full = payload(fruitId);
  const out = {};
  if (wanted.has("model")) out.model = JEV_MODEL;
  if (wanted.has("state")) out.state = full.state;
  if (wanted.has("questions")) {
    const src = full.questions[QUESTION_ID];
    const inner = {};
    if (wanted.has("type")) inner.type = src.type;
    if (wanted.has("instructions")) inner.instructions = src.instructions;
    if (wanted.has("criteria")) inner.criteria = src.criteria;
    out.questions = { [QUESTION_ID]: inner };
  }
  return out;
}

export function revealResponse(result, parts) {
  const wanted = new Set(parts);
  if (!result || wanted.size === 0) return null;
  const src = result.answers?.[QUESTION_ID];
  const out = {};
  if (wanted.has("model")) out.model = result.model;
  if (wanted.has("answers") && src) {
    const inner = {};
    if (wanted.has("type")) inner.type = src.type;
    if (wanted.has("score")) inner.score = src.score;
    if (wanted.has("probabilities")) inner.probabilities = src.probabilities;
    if (wanted.has("legend")) inner.legend = src.legend;
    if (wanted.has("confidence")) inner.confidence = src.confidence;
    out.answers = { [QUESTION_ID]: inner };
  }
  return out;
}

export function weightRows(answer) {
  const probabilities = answer.probabilities ?? {};
  const legend = answer.legend ?? {};
  return Object.keys(probabilities)
    .map(Number)
    .sort((a, b) => a - b)
    .map((level) => {
      const p = probabilities[String(level)] ?? 0;
      return {
        level,
        p,
        text: legend[String(level)] ?? LEVELS[level] ?? "",
        product: level * p,
      };
    });
}

export function weightedSum(rows) {
  return rows.reduce((sum, row) => sum + row.product, 0);
}

function readAnswer(bag, fruitId) {
  return bag.results[fruitId]?.answers?.[QUESTION_ID] ?? null;
}

function placement(score) {
  if (Number.isInteger(score)) return `That lands on level ${score} of a 0-to-${MAX} scale.`;
  return `That sits between level ${Math.floor(score)} and level ${Math.ceil(score)} on a 0-to-${MAX} scale.`;
}

function show(n) {
  if (typeof n !== "number") return String(n);
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 1000) / 1000);
}
