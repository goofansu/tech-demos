import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { verdictLabel, VERDICT_TONE } from "@/lib/format";
import type { Translate } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-context";
import { pct } from "@/lib/verdicts";
import type { JevAnswer, Judgment, JudgmentOutcome } from "@/lib/types";

type Props = {
  judgment: Judgment;
  outcome: JudgmentOutcome;
  answer: JevAnswer | undefined;
};

export function JudgmentCard({ judgment, outcome, answer }: Props) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={judgment.primitive}>{judgment.primitive}</Badge>
            <CardTitle className="truncate">{judgment.label}</CardTitle>
          </div>
          <CardDescription className="mt-1 line-clamp-2">{judgment.question}</CardDescription>
        </div>
        {outcome.verdict ? (
          <CardAction>
            <Badge tone={VERDICT_TONE[outcome.verdict]}>{verdictLabel(outcome.verdict, t)}</Badge>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm font-medium">{outcome.semantic}</p>
        {outcome.confidence !== null ? (
          <p className="text-xs text-muted-foreground">
            {t("judgment.confidence", { value: outcome.confidence.toFixed(2) })}
            {outcome.escalated
              ? outcome.role === "field"
                ? t("judgment.escalatedField")
                : t("judgment.escalatedQueue")
              : ""}
          </p>
        ) : null}
        {judgment.never_not_met && outcome.role === "field" ? (
          <p className="text-xs text-muted-foreground">
            {outcome.neverNotMetProtected
              ? t("judgment.neverNotMetReplaced")
              : t("judgment.protected")}
          </p>
        ) : null}
        {outcome.unconfigured ? (
          <p className="text-xs text-warning-foreground">{outcome.detail}</p>
        ) : null}

        {answer?.type === "noul" ? <NoulBody noul={answer.noul} t={t} /> : null}
        {answer?.type === "choice" ? (
          <ChoiceBody
            choice={answer.choice}
            confidence={answer.confidence}
            probabilities={answer.probabilities}
            t={t}
          />
        ) : null}
        {answer?.type === "score" && judgment.primitive === "score" ? (
          <ScoreBody
            score={answer.score}
            confidence={answer.confidence}
            legend={answer.legend}
            probabilities={answer.probabilities}
            levels={judgment.levels}
            t={t}
          />
        ) : null}

        {outcome.omitReason === "missing" ? (
          <p className="text-xs text-muted-foreground">{outcome.detail}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function NoulBody({ noul, t }: { noul: number; t: Translate }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">{t("judgment.pYes")}</span>
        <span className="font-mono text-2xl font-semibold tabular-nums">{pct(noul)}</span>
      </div>
      <Meter value={noul} tone="noul" label={t("judgment.probabilityYes")} />
    </div>
  );
}

function ChoiceBody({
  choice,
  confidence,
  probabilities,
  t,
}: {
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
  t: Translate;
}) {
  const rows = Object.entries(probabilities).toSorted((a, b) => b[1] - a[1]);
  return (
    <details className="rounded-lg border bg-muted/40">
      <summary className="cursor-pointer px-3 py-2 text-xs font-medium select-none">
        {t("judgment.choiceSummary", { choice, value: confidence.toFixed(2) })}
      </summary>
      <ul className="flex flex-col gap-2 border-t px-3 py-3">
        {rows.map(([key, p]) => (
          <li key={key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className={key === choice ? "font-semibold text-foreground" : "text-muted-foreground"}>
                <span className="font-mono">{key}</span>
              </span>
              <span className="shrink-0 font-mono tabular-nums text-muted-foreground">{pct(p)}</span>
            </div>
            <Meter value={p} tone={key === choice ? "choice" : "muted"} label={t("judgment.probability", { key })} />
          </li>
        ))}
      </ul>
    </details>
  );
}

function ScoreBody({
  score,
  confidence,
  legend,
  probabilities,
  levels,
  t,
}: {
  score: number;
  confidence: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
  levels: string[];
  t: Translate;
}) {
  const keys = Object.keys(legend).length > 0 ? Object.keys(legend) : levels.map((_, i) => String(i));
  const ordered = keys.map(Number).toSorted((a, b) => a - b);
  const max = Math.max(1, ordered.length - 1);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <span className="text-xs text-muted-foreground">{t("judgment.weightedScore")}</span>
          <p className="font-mono text-2xl font-semibold tabular-nums">{score.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-muted-foreground">{t("judgment.confidenceLabel")}</span>
          <p className="font-mono text-base font-semibold tabular-nums">{confidence.toFixed(2)}</p>
        </div>
      </div>
      <Meter value={score / max} tone="score" label={t("judgment.fractionalScore")} />
      <details className="rounded-lg border bg-muted/40">
        <summary className="cursor-pointer px-3 py-2 text-xs font-medium select-none">
          {t("judgment.perLevel")}
        </summary>
        <ol className="flex flex-col gap-2 border-t px-3 py-3">
          {ordered.map((lvl) => {
            const p = probabilities[String(lvl)] ?? 0;
            const label = legend[String(lvl)] ?? levels[lvl] ?? String(lvl);
            return (
              <li key={lvl} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">
                    <span className="font-mono">{lvl}</span> · {label}
                  </span>
                  <span className="shrink-0 font-mono tabular-nums text-muted-foreground">{pct(p)}</span>
                </div>
                <Meter value={p} tone="score" label={t("judgment.levelProbability", { n: lvl })} />
              </li>
            );
          })}
        </ol>
      </details>
    </div>
  );
}
