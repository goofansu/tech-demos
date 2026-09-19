import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { describeClause, type ConditionResult } from "@/lib/conditions";
import { useI18n } from "@/lib/i18n-context";
import type { ConditionTone, RubricField } from "@/lib/types";
import { TONE_BADGE } from "@/components/author/conditions-editor";

type Props = {
  results: ConditionResult[];
  fields: RubricField[];
  studentName: string;
};

export function ProfileSummary({ results, fields, studentName }: Props) {
  const { t } = useI18n();
  const byId = new Map(fields.map((f) => [f.id, f]));
  const fired = results.filter((r) => r.fired);
  const rest = results.filter((r) => !r.fired);

  const toneLabel = (tone: ConditionTone) => {
    switch (tone) {
      case "positive":
        return t("conditions.tonePositive");
      case "neutral":
        return t("conditions.toneNeutral");
      case "attention":
        return t("conditions.toneAttention");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t("profile.title", { name: studentName })}</CardTitle>
          <CardDescription>{t("profile.hint")}</CardDescription>
        </div>
        <Badge tone={fired.length > 0 ? "default" : "outline"}>
          {t("profile.firedCount", { fired: fired.length, total: results.length })}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("profile.noConditions")}</p>
        ) : null}

        {fired.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {fired.map((r) => (
              <li key={r.condition.id}>
                <Badge tone={TONE_BADGE[r.condition.tone]} size="md">
                  {r.condition.label}
                </Badge>
              </li>
            ))}
          </ul>
        ) : results.length > 0 ? (
          <p className="text-sm text-muted-foreground">{t("profile.noneFired")}</p>
        ) : null}

        <ul className="flex flex-col divide-y">
          {[...fired, ...rest].map((r) => (
            <li key={r.condition.id} className="flex flex-col gap-1 py-2">
              <div className="flex items-center gap-2 text-sm">
                <span
                  aria-hidden
                  className={
                    r.fired ? "size-2 rounded-full bg-success" : "size-2 rounded-full bg-muted-foreground/30"
                  }
                />
                <span className={r.fired ? "font-medium" : "text-muted-foreground"}>{r.condition.label}</span>
                <span className="ml-auto text-xs text-muted-foreground">{toneLabel(r.condition.tone)}</span>
              </div>
              <ul className="ml-4 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs">
                {r.clauses.map((c, i) => (
                  <li
                    key={i}
                    className={
                      c.holds === true
                        ? "text-success"
                        : c.holds === false
                          ? "text-muted-foreground line-through decoration-muted-foreground/50"
                          : "text-danger"
                    }
                  >
                    {describeClause(c.clause, byId.get(c.clause.fieldId), t)}
                    {c.holds === null ? t("profile.unanswered") : ""}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
