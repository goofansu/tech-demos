import { ATTENTION_ID, ATTENTION_REASON_ID } from "./admissions-preset";
import type { Applicant, ApplicantResult, AttentionReason, JevChoiceAnswer, JevScoreAnswer } from "./types";

export type QueueRow = {
  applicant: Applicant;
  result: ApplicantResult;
};

function attentionScore(result: ApplicantResult): number | null {
  const answer = result.answers?.[ATTENTION_ID];
  if (answer?.type !== "score") return null;
  return answer.score;
}

function attentionConfidence(result: ApplicantResult): number | null {
  const answer = result.answers?.[ATTENTION_ID];
  if (answer?.type !== "score") return null;
  return answer.confidence;
}

export function attentionAnswer(result: ApplicantResult): JevScoreAnswer | undefined {
  const answer = result.answers?.[ATTENTION_ID];
  return answer?.type === "score" ? answer : undefined;
}

/** Label from the peak of the distribution — not a rounded score. */
export function peakScoreLabel(answer: JevScoreAnswer): string {
  const peak = Object.entries(answer.probabilities).toSorted((a, b) => b[1] - a[1])[0];
  if (peak) return answer.legend[peak[0]] ?? "";
  return answer.legend[String(Math.trunc(answer.score))] ?? "";
}

export function attentionReasonAnswer(result: ApplicantResult): JevChoiceAnswer | undefined {
  const answer = result.answers?.[ATTENTION_REASON_ID];
  return answer?.type === "choice" ? answer : undefined;
}

export function attentionReasonLabel(result: ApplicantResult): AttentionReason | null {
  const answer = attentionReasonAnswer(result);
  if (!answer) return null;
  return answer.choice as AttentionReason;
}

/**
 * Completed rows by attention score descending, then confidence ascending
 * (spread distributions surface first), then applicant id. Incomplete rows
 * keep a stable id order after the completed set.
 */
export function compareQueueRows(a: QueueRow, b: QueueRow): number {
  const aDone = a.result.status === "done" ? 0 : a.result.status === "error" ? 1 : 2;
  const bDone = b.result.status === "done" ? 0 : b.result.status === "error" ? 1 : 2;
  if (aDone !== bDone) return aDone - bDone;

  if (a.result.status === "done" && b.result.status === "done") {
    const aScore = attentionScore(a.result);
    const bScore = attentionScore(b.result);
    const aHas = aScore === null ? 1 : 0;
    const bHas = bScore === null ? 1 : 0;
    if (aHas !== bHas) return aHas - bHas;
    if (aScore !== null && bScore !== null && aScore !== bScore) return bScore - aScore;

    const aConf = attentionConfidence(a.result) ?? 1;
    const bConf = attentionConfidence(b.result) ?? 1;
    if (aConf !== bConf) return aConf - bConf;
  }

  return a.applicant.id.localeCompare(b.applicant.id);
}

export function sortQueue(rows: QueueRow[]): QueueRow[] {
  return rows.toSorted(compareQueueRows);
}

export function emptyResults(): Record<string, ApplicantResult> {
  return {};
}

export function resultFor(
  results: Record<string, ApplicantResult>,
  id: string,
): ApplicantResult {
  return results[id] ?? { status: "idle" };
}
