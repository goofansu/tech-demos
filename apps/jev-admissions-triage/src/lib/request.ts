import { APPLICANT_STATE_KEYS } from "./admissions-preset";
import { omitReason } from "./fields";
import type { Translate } from "./i18n";
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

function fieldText(value: string | number | null | undefined, missing: string): string {
  if (value === null || value === undefined) return missing;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : missing;
  const trimmed = value.trim();
  return trimmed === "" ? missing : trimmed;
}

/** Whole-applicant state. Missing values are explicit so attention can see them. */
export function applicantState(applicant: Applicant, school: SchoolConfig, t: Translate): JevState {
  const missing = t("state.notProvided");
  const state: JevState = {
    applicant_id: applicant.id,
    applicant_name: applicant.name,
    school_name: school.name,
    school_country: school.country,
    school_academic_year: String(school.current_academic_year),
    school_grade_bands: formatGradeBands(school, t),
  };
  for (const key of APPLICANT_STATE_KEYS) {
    if (key === "age") {
      state.age = fieldText(applicant.age, missing);
    } else {
      state[key] = fieldText(applicant[key], missing);
    }
  }
  return state;
}

export function applicableJudgments(
  applicant: Applicant,
  school: SchoolConfig,
  preset: Judgment[],
): Judgment[] {
  return preset.filter((judgment) => omitReason(judgment, applicant, school) === null);
}

export function buildRequest(
  applicant: Applicant,
  school: SchoolConfig,
  preset: Judgment[],
  t: Translate,
): EvaluateRequest {
  const questions: Record<string, JevQuestion> = {};
  for (const judgment of applicableJudgments(applicant, school, preset)) {
    questions[judgment.id] = toJevQuestion(judgment);
  }
  return { state: applicantState(applicant, school, t), questions };
}
