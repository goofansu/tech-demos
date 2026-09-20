import { describe, expect, test } from "bun:test";
import { isAbortError, runPool } from "./pool";

describe("runPool", () => {
  test("visits every item and stays within the concurrency cap", async () => {
    const items = [0, 1, 2, 3, 4, 5, 6, 7];
    let current = 0;
    let max = 0;
    const seen: number[] = [];
    await runPool(items, 3, async (item) => {
      current += 1;
      max = Math.max(max, current);
      await Bun.sleep(15);
      seen.push(item);
      current -= 1;
    });
    expect(seen.toSorted((a, b) => a - b)).toEqual(items);
    expect(max).toBeLessThanOrEqual(3);
    expect(max).toBe(3);
  });

  test("does not start new work after abort", async () => {
    const controller = new AbortController();
    const started: number[] = [];
    const items = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    await runPool(
      items,
      2,
      async (item) => {
        started.push(item);
        if (started.length >= 2) controller.abort();
        await Bun.sleep(10);
      },
      controller.signal,
    );
    expect(started.length).toBeGreaterThan(0);
    expect(started.length).toBeLessThan(items.length);
  });

  test("isAbortError recognizes DOMException and Error names", () => {
    expect(isAbortError(new DOMException("Aborted", "AbortError"))).toBe(true);
    const err = new Error("Aborted");
    err.name = "AbortError";
    expect(isAbortError(err)).toBe(true);
    expect(isAbortError(new Error("nope"))).toBe(false);
  });
});
