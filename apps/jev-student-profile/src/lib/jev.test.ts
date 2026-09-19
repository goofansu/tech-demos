import { describe, expect, test } from "bun:test";
import { SAMPLE_RUBRIC } from "./sample";
import { buildRequest } from "./jev";

describe("buildRequest", () => {
  test("keeps an empty work_sample so Jev can see the cited field is blank", () => {
    const request = buildRequest(SAMPLE_RUBRIC, {
      teacher_notes: "  Maya finishes early.  ",
      student_reflection: "I want to plan endings first.",
      work_sample: "   ",
    });
    expect(request.state).toEqual({
      teacher_notes: "Maya finishes early.",
      student_reflection: "I want to plan endings first.",
      work_sample: "",
    });
    expect(request.questions.writing_quality).toMatchObject({ type: "score" });
  });

  test("includes every rubric input even when the student left it unset", () => {
    const request = buildRequest(SAMPLE_RUBRIC, { teacher_notes: "Keeps pace." });
    expect(Object.keys(request.state)).toEqual([
      "teacher_notes",
      "student_reflection",
      "work_sample",
    ]);
    expect(request.state.student_reflection).toBe("");
    expect(request.state.work_sample).toBe("");
  });
});
