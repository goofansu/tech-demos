import { omitReason } from "./fields";
import type { Translate } from "./i18n";
import type {
  Applicant,
  JevAnswer,
  JevChoiceAnswer,
  JevNoulAnswer,
  JevScoreAnswer,
  Judgment,
  JudgmentOutcome,
  SchoolConfig,
  VerdictState,
} from "./types";

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/** Concentration of a yes/no probability — not a correctness claim. */
export function noulConfidence(noul: number): number {
  if (!Number.isFinite(noul)) return 0;
  return Math.max(noul, 1 - noul);
}

/**
 * Assign a Score to a level band without rounding.
 * [0, 1) → 0, [1, 2) → 1, … last level is [n-1, +∞).
 */
export function scoreBand(score: number, levelCount: number): number {
  if (!Number.isFinite(score) || levelCount < 1) return 0;
  const max = levelCount - 1;
  if (score <= 0) return 0;
  if (score >= max) return max;
  return Math.trunc(score);
}

export function answerConfidence(answer: JevAnswer | undefined): number | null {
  if (!answer) return null;
  if (answer.type === "noul") return noulConfidence(answer.noul);
  return Number.isFinite(answer.confidence) ? answer.confidence : null;
}

function mapScoreVerdict(judgment: Extract<Judgment, { primitive: "score" }>, score: number): VerdictState {
  const band = scoreBand(score, judgment.levels.length);
  return judgment.verdict_map[String(band)] ?? judgment.verdict_map.default;
}

function noulVerdict(judgment: Extract<Judgment, { primitive: "noul" }>, noul: number): VerdictState {
  if (noul >= judgment.thresholds.met) return "met";
  if (judgment.thresholds.not_met !== undefined && noul <= judgment.thresholds.not_met) return "not_met";
  return "needs_review";
}

function semanticFor(judgment: Judgment, answer: JevAnswer | undefined, t: Translate): string {
  if (!answer) return t("outcome.noAnswer");
  if (answer.type === "noul" && judgment.primitive === "noul") {
    return t("outcome.pYes", { pct: pct(answer.noul) });
  }
  if (answer.type === "score" && judgment.primitive === "score") {
    const band = scoreBand(answer.score, judgment.levels.length);
    const level = judgment.levels[band] ?? answer.legend[String(band)] ?? "";
    return t("outcome.scoreSemantic", { score: answer.score.toFixed(2), level });
  }
  if (answer.type === "choice" && judgment.primitive === "choice") {
    return answer.choice;
  }
  return t("outcome.unexpected");
}

function applyGuardrails(
  judgment: Judgment,
  raw: VerdictState,
  confidence: number | null,
  floor: number,
): { verdict: VerdictState; escalated: boolean; neverNotMetProtected: boolean } {
  let verdict = raw;
  const escalated = confidence !== null && confidence < floor && verdict !== "missing";
  if (escalated) verdict = "needs_review";
  let neverNotMetProtected = false;
  if (judgment.never_not_met && verdict === "not_met") {
    verdict = "needs_review";
    neverNotMetProtected = true;
  }
  return { verdict, escalated, neverNotMetProtected };
}

export function deriveJudgment(
  judgment: Judgment,
  applicant: Applicant,
  school: SchoolConfig,
  answer: JevAnswer | undefined,
  confidenceFloor: number,
  t: Translate,
): JudgmentOutcome {
  const omitted = omitReason(judgment, applicant, school);
  const floor = confidenceFloor;

  if (omitted === "missing") {
    return {
      id: judgment.id,
      label: judgment.label,
      primitive: judgment.primitive,
      role: judgment.role,
      verdict: judgment.role === "field" ? "missing" : null,
      semantic: t("outcome.missingSemantic"),
      confidence: null,
      escalated: false,
      neverNotMetProtected: false,
      unconfigured: false,
      omitReason: "missing",
      detail: t("outcome.missingDetail"),
    };
  }

  if (omitted === "unconfigured") {
    return {
      id: judgment.id,
      label: judgment.label,
      primitive: judgment.primitive,
      role: judgment.role,
      verdict: "needs_review",
      semantic: t("outcome.unconfiguredSemantic"),
      confidence: null,
      escalated: false,
      neverNotMetProtected: false,
      unconfigured: true,
      omitReason: "unconfigured",
      detail: t("outcome.unconfiguredDetail"),
    };
  }

  if (!answer) {
    return {
      id: judgment.id,
      label: judgment.label,
      primitive: judgment.primitive,
      role: judgment.role,
      verdict: judgment.role === "field" ? null : null,
      semantic: t("outcome.waitingSemantic"),
      confidence: null,
      escalated: false,
      neverNotMetProtected: false,
      unconfigured: false,
      omitReason: null,
      detail: t("outcome.waitingDetail"),
    };
  }

  const confidence = answerConfidence(answer);
  let raw: VerdictState = "needs_review";

  if (judgment.primitive === "noul" && answer.type === "noul") {
    raw = noulVerdict(judgment, answer.noul);
  } else if (judgment.primitive === "score" && answer.type === "score") {
    raw = mapScoreVerdict(judgment, answer.score);
  } else if (judgment.primitive === "choice") {
    raw = "needs_review";
  }

  const guarded = applyGuardrails(judgment, raw, confidence, floor);
  const semantic = semanticFor(judgment, answer, t);
  const parts: string[] = [semantic];
  if (guarded.escalated) {
    parts.push(
      t("outcome.escalatedDetail", {
        confidence: confidence?.toFixed(2) ?? "",
        floor: floor.toFixed(2),
      }),
    );
  }
  if (guarded.neverNotMetProtected) {
    parts.push(t("outcome.neverNotMetDetail"));
  }

  return {
    id: judgment.id,
    label: judgment.label,
    primitive: judgment.primitive,
    role: judgment.role,
    verdict: judgment.role === "field" ? guarded.verdict : null,
    semantic,
    confidence,
    escalated: guarded.escalated,
    neverNotMetProtected: guarded.neverNotMetProtected,
    unconfigured: false,
    omitReason: null,
    detail: parts.join(" "),
  };
}

export function deriveOutcomes(
  applicant: Applicant,
  school: SchoolConfig,
  answers: Record<string, JevAnswer> | undefined,
  confidenceFloor: number,
  preset: Judgment[],
  t: Translate,
): JudgmentOutcome[] {
  return preset.map((judgment) =>
    deriveJudgment(judgment, applicant, school, answers?.[judgment.id], confidenceFloor, t),
  );
}

export function fieldOutcomes(outcomes: JudgmentOutcome[]): JudgmentOutcome[] {
  return outcomes.filter((o) => o.role === "field");
}

export function queueOutcomes(outcomes: JudgmentOutcome[]): JudgmentOutcome[] {
  return outcomes.filter((o) => o.role === "queue");
}

export function asNoul(answer: JevAnswer | undefined): JevNoulAnswer | undefined {
  return answer?.type === "noul" ? answer : undefined;
}

export function asScore(answer: JevAnswer | undefined): JevScoreAnswer | undefined {
  return answer?.type === "score" ? answer : undefined;
}

export function asChoice(answer: JevAnswer | undefined): JevChoiceAnswer | undefined {
  return answer?.type === "choice" ? answer : undefined;
}
