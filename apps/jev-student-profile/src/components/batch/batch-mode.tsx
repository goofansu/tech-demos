import * as React from "react";
import { TONE_BADGE } from "@/components/author/conditions-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import {
  BATCH_CONCURRENCY,
  BATCH_SIZE,
  batchRecords,
  buildBatchRequest,
  emptyBatchResults,
  rubricKey,
  type BatchRowResult,
  type BatchRowStatus,
} from "@/lib/batch";
import { evaluateConditions } from "@/lib/conditions";
import { costUsdFromUsage, formatUsd } from "@/lib/cost";
import { useI18n } from "@/lib/i18n-context";
import type { MessagePath } from "@/lib/i18n";
import { evaluate, rubricProblems } from "@/lib/jev";
import { isAbortError, runPool } from "@/lib/pool";
import { cn } from "@/lib/utils";
import type { ApiStatus, Rubric } from "@/lib/types";

type Props = {
  rubric: Rubric;
  status: ApiStatus | null;
  onGoAuthor: () => void;
};

const STATUS_PATH: Record<BatchRowStatus, MessagePath> = {
  idle: "batch.statusIdle",
  queued: "batch.statusQueued",
  running: "batch.statusRunning",
  done: "batch.statusDone",
  error: "batch.statusError",
};

const STATUS_TONE = {
  idle: "outline",
  queued: "outline",
  running: "info",
  done: "success",
  error: "danger",
} as const;

const ROW_BG = {
  idle: "even:bg-muted/40",
  queued: "even:bg-muted/40",
  running: "bg-info-soft",
  done: "even:bg-muted/40",
  error: "bg-danger-soft/50",
} as const;

export function BatchMode({ rubric, status, onGoAuthor }: Props) {
  const { locale, t } = useI18n();
  const records = batchRecords(locale);
  const [results, setResults] = React.useState(emptyBatchResults);
  const [running, setRunning] = React.useState(false);
  const [clock, setClock] = React.useState(0);
  const [timing, setTiming] = React.useState<{ start: number; end: number | null } | null>(null);
  const [appliedLocale, setAppliedLocale] = React.useState(locale);
  const [appliedRubric, setAppliedRubric] = React.useState(() => rubricKey(rubric));
  const controllerRef = React.useRef<AbortController | null>(null);
  const runIdRef = React.useRef(0);

  const missingKey = status !== null && !status.ready;
  const problems = rubricProblems(rubric, t);
  const nextRubricKey = rubricKey(rubric);

  if (appliedLocale !== locale) {
    setAppliedLocale(locale);
    setResults(emptyBatchResults());
    setTiming(null);
    setRunning(false);
  }

  if (appliedRubric !== nextRubricKey) {
    setAppliedRubric(nextRubricKey);
    setResults(emptyBatchResults());
    setTiming(null);
    setRunning(false);
  }

  React.useEffect(() => {
    void locale;
    runIdRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, [locale]);

  React.useEffect(() => {
    void nextRubricKey;
    runIdRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, [nextRubricKey]);

  React.useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  React.useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setClock(performance.now()), 100);
    return () => window.clearInterval(id);
  }, [running]);

  const patch = (id: string, next: BatchRowResult, runId: number) => {
    if (runIdRef.current !== runId) return;
    setResults((prev) => ({ ...prev, [id]: next }));
  };

  const classifyAll = async () => {
    if (running || missingKey || problems.length > 0) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    const rubricAtStart = rubric;
    setResults(Object.fromEntries(records.map((row) => [row.id, { status: "queued" as const }])));
    setTiming({ start: performance.now(), end: null });
    setClock(performance.now());
    setRunning(true);
    try {
      await runPool(
        records,
        BATCH_CONCURRENCY,
        async (record) => {
          if (controller.signal.aborted) return;
          patch(record.id, { status: "running" }, runId);
          const started = performance.now();
          try {
            const response = await evaluate(buildBatchRequest(rubricAtStart, record), {
              signal: controller.signal,
            });
            patch(
              record.id,
              {
                status: "done",
                answers: response.answers,
                latencyMs: response.latencyMs,
                costUsd: costUsdFromUsage(response.usage),
                inputTokens: response.usage?.input_tokens,
                outputTokens: response.usage?.output_tokens,
              },
              runId,
            );
          } catch (err) {
            if (controller.signal.aborted || isAbortError(err)) {
              patch(record.id, { status: "idle" }, runId);
              return;
            }
            patch(
              record.id,
              {
                status: "error",
                error: err instanceof Error ? err.message : String(err),
                latencyMs: Math.round(performance.now() - started),
              },
              runId,
            );
          }
        },
        controller.signal,
      );
    } finally {
      if (runIdRef.current === runId) {
        controllerRef.current = null;
        setRunning(false);
        setTiming((prev) => (prev ? { start: prev.start, end: performance.now() } : prev));
      }
    }
  };

  const stop = () => {
    runIdRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    setRunning(false);
    setTiming((prev) => (prev && prev.end === null ? { start: prev.start, end: performance.now() } : prev));
    setResults((prev) => {
      const next = { ...prev };
      for (const [id, row] of Object.entries(next)) {
        if (row.status === "queued" || row.status === "running") {
          next[id] = { status: "idle" };
        }
      }
      return next;
    });
  };

  const resetResults = () => {
    runIdRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    setRunning(false);
    setResults(emptyBatchResults());
    setTiming(null);
  };

  const finished = Object.values(results).filter((row) => row.status === "done" || row.status === "error");
  const doneCount = finished.length;
  const latencies = Object.values(results)
    .filter((row) => row.status === "done" && typeof row.latencyMs === "number")
    .map((row) => row.latencyMs as number);
  const avgMs = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null;
  const costs = Object.values(results)
    .filter((row) => row.status === "done" && typeof row.costUsd === "number")
    .map((row) => row.costUsd as number);
  const totalCost = costs.length > 0 ? costs.reduce((a, b) => a + b, 0) : null;
  const elapsedMs = timing ? (timing.end ?? clock) - timing.start : 0;
  const elapsedSec = timing ? (elapsedMs / 1000).toFixed(1) : null;
  const hasAnyResult = Object.keys(results).length > 0;
  const canClassify = !running && !missingKey && problems.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>{t("batch.title")}</CardTitle>
            <CardDescription>{t("batch.hint", { count: rubric.fields.length })}</CardDescription>
          </div>
          <CardAction>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="lg" disabled={!canClassify} onClick={() => void classifyAll()}>
                {running ? t("batch.classifying") : t("batch.classifyAll")}
              </Button>
              <Button variant="outline" disabled={!running} onClick={stop}>
                {t("batch.stop")}
              </Button>
              <Button variant="ghost" disabled={!hasAnyResult} onClick={resetResults}>
                {t("batch.reset")}
              </Button>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {missingKey ? (
            <div role="alert" className="rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-sm">
              <p className="font-medium text-warning-foreground">{t("run.noApiKey")}</p>
              <p className="mt-1 text-warning-foreground/90">{t("run.noApiKeyBody")}</p>
            </div>
          ) : null}

          {problems.length > 0 ? (
            <div role="alert" className="rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-xs">
              <p className="font-medium text-warning-foreground">{t("run.rubricProblems")}</p>
              <button type="button" className="underline text-warning-foreground" onClick={onGoAuthor}>
                {t("run.fixInAuthor")}
              </button>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline gap-2">
              <p className="text-sm font-medium">{rubric.name}</p>
              <span className="text-xs text-muted-foreground">
                {t("batch.questionCount", { count: rubric.fields.length })}
              </span>
              <span className="text-xs text-muted-foreground">{t("batch.concurrency", { n: BATCH_CONCURRENCY })}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {rubric.fields.map((field) => (
                <Badge key={field.id} tone={field.type} title={field.instructions}>
                  {field.label || field.id}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{t("batch.costHint")}</p>
            <p className="text-xs text-muted-foreground">{t("batch.noPersist")}</p>
          </div>

          <div className="flex flex-col gap-2" aria-live="polite">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="font-mono tabular-nums text-foreground">
                {t("batch.progress", { done: doneCount, total: BATCH_SIZE })}
              </span>
              {elapsedSec !== null ? <span>{t("batch.elapsed", { seconds: elapsedSec })}</span> : null}
              {avgMs !== null ? <span>{t("batch.avgMs", { ms: avgMs })}</span> : null}
              {totalCost !== null ? (
                <span className="font-mono tabular-nums">{t("batch.totalCost", { cost: formatUsd(totalCost) })}</span>
              ) : null}
            </div>
            <Meter
              value={doneCount / BATCH_SIZE}
              tone="choice"
              label={t("batch.progress", { done: doneCount, total: BATCH_SIZE })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="max-h-batch overflow-auto rounded-xl border bg-card shadow-xs">
        <table className="w-full min-w-3xl table-fixed text-left text-sm">
          <caption className="sr-only">{t("batch.tableCaption")}</caption>
          <thead className="sticky top-0 z-10 border-b bg-card">
            <tr className="text-xs text-muted-foreground">
              <th className="w-12 px-3 py-2 font-medium font-mono" scope="col">
                {t("batch.colIndex")}
              </th>
              <th className="w-32 px-3 py-2 font-medium" scope="col">
                {t("batch.colName")}
              </th>
              <th className="w-24 px-3 py-2 font-medium" scope="col">
                {t("batch.colStatus")}
              </th>
              <th className="px-3 py-2 font-medium" scope="col">
                {t("batch.colProfile")}
              </th>
              <th className="w-16 px-3 py-2 text-right font-medium font-mono" scope="col">
                {t("batch.colLatency")}
              </th>
              <th className="w-24 px-3 py-2 text-right font-medium font-mono" scope="col">
                {t("batch.colCost")}
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => {
              const row = results[record.id] ?? { status: "idle" as const };
              return (
                <tr key={record.id} className={cn("border-b last:border-b-0", ROW_BG[row.status])}>
                  <td className="px-3 py-1.5 font-mono tabular-nums text-xs text-muted-foreground">
                    {index + 1}
                  </td>
                  <td className="truncate px-3 py-1.5 text-xs font-medium" title={record.name}>
                    {record.name}
                  </td>
                  <td className="px-3 py-1.5">
                    {row.status === "idle" ? (
                      <span className="text-xs text-muted-foreground">{t("batch.statusIdle")}</span>
                    ) : row.status === "error" ? (
                      <Badge tone="danger" title={row.error}>
                        {t("batch.statusError")}
                      </Badge>
                    ) : (
                      <Badge tone={STATUS_TONE[row.status]}>{t(STATUS_PATH[row.status])}</Badge>
                    )}
                  </td>
                  <td className="px-3 py-1.5">
                    <ProfileChips rubric={rubric} row={row} />
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums text-xs">
                    {typeof row.latencyMs === "number" ? row.latencyMs : t("batch.emptyCell")}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums text-xs">
                    <CostCell row={row} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CostCell({ row }: { row: BatchRowResult }) {
  const { t } = useI18n();
  if (typeof row.costUsd !== "number") {
    return <>{t("batch.emptyCell")}</>;
  }
  const cost = formatUsd(row.costUsd);
  return (
    <span
      title={t("batch.costDetail", {
        cost,
        in: row.inputTokens ?? 0,
        out: row.outputTokens ?? 0,
      })}
    >
      {cost}
    </span>
  );
}

function ProfileChips({ rubric, row }: { rubric: Rubric; row: BatchRowResult }) {
  const { t } = useI18n();
  if (row.status !== "done" || !row.answers) {
    return <span className="text-xs text-muted-foreground">{t("batch.emptyCell")}</span>;
  }
  if (rubric.conditions.length === 0) {
    return <span className="text-xs text-muted-foreground">{t("batch.emptyCell")}</span>;
  }
  const fired = evaluateConditions(rubric.conditions, rubric.fields, row.answers).filter((item) => item.fired);
  if (fired.length === 0) {
    return <span className="text-xs text-muted-foreground">{t("batch.noneFired")}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {fired.map((item) => (
        <Badge key={item.condition.id} tone={TONE_BADGE[item.condition.tone]} title={item.condition.label}>
          {item.condition.label}
        </Badge>
      ))}
    </div>
  );
}
