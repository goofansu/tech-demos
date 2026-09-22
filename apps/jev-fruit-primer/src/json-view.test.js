import { expect, test } from "bun:test";
import { lineIsHot, linesFrom } from "./json-view.js";

test("line ids follow the JSON path", () => {
  const lines = linesFrom({
    model: "jev-latest",
    state: { fruit: "lemon", taste: "sour" },
  });
  const ids = lines.map((line) => line.id);
  expect(ids).toContain("$.model");
  expect(ids).toContain("$.state");
  expect(ids).toContain("$.state.fruit");
  expect(ids).toContain("$.state.$close");
  expect(ids).toContain("$.$close");
  expect(lines.find((line) => line.id === "$.state.fruit")?.valuePath).toBe("$.state.fruit");
  expect(lines.find((line) => line.id === "$.state")?.valuePath).toBe(null);
});

test("highlight matches a field or its branch", () => {
  const lines = linesFrom({ state: { fruit: "lemon" }, model: "jev-latest" });
  const fruit = lines.find((line) => line.id === "$.state.fruit");
  const model = lines.find((line) => line.id === "$.model");
  expect(lineIsHot(fruit, "state.*")).toBe(true);
  expect(lineIsHot(model, "state.*")).toBe(false);
  expect(lineIsHot(fruit, "state.fruit")).toBe(true);
  expect(lineIsHot(model, "model")).toBe(true);
  expect(lineIsHot(fruit, null)).toBe(false);
});
