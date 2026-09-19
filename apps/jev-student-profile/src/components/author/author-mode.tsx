import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RichText, useI18n } from "@/lib/i18n-context";
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
  const { t } = useI18n();
  const problems = rubricProblems(rubric, t);

  const setFields = (fields: RubricField[]) => onChange({ ...rubric, fields });

  const addField = () => {
    const n = rubric.fields.length + 1;
    setFields([
      ...rubric.fields,
      {
        id: `question_${n}`,
        type: "noul",
        label: t("author.defaultQuestion", { n }),
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
            <CardTitle>{t("author.rubric")}</CardTitle>
            <CardDescription>{t("author.rubricHint")}</CardDescription>
          </div>
          <CardAction>
            <Button size="sm" variant="outline" onClick={onReset}>
              {t("author.reset")}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <Field label={t("author.rubricName")} className="max-w-md">
            <Input value={rubric.name} onChange={(e) => onChange({ ...rubric, name: e.target.value })} />
          </Field>
        </CardContent>
      </Card>

      {problems.length > 0 ? (
        <div role="alert" className="rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 text-sm">
          <p className="font-medium text-warning-foreground">{t("author.fixBefore")}</p>
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
            <CardTitle>{t("author.questionsTitle", { count: rubric.fields.length })}</CardTitle>
            <CardDescription>
              <RichText
                path="author.questionsHint"
                tokens={{ systemone: <code className="font-mono">systemone</code> }}
              />
            </CardDescription>
          </div>
          <CardAction>
            <Button size="sm" onClick={addField}>
              {t("author.addQuestion")}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {rubric.fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("author.noQuestions")}</p>
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
          <RichText
            path="author.payloadPreview"
            tokens={{ questions: <code className="font-mono">questions</code> }}
          />
        </summary>
        <pre className="overflow-x-auto border-t bg-muted/50 px-5 py-4 font-mono text-xs leading-relaxed">
          {JSON.stringify(preview, null, 2)}
        </pre>
      </details>
    </div>
  );
}
