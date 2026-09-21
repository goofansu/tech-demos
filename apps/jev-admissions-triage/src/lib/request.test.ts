import { describe, expect, test } from "bun:test";
import { ADMISSIONS_PRESET } from "./admissions-preset";
import { APPLICANTS, applicantsWithTag } from "./applicants";
import { applicableJudgments, buildRequest, serializeChoiceOption, toJevQuestion } from "./request";
import { translate, type MessagePath, type Vars } from "./i18n";
import { SCHOOL } from "./school";

const tEn = (path: MessagePath, vars?: Vars) => translate("en", path, vars);
const MISSING_STATE_LABEL = translate("en", "state.notProvided");

describe("structured Choice serialization", () => {
  test("keeps what / not_for / examples as a labeled string", () => {
    const reason = ADMISSIONS_PRESET.find((j) => j.id === "attention_reason");
    if (!reason || reason.primitive !== "choice") throw new Error("preset");
    const text = serializeChoiceOption(reason.options.ambiguous);
    expect(text).toContain("what: the file reads differently");
    expect(text).toContain("not_for: a file that clearly argues against admission");
    expect(text).toContain("examples:");
    expect(text).not.toBe(reason.options.ambiguous.what);
  });

  test("other stays an honest option in the Jev criteria map", () => {
    const reason = ADMISSIONS_PRESET.find((j) => j.id === "attention_reason");
    if (!reason || reason.primitive !== "choice") throw new Error("preset");
    const question = toJevQuestion(reason);
    if (question.type !== "choice") throw new Error("choice");
    expect(Object.keys(question.criteria)).toEqual([
      "incomplete",
      "ambiguous",
      "time_critical",
      "exceptional",
      "concerning",
      "other",
    ]);
    expect(question.criteria.other).toContain("none of the above fits");
  });
});

describe("request construction", () => {
  test("a complete applicant sends all eight questions once", () => {
    const request = buildRequest(APPLICANTS[0], SCHOOL, ADMISSIONS_PRESET, tEn);
    expect(Object.keys(request.questions).toSorted()).toEqual(
      ADMISSIONS_PRESET.map((j) => j.id).toSorted(),
    );
    expect(request.questions.prior_school.type).toBe("noul");
    expect(request.questions.attention.type).toBe("score");
    expect(request.questions.attention_reason.type).toBe("choice");
  });

  test("missing field judgments are omitted; attention still runs with explicit blanks", () => {
    const incomplete = applicantsWithTag("attention_incomplete").find((a) => a.prior_school === null);
    if (!incomplete) throw new Error("fixture");
    const request = buildRequest(incomplete, SCHOOL, ADMISSIONS_PRESET, tEn);
    expect(request.questions.prior_school).toBeUndefined();
    expect(request.questions.reason_for_applying).toBeUndefined();
    expect(request.questions.attention).toBeDefined();
    expect(request.questions.attention_reason).toBeDefined();
    expect(request.state.prior_school).toBe(MISSING_STATE_LABEL);
    expect(request.state.reason_for_applying).toBe(MISSING_STATE_LABEL);
    expect(applicableJudgments(incomplete, SCHOOL, ADMISSIONS_PRESET).some((j) => j.id === "prior_school")).toBe(false);
  });

  test("unconfigured Year 8 omits academic_fit but still asks attention", () => {
    const ghost = applicantsWithTag("unconfigured_grade")[0];
    const request = buildRequest(ghost, SCHOOL, ADMISSIONS_PRESET, tEn);
    expect(request.questions.academic_fit).toBeUndefined();
    expect(request.questions.attention).toBeDefined();
    expect(request.state.grade).toBe("Year 8");
  });

  test("state values are strings and never undefined", () => {
    const request = buildRequest(APPLICANTS[0], SCHOOL, ADMISSIONS_PRESET, tEn);
    for (const [key, value] of Object.entries(request.state)) {
      expect(typeof value).toBe("string");
      expect(value).not.toBeUndefined();
      expect(key.length).toBeGreaterThan(0);
    }
    expect(request.state.age).toBe("13");
    expect(request.state.school_name).toBe(SCHOOL.name);
  });

  test("question wording comes only from the preset", () => {
    const request = buildRequest(APPLICANTS[0], SCHOOL, ADMISSIONS_PRESET, tEn);
    for (const judgment of ADMISSIONS_PRESET) {
      expect(request.questions[judgment.id]?.instructions).toBe(judgment.question);
    }
  });
});
