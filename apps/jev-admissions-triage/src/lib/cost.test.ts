import { describe, expect, test } from "bun:test";
import { costUsdFromUsage, formatUsd, JEV_INPUT_USD_PER_MILLION_TOKENS } from "./cost";

describe("Jev cost", () => {
  test("uses the published $0.042 / MTok input rate and ignores output tokens", () => {
    expect(JEV_INPUT_USD_PER_MILLION_TOKENS).toBe(0.042);
    expect(costUsdFromUsage({ input_tokens: 1_000_000, output_tokens: 50_000 })).toBe(0.042);
    expect(costUsdFromUsage({ input_tokens: 351, output_tokens: 50 })).toBeCloseTo(
      (351 / 1_000_000) * 0.042,
      12,
    );
  });

  test("returns undefined when usage is missing", () => {
    expect(costUsdFromUsage(undefined)).toBeUndefined();
    expect(costUsdFromUsage({})).toBeUndefined();
    expect(costUsdFromUsage({ output_tokens: 10 })).toBeUndefined();
  });

  test("formats tiny row costs with six decimals", () => {
    expect(formatUsd(0.000014742)).toBe("$0.000015");
    expect(formatUsd(0.01234)).toBe("$0.0123");
    expect(formatUsd(0)).toBe("$0");
  });
});
