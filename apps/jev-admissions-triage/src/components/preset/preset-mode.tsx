import { FloorControl } from "@/components/shared/floor-control";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ADMISSIONS_PRESET } from "@/lib/admissions-preset";
import { SCHOOL } from "@/lib/school";
import { serializeChoiceOption } from "@/lib/request";

type Props = {
  confidenceFloor: number;
  onFloorChange: (next: number) => void;
};

export function PresetMode({ confidenceFloor, onFloorChange }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Admissions preset</CardTitle>
          <CardDescription>
            Fixed questions for Faria International School. This is not a rubric authoring product — wording lives
            in one source file. <code className="font-mono">reads</code> documents intent and generation; every
            question still sees the whole state.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm">
            {SCHOOL.name} · {SCHOOL.country} · {SCHOOL.current_academic_year}
          </p>
          <p className="text-xs text-muted-foreground">
            Configured grades: {SCHOOL.grades.map((g) => `${g.name} (ages ${g.min_age}–${g.max_age})`).join(", ")}.
            An applied grade outside this list becomes Needs Review, never Not Met.
          </p>
          <FloorControl value={confidenceFloor} onChange={onFloorChange} />
          <p className="text-xs text-muted-foreground">
            Floor {confidenceFloor.toFixed(1)} applies to every judgment. Compare 0.5 / 0.6 / 0.7 on the Queue after
            a batch — verdicts recompute from stored distributions.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {ADMISSIONS_PRESET.map((judgment) => (
          <Card key={judgment.id}>
            <CardHeader>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={judgment.primitive}>{judgment.primitive}</Badge>
                  <Badge tone={judgment.role === "queue" ? "info" : "outline"}>
                    {judgment.role === "queue" ? "queue" : "field"}
                  </Badge>
                  {judgment.never_not_met ? <Badge tone="warning">never_not_met</Badge> : null}
                  <CardTitle className="truncate">{judgment.label}</CardTitle>
                </div>
                <CardDescription className="mt-2">{judgment.question}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                Intends to read {judgment.reads.join(", ")} — documentation only, not model-level scoping.
              </p>
              {judgment.primitive === "noul" ? (
                <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <li>true: {judgment.criteria.true}</li>
                  <li>false: {judgment.criteria.false}</li>
                  <li>
                    Met ≥ {judgment.thresholds.met}
                    {judgment.thresholds.not_met !== undefined
                      ? ` · Not Met ≤ ${judgment.thresholds.not_met}`
                      : " · otherwise Needs Review"}
                  </li>
                </ul>
              ) : null}
              {judgment.primitive === "score" ? (
                <ol className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {judgment.levels.map((level, i) => (
                    <li key={level}>
                      <span className="font-mono text-foreground">{i}</span> · {level}
                      {judgment.verdict_map[String(i)]
                        ? ` → ${judgment.verdict_map[String(i)]}`
                        : ` → ${judgment.verdict_map.default}`}
                    </li>
                  ))}
                </ol>
              ) : null}
              {judgment.primitive === "choice" ? (
                <ul className="flex flex-col gap-2 text-xs text-muted-foreground">
                  {Object.entries(judgment.options).map(([key, option]) => (
                    <li key={key}>
                      <span className="font-mono text-foreground">{key}</span> · {serializeChoiceOption(option)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
