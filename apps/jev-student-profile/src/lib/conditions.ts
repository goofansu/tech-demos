import type { Translate } from "./i18n";
import type { Clause, ClauseOp, Condition, JevAnswer, RubricField } from "./types";

export type Verdict = {
  met: boolean;
  label: string;
  detail: string;
};

/** Apply the field's own threshold to its answer. Code owns the decision. */
export function verdictFor(
  field: RubricField,
  answer: JevAnswer | undefined,
  t: Translate,
): Verdict | null {
  if (!answer) return null;
  switch (field.type) {
    case "noul": {
      if (answer.type !== "noul") return null;
      const met = answer.noul >= field.yesAt;
      return {
        met,
        label: met ? t("verdicts.yes") : t("verdicts.no"),
        detail: t("verdicts.noulDetail", {
          actual: pct(answer.noul),
          op: met ? "≥" : "<",
          threshold: pct(field.yesAt),
        }),
      };
    }
    case "choice": {
      if (answer.type !== "choice") return null;
      const met = answer.confidence >= field.minConfidence;
      return {
        met,
        label: met ? t("verdicts.confident") : t("verdicts.uncertain"),
        detail: t("verdicts.choiceDetail", {
          actual: answer.confidence.toFixed(2),
          op: met ? "≥" : "<",
          threshold: field.minConfidence.toFixed(2),
        }),
      };
    }
    case "score": {
      if (answer.type !== "score") return null;
      const met = answer.score >= field.meetsAt;
      return {
        met,
        label: met ? t("verdicts.meets") : t("verdicts.below"),
        detail: t("verdicts.scoreDetail", {
          actual: answer.score.toFixed(2),
          op: met ? "≥" : "<",
          threshold: field.meetsAt,
        }),
      };
    }
  }
}

export function opsFor(type: RubricField["type"]): ClauseOp[] {
  return type === "choice" ? ["is", "is_not"] : [">=", "<"];
}

export function opLabel(op: ClauseOp, t: Translate): string {
  switch (op) {
    case ">=":
      return "≥";
    case "<":
      return "<";
    case "is":
      return t("conditions.opIs");
    case "is_not":
      return t("conditions.opIsNot");
  }
}

export function clauseHolds(
  clause: Clause,
  field: RubricField | undefined,
  answer: JevAnswer | undefined,
): boolean | null {
  if (!field || !answer) return null;
  if (field.type === "noul" && answer.type === "noul") {
    return compare(answer.noul, clause.op, Number(clause.value));
  }
  if (field.type === "score" && answer.type === "score") {
    return compare(answer.score, clause.op, Number(clause.value));
  }
  if (field.type === "choice" && answer.type === "choice") {
    if (clause.op === "is") return answer.choice === clause.value;
    if (clause.op === "is_not") return answer.choice !== clause.value;
  }
  return null;
}

function compare(actual: number, op: ClauseOp, expected: number): boolean | null {
  if (Number.isNaN(expected)) return null;
  if (op === ">=") return actual >= expected;
  if (op === "<") return actual < expected;
  return null;
}

export type ConditionResult = {
  condition: Condition;
  fired: boolean;
  clauses: { clause: Clause; holds: boolean | null }[];
};

export function evaluateConditions(
  conditions: Condition[],
  fields: RubricField[],
  answers: Record<string, JevAnswer>,
): ConditionResult[] {
  const byId = new Map(fields.map((f) => [f.id, f]));
  return conditions.map((condition) => {
    const clauses = condition.clauses.map((clause) => ({
      clause,
      holds: clauseHolds(clause, byId.get(clause.fieldId), answers[clause.fieldId]),
    }));
    const fired = clauses.length > 0 && clauses.every((c) => c.holds === true);
    return { condition, fired, clauses };
  });
}

export function describeClause(clause: Clause, field: RubricField | undefined, t: Translate): string {
  const name = field?.label || clause.fieldId;
  if (field?.type === "noul" && (clause.op === ">=" || clause.op === "<")) {
    return `${name} ${opLabel(clause.op, t)} ${pct(Number(clause.value))}`;
  }
  return `${name} ${opLabel(clause.op, t)} ${clause.value}`;
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
