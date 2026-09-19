import { describe, expect, test } from "bun:test";
import {
  BATCH_CONCURRENCY,
  BATCH_OPTION_KEYS,
  BATCH_QUESTION_ID,
  BATCH_SIZE,
  BATCH_STATE_KEY,
  batchQuestion,
  batchRecords,
  buildBatchRequest,
  emptyBatchResults,
  isBatchOptionKey,
} from "./batch";
import { BATCH_RECORDS_EN, BATCH_RECORDS_ZH } from "./batch-records";

describe("batch dataset", () => {
  test("ships 100 distinct English records", () => {
    expect(BATCH_RECORDS_EN).toHaveLength(BATCH_SIZE);
    expect(new Set(BATCH_RECORDS_EN.map((r) => r.id)).size).toBe(BATCH_SIZE);
    expect(new Set(BATCH_RECORDS_EN.map((r) => r.name)).size).toBe(BATCH_SIZE);
    expect(new Set(BATCH_RECORDS_EN.map((r) => r.text)).size).toBe(BATCH_SIZE);
  });

  test("Chinese records share ids and stay unique", () => {
    expect(BATCH_RECORDS_ZH).toHaveLength(BATCH_SIZE);
    expect(BATCH_RECORDS_ZH.map((r) => r.id)).toEqual(BATCH_RECORDS_EN.map((r) => r.id));
    expect(new Set(BATCH_RECORDS_ZH.map((r) => r.name)).size).toBe(BATCH_SIZE);
    expect(new Set(BATCH_RECORDS_ZH.map((r) => r.text)).size).toBe(BATCH_SIZE);
  });

  test("locale helper returns the matching catalog", () => {
    expect(batchRecords("en")).toBe(BATCH_RECORDS_EN);
    expect(batchRecords("zh-CN")).toBe(BATCH_RECORDS_ZH);
  });
});

describe("batch question", () => {
  test("is a Choice with stable option keys", () => {
    const en = batchQuestion("en");
    const zh = batchQuestion("zh-CN");
    expect(en.type).toBe("choice");
    expect(Object.keys(en.criteria)).toEqual([...BATCH_OPTION_KEYS]);
    expect(Object.keys(zh.criteria)).toEqual([...BATCH_OPTION_KEYS]);
    expect(en.instructions).toContain(`\`${BATCH_STATE_KEY}\``);
    expect(zh.instructions).toContain(`\`${BATCH_STATE_KEY}\``);
  });

  test("buildBatchRequest sends one text and one question", () => {
    const request = buildBatchRequest("I finished early and started the extension.", "en");
    expect(request.state).toEqual({ [BATCH_STATE_KEY]: "I finished early and started the extension." });
    expect(request.questions[BATCH_QUESTION_ID]).toEqual(batchQuestion("en"));
  });

  test("empty results are an in-memory blank map", () => {
    expect(emptyBatchResults()).toEqual({});
    expect(BATCH_CONCURRENCY).toBe(6);
  });

  test("isBatchOptionKey accepts only the fixed labels", () => {
    expect(isBatchOptionKey("support")).toBe(true);
    expect(isBatchOptionKey("unknown")).toBe(false);
  });
});
