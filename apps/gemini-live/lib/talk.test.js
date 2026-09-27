import { describe, expect, test } from "bun:test";
import { formatPriorTalk } from "./talk.js";

describe("prior talk", () => {
  test("keeps what was said and drops empty turns", () => {
    const text = formatPriorTalk([
      { role: "user", text: "What time is it in Tokyo?" },
      { role: "model", text: "" },
      { role: "model", text: "It is 23:32." },
      { role: "tool", text: "ignored" },
    ]);
    expect(text).toBe("Person: What time is it in Tokyo?\nVoice: It is 23:32.");
  });

  test("returns nothing when the page is fresh", () => {
    expect(formatPriorTalk([])).toBe("");
  });
});
