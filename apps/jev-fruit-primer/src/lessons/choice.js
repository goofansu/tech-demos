import { JEV_MODEL } from "../../server/model.js";

const QUESTION_ID = "which_fruit";

const INSTRUCTIONS = "Which fruit do `skin`, `flesh`, `seeds`, and `taste` describe?";

const CRITERIA = {
  apple: "Smooth red or green skin, crisp white flesh, and a small core.",
  banana: "A long peel that pulls back from soft cream-colored flesh.",
  kiwi: "Brown fuzzy skin, bright green flesh, and a ring of black seeds.",
  mango: "Smooth skin, orange flesh, and one large flat pit.",
  other: "None of the fruits above.",
};

const NAMED = Object.fromEntries(Object.entries(CRITERIA).filter(([key]) => key !== "other"));

export const fruits = {
  kiwi: {
    id: "kiwi",
    name: "This fruit",
    state: {
      skin: "brown and fuzzy",
      flesh: "bright green",
      seeds: "a ring of tiny black seeds",
      taste: "sweet and a little tart",
    },
  },
  orange: {
    id: "orange",
    name: "Another fruit",
    state: {
      skin: "bright orange and bumpy",
      flesh: "juicy segments",
      seeds: "a few seeds inside the segments",
      taste: "sweet and a little sour",
    },
  },
};

export function payload(fruitId) {
  return {
    state: fruits[fruitId].state,
    questions: {
      [QUESTION_ID]: {
        type: "choice",
        instructions: INSTRUCTIONS,
        criteria: CRITERIA,
      },
    },
  };
}

const FULL_REQ = ["model", "state", "questions", "type", "instructions", "criteria"];
const ANSWER = ["model", "answers", "type", "choice", "probabilities", "confidence"];

export const scenes = [
  {
    id: "intro",
    fruit: "kiwi",
    request: [],
    response: [],
    focus: "fruit",
    phase: "compose",
    dwell: 4800,
    title: "Choice picks one option from your list",
    body: "This note describes a fruit and does not name it. A choice question hands Jev a fixed list. Jev must pick one option. It cannot answer with a fruit you forgot to list.",
  },
  {
    id: "model",
    fruit: "kiwi",
    request: ["model"],
    response: [],
    focus: "model",
    phase: "compose",
    dwell: 4000,
    title: "The envelope is the same",
    body: "`model`, `state`, and `questions` are still the whole request. What changes is the question's `type`, and the shape of `criteria`.",
  },
  {
    id: "state",
    fruit: "kiwi",
    request: ["model", "state"],
    response: [],
    focus: "state.*",
    phase: "compose",
    dwell: 4800,
    title: "state is still the only note",
    body: "Four facts, and no species name. Jev can only choose from these words. The drawing is a hint for you. It is not sent.",
  },
  {
    id: "name",
    fruit: "kiwi",
    request: ["model", "state", "questions", "type"],
    response: [],
    focus: "questions.which_fruit",
    phase: "compose",
    dwell: 4800,
    title: "which_fruit is your label",
    body: "Same rule as Noul. The key `which_fruit` is for you. Jev does not read it. The reply will use that key so the pick is easy to find.",
  },
  {
    id: "type",
    fruit: "kiwi",
    request: ["model", "state", "questions", "type"],
    response: [],
    focus: "questions.which_fruit.type",
    phase: "compose",
    dwell: 4600,
    title: "type is choice",
    body: "`choice` means: here is a set of options, pick one. The answer will name the winner, give every option a probability, and add a confidence. A noul answer has none of those fields.",
  },
  {
    id: "instructions",
    fruit: "kiwi",
    request: ["model", "state", "questions", "type", "instructions"],
    response: [],
    focus: "questions.which_fruit.instructions",
    phase: "compose",
    dwell: 4600,
    title: "instructions asks the question",
    body: "The list of options is not the question. `instructions` is. Backticks point at fields in `state`, the same way they did for the lemon.",
  },
  {
    id: "criteria",
    fruit: "kiwi",
    request: ["model", "state", "questions", "type", "instructions", "named"],
    response: [],
    focus: "questions.which_fruit.criteria.*",
    phase: "compose",
    dwell: 6200,
    title: "criteria is a map of options",
    body: "Each key is an option your code can branch on. The sentence says what that option means. A sentence may be null when the key is already clear. These keys need the sentences. Choice requires at least two options, and allows up to 255.",
  },
  {
    id: "escape",
    fruit: "kiwi",
    request: FULL_REQ,
    response: [],
    focus: "questions.which_fruit.criteria.other",
    phase: "compose",
    dwell: 6200,
    title: "Leave an exit",
    body: "The probabilities have to add up to 1. If the true fruit is missing, the leftover probability lands on whichever option is least wrong, often with a solid confidence. `other` is the exit: none of the named fruits.",
  },
  {
    id: "whole",
    fruit: "kiwi",
    request: FULL_REQ,
    response: [],
    focus: null,
    phase: "compose",
    dwell: 4200,
    title: "That is the whole choice request",
    body: "Still one POST. Still one state. The new piece is the criteria map. The reply will come back under `which_fruit`.",
  },
  {
    id: "send",
    fruit: "kiwi",
    request: FULL_REQ,
    response: [],
    focus: null,
    phase: "send",
    needs: "kiwi",
    dwell: 2400,
    title: "The same call as before",
    body: "POST /v1/systemone. The browser never sees the API key. The next numbers are the live reply for this fruit.",
  },
  {
    id: "pick",
    fruit: "kiwi",
    request: FULL_REQ,
    response: ["model", "answers", "type", "choice"],
    focus: "answers.which_fruit.choice",
    phase: "read",
    needs: "kiwi",
    dwell: 5600,
    title: "choice is the winning option",
    body: (bag) => {
      const answer = readAnswer(bag, "kiwi");
      if (!answer) return "`choice` is the option key Jev picked. It is one of the keys you sent.";
      return `Jev picked \`${answer.choice}\`. That string is your option key, ready for an if-statement. It is the option with the highest probability. The distribution under it is the part worth reading.`;
    },
  },
  {
    id: "probabilities",
    fruit: "kiwi",
    request: FULL_REQ,
    response: ["model", "answers", "type", "choice", "probabilities"],
    focus: "answers.which_fruit.probabilities.*",
    phase: "read",
    needs: "kiwi",
    bars: "all",
    dwell: 7000,
    title: "probabilities is the full distribution",
    body: (bag) => {
      const answer = readAnswer(bag, "kiwi");
      if (!answer) return "Every option gets a probability. The numbers add up to 1.";
      const rows = rowsFor(answer);
      const sum = rows.reduce((total, row) => total + row.p, 0);
      const top = rows.find((row) => row.picked) ?? rows[0];
      return `Every option is listed, including the ones at zero. ${top.key} is ${show(top.p)}. The bars add to ${showSum(sum)}. \`choice\` is just the largest of these. It is not a second, hidden judgment.`;
    },
  },
  {
    id: "confidence",
    fruit: "kiwi",
    request: FULL_REQ,
    response: ANSWER,
    focus: "answers.which_fruit.confidence",
    phase: "read",
    needs: "kiwi",
    bars: "quiet",
    dwell: 7000,
    title: "confidence summarizes the shape",
    body: (bag) => {
      const answer = readAnswer(bag, "kiwi");
      if (!answer) return "`confidence` is a number from 0 to 1 derived from the probabilities.";
      return `\`confidence\` is ${show(answer.confidence)}. It collapses the shape of the probabilities into one number so you can set a threshold. Jev has not published the formula. When the probability is all on one option, confidence is high. When it is split, confidence falls. Read the probabilities for the shape. This number is only the summary.`;
    },
  },
  {
    id: "swap",
    fruit: "orange",
    request: FULL_REQ,
    response: [],
    focus: "state.*",
    phase: "send",
    needs: "orange",
    dwell: 4800,
    title: "Same list, a fruit that is not on it",
    body: "The question stays. The note changes to a fruit with bumpy orange skin and juicy segments: an orange. Orange is not a key in `criteria`. Watch where the probability goes.",
  },
  {
    id: "other",
    fruit: "orange",
    request: FULL_REQ,
    response: ANSWER,
    focus: "answers.which_fruit.choice",
    phase: "read",
    needs: "orange",
    bars: "winner",
    dwell: 7200,
    title: "The exit catches the missing fruit",
    body: (bag) => {
      const answer = readAnswer(bag, "orange");
      if (!answer) return "If the fruit is not in the list, `other` is where that probability can sit.";
      if (answer.choice === "other") {
        const p = answer.probabilities?.other;
        return `Jev picked \`other\`, with probability ${show(p)}. The named fruits stay at the rest of the distribution. That is the exit doing its job. Without it, this orange would have been forced onto apple, banana, kiwi, or mango.`;
      }
      return `Jev picked \`${answer.choice}\` this time. The probabilities show where the rest of the mass went. \`other\` is still the option you add when the list might not cover the note.`;
    },
  },
];

export const choiceLesson = {
  id: "choice",
  label: "Choice",
  lede: "One option from a list you write. The reply names the winner, then shows every probability.",
  scenes,
  calls: ["kiwi", "orange"],
  fruit: (id) => fruits[id],
  payload,
  present,
};

export function present(scene, bag) {
  const result = scene.needs ? bag.results[scene.needs] : null;
  const error = scene.needs ? bag.errors[scene.needs] : null;
  const reading = scene.phase === "read";
  const answer = result ? readAnswer(bag, scene.fruit) : null;
  return {
    fruitId: scene.fruit,
    request: revealRequest(scene.fruit, scene.request),
    response: error ? null : revealResponse(result, scene.response),
    requestFocus: reading ? null : scene.focus,
    responseFocus: reading ? scene.focus : null,
    phase: scene.phase,
    title: scene.title,
    body: typeof scene.body === "function" ? scene.body(bag) : scene.body,
    bars: scene.bars && answer?.probabilities ? { rows: rowsFor(answer), mode: scene.bars } : null,
    meter: null,
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
    if (wanted.has("named")) inner.criteria = NAMED;
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
    if (wanted.has("choice")) inner.choice = src.choice;
    if (wanted.has("probabilities")) inner.probabilities = orderProbabilities(src.probabilities);
    if (wanted.has("confidence")) inner.confidence = src.confidence;
    out.answers = { [QUESTION_ID]: inner };
  }
  return out;
}

export function orderProbabilities(probabilities) {
  const ordered = {};
  if (!probabilities) return ordered;
  for (const key of Object.keys(CRITERIA)) {
    if (key in probabilities) ordered[key] = probabilities[key];
  }
  for (const [key, value] of Object.entries(probabilities)) {
    if (!(key in ordered)) ordered[key] = value;
  }
  return ordered;
}

export function rowsFor(answer) {
  const probabilities = orderProbabilities(answer.probabilities);
  return Object.entries(probabilities).map(([key, p]) => ({
    key,
    p,
    picked: key === answer.choice,
  }));
}

function readAnswer(bag, fruitId) {
  return bag.results[fruitId]?.answers?.[QUESTION_ID] ?? null;
}

function show(n) {
  return JSON.stringify(n);
}

function showSum(n) {
  if (Math.abs(n - 1) < 0.001) return "1";
  return String(Math.round(n * 1000) / 1000);
}
