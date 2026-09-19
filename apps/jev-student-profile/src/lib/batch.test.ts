import { describe, expect, test } from "bun:test";
import {
  BATCH_CONCURRENCY,
  BATCH_SIZE,
  batchRecords,
  buildBatchRequest,
  emptyBatchResults,
  rubricKey,
} from "./batch";
import { BATCH_RECORDS_EN, BATCH_RECORDS_ZH } from "./batch-records";
import { SAMPLE_RUBRIC } from "./sample";

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
