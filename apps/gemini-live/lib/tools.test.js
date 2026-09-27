import { describe, expect, test } from "bun:test";
import { cityDesk, readClock, runTool, signalScan } from "./tools.js";

describe("studio tools", () => {
  test("reads a timezone and rejects an unknown one", () => {
    const now = new Date("2026-09-27T14:32:00.000Z");
    const tokyo = readClock({ timezone: "Asia/Tokyo", now });
    expect(tokyo.timezone).toBe("Asia/Tokyo");
    expect(tokyo.time).toContain("23:32:00");
    expect(tokyo.iso).toBe("2026-09-27T14:32:00.000Z");
    expect(readClock({ timezone: "Not/AZone", now }).error).toMatch(/Unknown timezone/);
  });

  test("returns fixture cities and a labeled sketch otherwise", () => {
    const lisbon = cityDesk({ city: "Lisbon, Portugal" });
    expect(lisbon.city).toBe("Lisbon");
    expect(lisbon.fixture).toBe(true);
    expect(lisbon.flight).toMatch(/TP 198/);
    const sketch = cityDesk({ city: "Atlantis" });
    expect(sketch.fixture).toBe(false);
    expect(sketch.note).toMatch(/fixture book/);
  });

  test("scans the same system the same way", () => {
    const first = signalScan({ system: "north greenhouse array" });
    const second = signalScan({ system: "North greenhouse array" });
    expect(second.readings).toEqual(first.readings);
    expect(second.verdict).toBe(first.verdict);
    expect(second.system).toBe("North greenhouse array");
    expect(first.readings).toHaveLength(3);
    expect(["Hold the vents. Vibration is high.", "Safe to open the vents."]).toContain(first.verdict);
  });

  test("skips the studio delay when latency is off", async () => {
    const started = performance.now();
    const result = await runTool("city_desk", { city: "Kyoto" }, { latency: false });
    expect(performance.now() - started).toBeLessThan(200);
    expect(result.city).toBe("Kyoto");
    expect(result.latencyMs).toBe(0);
    expect((await runTool("missing", {})).error).toMatch(/Unknown tool/);
  });
});
