import type { ChoiceJudgment, Judgment, NoulJudgment, ScoreJudgment } from "./types";

export const DEFAULT_CONFIDENCE_FLOOR = 0.6;
export const CONFIDENCE_FLOOR_PRESETS = [0.5, 0.6, 0.7] as const;

const PRIOR_SCHOOL: NoulJudgment = {
  id: "prior_school",
  label: "Prior school recognition",
  primitive: "noul",
  role: "field",
  reads: ["prior_school"],
  question:
    "Is this a recognised international school, established independent school, or otherwise a school of known standing?",
  criteria: {
    true: "a named school with verifiable standing - international, independent, or well-established locally",
    false: "unrecognisable, generic, or too vague to identify a specific school",
  },
  never_not_met: false,
  thresholds: { met: 0.75, not_met: 0.25 },
  confidence_floor: DEFAULT_CONFIDENCE_FLOOR,
};

const EXTRACURRICULAR: ScoreJudgment = {
  id: "extracurricular",
  label: "Extracurricular depth",
  primitive: "score",
  role: "field",
  reads: ["extracurricular"],
  question:
    "How much depth does the extracurricular description show? Distinguish a bare list of activities from sustained involvement or leadership. Similar length is not similar depth — 'piano, swimming, chess' is not the same as a named instrument with years of practice, an ensemble, and an exam.",
  levels: [
    "nothing described",
    "activities listed without detail",
    "sustained involvement",
    "leadership or sustained achievement",
  ],
  never_not_met: true,
  verdict_map: { "0": "needs_review", "1": "needs_review", "2": "met", "3": "met", default: "needs_review" },
  confidence_floor: DEFAULT_CONFIDENCE_FLOOR,
};

const REASON_FOR_APPLYING: ScoreJudgment = {
  id: "reason_for_applying",
  label: "Reason-for-applying fit",
  primitive: "score",
  role: "field",
  reads: ["reason_for_applying"],
  question:
    "How specifically does this reason for applying fit this school? Long but empty prose that could name any school is generic. Concrete programmes, the IB continuum, a named campus, or a relocation tied to this school's offer are specific.",
  levels: [
    "generic, could be any school",
    "some specific interest",
    "clearly researched this school",
    "strong specific fit with concrete reasons",
  ],
  never_not_met: true,
  verdict_map: { "0": "needs_review", "1": "needs_review", "2": "met", "3": "met", default: "needs_review" },
  confidence_floor: DEFAULT_CONFIDENCE_FLOOR,
};

const SIBLING_CONNECTION: NoulJudgment = {
  id: "sibling_connection",
  label: "Sibling connection",
  primitive: "noul",
  role: "field",
  reads: ["siblings_information"],
  question: "Does this describe a sibling who currently attends or previously attended this school?",
  criteria: {
    true: "a sibling is named or described as currently attending or having previously attended this school, with enough relation to treat as a family connection",
    false: "no sibling connection to this school is described — other relatives, friends, or an unrelated note",
  },
  never_not_met: true,
  thresholds: { met: 0.7 },
  confidence_floor: DEFAULT_CONFIDENCE_FLOOR,
};

const EAL_SUPPORT: ScoreJudgment = {
  id: "eal_support",
  label: "EAL support need",
  primitive: "score",
  role: "field",
  reads: ["language", "second_language", "prior_school", "prior_school_country"],
  question:
    "How much English language support is this applicant likely to need? Weigh first language, second language, and whether the prior school appears English-medium — a country code alone does not decide this. A Mandarin speaker from an English-medium international school in Beijing is not the same case as a Mandarin speaker from a local-language school. A non-English first language is a resourcing signal, never a reason to reject.",
  levels: [
    "no support needed",
    "light monitoring",
    "assessment recommended",
    "significant support likely",
  ],
  never_not_met: true,
  verdict_map: { "0": "met", default: "needs_review" },
  confidence_floor: DEFAULT_CONFIDENCE_FLOOR,
};

const ACADEMIC_FIT: ScoreJudgment = {
  id: "academic_fit",
  label: "Academic fit",
  primitive: "score",
  role: "field",
  reads: ["grade", "age", "prior_school", "prior_school_country"],
  question:
    "How well does this applicant's age and prior-school system fit the applied grade? Use the school's published grade bands in the state. A 13-year-old applying to Year 9 is ordinary; the same age applying to Year 11 is not, unless the prior school's system explains the placement. Do not treat an unusual age as a mismatch when the prior system accounts for it.",
  levels: ["clear mismatch for the applied grade", "some concerns", "appropriate", "strong fit"],
  never_not_met: false,
  verdict_map: { "0": "not_met", "1": "needs_review", "2": "met", "3": "met", default: "needs_review" },
  confidence_floor: DEFAULT_CONFIDENCE_FLOOR,
};

const ATTENTION: ScoreJudgment = {
  id: "attention",
  label: "Attention",
  primitive: "score",
  role: "queue",
  reads: ["*"],
  question:
    "Would an experienced admissions officer regret not opening this file today? Answer on a single time-pressure axis that folds urgency and value together. Weigh the raw application as a whole. Do not tally missing fields, empty answers, or how many other checks look weak — three trivial gaps are not automatically worse than one serious academic concern, and a thin-but-complete file can matter more than a single hard failure. Missing counts are already shown separately; re-deriving them here is not the job. Level 0 is a complete, unremarkable file that can wait in queue order. Level 1 is something notable or slightly off with no time pressure. Level 2 cannot progress until a human decides something. Level 3 means delay risks losing the applicant or making a wrong call.",
  levels: [
    "routine, process in order",
    "worth a look",
    "needs a human decision",
    "urgent, review first",
  ],
  never_not_met: true,
  verdict_map: { default: "needs_review" },
  confidence_floor: DEFAULT_CONFIDENCE_FLOOR,
};

const ATTENTION_REASON: ChoiceJudgment = {
  id: "attention_reason",
  label: "Attention reason",
  primitive: "choice",
  role: "queue",
  reads: ["*"],
  question:
    "What is the main reason an admissions officer should open this file early? Pick the single best fit. If none of the named reasons fits, use other — do not force-fit. If the file is simply complete and fine, exceptional is not the answer.",
  options: {
    incomplete: {
      what: "required information is absent or unusable",
      not_for: "a file that is complete but hard to judge - that is ambiguous",
      examples: ["no prior school given", "reason for applying left blank"],
    },
    ambiguous: {
      what: "the file reads differently depending on how you weigh it",
      not_for: "a file that clearly argues against admission - that is concerning",
      examples: ["strong candidate whose paperwork reads weakly", "unclear sibling relation"],
    },
    time_critical: {
      what: "a deadline, competing offer or waitlist movement makes delay costly",
      not_for: "a file that is merely strong - that is exceptional",
      examples: ["deadline within a week", "known to hold another offer"],
    },
    exceptional: {
      what: "worth pursuing actively",
      not_for: "a file that is simply complete and fine - that is routine",
      examples: ["sibling of a current family", "standout candidate", "scholarship case"],
    },
    concerning: {
      what: "something argues against admission and needs a considered look",
      not_for: "a file that is merely unclear - that is ambiguous",
      examples: ["clear mismatch for the applied grade"],
    },
    other: {
      what: "none of the above fits",
      examples: [],
    },
  },
  never_not_met: true,
  confidence_floor: DEFAULT_CONFIDENCE_FLOOR,
};

export const ADMISSIONS_PRESET: Judgment[] = [
  PRIOR_SCHOOL,
  EXTRACURRICULAR,
  REASON_FOR_APPLYING,
  SIBLING_CONNECTION,
  EAL_SUPPORT,
  ACADEMIC_FIT,
  ATTENTION,
  ATTENTION_REASON,
];

export const FIELD_JUDGMENTS = ADMISSIONS_PRESET.filter((j) => j.role === "field");
export const QUEUE_JUDGMENTS = ADMISSIONS_PRESET.filter((j) => j.role === "queue");

export const ATTENTION_ID = ATTENTION.id;
export const ATTENTION_REASON_ID = ATTENTION_REASON.id;

export function judgmentById(id: string): Judgment | undefined {
  return ADMISSIONS_PRESET.find((j) => j.id === id);
}

export const APPLICANT_STATE_KEYS = [
  "grade",
  "age",
  "language",
  "second_language",
  "prior_school",
  "prior_school_country",
  "extracurricular",
  "reason_for_applying",
  "siblings_information",
  "application_status",
  "deadline",
  "competing_offer",
  "scholarship",
  "officer_notes",
] as const;
