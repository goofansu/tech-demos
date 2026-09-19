import { describe, expect, test } from "bun:test";
import {
  BATCH_CONCURRENCY,
  BATCH_SIZE,
  batchRecords,
  buildBatchRequest,
  choiceLabel,
  emptyBatchResults,
  rubricKey,
  summarizeFieldAnswer,
} from "./batch";
import { BATCH_RECORDS_EN, BATCH_RECORDS_ZH } from "./batch-records";
import { translate } from "./i18n";
import { SAMPLE_RUBRIC } from "./sample";

const t = (path: Parameters<typeof translate>[1], vars?: Parameters<typeof translate>[2]) =>
  translate("en", path, vars);

describe("batch dataset", () => {
  test("ships 100 distinct English students with rubric inputs", () => {
    expect(BATCH_RECORDS_EN).toHaveLength(BATCH_SIZE);
    expect(new Set(BATCH_RECORDS_EN.map((r) => r.id)).size).toBe(BATCH_SIZE);
    expect(new Set(BATCH_RECORDS_EN.map((r) => r.name)).size).toBe(BATCH_SIZE);
    expect(new Set(BATCH_RECORDS_EN.map((r) => JSON.stringify(r.state))).size).toBe(BATCH_SIZE);
    for (const record of BATCH_RECORDS_EN) {
      expect(Object.keys(record.state)).toEqual([
        "teacher_notes",
        "student_reflection",
        "work_sample",
      ]);
      expect(record.state.teacher_notes.length).toBeGreaterThan(0);
      expect(record.state.student_reflection.length).toBeGreaterThan(0);
      expect(record.state.work_sample.length).toBeGreaterThan(0);
    }
  });

  test("Chinese records share ids and stay unique", () => {
    expect(BATCH_RECORDS_ZH).toHaveLength(BATCH_SIZE);
    expect(BATCH_RECORDS_ZH.map((r) => r.id)).toEqual(BATCH_RECORDS_EN.map((r) => r.id));
    expect(new Set(BATCH_RECORDS_ZH.map((r) => r.name)).size).toBe(BATCH_SIZE);
    expect(new Set(BATCH_RECORDS_ZH.map((r) => JSON.stringify(r.state))).size).toBe(BATCH_SIZE);
  });

  test("locale helper returns the matching catalog", () => {
    expect(batchRecords("en")).toBe(BATCH_RECORDS_EN);
    expect(batchRecords("zh-CN")).toBe(BATCH_RECORDS_ZH);
  });

  test("interleaves archetypes so neighboring notes differ", () => {
    const openings = BATCH_RECORDS_EN.slice(0, 5).map((r) => r.state.teacher_notes.slice(0, 24));
    expect(new Set(openings).size).toBe(5);
  });
});

describe("batch request", () => {
  test("sends the full rubric for each student", () => {
    const request = buildBatchRequest(SAMPLE_RUBRIC, BATCH_RECORDS_EN[0]);
    expect(Object.keys(request.questions)).toEqual(SAMPLE_RUBRIC.fields.map((f) => f.id));
    expect(request.state.teacher_notes).toBe(BATCH_RECORDS_EN[0].state.teacher_notes);
    expect(request.state.work_sample).toBe(BATCH_RECORDS_EN[0].state.work_sample);
  });

  test("empty results are an in-memory blank map", () => {
    expect(emptyBatchResults()).toEqual({});
    expect(BATCH_CONCURRENCY).toBe(6);
    expect(rubricKey(SAMPLE_RUBRIC)).toContain("learning_style:choice");
  });
});

describe("summarizeFieldAnswer", () => {
  test("renders choice, score, and noul as short chips", () => {
    const choice = SAMPLE_RUBRIC.fields.find((f) => f.id === "learning_style");
    const score = SAMPLE_RUBRIC.fields.find((f) => f.id === "writing_quality");
    const noul = SAMPLE_RUBRIC.fields.find((f) => f.id === "needs_support");
    if (!choice || !score || !noul) throw new Error("expected sample fields");

    expect(
      summarizeFieldAnswer(
        choice,
        { type: "choice", choice: "hands_on", confidence: 0.8, probabilities: {} },
        t,
      ),
    ).toMatchObject({ text: "hands on", tone: "choice" });

    expect(
      summarizeFieldAnswer(
        score,
        { type: "score", score: 2.4, confidence: 0.7, legend: {}, probabilities: {} },
        t,
      ),
    ).toMatchObject({ text: "2.4", tone: "success" });

    expect(summarizeFieldAnswer(noul, { type: "noul", noul: 0.2 }, t)).toMatchObject({
      text: "No",
      tone: "outline",
    });
    expect(choiceLabel("hands_on")).toBe("hands on");
  });
});
