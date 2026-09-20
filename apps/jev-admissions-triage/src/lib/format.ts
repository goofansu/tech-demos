import type { Applicant, VerdictState } from "./types";

export const VERDICT_LABEL: Record<VerdictState, string> = {
  met: "Met",
  not_met: "Not Met",
  needs_review: "Needs Review",
  missing: "Missing",
};

export const VERDICT_TONE: Record<VerdictState, "success" | "danger" | "warning" | "outline"> = {
  met: "success",
  not_met: "danger",
  needs_review: "warning",
  missing: "outline",
};

export function applicantContext(applicant: Applicant): string {
  const bits = [
    applicant.grade ?? "No grade",
    applicant.age !== null ? `age ${applicant.age}` : null,
    applicant.prior_school,
  ].filter(Boolean);
  return bits.join(" · ");
}

export function formatFloor(n: number): string {
  return n.toFixed(1);
}
