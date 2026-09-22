import { expect, test } from "bun:test";
import { validateRequest } from "../../server/evaluate.js";
import { answerSentence, payload, present, revealRequest, revealResponse, scenes } from "./noul.js";

test("the displayed request is the body Jev receives", () => {
  const lemon = payload("lemon");
  const shown = revealRequest("lemon", ["model", "state", "questions", "type", "instructions", "criteria"]);
  expect(shown.state).toEqual(lemon.state);
  expect(shown.questions).toEqual(lemon.questions);
  expect(shown.model).toBe("jev-latest");
  expect(validateRequest(lemon).request.questions.is_citrus.type).toBe("noul");
});

test("a partial reply copies live fields and invents none", () => {
  const live = {
    model: "jev-1.13.0",
    answers: { is_citrus: { type: "noul", noul: 0.99 } },
    usage: { input_tokens: 375, output_tokens: 23 },
  };
  expect(revealResponse(live, ["model", "answers", "type"])).toEqual({
    model: "jev-1.13.0",
    answers: { is_citrus: { type: "noul" } },
  });
  expect(revealResponse(live, ["model", "answers", "type", "noul", "usage", "input_tokens", "output_tokens"])).toEqual({
    model: "jev-1.13.0",
    answers: { is_citrus: { type: "noul", noul: 0.99 } },
    usage: { input_tokens: 375, output_tokens: 23 },
  });
});

test("mango step reads the mango probability", () => {
  const scene = scenes.find((item) => item.id === "mango");
  const view = present(scene, {
    results: {
      lemon: { model: "jev-1.13.0", answers: { is_citrus: { type: "noul", noul: 0.99 } }, usage: { input_tokens: 1, output_tokens: 1 } },
      mango: { model: "jev-1.13.0", answers: { is_citrus: { type: "noul", noul: 0.02 } }, usage: { input_tokens: 2, output_tokens: 1 } },
    },
    errors: {},
  });
  expect(view.fruitId).toBe("mango");
  expect(view.response.answers.is_citrus.noul).toBe(0.02);
  expect(view.body).toContain("0.02");
  expect(view.body).toContain("0.99");
  expect(view.meter.value).toBe(0.02);
  expect(answerSentence(0.99)).toBe("yes");
  expect(answerSentence(0.02)).toBe("no");
  expect(answerSentence(0.5)).toBe("unsure");
});
