import * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  default: "bg-secondary text-secondary-foreground",
  outline: "border text-muted-foreground",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning-foreground",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  noul: "bg-noul/10 text-noul",
  choice: "bg-choice/10 text-choice",
  score: "bg-score/10 text-score",
} as const;

const sizes = {
  sm: "px-2 py-0.5 text-xs leading-4",
  md: "px-3 py-1 text-sm leading-5",
} as const;

export type BadgeProps = React.ComponentProps<"span"> & {
  tone?: keyof typeof tones;
  size?: keyof typeof sizes;
};

export function Badge({ className, tone = "default", size = "sm", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap",
        tones[tone],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
