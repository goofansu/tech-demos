import * as React from "react";
import { cn } from "@/lib/utils";

export const fieldClasses =
  "w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-xs transition-colors outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50";

export type InputProps = React.ComponentProps<"input"> & { mono?: boolean };

export function Input({ className, mono = false, ...props }: InputProps) {
  return <input className={cn(fieldClasses, "h-9", mono && "font-mono", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(fieldClasses, "min-h-20 resize-y py-2 leading-relaxed", className)}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select className={cn(fieldClasses, "h-9 appearance-auto pr-8", className)} {...props}>
      {children}
    </select>
  );
}
