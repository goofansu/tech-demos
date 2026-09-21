import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { pct, verdictFor } from "@/lib/conditions";
import { useI18n } from "@/lib/i18n-context";
import type { JevAnswer, RubricField } from "@/lib/types";

type Props = {
  field: RubricField;
  answer: JevAnswer | undefined;
};

export function AnswerCard({ field, answer }: Props) {
  const { t } = useI18n();
  const verdict = verdictFor(field, answer, t);

  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge tone={field.type}>{field.type}</Badge>
            <CardTitle className="truncate">{field.label || field.id}</CardTitle>
          </div>
          <CardDescription className="mt-1 line-clamp-2">{field.instructions}</CardDescription>
        </div>
        {verdict ? (
          <CardAction>
            <Badge tone={verdict.met ? "success" : "outline"} title={verdict.detail}>
              {verdict.label}
            </Badge>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!answer ? <p className="text-sm text-muted-foreground">{t("answers.noAnswer")}</p> : null}
        {answer?.type === "noul" && field.type === "noul" ? (
          <NoulBody noul={answer.noul} yesAt={field.yesAt} />
        ) : null}
        {answer?.type === "choice" && field.type === "choice" ? (
          <ChoiceBody
            choice={answer.choice}
            confidence={answer.confidence}
            probabilities={answer.probabilities}
            descriptions={Object.fromEntries(field.options.map((o) => [o.key, o.description]))}
          />
        ) : null}
        {answer?.type === "score" && field.type === "score" ? (
          <ScoreBody
            score={answer.score}
            confidence={answer.confidence}
            legend={answer.legend}
            probabilities={answer.probabilities}
            meetsAt={field.meetsAt}
          />
        ) : null}
        {verdict ? <p className="text-xs text-muted-foreground">{verdict.detail}</p> : null}
      </CardContent>
    </Card>
  );
}

function NoulBody({ noul, yesAt }: { noul: number; yesAt: number }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">{t("answers.pYes")}</span>
        <span className="font-mono text-2xl font-semibold tabular-nums">{pct(noul)}</span>
      </div>
      <Meter value={noul} tone="noul" label={t("answers.probabilityYes")} />
      <div className="flex justify-between font-mono text-xs text-muted-foreground">
        <span>0%</span>
        <span>{t("answers.threshold", { pct: pct(yesAt) })}</span>
        <span>100%</span>
      </div>
    </div>
  );
}

type ChoiceBodyProps = {
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
  descriptions: Record<string, string>;
};

function ChoiceBody({ choice, confidence, probabilities, descriptions }: ChoiceBodyProps) {
  const { t } = useI18n();
  const rows = Object.entries(probabilities).toSorted((a, b) => b[1] - a[1]);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs text-muted-foreground">{t("answers.pick")}</span>
          <p className="truncate font-mono text-xl font-semibold">{choice}</p>
        </div>
        <Stat label={t("answers.confidence")} value={confidence.toFixed(2)} />
      </div>
      <ul className="flex flex-col gap-2">
        {rows.map(([key, p]) => (
          <li key={key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className={key === choice ? "min-w-0 break-words font-semibold text-foreground" : "min-w-0 break-words text-muted-foreground"}>
                <span className="font-mono">{key}</span>
                {descriptions[key] ? <span className="text-muted-foreground"> — {descriptions[key]}</span> : null}
              </span>
              <span className="shrink-0 font-mono tabular-nums text-muted-foreground">{pct(p)}</span>
            </div>
            <Meter value={p} tone={key === choice ? "choice" : "muted"} label={t("answers.probability", { key })} />
          </li>
        ))}
      </ul>
    </div>
  );
}

type ScoreBodyProps = {
  score: number;
  confidence: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
  meetsAt: number;
};

function ScoreBody({ score, confidence, legend, probabilities, meetsAt }: ScoreBodyProps) {
  const { t } = useI18n();
  const levels = Object.keys(legend)
    .map(Number)
    .toSorted((a, b) => a - b);
  const max = Math.max(1, levels.length - 1);
  const nearest = Math.round(score);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <span className="text-xs text-muted-foreground">{t("answers.scoreRange", { max })}</span>
          <p className="font-mono text-2xl font-semibold tabular-nums">{score.toFixed(2)}</p>
        </div>
        <Stat label={t("answers.confidence")} value={confidence.toFixed(2)} />
      </div>
      <div className="flex flex-col gap-1">
        <Meter value={score / max} tone="score" label={t("answers.fractionalScore")} />
        <div className="flex justify-between font-mono text-xs text-muted-foreground">
          <span>0</span>
          <span>{t("answers.meetsAt", { value: meetsAt })}</span>
          <span>{max}</span>
        </div>
      </div>
      <ol className="flex flex-col gap-2">
        {levels.map((lvl) => {
          const p = probabilities[String(lvl)] ?? 0;
          const active = lvl === nearest;
          return (
            <li key={lvl} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className={active ? "min-w-0 break-words font-semibold text-foreground" : "min-w-0 break-words text-muted-foreground"}>
                  <span className="font-mono">{lvl}</span> · {legend[String(lvl)]}
                </span>
                <span className="shrink-0 font-mono tabular-nums text-muted-foreground">{pct(p)}</span>
              </div>
              <Meter
                value={p}
                tone={active ? "score" : "muted"}
                label={t("answers.levelProbability", { n: lvl })}
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="font-mono text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}
