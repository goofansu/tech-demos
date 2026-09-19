import * as React from "react";
import { cn } from "@/lib/utils";

const fills = {
  primary: "bg-primary",
  noul: "bg-noul",
  choice: "bg-choice",
  score: "bg-score",
  muted: "bg-muted-foreground/40",
} as const;

type MeterProps = {
  /** 0..1 */
  value: number;
  tone?: keyof typeof fills;
  className?: string;
  label?: string;
};

export function Meter({ value, tone = "primary", className, label }: MeterProps) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={clamped}
      aria-label={label}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn("h-full w-(--meter-w) rounded-full transition-all duration-500", fills[tone])}
        style={{ "--meter-w": `${(clamped * 100).toFixed(1)}%` } as React.CSSProperties}
      />
    </div>
  );
}
