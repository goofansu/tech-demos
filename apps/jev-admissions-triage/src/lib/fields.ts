import { gradeBand } from "./school";
import type { Applicant, Judgment, OmitReason, SchoolConfig } from "./types";

export function isBlank(value: string | number | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "number") return !Number.isFinite(value);
  return value.trim() === "";
}

export function applicantValue(applicant: Applicant, key: string): string | number | null {
  if (key === "*") return null;
  return (applicant as unknown as Record<string, string | number | null>)[key] ?? null;
}

export function readKeys(judgment: Judgment): string[] {
  return judgment.reads.filter((key) => key !== "*");
}

/** Field judgments with a single `reads` key miss when that key is empty. Composites miss when every read is empty. */
export function isMissingInput(judgment: Judgment, applicant: Applicant): boolean {
  if (judgment.role === "queue") return false;
  const keys = readKeys(judgment);
  if (keys.length === 0) return false;
  if (keys.length === 1) return isBlank(applicantValue(applicant, keys[0]));
  return keys.every((key) => isBlank(applicantValue(applicant, key)));
}

/** Academic fit cannot reject an applied grade the school has not configured. */
export function isUnconfiguredPrerequisite(
  judgment: Judgment,
  applicant: Applicant,
  school: SchoolConfig,
): boolean {
  if (judgment.id !== "academic_fit") return false;
  if (isBlank(applicant.grade)) return false;
  return !gradeBand(school, applicant.grade);
}

export function omitReason(
  judgment: Judgment,
  applicant: Applicant,
  school: SchoolConfig,
): OmitReason | null {
  if (isMissingInput(judgment, applicant)) return "missing";
  if (isUnconfiguredPrerequisite(judgment, applicant, school)) return "unconfigured";
  return null;
}

export function missingFieldCount(applicant: Applicant, preset: Judgment[]): number {
  return preset.filter((j) => j.role === "field" && isMissingInput(j, applicant)).length;
}

export function cloneApplicant(applicant: Applicant): Applicant {
  return { ...applicant, tags: [...applicant.tags] };
}
