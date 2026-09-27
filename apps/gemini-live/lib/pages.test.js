import { describe, expect, test } from "bun:test";
import { SCENES } from "./catalog.js";
import { demoPath, pageFromPath } from "./pages.js";

describe("demonstration pages", () => {
  test("the home path is the list", () => {
    expect(pageFromPath("/").kind).toBe("home");
    expect(pageFromPath("").kind).toBe("home");
    expect(pageFromPath("/index.html").kind).toBe("home");
  });

  test("each Try one item has its own page and an explanation", () => {
    for (const scene of SCENES) {
      const page = pageFromPath(demoPath(scene.id));
      expect(page.kind).toBe("demo");
      expect(page.scene.id).toBe(scene.id);
      expect(scene.shows.length).toBeGreaterThan(8);
      expect(scene.detail.length).toBeGreaterThan(8);
      expect(scene.ask.length).toBeGreaterThan(3);
      expect(scene.points.length).toBeGreaterThan(0);
      expect(scene.text.length).toBeGreaterThan(8);
    }
    expect(SCENES.map((scene) => scene.id)).toEqual([
      "hello",
      "clock",
      "lisbon",
      "scan",
      "search",
      "puzzle",
      "see",
    ]);
  });

  test("a trailing slash still opens the demonstration", () => {
    expect(pageFromPath("/try/hello/").scene.id).toBe("hello");
  });

  test("unknown addresses are not demonstrations", () => {
    expect(pageFromPath("/try/nope").kind).toBe("missing");
    expect(pageFromPath("/try/hello/extra").kind).toBe("missing");
    expect(pageFromPath("/other").kind).toBe("missing");
  });
});
