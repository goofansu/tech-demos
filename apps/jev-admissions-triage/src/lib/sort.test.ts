import { describe, expect, test } from "bun:test";
import { compareQueueRows, peakScoreLabel, sortQueue, type QueueRow } from "./sort";
import type { Applicant, ApplicantResult, JevScoreAnswer } from "./types";

function applicant(id: string): Applicant {
  return {
    id,
    name: id,
    grade: "Year 9",
    age: 13,
    language: "English",
    second_language: null,
    prior_school: "x",
    prior_school_country: "GB",
    extracurricular: "y",
    reason_for_applying: "z",
    siblings_information: null,
    application_status: "active",
    deadline: null,
    competing_offer: null,
    scholarship: null,
    officer_notes: null,
    tags: [],
  };
}

function done(id: string, score: number, confidence: number): QueueRow {
  const answer: JevScoreAnswer = {
    type: "score",
    score,
    confidence,
    legend: {},
    probabilities: {},
  };
  const result: ApplicantResult = { status: "done", answers: { attention: answer } };
  return { applicant: applicant(id), result };
}

describe("attention sorting", () => {
  test("orders by score desc, then confidence asc, then id", () => {
    const rows = [
      done("A-0003", 2.0, 0.9),
      done("A-0001", 2.4, 0.8),
      done("A-0002", 2.4, 0.5),
      done("A-0004", 1.1, 0.9),
    ];
    const ids = sortQueue(rows).map((row) => row.applicant.id);
    expect(ids).toEqual(["A-0002", "A-0001", "A-0003", "A-0004"]);
  });

  test("completed rows outrank idle rows; idle stays id-stable", () => {
    const rows: QueueRow[] = [
      { applicant: applicant("A-0005"), result: { status: "idle" } },
      done("A-0009", 0.4, 0.9),
      { applicant: applicant("A-0002"), result: { status: "idle" } },
    ];
    const ids = sortQueue(rows).map((row) => row.applicant.id);
    expect(ids).toEqual(["A-0009", "A-0002", "A-0005"]);
  });

  test("compare is deterministic for equal keys", () => {
    const a = done("A-0010", 1.5, 0.7);
    const b = done("A-0010", 1.5, 0.7);
    expect(compareQueueRows(a, b)).toBe(0);
  });

  test("peakScoreLabel reads the distribution, not a rounded score", () => {
    const answer: JevScoreAnswer = {
      type: "score",
      score: 2.98,
      confidence: 0.7,
      legend: {
        "0": "routine, process in order",
        "1": "worth a look",
        "2": "needs a human decision",
        "3": "urgent, review first",
      },
      probabilities: { "0": 0.02, "1": 0.05, "2": 0.2, "3": 0.73 },
    };
    expect(peakScoreLabel(answer)).toBe("urgent, review first");
  });
});
