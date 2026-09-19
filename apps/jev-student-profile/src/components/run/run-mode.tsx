import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { evaluateConditions } from "@/lib/conditions";
import { RichText, useI18n } from "@/lib/i18n-context";
import { buildRequest, evaluate, rubricProblems } from "@/lib/jev";
import { sampleStudents } from "@/lib/sample";
import type { ApiStatus, EvaluateResponse, JevState, Rubric } from "@/lib/types";
import { AnswerCard } from "./answer-card";
import { ProfileSummary } from "./profile-summary";

type Props = {
  rubric: Rubric;
  status: ApiStatus | null;
  onGoAuthor: () => void;
};

type RunState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; response: EvaluateResponse; request: ReturnType<typeof buildRequest> };

const CUSTOM = "__custom__";

export function RunMode({ rubric, status, onGoAuthor }: Props) {
  const { locale, t } = useI18n();
  const students = sampleStudents(locale);
  const [sample, setSample] = React.useState<string>(students[0]?.id ?? CUSTOM);
  const [studentName, setStudentName] = React.useState<string>(students[0]?.name ?? t("run.defaultStudent"));
  const [state, setState] = React.useState<JevState>(() => students[0]?.state ?? {});
  const [run, setRun] = React.useState<RunState>({ kind: "idle" });
  const [appliedLocale, setAppliedLocale] = React.useState(locale);

  if (appliedLocale !== locale) {
    setAppliedLocale(locale);
    if (sample !== CUSTOM) {
      const next = sampleStudents(locale).find((st) => st.id === sample);
      if (next) {
        setStudentName(next.name);
        setState(next.state);
      }
    }
    setRun({ kind: "idle" });
  }

  const problems = rubricProblems(rubric, t);
  const hasText = rubric.inputs.some((i) => state[i.key]?.trim());
  const missingKey = status !== null && !status.ready;
  const canRun = problems.length === 0 && hasText && run.kind !== "loading" && !missingKey;

  const pickSample = (id: string) => {
    setSample(id);
    const s = sampleStudents(locale).find((st) => st.id === id);
    if (s) {
      setStudentName(s.name);
      setState(s.state);
    } else {
      setStudentName("");
      setState({});
    }
    setRun({ kind: "idle" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canRun) return;
    const request = buildRequest(rubric, state);
    setRun({ kind: "loading" });
    try {
      const response = await evaluate(request);
      setRun({ kind: "done", response, request });
    } catch (err) {
      setRun({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    }
  };

  const results =
    run.kind === "done" ? evaluateConditions(rubric.conditions, rubric.fields, run.response.answers) : [];

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <form onSubmit={submit} className="flex flex-col gap-5 lg:col-span-5">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{t("run.student")}</CardTitle>
              <CardDescription>
                <RichText
                  path="run.studentHint"
                  tokens={{ state: <code className="font-mono">state</code> }}
                />
              </CardDescription>
            </div>
            <CardAction>
              <Select
                aria-label={t("run.sampleStudent")}
                className="w-auto"
                value={sample}
                onChange={(e) => pickSample(e.target.value)}
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {t("run.sample", { name: s.name })}
                  </option>
                ))}
                <option value={CUSTOM}>{t("run.blank")}</option>
              </Select>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field label={t("run.studentName")}>
              <Input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder={t("run.namePlaceholder")}
              />
            </Field>
            {rubric.inputs.map((input) => (
              <Field key={input.key} label={input.label} htmlFor={`in-${input.key}`}>
                {input.multiline ? (
                  <Textarea
                    id={`in-${input.key}`}
                    className="min-h-28"
                    placeholder={input.placeholder}
                    value={state[input.key] ?? ""}
                    onChange={(e) => setState({ ...state, [input.key]: e.target.value })}
                  />
                ) : (
                  <Input
                    id={`in-${input.key}`}
                    placeholder={input.placeholder}
                    value={state[input.key] ?? ""}
                    onChange={(e) => setState({ ...state, [input.key]: e.target.value })}
                  />
                )}
              </Field>
            ))}

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

            <div className="flex items-center gap-3">
              <Button type="submit" size="lg" disabled={!canRun}>
                {run.kind === "loading"
                  ? t("run.evaluating")
                  : t("run.evaluate", { count: rubric.fields.length })}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <div className="flex flex-col gap-5 lg:col-span-7">
        {run.kind === "idle" ? (
          <Card>
            <CardContent className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm font-medium">{t("run.readyTitle")}</p>
              <p className="max-w-sm text-xs text-muted-foreground">{t("run.readyBody")}</p>
            </CardContent>
          </Card>
        ) : null}

        {run.kind === "loading" ? (
          <Card>
            <CardContent className="flex min-h-40 items-center justify-center">
              <p className="animate-pulse text-sm text-muted-foreground">{t("run.asking")}</p>
            </CardContent>
          </Card>
        ) : null}

        {run.kind === "error" ? (
          <div role="alert" className="rounded-xl border border-danger/40 bg-danger-soft px-5 py-4 text-sm">
            <p className="font-medium text-danger">{t("run.failed")}</p>
            <p className="mt-1 text-danger/90">{run.message}</p>
          </div>
        ) : null}

        {run.kind === "done" ? (
          <>
            <ResultMeta response={run.response} />
            <ProfileSummary
              results={results}
              fields={rubric.fields}
              studentName={studentName || t("run.defaultStudent")}
            />
            <div className="grid gap-4 md:grid-cols-2">
              {rubric.fields.map((field) => (
                <AnswerCard key={field.id} field={field} answer={run.response.answers[field.id]} />
              ))}
            </div>
            <details className="rounded-xl border bg-card shadow-xs">
              <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-muted-foreground select-none hover:text-foreground">
                <RichText
                  path="run.requestSent"
                  tokens={{ path: <code className="font-mono">/api/evaluate</code> }}
                />
              </summary>
              <pre className="overflow-x-auto border-t bg-muted/50 px-5 py-4 font-mono text-xs leading-relaxed">
                {JSON.stringify(run.request, null, 2)}
              </pre>
            </details>
          </>
        ) : null}
      </div>
    </div>
  );
}

function ResultMeta({ response }: { response: EvaluateResponse }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Badge tone="success">Jev</Badge>
      <span>
        {t("run.modelLabel")} <code className="font-mono text-foreground">{response.model}</code>
      </span>
      <span>·</span>
      <span>{response.latencyMs} ms</span>
      {response.usage ? (
        <>
          <span>·</span>
          <span>
            {t("run.tokens", {
              in: response.usage.input_tokens ?? 0,
              out: response.usage.output_tokens ?? 0,
            })}
          </span>
        </>
      ) : null}
    </div>
  );
}
