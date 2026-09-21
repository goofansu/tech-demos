import { describe, expect, test } from "bun:test";
import { PRESETS, presetFor } from "./admissions-preset";
import { catalogs, interpolate, translate, type Locale } from "./i18n";

function paths(node: unknown, prefix = ""): string[] {
  if (typeof node === "string") return [prefix];
  if (!node || typeof node !== "object") return [];
  return Object.entries(node).flatMap(([key, value]) =>
    paths(value, prefix ? `${prefix}.${key}` : key),
  );
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).toSorted();
}

describe("i18n catalogs", () => {
  test("English and Simplified Chinese share the same message keys", () => {
    expect(paths(catalogs["zh-CN"])).toEqual(paths(catalogs.en));
  });

  test("each locale keeps the same interpolation placeholders", () => {
    for (const path of paths(catalogs.en)) {
      const enVars = placeholders(translate("en", path as never));
      const zhVars = placeholders(translate("zh-CN", path as never));
      expect(zhVars, path).toEqual(enVars);
    }
  });

  test("interpolate leaves unknown tokens in place", () => {
    expect(interpolate("Hello {name}", { other: "x" })).toBe("Hello {name}");
  });

  test("mode names use the agreed glossary", () => {
    expect(translate("en", "app.queue")).toBe("Queue");
    expect(translate("zh-CN", "app.queue")).toBe("队列");
    expect(translate("zh-CN", "app.applicant")).toBe("申请人");
    expect(translate("zh-CN", "app.preset")).toBe("题组");
  });
});

describe("preset parity across locales", () => {
  const en = PRESETS.en;
  const zh = PRESETS["zh-CN"];

  test("same judgment ids in the same order", () => {
    expect(zh.map((j) => j.id)).toEqual(en.map((j) => j.id));
  });

  test("structure and calibration are identical", () => {
    for (const [i, source] of en.entries()) {
      const target = zh[i];
      expect(target.primitive, source.id).toBe(source.primitive);
      expect(target.role, source.id).toBe(source.role);
      expect(target.reads, source.id).toEqual(source.reads);
      expect(target.never_not_met, source.id).toBe(source.never_not_met);
      expect(target.confidence_floor, source.id).toBe(source.confidence_floor);
    }
  });

  test("noul thresholds, score maps and choice keys match", () => {
    for (const [i, source] of en.entries()) {
      const target = zh[i];
      if (source.primitive === "noul" && target.primitive === "noul") {
        expect(target.thresholds, source.id).toEqual(source.thresholds);
        expect(Object.keys(target.criteria).toSorted()).toEqual(["false", "true"]);
      }
      if (source.primitive === "score" && target.primitive === "score") {
        expect(target.verdict_map, source.id).toEqual(source.verdict_map);
        expect(target.levels.length, source.id).toBe(source.levels.length);
      }
      if (source.primitive === "choice" && target.primitive === "choice") {
        expect(Object.keys(target.options), source.id).toEqual(Object.keys(source.options));
      }
    }
  });

  test("every Chinese judgment has translated prose", () => {
    const cjk = /[\u4e00-\u9fff]/;
    for (const judgment of zh) {
      expect(cjk.test(judgment.label), `${judgment.id} label`).toBe(true);
      expect(cjk.test(judgment.question), `${judgment.id} question`).toBe(true);
    }
  });

  test("presetFor returns the locale's preset", () => {
    const locales: Locale[] = ["en", "zh-CN"];
    for (const locale of locales) {
      expect(presetFor(locale)).toBe(PRESETS[locale]);
    }
  });
});
