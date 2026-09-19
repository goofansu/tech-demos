import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { evaluateConditions } from "@/lib/conditions";
import { buildRequest, evaluate, rubricProblems } from "@/lib/jev";
import { SAMPLE_STUDENTS } from "@/lib/sample";
import { NO_API_KEY_MESSAGE, type ApiStatus, type EvaluateResponse, type JevState, type Rubric } from "@/lib/types";
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
  const [sample, setSample] = React.useState<string>(SAMPLE_STUDENTS[0]?.name ?? CUSTOM);
  const [studentName, setStudentName] = React.useState<string>(SAMPLE_STUDENTS[0]?.name ?? "Student");
  const [state, setState] = React.useState<JevState>(() => SAMPLE_STUDENTS[0]?.state ?? {});
  const [run, setRun] = React.useState<RunState>({ kind: "idle" });

  const problems = rubricProblems(rubric);
  const hasText = rubric.inputs.some((i) => state[i.key]?.trim());
  const missingKey = status !== null && !status.ready;
  const canRun = problems.length === 0 && hasText && run.kind !== "loading" && !missingKey;

  const pickSample = (name: string) => {
    setSample(name);
    const s = SAMPLE_STUDENTS.find((st) => st.name === name);
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
              <CardTitle>Student</CardTitle>
              <CardDescription>
                This becomes the Jev <code className="font-mono">state</code>. Send only what the questions need.
              </CardDescription>
            </div>
            <Select
              aria-label="Sample student"
              className="w-auto"
              value={sample}
              onChange={(e) => pickSample(e.target.value)}
            >
              {SAMPLE_STUDENTS.map((s) => (
                <option key={s.name} value={s.name}>
                  Sample · {s.name}
                </option>
              ))}
              <option value={CUSTOM}>Blank</option>
            </Select>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field label="Student name (not sent to Jev)">
              <Input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Name" />
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
                <p className="font-medium text-warning-foreground">No API key</p>
                <p className="mt-1 text-warning-foreground/90">{NO_API_KEY_MESSAGE}</p>
              </div>
            ) : null}

            {problems.length > 0 ? (
              <div role="alert" className="rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-xs">
                <p className="font-medium text-warning-foreground">The rubric has problems. </p>
                <button type="button" className="underline text-warning-foreground" onClick={onGoAuthor}>
                  Fix them in Author mode
                </button>
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <Button type="submit" size="lg" disabled={!canRun}>
                {run.kind === "loading" ? "Evaluating…" : `Evaluate ${rubric.fields.length} questions`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <div className="flex flex-col gap-5 lg:col-span-7">
        {run.kind === "idle" ? (
          <Card>
            <CardContent className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm font-medium">Ready to evaluate</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Jev returns a calibrated probability distribution per question. The cards on this side show
                every probability, the confidence, and how your thresholds interpret them.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {run.kind === "loading" ? (
          <Card>
            <CardContent className="flex min-h-40 items-center justify-center">
              <p className="animate-pulse text-sm text-muted-foreground">Asking Jev…</p>
            </CardContent>
          </Card>
        ) : null}

        {run.kind === "error" ? (
          <div role="alert" className="rounded-xl border border-danger/40 bg-danger-soft px-5 py-4 text-sm">
            <p className="font-medium text-danger">Evaluation failed</p>
            <p className="mt-1 text-danger/90">{run.message}</p>
          </div>
        ) : null}

        {run.kind === "done" ? (
          <>
            <ResultMeta response={run.response} />
            <ProfileSummary results={results} fields={rubric.fields} studentName={studentName || "Student"} />
            <div className="grid gap-4 md:grid-cols-2">
              {rubric.fields.map((field) => (
                <AnswerCard key={field.id} field={field} answer={run.response.answers[field.id]} />
              ))}
            </div>
            <details className="rounded-xl border bg-card shadow-xs">
              <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-muted-foreground select-none hover:text-foreground">
                Request sent to <code className="font-mono">/api/evaluate</code>
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
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Badge tone="success">Jev</Badge>
      <span>
        model <code className="font-mono text-foreground">{response.model}</code>
      </span>
      <span>·</span>
      <span>{response.latencyMs} ms</span>
      {response.usage ? (
        <>
          <span>·</span>
          <span>
            {response.usage.input_tokens ?? 0} in / {response.usage.output_tokens ?? 0} out tokens
          </span>
        </>
      ) : null}
    </div>
  );
}
