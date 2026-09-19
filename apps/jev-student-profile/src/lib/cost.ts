/** TypeSafe Jev published input price. Output tokens are free. */
export const JEV_INPUT_USD_PER_MILLION_TOKENS = 0.042;

export type TokenUsage = {
  input_tokens?: number;
  output_tokens?: number;
};

export function costUsdFromUsage(usage: TokenUsage | undefined): number | undefined {
  const input = usage?.input_tokens;
  if (typeof input !== "number" || !Number.isFinite(input) || input < 0) return undefined;
  return (input / 1_000_000) * JEV_INPUT_USD_PER_MILLION_TOKENS;
}

export function formatUsd(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "$0";
  if (amount >= 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(6)}`;
}
