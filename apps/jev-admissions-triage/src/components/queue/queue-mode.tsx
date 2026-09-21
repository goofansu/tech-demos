import * as React from "react";
import { FloorControl } from "@/components/shared/floor-control";
import { KeyWarning } from "@/components/shared/key-warning";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { presetFor } from "@/lib/admissions-preset";
import { costUsdFromUsage, formatUsd } from "@/lib/cost";
import { missingFieldCount } from "@/lib/fields";
import { applicantContext, verdictLabel } from "@/lib/format";
import type { MessagePath } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-context";
import { evaluate } from "@/lib/jev";
import { isAbortError, runPool } from "@/lib/pool";
import { buildRequest } from "@/lib/request";
import { attentionAnswer, attentionReasonLabel, peakScoreLabel, resultFor, sortQueue } from "@/lib/sort";
import { deriveOutcomes } from "@/lib/verdicts";
import { cn } from "@/lib/utils";
import type { ApiStatus, Applicant, ApplicantResult, SchoolConfig } from "@/lib/types";

export const QUEUE_CONCURRENCY = 6;

type Props = {
  applicants: Applicant[];
  school: SchoolConfig;
  results: Record<string, ApplicantResult>;
  setResults: React.Dispatch<React.SetStateAction<Record<string, ApplicantResult>>>;
  confidenceFloor: number;
  onFloorChange: (next: number) => void;
  status: ApiStatus | null;
  onOpenApplicant: (id: string) => void;
};

const STATUS_TONE = {
  idle: "outline",
  queued: "outline",
  running: "info",
  done: "success",
  error: "danger",
} as const;

const STATUS_PATH: Record<string, MessagePath> = {
  idle: "queue.statusIdle",
  queued: "queue.statusQueued",
  running: "queue.statusRunning",
  done: "queue.statusDone",
  error: "queue.statusError",
};

const ROW_BG = {
  idle: "even:bg-muted/40",
  queued: "even:bg-muted/40",
  running: "bg-info-soft",
  done: "even:bg-muted/40",
  error: "bg-danger-soft/50",
} as const;

export function QueueMode({
  applicants,
  school,
  results,
  setResults,
  confidenceFloor,
  onFloorChange,
  status,
  onOpenApplicant,
}: Props) {
  const { locale, t } = useI18n();
  const preset = presetFor(locale);
  const [running, setRunning] = React.useState(false);
  const [clock, setClock] = React.useState(0);
  const [timing, setTiming] = React.useState<{ start: number; end: number | null } | null>(null);
  const controllerRef = React.useRef<AbortController | null>(null);
  const runIdRef = React.useRef(0);

  const missingKey = status !== null && !status.ready;

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

  const patch = (id: string, next: ApplicantResult, runId: number) => {
    if (runIdRef.current !== runId) return;
    setResults((prev) => ({ ...prev, [id]: next }));
  };

  const evaluateAll = async () => {
    if (running || missingKey) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    setResults(Object.fromEntries(applicants.map((row) => [row.id, { status: "queued" as const }])));
    setTiming({ start: performance.now(), end: null });
    setClock(performance.now());
    setRunning(true);
    try {
      await runPool(
        applicants,
        QUEUE_CONCURRENCY,
        async (record) => {
          if (controller.signal.aborted) return;
          patch(record.id, { status: "running" }, runId);
          const started = performance.now();
          try {
            const request = buildRequest(record, school, preset, t);
            const response = await evaluate(request, { signal: controller.signal });
            patch(
              record.id,
              {
                status: "done",
                answers: response.answers,
                request,
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
        if (row.status === "queued" || row.status === "running") next[id] = { status: "idle" };
      }
      return next;
    });
  };

  const resetResults = () => {
    runIdRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    setRunning(false);
    setResults({});
    setTiming(null);
  };

  const rows = sortQueue(applicants.map((applicant) => ({ applicant, result: resultFor(results, applicant.id) })));
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
  const canRun = !running && !missingKey;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>{t("queue.title")}</CardTitle>
<CardDescription>{t("queue.description")}</CardDescription>
          </div>
          <CardAction>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="lg" disabled={!canRun} onClick={() => void evaluateAll()}>
                {running ? t("queue.evaluating") : t("queue.evaluateAll")}
              </Button>
              <Button variant="outline" disabled={!running} onClick={stop}>
                {t("queue.stop")}
              </Button>
              <Button variant="ghost" disabled={!hasAnyResult} onClick={resetResults}>
                {t("queue.reset")}
              </Button>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <KeyWarning show={missingKey} />
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline gap-2">
              <p className="text-sm font-medium">{t("queue.presetName")}</p>
              <span className="text-xs text-muted-foreground">{t("queue.judgmentCount", { count: preset.length })}</span>
              <span className="text-xs text-muted-foreground">{t("queue.concurrency", { n: QUEUE_CONCURRENCY })}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {preset.map((field) => (
                <Badge key={field.id} tone={field.primitive} title={field.question}>
                  {field.label}
                </Badge>
              ))}
            </div>
            <FloorControl value={confidenceFloor} onChange={onFloorChange} />
<p className="text-xs text-muted-foreground">{t("queue.floorHint")}</p>
<p className="text-xs text-muted-foreground">{t("queue.costHint")}</p>
          </div>
          <div className="flex flex-col gap-2" aria-live="polite">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="font-mono tabular-nums text-foreground">
                {doneCount} / {applicants.length}
              </span>
              {elapsedSec !== null ? <span>{t("queue.elapsed", { seconds: elapsedSec })}</span> : null}
              {avgMs !== null ? <span>{t("queue.avgMs", { ms: avgMs })}</span> : null}
              {totalCost !== null ? (
                <span className="font-mono tabular-nums">
                  {t("queue.estCost", { cost: formatUsd(totalCost) })}
                </span>
              ) : null}
            </div>
            <Meter
              value={doneCount / applicants.length}
              tone="choice"
              label={t("queue.meterLabel", { done: doneCount, total: applicants.length })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="max-h-batch overflow-auto rounded-xl border bg-card shadow-xs">
        <table className="w-full table-fixed text-left text-sm">
          <caption className="sr-only">{t("queue.tableCaption")}</caption>
          <thead className="sticky top-0 z-10 border-b bg-card">
            <tr className="text-xs text-muted-foreground">
              <th className="w-16 px-3 py-2 font-medium font-mono" scope="col">
                {t("queue.colId")}
              </th>
              <th className="px-3 py-2 font-medium" scope="col">
                {t("queue.colApplicant")}
              </th>
              <th className="w-20 px-3 py-2 font-medium" scope="col">
                {t("queue.colGrade")}
              </th>
              <th className="w-16 px-3 py-2 text-right font-medium" scope="col">
                {t("queue.colMiss")}
              </th>
              <th className="w-36 px-3 py-2 font-medium" scope="col">
                {t("queue.colAttention")}
              </th>
              <th className="w-28 px-3 py-2 font-medium" scope="col">
                {t("queue.colWhy")}
              </th>
              <th className="w-16 px-3 py-2 text-right font-medium" scope="col">
                {t("queue.colConf")}
              </th>
              <th className="w-24 px-3 py-2 font-medium" scope="col">
                {t("queue.colStatus")}
              </th>
              <th className="w-16 px-3 py-2 text-right font-medium font-mono" scope="col">
                {t("queue.colMs")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ applicant, result }) => {
              const attention = attentionAnswer(result);
              const reason = attentionReasonLabel(result);
              const outcomes =
                result.status === "done"
                  ? deriveOutcomes(applicant, school, result.answers, confidenceFloor, preset, t)
                  : [];
              const reviewCount = outcomes.filter((o) => o.verdict === "needs_review").length;
              return (
                <tr key={applicant.id} className={cn("border-b last:border-b-0", ROW_BG[result.status])}>
                  <td className="px-3 py-1.5 font-mono tabular-nums text-xs text-muted-foreground">
                    {applicant.id}
                  </td>
                  <td className="px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenApplicant(applicant.id)}
                      className="block max-w-full truncate text-left text-xs font-medium hover:underline"
                      title={applicantContext(applicant, t)}
                    >
                      {applicant.name}
                    </button>
                    <p className="truncate text-xs text-muted-foreground">{applicantContext(applicant, t)}</p>
                  </td>
                  <td className="truncate px-3 py-1.5 text-xs">{applicant.grade ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums text-xs">
                    {missingFieldCount(applicant, preset)}
                  </td>
                  <td className="px-3 py-1.5 text-xs">
                    {attention ? (
                      <span className="font-mono tabular-nums">
                        {attention.score.toFixed(2)}
                        <span className="ml-1 text-muted-foreground">{peakScoreLabel(attention)}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5">
                    {reason ? (
                      <Badge tone={reason === "other" ? "outline" : "choice"}>
                        {t(`attentionReason.${reason}` as MessagePath)}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums text-xs">
                    {attention ? attention.confidence.toFixed(2) : "—"}
                  </td>
                  <td className="px-3 py-1.5">
                    {result.status === "idle" ? (
                      <span className="text-xs text-muted-foreground">{t("queue.statusIdle")}</span>
                    ) : result.status === "error" ? (
                      <Badge tone="danger" title={result.error}>
                        {t("queue.statusError")}
                      </Badge>
                    ) : result.status === "done" && reviewCount > 0 ? (
                      <Badge tone="warning" title={`${reviewCount} ${verdictLabel("needs_review", t)}`}>
                        {t("queue.statusDone")}
                      </Badge>
                    ) : (
                      <Badge tone={STATUS_TONE[result.status]}>{t(STATUS_PATH[result.status])}</Badge>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums text-xs">
                    {typeof result.latencyMs === "number" ? result.latencyMs : "—"}
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
