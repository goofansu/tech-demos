// ---- Jev (TypeSafe System One) wire types -----------------------------------

export type JevQuestionType = "choice" | "score" | "noul";

export type JevNoulQuestion = {
  type: "noul";
  instructions: string;
  criteria?: { true: string; false: string };
};

export type JevChoiceQuestion = {
  type: "choice";
  instructions: string;
  criteria: Record<string, string | null>;
};

export type JevScoreQuestion = {
  type: "score";
  instructions: string;
  criteria: string[];
};

export type JevQuestion = JevNoulQuestion | JevChoiceQuestion | JevScoreQuestion;

export type JevNoulAnswer = { type: "noul"; noul: number };
export type JevChoiceAnswer = {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
};
export type JevScoreAnswer = {
  type: "score";
  score: number;
  confidence: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
};
export type JevAnswer = JevNoulAnswer | JevChoiceAnswer | JevScoreAnswer;

export type JevState = Record<string, string>;

export type EvaluateRequest = {
  state: JevState;
  questions: Record<string, JevQuestion>;
};

export type EvaluateResponse = {
  model: string;
  answers: Record<string, JevAnswer>;
  usage?: { input_tokens?: number; output_tokens?: number };
  latencyMs: number;
};

export type EvaluateError = { error: string; status?: number; detail?: unknown };

export type ApiStatus = { ready: boolean; model: string };

export const NO_API_KEY_MESSAGE =
  "No API key is set, so we can't ask Jev yet. Add a TypeSafe API key on the server and reload this page.";

// ---- Rubric (authoring model) -----------------------------------------------

export type RubricInput = {
  key: string;
  label: string;
  placeholder: string;
  multiline: boolean;
};

export type NoulField = {
  id: string;
  type: "noul";
  label: string;
  instructions: string;
  criteriaTrue: string;
  criteriaFalse: string;
  /** Probability at or above which the statement counts as true. */
  yesAt: number;
};

export type ChoiceOption = { key: string; description: string };

export type ChoiceField = {
  id: string;
  type: "choice";
  label: string;
  instructions: string;
  options: ChoiceOption[];
  /** Below this confidence the pick is reported as uncertain. */
  minConfidence: number;
};

/** Jev Score questions take this many ordered level descriptions (low → high). */
export const SCORE_LEVEL_MIN = 2;
export const SCORE_LEVEL_MAX = 10;

export type ScoreField = {
  id: string;
  type: "score";
  label: string;
  instructions: string;
  /** Ordered low → high, `SCORE_LEVEL_MIN`..`SCORE_LEVEL_MAX` entries. */
  levels: string[];
  /** Fractional score at or above which the level counts as met. */
  meetsAt: number;
};

export type RubricField = NoulField | ChoiceField | ScoreField;

export type ClauseOp = ">=" | "<" | "is" | "is_not";

export type Clause = {
  fieldId: string;
  op: ClauseOp;
  value: string;
};

export type ConditionTone = "positive" | "neutral" | "attention";

export type Condition = {
  id: string;
  label: string;
  tone: ConditionTone;
  clauses: Clause[];
};

export type Rubric = {
  name: string;
  inputs: RubricInput[];
  fields: RubricField[];
  conditions: Condition[];
};

export type SampleStudent = { id: string; name: string; state: JevState };
