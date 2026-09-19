import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { rubricProblems, toJevQuestion } from "@/lib/jev";
import type { Rubric, RubricField } from "@/lib/types";
import { ConditionsEditor } from "./conditions-editor";
import { InputsEditor } from "./inputs-editor";
import { QuestionEditor } from "./question-editor";

type Props = {
  rubric: Rubric;
  onChange: (rubric: Rubric) => void;
  onReset: () => void;
};

export function AuthorMode({ rubric, onChange, onReset }: Props) {
  const problems = rubricProblems(rubric);

  const setFields = (fields: RubricField[]) => onChange({ ...rubric, fields });

  const addField = () => {
    const n = rubric.fields.length + 1;
    setFields([
      ...rubric.fields,
      {
        id: `question_${n}`,
        type: "noul",
        label: `Question ${n}`,
        instructions: "",
        criteriaTrue: "",
        criteriaFalse: "",
        yesAt: 0.6,
      },
    ]);
  };

  const move = (i: number, delta: -1 | 1) => {
    const j = i + delta;
    if (j < 0 || j >= rubric.fields.length) return;
    const next = [...rubric.fields];
    [next[i], next[j]] = [next[j], next[i]];
    setFields(next);
  };

  const preview = Object.fromEntries(rubric.fields.map((f) => [f.id, toJevQuestion(f)]));

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Rubric</CardTitle>
            <CardDescription>Saved to this browser automatically. Reset restores the bundled sample.</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={onReset}>
            Reset to sample
          </Button>
        </CardHeader>
        <CardContent>
          <Field label="Rubric name" className="max-w-md">
            <Input value={rubric.name} onChange={(e) => onChange({ ...rubric, name: e.target.value })} />
          </Field>
        </CardContent>
      </Card>

      {problems.length > 0 ? (
        <div role="alert" className="rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 text-sm">
          <p className="font-medium text-warning-foreground">Fix before running:</p>
          <ul className="mt-1 list-disc pl-5 text-warning-foreground/90">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <InputsEditor inputs={rubric.inputs} onChange={(inputs) => onChange({ ...rubric, inputs })} />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Questions ({rubric.fields.length})</CardTitle>
            <CardDescription>
              Every question is sent in a single Jev <code className="font-mono">systemone</code> call. Jev
              answers; your thresholds decide.
            </CardDescription>
          </div>
          <Button size="sm" onClick={addField}>
            + Question
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {rubric.fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No questions yet.</p>
          ) : null}
          {rubric.fields.map((field, i) => (
            <QuestionEditor
              key={i}
              field={field}
              index={i}
              total={rubric.fields.length}
              onChange={(next) => setFields(rubric.fields.map((f, idx) => (idx === i ? next : f)))}
              onRemove={() => setFields(rubric.fields.filter((_, idx) => idx !== i))}
              onMove={(delta) => move(i, delta)}
            />
          ))}
        </CardContent>
      </Card>

      <ConditionsEditor
        conditions={rubric.conditions}
        fields={rubric.fields}
        onChange={(conditions) => onChange({ ...rubric, conditions })}
      />

      <details className="group rounded-xl border bg-card shadow-xs">
        <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-muted-foreground select-none hover:text-foreground">
          Jev <code className="font-mono">questions</code> payload preview
        </summary>
        <pre className="overflow-x-auto border-t bg-muted/50 px-5 py-4 font-mono text-xs leading-relaxed">
          {JSON.stringify(preview, null, 2)}
        </pre>
      </details>
    </div>
  );
}
