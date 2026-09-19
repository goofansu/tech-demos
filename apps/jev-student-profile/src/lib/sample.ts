import type { Locale } from "./i18n";
import { SAMPLE_RUBRIC_ZH, SAMPLE_STUDENTS_ZH } from "./sample.zh-CN";
import type { Rubric, SampleStudent } from "./types";

export const SAMPLE_RUBRIC: Rubric = {
  name: "Grade 8 Learner Profile",
  inputs: [
    {
      key: "teacher_notes",
      label: "Teacher notes",
      placeholder: "Observations from class, group work, and assessments…",
      multiline: true,
    },
    {
      key: "student_reflection",
      label: "Student self-reflection",
      placeholder: "What the student wrote about their own learning…",
      multiline: true,
    },
    {
      key: "work_sample",
      label: "Work sample excerpt",
      placeholder: "A short excerpt from a recent assignment…",
      multiline: true,
    },
  ],
  fields: [
    {
      id: "learning_style",
      type: "choice",
      label: "Dominant learning mode",
      instructions:
        "Based on `teacher_notes` and `student_reflection`, which mode of learning does this student lean on most?",
      options: [
        { key: "collaborative", description: "Learns best in discussion and group work; energised by peers." },
        { key: "independent", description: "Prefers to work alone, self-paced, and figure things out privately." },
        { key: "hands_on", description: "Needs to build, experiment, or move to understand a concept." },
        { key: "mixed", description: "No single mode dominates; adapts to the task." },
      ],
      minConfidence: 0.35,
    },
    {
      id: "writing_quality",
      type: "score",
      label: "Writing quality",
      instructions:
        "Judge only the writing in `work_sample` against the levels. If `work_sample` is missing or empty, assign the lowest level.",
      levels: [
        "No writing sample, or ideas are hard to follow; frequent grammar errors interrupt meaning.",
        "Ideas are present but loosely organised; noticeable errors.",
        "Clear structure with a main idea and support; minor errors.",
        "Well-organised, purposeful, and precise; errors are rare.",
      ],
      meetsAt: 2,
    },
    {
      id: "self_awareness",
      type: "score",
      label: "Metacognitive self-awareness",
      instructions:
        "How accurately does `student_reflection` identify the student's own strengths, gaps, and next steps?",
      levels: [
        "Reflection is generic or absent; no specific strengths or gaps named.",
        "Names a strength or a gap, but without a concrete next step.",
        "Names specific strengths and gaps and proposes a realistic next step.",
      ],
      meetsAt: 1.5,
    },
    {
      id: "needs_support",
      type: "noul",
      label: "Needs additional support",
      instructions:
        "Do `teacher_notes` describe a pattern (not a one-off) of the student falling behind or disengaging?",
      criteriaTrue: "Repeated missed work, confusion across topics, or withdrawal noted over time.",
      criteriaFalse: "Occasional slips only, or the student is keeping pace.",
      yesAt: 0.6,
    },
    {
      id: "ready_for_extension",
      type: "noul",
      label: "Ready for extension work",
      instructions:
        "Do `teacher_notes` or `work_sample` show the student finishing core work early or going beyond what was asked?",
      criteriaTrue: "Finishes early, asks deeper questions, or extends tasks unprompted.",
      criteriaFalse: "Core work takes the full time or is incomplete.",
      yesAt: 0.65,
    },
  ],
  conditions: [
    {
      id: "advanced_writing_track",
      label: "Recommend advanced writing track",
      tone: "positive",
      clauses: [
        { fieldId: "writing_quality", op: ">=", value: "2.5" },
        { fieldId: "ready_for_extension", op: ">=", value: "0.65" },
      ],
    },
    {
      id: "check_in",
      label: "Schedule a support check-in",
      tone: "attention",
      clauses: [{ fieldId: "needs_support", op: ">=", value: "0.6" }],
    },
    {
      id: "reflection_coaching",
      label: "Coach on reflection habits",
      tone: "neutral",
      clauses: [{ fieldId: "self_awareness", op: "<", value: "1.5" }],
    },
    {
      id: "group_project_lead",
      label: "Good candidate to lead group projects",
      tone: "positive",
      clauses: [
        { fieldId: "learning_style", op: "is", value: "collaborative" },
        { fieldId: "needs_support", op: "<", value: "0.4" },
      ],
    },
  ],
};

export const SAMPLE_STUDENTS: SampleStudent[] = [
  {
    id: "maya",
    name: "Maya R.",
    state: {
      teacher_notes:
        "Maya finishes most tasks ahead of the class and then quietly starts on the optional extension prompts without being asked. She lights up in seminar discussions and often pulls quieter classmates into the conversation. Homework is consistently complete. No concerns about pace.",
      student_reflection:
        "I think my strongest skill is building an argument, especially when I can talk it through with someone first. I still rush my conclusions and sometimes repeat myself. Next unit I want to draft my ending first and then check that every paragraph points at it.",
      work_sample:
        "Although the narrator insists she is 'unbothered,' the repetition of that word across three scenes suggests the opposite. Each time it appears, the sentence around it grows shorter, as if she is running out of room to hide. The author uses this compression to show anxiety without ever naming it.",
    },
  },
  {
    id: "dev",
    name: "Dev K.",
    state: {
      teacher_notes:
        "Dev has missed four of the last six homework submissions and has been quiet in class since the term started. He seemed confused during both the fractions and the ratio units and did not ask for help either time. He does engage when we use manipulatives or run lab-style activities.",
      student_reflection:
        "I'm okay at math I guess. I need to do better. I'll try harder next time.",
      work_sample:
        "the story is about a boy who move to a new town, he dont like it at first but then he make friends. i think the theme is change is hard. the author show this by the boy being sad then happy",
    },
  },
  {
    id: "sofia",
    name: "Sofia L.",
    state: {
      teacher_notes:
        "Sofia works steadily and prefers to sit apart from the group when drafting; she asks for headphones during independent work. Her assignments arrive on time and are thorough. In group projects she does her share but rarely speaks up. Pace is fine; nothing to flag.",
      student_reflection:
        "I'm good at planning my essays and I like doing research on my own. My weakness is that I don't share ideas in groups because I worry they aren't ready yet. One thing I could try is writing my idea down and reading it out instead of speaking off the cuff.",
      work_sample:
        "The city's decision to widen the road was framed as progress, but the data tells a more complicated story. Traffic volume rose 18% within two years, while average commute times fell by less than a minute. If the goal was faster travel, the project did not achieve it; if the goal was more cars, it succeeded.",
    },
  },
];

export const SAMPLE_RUBRICS: Record<Locale, Rubric> = {
  en: SAMPLE_RUBRIC,
  "zh-CN": SAMPLE_RUBRIC_ZH,
};

export const SAMPLE_STUDENTS_BY_LOCALE: Record<Locale, SampleStudent[]> = {
  en: SAMPLE_STUDENTS,
  "zh-CN": SAMPLE_STUDENTS_ZH,
};

export function sampleRubric(locale: Locale): Rubric {
  return SAMPLE_RUBRICS[locale];
}

export function sampleStudents(locale: Locale): SampleStudent[] {
  return SAMPLE_STUDENTS_BY_LOCALE[locale];
}

export function rubricsEqual(a: Rubric, b: Rubric): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function isBundledSample(rubric: Rubric): boolean {
  return Object.values(SAMPLE_RUBRICS).some((sample) => rubricsEqual(rubric, sample));
}
