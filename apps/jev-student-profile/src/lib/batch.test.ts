import { describe, expect, test } from "bun:test";
import {
  BATCH_CONCURRENCY,
  BATCH_SIZE,
  batchRecords,
  buildBatchRequest,
  emptyBatchResults,
  rubricKey,
} from "./batch";
import { BATCH_ARCHETYPE_PROFILES, BATCH_RECORDS_EN, BATCH_RECORDS_ZH } from "./batch-records";
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

  test("Chinese records are translations, not copies of the English text", () => {
    expect(BATCH_RECORDS_ZH.map((r) => r.id)).toEqual(BATCH_RECORDS_EN.map((r) => r.id));
    for (const [index, en] of BATCH_RECORDS_EN.entries()) {
      const zh = BATCH_RECORDS_ZH[index];
      expect(zh.state.teacher_notes).not.toBe(en.state.teacher_notes);
      expect(zh.state.student_reflection).not.toBe(en.state.student_reflection);
      expect(zh.state.work_sample).not.toBe(en.state.work_sample);
    }
  });

  test("locale helper returns the matching catalog", () => {
    expect(batchRecords("en")).toBe(BATCH_RECORDS_EN);
    expect(batchRecords("zh-CN")).toBe(BATCH_RECORDS_ZH);
  });

  test("interleaves archetypes so neighboring notes differ", () => {
    const openings = BATCH_RECORDS_EN.slice(0, 5).map((r) => r.state.teacher_notes.slice(0, 24));
    expect(new Set(openings).size).toBe(5);
  });

  test("every record is written to fire at least one sample-rubric profile", () => {
    const conditionIds = new Set(SAMPLE_RUBRIC.conditions.map((c) => c.id));
    expect(BATCH_ARCHETYPE_PROFILES.length).toBe(5);
    for (const profiles of BATCH_ARCHETYPE_PROFILES) {
      expect(profiles.length).toBeGreaterThan(0);
      for (const id of profiles) expect(conditionIds.has(id)).toBe(true);
    }

    for (const [index, record] of BATCH_RECORDS_EN.entries()) {
      const intended = BATCH_ARCHETYPE_PROFILES[index % BATCH_ARCHETYPE_PROFILES.length];
      const notes = record.state.teacher_notes;
      const reflection = record.state.student_reflection;
      const zh = BATCH_RECORDS_ZH[index];

      if (intended.includes("check_in")) {
        expect(notes).toContain("Has missed four of the last six");
        expect(zh.state.teacher_notes).toContain("缺交了四次");
      }
      if (intended.includes("advanced_writing_track")) {
        expect(notes).toContain("optional extension");
        expect(zh.state.teacher_notes).toMatch(/拓展题/);
        expect(record.state.work_sample).not.toMatch(/dont work|not organized/i);
        expect(record.state.work_sample).toMatch(/18%|unbothered/);
        expect(zh.state.work_sample).toMatch(/18%|毫不在意/);
      }
      if (intended.includes("group_project_lead")) {
        expect(notes).toContain("quieter classmates");
        expect(zh.state.teacher_notes).toContain("安静的同学");
      }
      if (intended.includes("reflection_coaching") && !intended.includes("advanced_writing_track")) {
        expect(reflection).toContain("I'll try harder next time");
        expect(zh.state.student_reflection).toContain("下次会加油");
      }
    }
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
