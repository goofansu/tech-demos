import * as React from "react";
import { cn } from "@/lib/utils";

export type CheckboxProps = Omit<React.ComponentProps<"input">, "type" | "size">;

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      className={cn("m-0 size-4 shrink-0 accent-primary", className)}
      {...props}
    />
  );
}

export function CheckboxLabel({
  className,
  children,
  ...props
}: CheckboxProps & { children: React.ReactNode }) {
  return (
    <label className={cn("inline-flex h-9 items-center gap-1.5 text-xs leading-none text-muted-foreground", className)}>
      <Checkbox {...props} />
      <span className="leading-none">{children}</span>
    </label>
  );
}
