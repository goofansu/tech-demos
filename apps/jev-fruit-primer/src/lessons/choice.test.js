import { expect, test } from "bun:test";
import { validateRequest } from "../../server/evaluate.js";
import { orderProbabilities, payload, present, revealRequest, scenes } from "./choice.js";

test("choice payload matches the question shown at the end", () => {
  const body = payload("kiwi");
  expect(validateRequest(body).request.questions.which_fruit.type).toBe("choice");
  const shown = revealRequest("kiwi", ["model", "state", "questions", "type", "instructions", "criteria"]);
  expect(shown.questions).toEqual(body.questions);
  expect(shown.state.skin).toBe("brown and fuzzy");
  const named = revealRequest("kiwi", ["questions", "type", "named"]);
  expect(named.questions.which_fruit.criteria.other).toBeUndefined();
  expect(named.questions.which_fruit.criteria.kiwi).toContain("black seeds");
});

test("probabilities stay in criteria order and the bars follow the live pick", () => {
  const ordered = orderProbabilities({ other: 0, banana: 0, kiwi: 1, mango: 0, apple: 0 });
  expect(Object.keys(ordered)).toEqual(["apple", "banana", "kiwi", "mango", "other"]);
  const scene = scenes.find((item) => item.id === "other");
  const view = present(scene, {
    results: {
      orange: {
        model: "jev-1.13.0",
        answers: {
          which_fruit: {
            type: "choice",
            choice: "other",
            confidence: 1,
            probabilities: { banana: 0, kiwi: 0, apple: 0, other: 1, mango: 0 },
          },
        },
      },
    },
    errors: {},
  });
  expect(view.response.answers.which_fruit.choice).toBe("other");
  expect(view.bars.rows.find((row) => row.picked).key).toBe("other");
  expect(view.body).toContain("other");
  expect(view.meter).toBe(null);
});
