import * as React from "react";
import { JudgmentCard } from "@/components/shared/judgment-card";
import { KeyWarning } from "@/components/shared/key-warning";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ADMISSIONS_PRESET, FIELD_JUDGMENTS, QUEUE_JUDGMENTS } from "@/lib/admissions-preset";
import { applicantsFor } from "@/lib/applicants";
import { costUsdFromUsage } from "@/lib/cost";
import { applicantContext, VERDICT_LABEL, VERDICT_TONE } from "@/lib/format";
import { evaluate } from "@/lib/jev";
import { useI18n } from "@/lib/i18n-context";
import { buildRequest } from "@/lib/request";
import { resultFor } from "@/lib/sort";
import { deriveOutcomes } from "@/lib/verdicts";
import type { ApiStatus, Applicant, ApplicantResult, SchoolConfig } from "@/lib/types";


type Props = {
  applicants: Applicant[];
  selectedId: string;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<Applicant>) => void;
  school: SchoolConfig;
  results: Record<string, ApplicantResult>;
  setResults: React.Dispatch<React.SetStateAction<Record<string, ApplicantResult>>>;
  confidenceFloor: number;
  status: ApiStatus | null;
};

const GRADES = ["Year 7", "Year 8", "Year 9", "Year 11", ""];

export function ApplicantMode({
  applicants,
  selectedId,
  onSelect,
  onChange,
  school,
  results,
  setResults,
  confidenceFloor,
  status,
}: Props) {
  const { locale } = useI18n();
  const applicant = applicants.find((row) => row.id === selectedId) ?? applicants[0];
  const result = resultFor(results, applicant.id);
  const missingKey = status !== null && !status.ready;
  const busy = result.status === "running";
  const canRun = !busy && !missingKey;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canRun) return;
    const request = buildRequest(applicant, school);
    setResults((prev) => ({ ...prev, [applicant.id]: { status: "running" } }));
    try {
      const response = await evaluate(request);
      setResults((prev) => ({
        ...prev,
        [applicant.id]: {
          status: "done",
          answers: response.answers,
          request,
          latencyMs: response.latencyMs,
          costUsd: costUsdFromUsage(response.usage),
          inputTokens: response.usage?.input_tokens,
          outputTokens: response.usage?.output_tokens,
        },
      }));
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [applicant.id]: {
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        },
      }));
    }
  };

  const restore = () => {
    const original = applicantsFor(locale).find((row) => row.id === applicant.id);
    if (original) onChange(applicant.id, original);
  };

  const outcomes = deriveOutcomes(applicant, school, result.answers, confidenceFloor);
  const fieldRows = outcomes.filter((o) => o.role === "field");
  const queueRows = outcomes.filter((o) => o.role === "queue");

  const set = (patch: Partial<Applicant>) => onChange(applicant.id, patch);

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <form onSubmit={submit} className="flex flex-col gap-5 lg:col-span-5">
        <Card>
          <CardHeader>
            <div className="min-w-0">
              <CardTitle>Applicant</CardTitle>
              <CardDescription>{applicantContext(applicant)}</CardDescription>
            </div>
            <CardAction>
              <Select
                aria-label="Fabricated applicant"
                className="w-auto max-w-56"
                value={applicant.id}
                onChange={(e) => onSelect(e.target.value)}
              >
                {applicants.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.id} · {row.name}
                  </option>
                ))}
              </Select>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground">
              Fabricated record. Empty fields become Missing in code and never reach Jev.
            </p>
            <Field label="Name" htmlFor="name">
              <Input id="name" value={applicant.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Applied grade" htmlFor="grade">
                <Select
                  id="grade"
                  value={applicant.grade ?? ""}
                  onChange={(e) => set({ grade: e.target.value || null })}
                >
                  {GRADES.map((g) => (
                    <option key={g || "blank"} value={g}>
                      {g || "(not provided)"}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Age" htmlFor="age">
                <Input
                  id="age"
                  type="number"
                  value={applicant.age ?? ""}
                  onChange={(e) => set({ age: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First language" htmlFor="language">
                <Input
                  id="language"
                  value={applicant.language ?? ""}
                  onChange={(e) => set({ language: e.target.value || null })}
                />
              </Field>
              <Field label="Second language" htmlFor="second_language">
                <Input
                  id="second_language"
                  value={applicant.second_language ?? ""}
                  onChange={(e) => set({ second_language: e.target.value || null })}
                />
              </Field>
            </div>
            <Field label="Prior school" htmlFor="prior_school">
              <Input
                id="prior_school"
                value={applicant.prior_school ?? ""}
                onChange={(e) => set({ prior_school: e.target.value || null })}
              />
            </Field>
            <Field label="Prior school country" htmlFor="prior_school_country">
              <Input
                id="prior_school_country"
                value={applicant.prior_school_country ?? ""}
                onChange={(e) => set({ prior_school_country: e.target.value || null })}
              />
            </Field>
            <Field label="Extracurricular" htmlFor="extracurricular">
              <Textarea
                id="extracurricular"
                className="min-h-20"
                value={applicant.extracurricular ?? ""}
                onChange={(e) => set({ extracurricular: e.target.value || null })}
              />
            </Field>
            <Field label="Reason for applying" htmlFor="reason_for_applying">
              <Textarea
                id="reason_for_applying"
                className="min-h-20"
                value={applicant.reason_for_applying ?? ""}
                onChange={(e) => set({ reason_for_applying: e.target.value || null })}
              />
            </Field>
            <Field label="Siblings" htmlFor="siblings_information">
              <Input
                id="siblings_information"
                value={applicant.siblings_information ?? ""}
                onChange={(e) => set({ siblings_information: e.target.value || null })}
              />
            </Field>
            <Field label="Deadline" htmlFor="deadline">
              <Input
                id="deadline"
                value={applicant.deadline ?? ""}
                onChange={(e) => set({ deadline: e.target.value || null })}
              />
            </Field>
            <Field label="Competing offer" htmlFor="competing_offer">
              <Input
                id="competing_offer"
                value={applicant.competing_offer ?? ""}
                onChange={(e) => set({ competing_offer: e.target.value || null })}
              />
            </Field>
            <Field label="Scholarship" htmlFor="scholarship">
              <Input
                id="scholarship"
                value={applicant.scholarship ?? ""}
                onChange={(e) => set({ scholarship: e.target.value || null })}
              />
            </Field>
            <Field label="Officer notes" htmlFor="officer_notes">
              <Textarea
                id="officer_notes"
                className="min-h-20"
                value={applicant.officer_notes ?? ""}
                onChange={(e) => set({ officer_notes: e.target.value || null })}
              />
            </Field>
            <KeyWarning show={missingKey} />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" size="lg" disabled={!canRun}>
                {busy ? "Evaluating…" : "Evaluate applicant"}
              </Button>
              <Button type="button" variant="ghost" onClick={restore}>
                Restore fixture
              </Button>
            </div>
            {applicant.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {applicant.tags.map((tag) => (
                  <Badge key={tag} tone="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </form>

      <div className="flex flex-col gap-5 lg:col-span-7">
        {result.status === "idle" ? (
          <Card>
            <CardContent className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm font-medium">Ready to evaluate this file</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Six field judgments get a four-state verdict. Attention and attention reason stay queue metadata —
                they are not rejection scores.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {result.status === "running" ? (
          <Card>
            <CardContent className="flex min-h-40 items-center justify-center">
              <p className="animate-pulse text-sm text-muted-foreground">Asking Jev…</p>
            </CardContent>
          </Card>
        ) : null}

        {result.status === "error" ? (
          <div role="alert" className="rounded-xl border border-danger/40 bg-danger-soft px-5 py-4 text-sm">
            <p className="font-medium text-danger">Evaluation failed</p>
            <p className="mt-1 text-danger/90">{result.error}</p>
          </div>
        ) : null}

        {result.status === "done" ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge tone="success">Jev</Badge>
              <span>{result.latencyMs} ms</span>
              {typeof result.inputTokens === "number" ? (
                <span>
                  {result.inputTokens} in / {result.outputTokens ?? 0} out
                </span>
              ) : null}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Queue metadata</CardTitle>
                <CardDescription>
                  Attention orders the batch. The reason says why — other is kept, not remapped.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {queueRows.map((outcome) => {
                  const judgment = QUEUE_JUDGMENTS.find((j) => j.id === outcome.id);
                  if (!judgment) return null;
                  return (
                    <JudgmentCard
                      key={outcome.id}
                      judgment={judgment}
                      outcome={outcome}
                      answer={result.answers?.[outcome.id]}
                    />
                  );
                })}
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-1.5">
              {fieldRows.map((outcome) =>
                outcome.verdict ? (
                  <Badge key={outcome.id} tone={VERDICT_TONE[outcome.verdict]}>
                    {outcome.label}: {VERDICT_LABEL[outcome.verdict]}
                  </Badge>
                ) : null,
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {fieldRows.map((outcome) => {
                const judgment = FIELD_JUDGMENTS.find((j) => j.id === outcome.id);
                if (!judgment) return null;
                return (
                  <JudgmentCard
                    key={outcome.id}
                    judgment={judgment}
                    outcome={outcome}
                    answer={result.answers?.[outcome.id]}
                  />
                );
              })}
            </div>

            <details className="rounded-xl border bg-card shadow-xs">
              <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-muted-foreground select-none hover:text-foreground">
                Request sent to Jev
              </summary>
              <pre className="overflow-x-auto border-t bg-muted/50 px-5 py-4 font-mono text-xs leading-relaxed">
                {JSON.stringify(result.request ?? buildRequest(applicant, school), null, 2)}
              </pre>
            </details>
          </>
        ) : null}

        {result.status !== "done" && result.status !== "running" && result.status !== "error" ? (
          <details className="rounded-xl border bg-card shadow-xs">
            <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-muted-foreground select-none hover:text-foreground">
              Request that would be sent ({Object.keys(buildRequest(applicant, school).questions).length} of{" "}
              {ADMISSIONS_PRESET.length} questions)
            </summary>
            <pre className="overflow-x-auto border-t bg-muted/50 px-5 py-4 font-mono text-xs leading-relaxed">
              {JSON.stringify(buildRequest(applicant, school), null, 2)}
            </pre>
          </details>
        ) : null}
      </div>
    </div>
  );
}
