import { describe, expect, test } from "bun:test";
import { APPLICANT_COUNT, APPLICANTS, REQUIRED_TAGS, applicantsWithTag } from "./applicants";

describe("100 fabricated applicants", () => {
  test("is a deterministic set of 100 unique A-0001..A-0100 ids", () => {
    expect(APPLICANT_COUNT).toBe(100);
    expect(APPLICANTS).toHaveLength(100);
    const ids = APPLICANTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(100);
    expect(ids[0]).toBe("A-0001");
    expect(ids[99]).toBe("A-0100");
    expect(ids).toEqual([...ids].toSorted());
  });

  test("covers every required planted tag", () => {
    for (const tag of REQUIRED_TAGS) {
      expect(applicantsWithTag(tag).length, tag).toBeGreaterThan(0);
    }
  });

  test("has at least two clear cases per attention reason", () => {
    for (const tag of [
      "attention_incomplete",
      "attention_ambiguous",
      "attention_time_critical",
      "attention_exceptional",
      "attention_concerning",
    ]) {
      expect(applicantsWithTag(tag).length, tag).toBeGreaterThanOrEqual(2);
    }
  });

  test("separates urgency from quality", () => {
    expect(applicantsWithTag("exceptional_not_urgent").length).toBeGreaterThanOrEqual(1);
    expect(applicantsWithTag("weak_time_critical").length).toBeGreaterThanOrEqual(1);
    const overlap = applicantsWithTag("exceptional_not_urgent").filter((a) =>
      a.tags.includes("weak_time_critical"),
    );
    expect(overlap).toHaveLength(0);
  });

  test("includes the anti-tally pair and the mixed exceptional+incomplete case", () => {
    expect(applicantsWithTag("trivial_missings").length).toBeGreaterThanOrEqual(1);
    expect(applicantsWithTag("single_serious_concern").length).toBeGreaterThanOrEqual(1);
    expect(applicantsWithTag("mixed_exceptional_incomplete").length).toBeGreaterThanOrEqual(1);
  });

  test("leaves some fields null so Missing is exercised", () => {
    const withNull = APPLICANTS.filter(
      (a) =>
        a.prior_school === null ||
        a.extracurricular === null ||
        a.reason_for_applying === null ||
        a.siblings_information === null ||
        a.language === null,
    );
    expect(withNull.length).toBeGreaterThan(3);
  });

  test("keeps a long routine tail", () => {
    expect(applicantsWithTag("routine").length).toBeGreaterThan(50);
  });
});
