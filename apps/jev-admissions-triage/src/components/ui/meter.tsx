import { Progress as ProgressPrimitive } from "@base-ui/react/progress"
import { cn } from "cn"

import { ProgressIndicator, ProgressTrack } from "@/components/ui/progress"

type MeterTone = "primary" | "noul" | "choice" | "score" | "muted"

type MeterProps = {
  /** 0..1 */
  value: number
  tone?: MeterTone
  className?: string
  label?: string
}

export function Meter({ value, tone = "primary", className, label }: MeterProps) {
  const clamped = Math.max(0, Math.min(1, value))
  return (
    <ProgressPrimitive.Root
      value={clamped * 100}
      data-slot="meter"
      aria-label={label}
      className={cn("flex w-full", className)}
    >
      <ProgressTrack className="h-2">
        <ProgressIndicator
          data-tone={tone}
          className="bg-primary data-[tone=noul]:bg-noul data-[tone=choice]:bg-choice data-[tone=score]:bg-score data-[tone=muted]:bg-muted-foreground/40"
        />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  )
}
