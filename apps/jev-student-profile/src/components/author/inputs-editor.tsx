import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckboxLabel } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RichText, useI18n } from "@/lib/i18n-context";
import { slugify } from "@/lib/store";
import type { RubricInput } from "@/lib/types";

type Props = {
  inputs: RubricInput[];
  onChange: (inputs: RubricInput[]) => void;
};

export function InputsEditor({ inputs, onChange }: Props) {
  const { t } = useI18n();
  const update = (i: number, patch: Partial<RubricInput>) =>
    onChange(inputs.map((inp, idx) => (idx === i ? { ...inp, ...patch } : inp)));

  const add = () =>
    onChange([
      ...inputs,
      { key: `field_${inputs.length + 1}`, label: t("inputs.defaultLabel"), placeholder: "", multiline: true },
    ]);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t("inputs.title")}</CardTitle>
          <CardDescription>
            <RichText
              path="inputs.hint"
              tokens={{
                state: <code className="font-mono">state</code>,
                example: <code className="font-mono">`teacher_notes`</code>,
              }}
            />
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={add}>
          {t("inputs.add")}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {inputs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("inputs.empty")}</p>
        ) : null}
        {inputs.map((inp, i) => (
          <div key={i} className="grid gap-3 rounded-lg border bg-muted/40 p-3 sm:grid-cols-12">
            <Field label={t("inputs.label")} className="sm:col-span-3">
              <Input
                value={inp.label}
                onChange={(e) =>
                  update(i, {
                    label: e.target.value,
                    key: inp.key === slugify(inp.label) ? slugify(e.target.value) : inp.key,
                  })
                }
              />
            </Field>
            <Field label={t("inputs.key")} className="sm:col-span-3">
              <Input
                mono
                value={inp.key}
                onChange={(e) => update(i, { key: slugify(e.target.value) || e.target.value })}
              />
            </Field>
            <Field label={t("inputs.placeholder")} className="sm:col-span-4">
              <Input value={inp.placeholder} onChange={(e) => update(i, { placeholder: e.target.value })} />
            </Field>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="invisible text-xs font-medium" aria-hidden>
                {t("inputs.multiline")}
              </span>
              <div className="flex h-9 items-center justify-end gap-2">
                <CheckboxLabel
                  checked={inp.multiline}
                  onChange={(e) => update(i, { multiline: e.target.checked })}
                >
                  {t("inputs.multiline")}
                </CheckboxLabel>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t("inputs.remove")}
                  onClick={() => onChange(inputs.filter((_, idx) => idx !== i))}
                >
                  ×
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
