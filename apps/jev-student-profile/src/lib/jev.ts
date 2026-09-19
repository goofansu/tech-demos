import type {
  EvaluateError,
  EvaluateRequest,
  EvaluateResponse,
  ApiStatus,
  JevQuestion,
  JevState,
  Rubric,
  RubricField,
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
export function rubricProblems(rubric: Rubric): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  if (rubric.inputs.length === 0) problems.push("Add at least one input field.");
  for (const input of rubric.inputs) {
    if (!/^[a-z0-9_]+$/i.test(input.key)) {
      problems.push(`Input key "${input.key || "(empty)"}" must be alphanumeric/underscore.`);
    }
  }
  if (rubric.fields.length === 0) problems.push("Add at least one question.");
  for (const f of rubric.fields) {
    const name = f.label || f.id || "(untitled)";
    if (!/^[a-z0-9_]+$/i.test(f.id)) problems.push(`"${name}": id must be alphanumeric/underscore.`);
    if (ids.has(f.id)) problems.push(`Duplicate question id "${f.id}".`);
    ids.add(f.id);
    if (!f.instructions.trim()) problems.push(`"${name}": instructions are required.`);
    if (f.type === "choice") {
      const keys = f.options.map((o) => o.key.trim()).filter(Boolean);
      if (keys.length < 2) problems.push(`"${name}": choice needs at least 2 options.`);
      if (new Set(keys).size !== keys.length) problems.push(`"${name}": option keys must be unique.`);
    }
    if (f.type === "score") {
      if (f.levels.length < 2 || f.levels.length > 10) {
        problems.push(`"${name}": score needs 2–10 levels.`);
      }
      if (f.levels.some((l) => !l.trim())) problems.push(`"${name}": every level needs text.`);
    }
    if (f.type === "noul") {
      const t = f.criteriaTrue.trim();
      const fl = f.criteriaFalse.trim();
      if ((t && !fl) || (!t && fl)) {
        problems.push(`"${name}": give both true and false criteria, or neither.`);
      }
    }
  }
  for (const c of rubric.conditions) {
    for (const clause of c.clauses) {
      if (!ids.has(clause.fieldId)) {
        problems.push(`Condition "${c.label}" references a missing question.`);
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

export async function evaluate(request: EvaluateRequest): Promise<EvaluateResponse> {
  const res = await fetch("/api/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const data = (await res.json().catch(() => ({ error: "Malformed server response" }))) as
    | EvaluateResponse
    | EvaluateError;
  if (!res.ok || "error" in data) {
    const err = data as EvaluateError;
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return data;
}
