import type { Locale } from "./i18n";
import { BATCH_RECORDS_EN, BATCH_RECORDS_ZH, type BatchRecord } from "./batch-records";
import type { EvaluateRequest, JevChoiceQuestion } from "./types";

export type { BatchRecord };

export const BATCH_CONCURRENCY = 6;
export const BATCH_SIZE = 100;
export const BATCH_QUESTION_ID = "signal";
export const BATCH_STATE_KEY = "student_text";

export const BATCH_OPTION_KEYS = [
  "support",
  "extension",
  "collaboration",
  "reflection",
  "mixed",
] as const;

export type BatchOptionKey = (typeof BATCH_OPTION_KEYS)[number];

export type BatchRowStatus = "idle" | "queued" | "running" | "done" | "error";

export type BatchRowResult = {
  status: BatchRowStatus;
  label?: string;
  confidence?: number;
  latencyMs?: number;
  error?: string;
};

export function isBatchOptionKey(value: string): value is BatchOptionKey {
  return (BATCH_OPTION_KEYS as readonly string[]).includes(value);
}

export function emptyBatchResults(): Record<string, BatchRowResult> {
  return {};
}

export function batchRecords(locale: Locale): BatchRecord[] {
  return locale === "zh-CN" ? BATCH_RECORDS_ZH : BATCH_RECORDS_EN;
}

export function batchQuestion(locale: Locale): JevChoiceQuestion {
  if (locale === "zh-CN") {
    return {
      type: "choice",
      instructions:
        "只根据 `student_text` 判断主导的学习信号。选一个最贴切的标签。若两个信号差不多强，选 mixed。",
      criteria: {
        support: "学生卡住、跟不上，或在明确求助。",
        extension: "学生超前、提前完成，或主动延伸任务。",
        collaboration: "学生主要写同伴、小组或课堂讨论。",
        reflection: "学生点出自己的具体优势、缺口或下一步。",
        mixed: "没有单一信号占主导，或几种信号差不多强。",
      },
    };
  }
  return {
    type: "choice",
    instructions:
      "Read `student_text` only. Pick the single best label for the dominant learning signal. If two signals are equally strong, choose mixed.",
    criteria: {
      support: "The student is stuck, falling behind, or asking for help.",
      extension: "The student is ahead, finishing early, or going beyond the assigned work.",
      collaboration: "The student focuses on peers, group work, or discussion.",
      reflection: "The student names a specific strength, gap, or next step about their own learning.",
      mixed: "No single signal dominates, or two signals are equally strong.",
    },
  };
}

export function buildBatchRequest(text: string, locale: Locale): EvaluateRequest {
  return {
    state: { [BATCH_STATE_KEY]: text },
    questions: { [BATCH_QUESTION_ID]: batchQuestion(locale) },
  };
}
