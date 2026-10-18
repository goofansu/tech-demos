import { describe, expect, test } from "bun:test";
import { entryMeta, formatDate, formatMoney, statusLabel } from "./format.js";

describe("format", () => {
  test("formats money, dates, and a subscription row", () => {
    expect(formatMoney(15.9, "USD")).toBe("$15.90");
    expect(formatMoney(12, "US")).toBe("");
    expect(formatDate("2026-11-04")).toBe("Nov 4, 2026");
    expect(formatDate("2026-02-31")).toBe("");
    expect(statusLabel("paused")).toBe("Paused");
    expect(entryMeta({
      kind: "subscription",
      cadence: "monthly",
      renewsOn: "2026-11-04",
      category: "Video",
    })).toBe("Monthly · renews Nov 4, 2026 · Video");
  });
});
