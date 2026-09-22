import { JEV_MODEL } from "../../server/model.js";

const QUESTION_ID = "is_citrus";

const INSTRUCTIONS =
  "Looking at `fruit`, `skin`, `shape`, and `taste`, is this a citrus fruit?";

const CRITERIA = {
  true: "It is a citrus fruit, such as a lemon, lime, orange, or grapefruit.",
  false: "It is not a citrus fruit.",
};

export const fruits = {
  lemon: {
    id: "lemon",
    name: "Lemon",
    state: {
      fruit: "lemon",
      skin: "bright yellow and waxy",
      shape: "small oval with a pointed end",
      taste: "sour",
    },
  },
  mango: {
    id: "mango",
    name: "Mango",
    state: {
      fruit: "mango",
      skin: "smooth, green with a red blush",
      shape: "large oval with a slight curve",
      taste: "sweet",
    },
  },
};

export function payload(fruitId) {
  return {
    state: fruits[fruitId].state,
    questions: {
      [QUESTION_ID]: {
        type: "noul",
        instructions: INSTRUCTIONS,
        criteria: CRITERIA,
      },
    },
  };
}

const REQ = ["model", "state", "questions", "type", "instructions", "criteria"];
const RES = ["model", "answers", "type", "noul", "usage", "input_tokens", "output_tokens"];

export const scenes = [
  {
    id: "intro",
    fruit: "lemon",
    request: [],
    response: [],
    focus: "fruit",
    phase: "compose",
    dwell: 4600,
    title: "One fruit, one yes-or-no question",
    body: "Jev will not describe this lemon. You send a short note and a question, and Jev sends back a probability. The request builds in the middle. The live reply lands on the right.",
  },
  {
    id: "model",
    fruit: "lemon",
    request: ["model"],
    response: [],
    focus: "model",
    phase: "compose",
    dwell: 4600,
    title: "model names which Jev you ask",
    body: "`model` is required. `jev-latest` means the current stable release. The reply will name the exact version that answered, which may be more specific than the alias you sent.",
  },
  {
    id: "state",
    fruit: "lemon",
    request: ["model", "state"],
    response: [],
    focus: "state.*",
    phase: "compose",
    dwell: 5400,
    title: "state is the only note Jev reads",
    body: "These four facts are the whole lemon. Jev does not look anything up. A fact you leave out of `state` is invisible, so the question can only use what you wrote here.",
  },
  {
    id: "name",
    fruit: "lemon",
    request: ["model", "state", "questions", "type"],
    response: [],
    focus: "questions.is_citrus",
    phase: "compose",
    dwell: 5600,
    title: "You name the question",
    body: "`is_citrus` is a label you invent. Jev does not read that label, and it plays no part in the judgment. The reply comes back under the same label so you can find it.",
  },
  {
    id: "type",
    fruit: "lemon",
    request: ["model", "state", "questions", "type"],
    response: [],
    focus: "questions.is_citrus.type",
    phase: "compose",
    dwell: 5400,
    title: "noul means yes or no",
    body: "`type` chooses the shape of the answer. `noul` asks whether a statement is true and returns the probability of yes. Choice and Score, on the next pages, return different fields.",
  },
  {
    id: "instructions",
    fruit: "lemon",
    request: ["model", "state", "questions", "type", "instructions"],
    response: [],
    focus: "questions.is_citrus.instructions",
    phase: "compose",
    dwell: 5400,
    title: "instructions is the question itself",
    body: "This is the question in ordinary words. A name in backticks, such as `fruit`, points at that field inside `state`. The question id `is_citrus` is not a substitute for writing the question here.",
  },
  {
    id: "criteria",
    fruit: "lemon",
    request: REQ,
    response: [],
    focus: "questions.is_citrus.criteria.*",
    phase: "compose",
    dwell: 5800,
    title: "criteria pins down the two sides",
    body: "Noul is the only question type that may omit `criteria`. When you include it, `true` and `false` say what each side means, so \"citrus\" is not left open to interpretation.",
  },
  {
    id: "whole",
    fruit: "lemon",
    request: REQ,
    response: [],
    focus: null,
    phase: "compose",
    dwell: 4800,
    title: "That is the whole request",
    body: "Three top-level fields: `model`, `state`, and `questions`. There is no temperature and no request for a paragraph. One POST carries every question, and every question sees this same state.",
  },
  {
    id: "send",
    fruit: "lemon",
    request: REQ,
    response: [],
    focus: null,
    phase: "send",
    needs: "lemon",
    dwell: 2400,
    title: "The request goes to Jev",
    body: "The browser asks this page's server. The server attaches the API key and forwards this JSON to POST /v1/systemone. The number you are about to read is that live reply.",
  },
  {
    id: "reply-model",
    fruit: "lemon",
    request: REQ,
    response: ["model"],
    focus: "model",
    phase: "read",
    needs: "lemon",
    dwell: 4600,
    title: "The reply names the model that answered",
    body: (bag) => {
      const model = bag.results.lemon?.model;
      return model
        ? `You sent the alias \`${JEV_MODEL}\`. This reply came from \`${model}\`. Log that version: a cutoff you tune belongs to the model that produced the probabilities.`
        : "The reply's `model` field is the exact version that answered, which can be more specific than `jev-latest`.";
    },
  },
  {
    id: "reply-type",
    fruit: "lemon",
    request: REQ,
    response: ["model", "answers", "type"],
    focus: "answers.is_citrus.type",
    phase: "read",
    needs: "lemon",
    dwell: 5000,
    title: "The answer comes back under your label",
    body: "`answers.is_citrus` matches the question you named. `type` is `noul` again, which tells you the only number in this answer is `noul`. There is no confidence field on a noul.",
  },
  {
    id: "noul",
    fruit: "lemon",
    request: REQ,
    response: ["model", "answers", "type", "noul"],
    focus: "answers.is_citrus.noul",
    phase: "read",
    needs: "lemon",
    meter: true,
    dwell: 6800,
    title: "noul is the probability of yes",
    body: (bag) => {
      const n = readNoul(bag, "lemon");
      return n == null
        ? "`noul` runs from 0 (no) to 1 (yes)."
        : `\`noul\` runs from 0 (no) to 1 (yes). This lemon came back as ${show(n)}. Near 1 means yes. Near 0 means no. Near 0.5 means Jev cannot tell — it does not mean the fruit is partly citrus.`;
    },
  },
  {
    id: "cutoff",
    fruit: "lemon",
    request: REQ,
    response: ["model", "answers", "type", "noul"],
    focus: "answers.is_citrus.noul",
    phase: "read",
    needs: "lemon",
    meter: true,
    mark: true,
    dwell: 6000,
    title: "You decide what counts as yes",
    body: "Jev does not return true or false. Your code does. One pattern is to treat the statement as true when `noul` is at least 0.8. The mark on the bar is that cutoff. It is not part of the reply.",
  },
  {
    id: "usage",
    fruit: "lemon",
    request: REQ,
    response: RES,
    focus: "usage.*",
    phase: "read",
    needs: "lemon",
    meter: true,
    dwell: 5400,
    title: "usage counts the tokens",
    body: (bag) => {
      const usage = bag.results.lemon?.usage;
      if (!usage) return "`usage` reports token counts for the call. Input tokens are what get billed.";
      return `This call reported ${usage.input_tokens} input tokens and ${usage.output_tokens} output tokens. Input tokens are billed. Output tokens are counted and cost nothing.`;
    },
  },
  {
    id: "swap",
    fruit: "mango",
    request: REQ,
    response: [],
    focus: "state.*",
    phase: "send",
    needs: "mango",
    dwell: 4200,
    title: "Same question, different fruit",
    body: "The question stays word for word. Only `state` changes, from the lemon to a mango. The probability should move with the fruit, because it means \"how likely is yes,\" not \"how citrus is this, on a scale.\"",
  },
  {
    id: "mango",
    fruit: "mango",
    request: REQ,
    response: RES,
    focus: "answers.is_citrus.noul",
    phase: "read",
    needs: "mango",
    meter: true,
    dwell: 7000,
    title: "The number follows the fruit",
    body: (bag) => {
      const lemon = readNoul(bag, "lemon");
      const mango = readNoul(bag, "mango");
      if (mango == null) return "The mango's `noul` is the probability that the citrus statement is true.";
      const lemonBit = lemon == null ? "" : ` The lemon was ${show(lemon)}.`;
      return `The mango's \`noul\` is ${show(mango)}.${lemonBit} Same question shape, and the probability moved with the note. A noul answer is that one number.`;
    },
  },
];

export const noulLesson = {
  id: "noul",
  label: "Noul",
  lede: "A yes-or-no question. The answer is the probability that the answer is yes.",
  scenes,
  calls: ["lemon", "mango"],
  fruit: (id) => fruits[id],
  payload,
  present,
};

export function present(scene, bag) {
  const result = scene.needs ? bag.results[scene.needs] : null;
  const error = scene.needs ? bag.errors[scene.needs] : null;
  const request = revealRequest(scene.fruit, scene.request);
  const response = error ? null : revealResponse(result, scene.response);
  const noul = readNoul(bag, scene.fruit);
  const reading = scene.phase === "read";
  return {
    fruitId: scene.fruit,
    request,
    response,
    requestFocus: reading ? null : scene.focus,
    responseFocus: reading ? scene.focus : null,
    phase: scene.phase,
    title: scene.title,
    body: typeof scene.body === "function" ? scene.body(bag) : scene.body,
    meter:
      scene.meter && noul != null
        ? { value: noul, mark: Boolean(scene.mark), hot: scene.focus === "answers.is_citrus.noul" }
        : null,
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
    if (wanted.has("noul")) inner.noul = src.noul;
    out.answers = { [QUESTION_ID]: inner };
  }
  if (wanted.has("usage") && result.usage) {
    const usage = {};
    if (wanted.has("input_tokens")) usage.input_tokens = result.usage.input_tokens;
    if (wanted.has("output_tokens")) usage.output_tokens = result.usage.output_tokens;
    out.usage = usage;
  }
  return out;
}

function readNoul(bag, fruitId) {
  const value = bag.results[fruitId]?.answers?.[QUESTION_ID]?.noul;
  return typeof value === "number" ? value : null;
}

function show(n) {
  return JSON.stringify(n);
}

export function answerSentence(noul) {
  if (noul >= 0.8) return "yes";
  if (noul <= 0.2) return "no";
  return "unsure";
}
