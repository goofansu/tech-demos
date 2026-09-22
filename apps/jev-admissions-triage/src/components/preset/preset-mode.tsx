import { FloorControl } from "@/components/shared/floor-control";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { presetFor } from "@/lib/admissions-preset";
import { RichText, useI18n } from "@/lib/i18n-context";
import { schoolFor } from "@/lib/school";
import { serializeChoiceOption } from "@/lib/request";

type Props = {
  confidenceFloor: number;
  onFloorChange: (next: number) => void;
};

export function PresetMode({ confidenceFloor, onFloorChange }: Props) {
  const { locale, t } = useI18n();
  const preset = presetFor(locale);
  const school = schoolFor(locale);
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>{t("preset.title")}</CardTitle>
          <CardDescription>
            <RichText
              path="preset.description"
              vars={{ school: school.name }}
              tokens={{ reads: <code className="font-mono">reads</code> }}
            />
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm">
            {t("preset.schoolLine", {
              name: school.name,
              country: school.country,
              year: school.current_academic_year,
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("preset.grades", {
              list: school.grades
                .map((g) => t("preset.gradeItem", { name: g.name, min: g.min_age, max: g.max_age }))
                .join(", "),
            })}
          </p>
          <FloorControl value={confidenceFloor} onChange={onFloorChange} />
          <p className="text-xs text-muted-foreground">
            {t("preset.floorHint", { value: confidenceFloor.toFixed(1) })}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {preset.map((judgment) => (
          <Card key={judgment.id}>
            <CardHeader>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={judgment.primitive}>{judgment.primitive}</Badge>
                  <Badge tone={judgment.role === "queue" ? "info" : "outline"}>
                    {judgment.role === "queue" ? t("preset.roleQueue") : t("preset.roleField")}
                  </Badge>
                  {judgment.never_not_met ? <Badge tone="warning">never_not_met</Badge> : null}
                  <CardTitle className="truncate">{judgment.label}</CardTitle>
                </div>
                <CardDescription className="mt-2">{judgment.question}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                {t("preset.reads", { keys: judgment.reads.join(", ") })}
              </p>
              {judgment.primitive === "noul" ? (
                <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <li>{t("preset.criteriaTrue", { text: judgment.criteria.true })}</li>
                  <li>{t("preset.criteriaFalse", { text: judgment.criteria.false })}</li>
                  <li>
                    {t("preset.metAtLeast", { value: judgment.thresholds.met })}
                    {judgment.thresholds.not_met !== undefined
                      ? t("preset.notMetAtMost", { value: judgment.thresholds.not_met })
                      : t("preset.otherwiseReview")}
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
