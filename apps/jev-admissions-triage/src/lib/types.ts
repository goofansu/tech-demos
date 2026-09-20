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

/** String-only state: numbers and config are serialized at the request boundary. */
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

export const SCORE_LEVEL_MIN = 2;
export const SCORE_LEVEL_MAX = 10;

export const MISSING_STATE_LABEL = "(not provided)";

// ---- Admissions domain ------------------------------------------------------

export type VerdictState = "met" | "not_met" | "needs_review" | "missing";

export type AttentionReason =
  | "incomplete"
  | "ambiguous"
  | "time_critical"
  | "exceptional"
  | "concerning"
  | "other";

export type GradeBand = {
  name: string;
  min_age: number;
  max_age: number;
};

export type SchoolConfig = {
  name: string;
  country: string;
  current_academic_year: number;
  grades: GradeBand[];
};

export type Applicant = {
  id: string;
  name: string;
  grade: string | null;
  age: number | null;
  language: string | null;
  second_language: string | null;
  prior_school: string | null;
  prior_school_country: string | null;
  extracurricular: string | null;
  reason_for_applying: string | null;
  siblings_information: string | null;
  application_status: string;
  deadline: string | null;
  competing_offer: string | null;
  scholarship: string | null;
  officer_notes: string | null;
  tags: string[];
};

export type ApplicantFieldKey = Exclude<keyof Applicant, "id" | "name" | "tags" | "age"> | "age";

export type ChoiceOptionSpec = {
  what: string;
  not_for?: string;
  examples?: string[];
};

export type NoulJudgment = {
  id: string;
  label: string;
  primitive: "noul";
  role: "field" | "queue";
  reads: string[];
  question: string;
  criteria: { true: string; false: string };
  never_not_met: boolean;
  thresholds: { met: number; not_met?: number };
  confidence_floor: number;
};

export type ScoreJudgment = {
  id: string;
  label: string;
  primitive: "score";
  role: "field" | "queue";
  reads: string[];
  question: string;
  levels: string[];
  never_not_met: boolean;
  /** Map level-band keys ("0") to a verdict. `default` covers any unmapped band. */
  verdict_map: { default: VerdictState } & Record<string, VerdictState>;
  confidence_floor: number;
};

export type ChoiceJudgment = {
  id: string;
  label: string;
  primitive: "choice";
  role: "field" | "queue";
  reads: string[];
  question: string;
  options: Record<string, ChoiceOptionSpec>;
  never_not_met: boolean;
  confidence_floor: number;
};

export type Judgment = NoulJudgment | ScoreJudgment | ChoiceJudgment;

export type OmitReason = "missing" | "unconfigured";

export type JudgmentOutcome = {
  id: string;
  label: string;
  primitive: Judgment["primitive"];
  role: Judgment["role"];
  verdict: VerdictState | null;
  semantic: string;
  confidence: number | null;
  escalated: boolean;
  neverNotMetProtected: boolean;
  unconfigured: boolean;
  omitReason: OmitReason | null;
  detail: string;
};

export type BatchRowStatus = "idle" | "queued" | "running" | "done" | "error";

export type ApplicantResult = {
  status: BatchRowStatus;
  answers?: Record<string, JevAnswer>;
  request?: EvaluateRequest;
  latencyMs?: number;
  costUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
};
