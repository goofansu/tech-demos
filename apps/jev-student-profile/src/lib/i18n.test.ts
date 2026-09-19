import { describe, expect, test } from "bun:test";
import { catalogs, interpolate, translate, type Locale, type MessagePath, type Vars } from "./i18n";
import { SAMPLE_RUBRIC, SAMPLE_RUBRICS, SAMPLE_STUDENTS_BY_LOCALE } from "./sample";
import { buildRequest, rubricProblems } from "./jev";
import { verdictFor } from "./conditions";

const tZh = (path: MessagePath, vars?: Vars) => translate("zh-CN", path, vars);

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

  test("translate interpolates variables", () => {
    expect(translate("en", "app.subtitle", { name: "Grade 8", count: 5 })).toBe(
      "Grade 8 · 5 questions · TypeSafe Jev only",
    );
    expect(translate("zh-CN", "app.subtitle", { name: "八年级学习者画像", count: 5 })).toBe(
      "八年级学习者画像 · 5 道题 · 仅使用 TypeSafe Jev",
    );
  });

  test("interpolate leaves unknown tokens in place", () => {
    expect(interpolate("Hello {name}", { other: "x" })).toBe("Hello {name}");
  });
});

describe("locale samples", () => {
  const locales = Object.keys(SAMPLE_RUBRICS) as Locale[];

  test("Chinese sample keeps the same ids, keys, and types as English", () => {
    const en = SAMPLE_RUBRICS.en;
    const zh = SAMPLE_RUBRICS["zh-CN"];
    expect(zh.inputs.map((i) => i.key)).toEqual(en.inputs.map((i) => i.key));
    expect(zh.fields.map((f) => ({ id: f.id, type: f.type }))).toEqual(
      en.fields.map((f) => ({ id: f.id, type: f.type })),
    );
    expect(zh.conditions.map((c) => c.id)).toEqual(en.conditions.map((c) => c.id));
    expect(zh.conditions.map((c) => c.clauses)).toEqual(en.conditions.map((c) => c.clauses));
  });

  test("sample students share stable ids across locales", () => {
    const enIds = SAMPLE_STUDENTS_BY_LOCALE.en.map((s) => s.id);
    for (const locale of locales) {
      expect(SAMPLE_STUDENTS_BY_LOCALE[locale].map((s) => s.id)).toEqual(enIds);
    }
  });

  test("Chinese sample is a valid rubric and keeps empty excerpts in state", () => {
    expect(rubricProblems(SAMPLE_RUBRICS["zh-CN"], tZh)).toEqual([]);

    const request = buildRequest(SAMPLE_RUBRICS["zh-CN"], {
      teacher_notes: "小雅提前完成任务。",
      student_reflection: "我想先写结尾。",
      work_sample: "   ",
    });
    expect(request.state.work_sample).toBe("");
    expect(request.questions.writing_quality).toMatchObject({ type: "score" });
  });

  test("English sample still matches the default export", () => {
    expect(SAMPLE_RUBRICS.en).toBe(SAMPLE_RUBRIC);
  });
});

describe("localized verdicts", () => {
  const field = SAMPLE_RUBRIC.fields.find((f) => f.id === "writing_quality");
  if (!field || field.type !== "score") throw new Error("expected writing_quality score field");

  test("renders Simplified Chinese labels", () => {
    const verdict = verdictFor(
      field,
      { type: "score", score: 2.4, confidence: 0.8, legend: {}, probabilities: {} },
      tZh,
    );
    expect(verdict?.label).toBe("达到等级");
    expect(verdict?.detail).toContain("分数");
  });
});
