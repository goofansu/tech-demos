import { describe, expect, test } from "bun:test";
import { ADMISSIONS_PRESET, DEFAULT_CONFIDENCE_FLOOR } from "./admissions-preset";
import { APPLICANTS, applicantsWithTag } from "./applicants";
import { translate, type MessagePath, type Vars } from "./i18n";
import { SCHOOL } from "./school";
import { deriveJudgment, noulConfidence, scoreBand } from "./verdicts";
import type { Applicant, JevAnswer, JevNoulAnswer, JevScoreAnswer, Judgment } from "./types";

function judgment(id: string): Judgment {
  const found = ADMISSIONS_PRESET.find((j) => j.id === id);
  if (!found) throw new Error(id);
  return found;
}

function sample(): Applicant {
  return APPLICANTS[0];
}

const tEn = (path: MessagePath, vars?: Vars) => translate("en", path, vars);

const noul = (p: number): JevNoulAnswer => ({ type: "noul", noul: p });
const score = (value: number, confidence = 0.9): JevScoreAnswer => ({
  type: "score",
  score: value,
  confidence,
  legend: { "0": "a", "1": "b", "2": "c", "3": "d" },
  probabilities: { "0": 0, "1": 0, "2": 0, "3": 0 },
});

describe("scoreBand", () => {
  test("uses intervals, not rounding", () => {
    expect(scoreBand(1.49, 4)).toBe(1);
    expect(scoreBand(1.51, 4)).toBe(1);
    expect(scoreBand(1.99, 4)).toBe(1);
    expect(scoreBand(2.0, 4)).toBe(2);
    expect(scoreBand(0.4, 4)).toBe(0);
    expect(scoreBand(2.9, 4)).toBe(2);
    expect(scoreBand(3.2, 4)).toBe(3);
  });
});

describe("confidence-floor escalation", () => {
  test("routes a Met noul below the floor to Needs Review", () => {
    const outcome = deriveJudgment(
      judgment("prior_school"),
      sample(),
      SCHOOL,
      noul(0.8),
      0.9,
      tEn,
    );
    // noul 0.8 → concentration 0.8, below 0.9
    expect(noulConfidence(0.8)).toBe(0.8);
    expect(outcome.verdict).toBe("needs_review");
    expect(outcome.escalated).toBe(true);
  });

  test("keeps Met when concentration clears the floor", () => {
    const outcome = deriveJudgment(
      judgment("prior_school"),
      sample(),
      SCHOOL,
      noul(0.92),
      DEFAULT_CONFIDENCE_FLOOR,
      tEn,
    );
    expect(outcome.verdict).toBe("met");
    expect(outcome.escalated).toBe(false);
  });

  test("a spread Score is Needs Review even when the weighted mean sits in a Met band", () => {
    const outcome = deriveJudgment(
      judgment("extracurricular"),
      sample(),
      SCHOOL,
      score(2.2, 0.41),
      0.6,
      tEn,
    );
    expect(outcome.verdict).toBe("needs_review");
    expect(outcome.escalated).toBe(true);
  });
});

describe("never_not_met", () => {
  const protectedIds = ADMISSIONS_PRESET.filter((j) => j.never_not_met && j.role === "field").map((j) => j.id);

  test("lists the four field judgments that cannot be Not Met", () => {
    expect(protectedIds.toSorted()).toEqual(
      ["eal_support", "extracurricular", "reason_for_applying", "sibling_connection"].toSorted(),
    );
  });

  test("EAL cannot become Not Met even if a map is wrong", () => {
    const hacked = { ...judgment("eal_support"), verdict_map: { default: "not_met" as const } };
    const outcome = deriveJudgment(hacked, sample(), SCHOOL, score(3, 0.95), 0.6, tEn);
    expect(outcome.verdict).toBe("needs_review");
    expect(outcome.neverNotMetProtected).toBe(true);
  });

  test("sibling below the met threshold is Needs Review, not Not Met", () => {
    const sibling = applicantsWithTag("ambiguous_sibling")[0];
    const outcome = deriveJudgment(judgment("sibling_connection"), sibling, SCHOOL, noul(0.2), 0.6, tEn);
    expect(outcome.verdict).toBe("needs_review");
    expect(outcome.neverNotMetProtected).toBe(false);
  });

  test("scholarship and non-English traps still refuse Not Met on protected judgments", () => {
    const scholarship = applicantsWithTag("scholarship_trap")[0];
    const eal = deriveJudgment(judgment("eal_support"), scholarship, SCHOOL, score(2.4, 0.88), 0.6, tEn);
    expect(eal.verdict).not.toBe("not_met");

    const nonEnglish = applicantsWithTag("non_english_no_rejection")[0];
    const language = deriveJudgment(judgment("eal_support"), nonEnglish, SCHOOL, score(1.4, 0.7), 0.6, tEn);
    expect(language.verdict).toBe("needs_review");
    expect(language.verdict).not.toBe("not_met");
  });
});

describe("missing fields bypass the model", () => {
  test("empty prior school is Missing without an answer", () => {
    const incomplete = applicantsWithTag("attention_incomplete").find((a) => a.prior_school === null);
    if (!incomplete) throw new Error("need a null prior_school fixture");
    const outcome = deriveJudgment(judgment("prior_school"), incomplete, SCHOOL, undefined, 0.6, tEn);
    expect(outcome.verdict).toBe("missing");
    expect(outcome.omitReason).toBe("missing");
  });

  test("a supplied answer is ignored when the field is empty", () => {
    const emptyExtra: Applicant = { ...sample(), extracurricular: null };
    const outcome = deriveJudgment(judgment("extracurricular"), emptyExtra, SCHOOL, score(3, 0.99), 0.6, tEn);
    expect(outcome.verdict).toBe("missing");
  });
});

describe("unconfigured prerequisites", () => {
  test("Year 8 is Needs Review, never Not Met", () => {
    const ghost = applicantsWithTag("unconfigured_grade")[0];
    const outcome = deriveJudgment(
      judgment("academic_fit"),
      ghost,
      SCHOOL,
      score(0.1, 0.99),
      0.6,
      tEn,
    );
    expect(outcome.verdict).toBe("needs_review");
    expect(outcome.unconfigured).toBe(true);
    expect(outcome.omitReason).toBe("unconfigured");
  });
});

describe("Score handling without rounding", () => {
  test("1.49 academic fit stays in the Needs Review band, not Met", () => {
    const outcome = deriveJudgment(judgment("academic_fit"), sample(), SCHOOL, score(1.49, 0.95), 0.6, tEn);
    expect(outcome.verdict).toBe("needs_review");
  });

  test("1.51 academic fit also stays Needs Review — rounding would have flipped it", () => {
    const outcome = deriveJudgment(judgment("academic_fit"), sample(), SCHOOL, score(1.51, 0.95), 0.6, tEn);
    expect(outcome.verdict).toBe("needs_review");
  });

  test("2.00 academic fit is Met", () => {
    const outcome = deriveJudgment(judgment("academic_fit"), sample(), SCHOOL, score(2.0, 0.95), 0.6, tEn);
    expect(outcome.verdict).toBe("met");
  });

  test("0.4 academic fit is Not Met (level 0 band)", () => {
    const outcome = deriveJudgment(judgment("academic_fit"), sample(), SCHOOL, score(0.4, 0.95), 0.6, tEn);
    expect(outcome.verdict).toBe("not_met");
  });

  test("EAL 0.4 is Met (no support needed band); 1.4 is Needs Review", () => {
    expect(deriveJudgment(judgment("eal_support"), sample(), SCHOOL, score(0.4, 0.8), 0.6, tEn).verdict).toBe(
      "met",
    );
    expect(deriveJudgment(judgment("eal_support"), sample(), SCHOOL, score(1.4, 0.8), 0.6, tEn).verdict).toBe(
      "needs_review",
    );
  });
});

describe("queue judgments have no panel verdict", () => {
  test("attention carries a semantic score and a null verdict", () => {
    const answer: JevAnswer = score(2.3, 0.77);
    const outcome = deriveJudgment(judgment("attention"), sample(), SCHOOL, answer, 0.6, tEn);
    expect(outcome.verdict).toBeNull();
    expect(outcome.role).toBe("queue");
    expect(outcome.semantic).toContain("2.30");
  });
});
