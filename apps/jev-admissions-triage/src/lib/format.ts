import type { MessagePath, Translate } from "./i18n";
import type { Applicant, VerdictState } from "./types";

export function verdictLabel(verdict: VerdictState, t: Translate): string {
  return t(`verdict.${verdict}` as MessagePath);
}

export const VERDICT_TONE: Record<VerdictState, "success" | "danger" | "warning" | "outline"> = {
  met: "success",
  not_met: "danger",
  needs_review: "warning",
  missing: "outline",
};

export function applicantContext(applicant: Applicant, t: Translate): string {
  const bits = [
    applicant.grade ?? t("outcome.noGrade"),
    applicant.age !== null ? t("outcome.age", { age: applicant.age }) : null,
    applicant.prior_school,
  ].filter(Boolean);
  return bits.join(" · ");
}

export function formatFloor(n: number): string {
  return n.toFixed(1);
}
