import { CONFIDENCE_FLOOR_PRESETS } from "@/lib/admissions-preset";
import { formatFloor } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  onChange: (next: number) => void;
};

export function FloorControl({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Confidence floor</span>
      <div className="flex rounded-lg bg-muted p-1" role="group" aria-label="Confidence floor">
        {CONFIDENCE_FLOOR_PRESETS.map((floor) => (
          <button
            key={floor}
            type="button"
            aria-pressed={value === floor}
            onClick={() => onChange(floor)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              value === floor ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {formatFloor(floor)}
          </button>
        ))}
      </div>
    </div>
  );
}
