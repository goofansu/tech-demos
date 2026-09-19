import { detectLocale, translate, type Translate } from "./i18n";
import {
  SCORE_LEVEL_MAX,
  SCORE_LEVEL_MIN,
  type EvaluateError,
  type EvaluateRequest,
  type EvaluateResponse,
  type ApiStatus,
  type JevQuestion,
  type JevState,
  type Rubric,
  type RubricField,
} from "./types";

/** Translate one authored field into a Jev question. */
export function toJevQuestion(field: RubricField): JevQuestion {
  switch (field.type) {
    case "noul": {
      const t = field.criteriaTrue.trim();
      const f = field.criteriaFalse.trim();
      return t && f
        ? { type: "noul", instructions: field.instructions, criteria: { true: t, false: f } }
        : { type: "noul", instructions: field.instructions };
    }
    case "choice": {
      const criteria: Record<string, string | null> = {};
      for (const opt of field.options) {
        if (!opt.key.trim()) continue;
        criteria[opt.key.trim()] = opt.description.trim() || null;
      }
      return { type: "choice", instructions: field.instructions, criteria };
    }
    case "score":
      return {
        type: "score",
        instructions: field.instructions,
        criteria: field.levels.map((l) => l.trim()),
      };
  }
}

export function buildRequest(rubric: Rubric, state: JevState): EvaluateRequest {
  const questions: Record<string, JevQuestion> = {};
  for (const field of rubric.fields) questions[field.id] = toJevQuestion(field);
  // Keep blank inputs as empty strings. Dropping them hides a cited field
  // (e.g. `work_sample`) and Jev scores leftover notes/reflection instead.
  const nextState: JevState = {};
  for (const input of rubric.inputs) {
    nextState[input.key] = state[input.key]?.trim() ?? "";
  }
  return { state: nextState, questions };
}

/** Author-time problems that would make the request fail validation. */
export function rubricProblems(rubric: Rubric, t: Translate): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  if (rubric.inputs.length === 0) problems.push(t("problems.needInput"));
  for (const input of rubric.inputs) {
    if (!/^[a-z0-9_]+$/i.test(input.key)) {
      problems.push(t("problems.inputKey", { key: input.key || t("problems.empty") }));
    }
  }
  if (rubric.fields.length === 0) problems.push(t("problems.needQuestion"));
  for (const f of rubric.fields) {
    const name = f.label || f.id || t("problems.untitled");
    if (!/^[a-z0-9_]+$/i.test(f.id)) problems.push(t("problems.badId", { name }));
    if (ids.has(f.id)) problems.push(t("problems.duplicateId", { id: f.id }));
    ids.add(f.id);
    if (!f.instructions.trim()) problems.push(t("problems.needInstructions", { name }));
    if (f.type === "choice") {
      const keys = f.options.map((o) => o.key.trim()).filter(Boolean);
      if (keys.length < 2) problems.push(t("problems.choiceMin", { name }));
      if (new Set(keys).size !== keys.length) problems.push(t("problems.choiceUnique", { name }));
    }
    if (f.type === "score") {
      if (f.levels.length < SCORE_LEVEL_MIN || f.levels.length > SCORE_LEVEL_MAX) {
        problems.push(t("problems.scoreLevels", { name }));
      }
      if (f.levels.some((l) => !l.trim())) problems.push(t("problems.scoreText", { name }));
    }
    if (f.type === "noul") {
      const truth = f.criteriaTrue.trim();
      const fl = f.criteriaFalse.trim();
      if ((truth && !fl) || (!truth && fl)) {
        problems.push(t("problems.noulCriteria", { name }));
      }
    }
  }
  for (const c of rubric.conditions) {
    for (const clause of c.clauses) {
      if (!ids.has(clause.fieldId)) {
        problems.push(t("problems.missingQuestion", { label: c.label }));
      }
    }
  }
  return problems;
}

export async function fetchStatus(): Promise<ApiStatus> {
  const res = await fetch("/api/status");
  if (!res.ok) throw new Error(`status ${res.status}`);
  return (await res.json()) as ApiStatus;
}

export async function evaluate(
  request: EvaluateRequest,
  options?: { signal?: AbortSignal },
): Promise<EvaluateResponse> {
  const res = await fetch("/api/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal: options?.signal,
  });
  const locale = detectLocale();
  const data = (await res.json().catch(() => ({ error: translate(locale, "errors.malformed") }))) as
    | EvaluateResponse
    | EvaluateError;
  if (!res.ok || "error" in data) {
    const err = data as EvaluateError;
    throw new Error(err.error || translate(locale, "errors.requestFailed", { status: res.status }));
  }
  return data;
}
