import { expect, test } from "bun:test";
import { validateRequest } from "../../server/evaluate.js";
import { payload, present, scenes, weightRows, weightedSum } from "./score.js";

test("score criteria are an ordered list of 2 to 10 strings", () => {
  const body = payload("freckled");
  const validated = validateRequest(body);
  expect(validated.request.questions.ripeness.criteria).toHaveLength(4);
  expect(validated.request.questions.ripeness.criteria[0]).toContain("green");
});

test("the weighted position is the sum of index times probability", () => {
  const rows = weightRows({
    score: 2.54,
    probabilities: { 0: 0, 1: 0, 2: 0.46, 3: 0.54 },
    legend: { 2: "freckled", 3: "spotted" },
  });
  expect(weightedSum(rows)).toBeCloseTo(2.54, 5);
  const scene = scenes.find((item) => item.id === "math");
  const view = present(scene, {
    results: {
      freckled: {
        model: "jev-1.13.0",
        answers: {
          ripeness: {
            type: "score",
            score: 2.54,
            confidence: 0.54,
            probabilities: { 0: 0, 1: 0, 2: 0.46, 3: 0.54 },
            legend: { 0: "a", 1: "b", 2: "c", 3: "d" },
          },
        },
      },
    },
    errors: {},
  });
  expect(view.scale.score).toBe(2.54);
  expect(view.scale.max).toBe(3);
  expect(view.weights.rows).toHaveLength(4);
  expect(view.body).toContain("2.54");
  expect(view.body).toContain("not a percent");
  expect(view.body).toContain("score > 2");
});
