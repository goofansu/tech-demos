import type { Locale } from "./i18n";
import { BATCH_RECORDS_EN, BATCH_RECORDS_ZH, type BatchRecord } from "./batch-records";
import { buildRequest } from "./jev";
import type { EvaluateRequest, JevAnswer, Rubric } from "./types";

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
