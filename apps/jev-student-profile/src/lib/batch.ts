import { verdictFor } from "./conditions";
import type { Translate } from "./i18n";
import type { Locale } from "./i18n";
import { BATCH_RECORDS_EN, BATCH_RECORDS_ZH, type BatchRecord } from "./batch-records";
import { buildRequest } from "./jev";
import type { EvaluateRequest, JevAnswer, Rubric, RubricField } from "./types";

export type { BatchRecord };

export const BATCH_CONCURRENCY = 6;
export const BATCH_SIZE = 100;

export type BatchRowStatus = "idle" | "queued" | "running" | "done" | "error";

export type BatchRowResult = {
  status: BatchRowStatus;
  answers?: Record<string, JevAnswer>;
  latencyMs?: number;
  error?: string;
};

export type FieldChip = {
  text: string;
  title: string;
  tone: "choice" | "score" | "noul" | "success" | "outline" | "warning";
};

export function emptyBatchResults(): Record<string, BatchRowResult> {
  return {};
}

export function batchRecords(locale: Locale): BatchRecord[] {
  return locale === "zh-CN" ? BATCH_RECORDS_ZH : BATCH_RECORDS_EN;
}

export function buildBatchRequest(rubric: Rubric, record: BatchRecord): EvaluateRequest {
  return buildRequest(rubric, record.state);
}

export function rubricKey(rubric: Rubric): string {
  return rubric.fields.map((field) => `${field.id}:${field.type}`).join("|");
}

export function choiceLabel(key: string): string {
  return key.replace(/_/g, " ");
}

export function summarizeFieldAnswer(
  field: RubricField,
  answer: JevAnswer | undefined,
  t: Translate,
): FieldChip | null {
  if (!answer) return null;
  const verdict = verdictFor(field, answer, t);
  if (field.type === "choice" && answer.type === "choice") {
    const text = choiceLabel(answer.choice);
    return {
      text,
      title: t("batch.choiceDetail", {
        label: text,
        pct: Math.round(answer.confidence * 100),
      }),
      tone: "choice",
    };
  }
  if (field.type === "score" && answer.type === "score") {
    return {
      text: answer.score.toFixed(1),
      title: verdict?.detail ?? textOrEmpty(answer.score),
      tone: verdict?.met ? "success" : "outline",
    };
  }
  if (field.type === "noul" && answer.type === "noul") {
    return {
      text: verdict?.label ?? t("batch.emptyCell"),
      title: verdict?.detail ?? "",
      tone: verdict?.met ? "success" : "outline",
    };
  }
  return null;
}

function textOrEmpty(score: number): string {
  return String(score);
}
