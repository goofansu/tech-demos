import { describe, expect, test } from "bun:test";
import { PRESETS, presetFor } from "./admissions-preset";
import { APPLICANTS_BY_LOCALE, REQUIRED_TAGS, applicantsFor, applicantsWithTag } from "./applicants";
import { SCHOOLS, gradeBand, schoolFor } from "./school";
import { verdictLabel } from "./format";
import { catalogs, interpolate, translate, type Locale, type MessagePath, type Vars } from "./i18n";
import { buildRequest } from "./request";
import { deriveJudgment } from "./verdicts";

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

describe("school parity across locales", () => {
  test("same number of grade bands with the same ages", () => {
    const en = SCHOOLS.en;
    const zh = SCHOOLS["zh-CN"];
    expect(zh.country).toBe(en.country);
    expect(zh.current_academic_year).toBe(en.current_academic_year);
    expect(zh.grades.map((g) => [g.min_age, g.max_age])).toEqual(
      en.grades.map((g) => [g.min_age, g.max_age]),
    );
    expect(zh.grades.map((g) => g.name)).not.toEqual(en.grades.map((g) => g.name));
  });
});

describe("applicant parity across locales", () => {
  const en = APPLICANTS_BY_LOCALE.en;
  const zh = APPLICANTS_BY_LOCALE["zh-CN"];

  test("both locales ship the same 100 ids in the same order", () => {
    expect(zh).toHaveLength(100);
    expect(zh.map((a) => a.id)).toEqual(en.map((a) => a.id));
  });

  test("language-independent fields are identical", () => {
    for (const [i, source] of en.entries()) {
      const target = zh[i];
      expect(target.age, source.id).toBe(source.age);
      expect(target.tags, source.id).toEqual(source.tags);
      expect(target.prior_school_country, source.id).toBe(source.prior_school_country);
      expect(target.application_status, source.id).toBe(source.application_status);
    }
  });

  test("each Chinese grade resolves to the same configured band index", () => {
    const enSchool = schoolFor("en");
    const zhSchool = schoolFor("zh-CN");
    for (const [i, source] of en.entries()) {
      const target = zh[i];
      const enIndex = enSchool.grades.indexOf(gradeBand(enSchool, source.grade)!);
      const zhIndex = zhSchool.grades.indexOf(gradeBand(zhSchool, target.grade)!);
      expect(zhIndex, `${source.id} ${source.grade} -> ${target.grade}`).toBe(enIndex);
    }
  });

  test("the unconfigured-grade fixture is unconfigured in both locales", () => {
    const enGhost = applicantsWithTag("unconfigured_grade", "en")[0];
    const zhGhost = applicantsWithTag("unconfigured_grade", "zh-CN")[0];
    expect(enGhost.id).toBe(zhGhost.id);
    expect(gradeBand(schoolFor("en"), enGhost.grade)).toBeUndefined();
    expect(gradeBand(schoolFor("zh-CN"), zhGhost.grade)).toBeUndefined();
  });

  test("every required planted tag is covered in Chinese too", () => {
    for (const tag of REQUIRED_TAGS) {
      expect(applicantsWithTag(tag, "zh-CN").length, tag).toBeGreaterThan(0);
    }
  });

  test("prose fields are actually translated", () => {
    const cjk = /[\u4e00-\u9fff]/;
    for (const applicant of zh) {
      for (const key of ["reason_for_applying", "extracurricular", "officer_notes"] as const) {
        const value = applicant[key];
        if (value === null || value.trim() === "") continue;
        expect(cjk.test(value), `${applicant.id}.${key}`).toBe(true);
      }
    }
  });

  test("applicantsFor returns the locale's fixtures", () => {
    expect(applicantsFor("en")).toBe(APPLICANTS_BY_LOCALE.en);
    expect(applicantsFor("zh-CN")).toBe(APPLICANTS_BY_LOCALE["zh-CN"]);
  });
});

const tEn = (path: MessagePath, vars?: Vars) => translate("en", path, vars);
const tZh = (path: MessagePath, vars?: Vars) => translate("zh-CN", path, vars);

describe("localized lib output", () => {
  test("verdict labels follow the glossary", () => {
    expect(verdictLabel("needs_review", tEn)).toBe("Needs Review");
    expect(verdictLabel("needs_review", tZh)).toBe("待人工复核");
    expect(verdictLabel("not_met", tZh)).toBe("不符合");
    expect(verdictLabel("met", tZh)).toBe("符合");
    expect(verdictLabel("missing", tZh)).toBe("缺失");
  });

  test("a missing field explains itself in the active locale", () => {
    const blank = applicantsFor("zh-CN").find((a) => a.prior_school === null);
    if (!blank) throw new Error("fixture");
    const judgment = presetFor("zh-CN").find((j) => j.id === "prior_school")!;
    const outcome = deriveJudgment(judgment, blank, schoolFor("zh-CN"), undefined, 0.6, tZh);
    expect(outcome.verdict).toBe("missing");
    expect(outcome.semantic).toContain("Jev");
    expect(/[\u4e00-\u9fff]/.test(outcome.detail)).toBe(true);
  });

  test("the Chinese request carries Chinese questions and a Chinese missing label", () => {
    const blank = applicantsFor("zh-CN").find((a) => a.prior_school === null)!;
    const request = buildRequest(blank, schoolFor("zh-CN"), presetFor("zh-CN"), tZh);
    expect(request.state.prior_school).toBe("（未提供）");
    expect(request.questions.prior_school).toBeUndefined();
    expect(request.questions.attention).toBeDefined();
    expect(/[\u4e00-\u9fff]/.test(request.state.school_grade_bands)).toBe(true);
  });
});

describe("attention reason labels", () => {
  const keys = ["incomplete", "ambiguous", "time_critical", "exceptional", "concerning", "other"] as const;

  test("every choice option key has a display label in both locales", () => {
    const reason = presetFor("en").find((j) => j.id === "attention_reason");
    if (!reason || reason.primitive !== "choice") throw new Error("preset");
    expect(Object.keys(reason.options)).toEqual([...keys]);
    for (const key of keys) {
      const path = `attentionReason.${key}` as MessagePath;
      expect(translate("en", path)).not.toBe(path);
      expect(/[\u4e00-\u9fff]/.test(translate("zh-CN", path)), key).toBe(true);
    }
  });
});
