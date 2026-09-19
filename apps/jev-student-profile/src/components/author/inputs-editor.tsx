import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { slugify } from "@/lib/store";
import type { RubricInput } from "@/lib/types";

type Props = {
  inputs: RubricInput[];
  onChange: (inputs: RubricInput[]) => void;
};

export function InputsEditor({ inputs, onChange }: Props) {
  const update = (i: number, patch: Partial<RubricInput>) =>
    onChange(inputs.map((inp, idx) => (idx === i ? { ...inp, ...patch } : inp)));

  const add = () =>
    onChange([
      ...inputs,
      { key: `field_${inputs.length + 1}`, label: "New input", placeholder: "", multiline: true },
    ]);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Student inputs</CardTitle>
          <CardDescription>
            Keys of the <code className="font-mono">state</code> object sent to Jev. Reference them in
            instructions with backticks, e.g. <code className="font-mono">`teacher_notes`</code>.
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={add}>
          + Input
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {inputs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No inputs yet. Add one to describe the student.</p>
        ) : null}
        {inputs.map((inp, i) => (
          <div key={i} className="grid gap-3 rounded-lg border bg-muted/40 p-3 sm:grid-cols-12">
            <Field label="Label" className="sm:col-span-3">
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
            <Field label="Key" className="sm:col-span-3">
              <Input
                mono
                value={inp.key}
                onChange={(e) => update(i, { key: slugify(e.target.value) || e.target.value })}
              />
            </Field>
            <Field label="Placeholder" className="sm:col-span-4">
              <Input value={inp.placeholder} onChange={(e) => update(i, { placeholder: e.target.value })} />
            </Field>
            <div className="flex items-end gap-2 sm:col-span-2">
              <label className="flex h-9 items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={inp.multiline}
                  onChange={(e) => update(i, { multiline: e.target.checked })}
                />
                Multi-line
              </label>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Remove input"
                onClick={() => onChange(inputs.filter((_, idx) => idx !== i))}
              >
                ×
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
