import { ADMISSIONS_PRESET, APPLICANT_STATE_KEYS } from "./admissions-preset";
import { omitReason } from "./fields";
import { formatGradeBands } from "./school";
import type {
  Applicant,
  ChoiceOptionSpec,
  EvaluateRequest,
  JevQuestion,
  JevState,
  Judgment,
  SchoolConfig,
} from "./types";
import { MISSING_STATE_LABEL } from "./types";

export function serializeChoiceOption(option: ChoiceOptionSpec): string {
  const parts = [`what: ${option.what}`];
  if (option.not_for) parts.push(`not_for: ${option.not_for}`);
  if (option.examples && option.examples.length > 0) {
    parts.push(`examples: ${option.examples.join("; ")}`);
  }
  return parts.join(". ");
}

export function toJevQuestion(judgment: Judgment): JevQuestion {
  switch (judgment.primitive) {
    case "noul":
      return {
        type: "noul",
        instructions: judgment.question,
        criteria: { true: judgment.criteria.true, false: judgment.criteria.false },
      };
    case "score":
      return {
        type: "score",
        instructions: judgment.question,
        criteria: [...judgment.levels],
      };
    case "choice": {
      const criteria: Record<string, string | null> = {};
      for (const [key, option] of Object.entries(judgment.options)) {
        criteria[key] = serializeChoiceOption(option);
      }
      return { type: "choice", instructions: judgment.question, criteria };
    }
  }
}

function fieldText(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return MISSING_STATE_LABEL;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : MISSING_STATE_LABEL;
  const trimmed = value.trim();
  return trimmed === "" ? MISSING_STATE_LABEL : trimmed;
}

/** Whole-applicant state. Missing values are explicit so attention can see them. */
export function applicantState(applicant: Applicant, school: SchoolConfig): JevState {
  const state: JevState = {
    applicant_id: applicant.id,
    applicant_name: applicant.name,
    school_name: school.name,
    school_country: school.country,
    school_academic_year: String(school.current_academic_year),
    school_grade_bands: formatGradeBands(school),
  };
  for (const key of APPLICANT_STATE_KEYS) {
    if (key === "age") {
      state.age = fieldText(applicant.age);
    } else {
      state[key] = fieldText(applicant[key]);
    }
  }
  return state;
}

export function applicableJudgments(applicant: Applicant, school: SchoolConfig): Judgment[] {
  return ADMISSIONS_PRESET.filter((judgment) => omitReason(judgment, applicant, school) === null);
}

export function buildRequest(applicant: Applicant, school: SchoolConfig): EvaluateRequest {
  const questions: Record<string, JevQuestion> = {};
  for (const judgment of applicableJudgments(applicant, school)) {
    questions[judgment.id] = toJevQuestion(judgment);
  }
  return { state: applicantState(applicant, school), questions };
}
