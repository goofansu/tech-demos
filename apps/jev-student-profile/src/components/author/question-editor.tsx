import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { slugify } from "@/lib/store";
import type { ChoiceField, JevQuestionType, NoulField, RubricField, ScoreField } from "@/lib/types";

type Props = {
  field: RubricField;
  index: number;
  total: number;
  onChange: (field: RubricField) => void;
  onRemove: () => void;
  onMove: (delta: -1 | 1) => void;
};

export const TYPE_HELP: Record<JevQuestionType, string> = {
  noul: "Yes/no. Jev returns the probability the statement is true (0–1).",
  choice: "Pick one of N unordered options. Returns the pick, a probability per option, and confidence.",
  score: "Position on an ordered scale. Returns a fractional score, probability per level, and confidence.",
};

export function QuestionEditor({ field, index, total, onChange, onRemove, onMove }: Props) {
  const setCommon = (patch: Partial<Pick<RubricField, "id" | "label" | "instructions">>) =>
    onChange({ ...field, ...patch } as RubricField);

  const changeType = (type: JevQuestionType) => {
    if (type === field.type) return;
    const base = { id: field.id, label: field.label, instructions: field.instructions };
    if (type === "noul") {
      onChange({ ...base, type, criteriaTrue: "", criteriaFalse: "", yesAt: 0.6 });
    } else if (type === "choice") {
      onChange({
        ...base,
        type,
        options: [
          { key: "option_a", description: "" },
          { key: "option_b", description: "" },
          { key: "other", description: "None of the above fit." },
        ],
        minConfidence: 0.3,
      });
    } else {
      onChange({ ...base, type, levels: ["Low", "Medium", "High"], meetsAt: 1 });
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-muted/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Q{index + 1}</span>
          <Badge tone={field.type}>{field.type}</Badge>
          <code className="font-mono text-xs text-muted-foreground">{field.id}</code>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" aria-label="Move up" disabled={index === 0} onClick={() => onMove(-1)}>
            ↑
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Move down"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            ↓
          </Button>
          <Button size="sm" variant="danger" onClick={onRemove}>
            Remove
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-12">
        <Field label="Label" className="sm:col-span-5">
          <Input
            value={field.label}
            onChange={(e) =>
              setCommon({
                label: e.target.value,
                id: field.id === slugify(field.label) ? slugify(e.target.value) : field.id,
              })
            }
          />
        </Field>
        <Field label="Question id" className="sm:col-span-4" hint="Used as the key in the Jev request.">
          <Input
            mono
            value={field.id}
            onChange={(e) => setCommon({ id: slugify(e.target.value) || e.target.value })}
          />
        </Field>
        <Field label="Type" className="sm:col-span-3">
          <Select value={field.type} onChange={(e) => changeType(e.target.value as JevQuestionType)}>
            <option value="noul">Noul (yes/no)</option>
            <option value="choice">Choice</option>
            <option value="score">Score</option>
          </Select>
        </Field>
      </div>

      <Field label="Instructions" hint={TYPE_HELP[field.type]}>
        <Textarea
          className="min-h-16"
          value={field.instructions}
          onChange={(e) => setCommon({ instructions: e.target.value })}
        />
      </Field>

      {field.type === "noul" ? <NoulEditor field={field} onChange={onChange} /> : null}
      {field.type === "choice" ? <ChoiceEditor field={field} onChange={onChange} /> : null}
      {field.type === "score" ? <ScoreEditor field={field} onChange={onChange} /> : null}
    </div>
  );
}

function NoulEditor({ field, onChange }: { field: NoulField; onChange: (f: NoulField) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-12">
      <Field label="Criteria · true (optional)" className="sm:col-span-5">
        <Textarea
          className="min-h-14"
          value={field.criteriaTrue}
          onChange={(e) => onChange({ ...field, criteriaTrue: e.target.value })}
        />
      </Field>
      <Field label="Criteria · false (optional)" className="sm:col-span-5">
        <Textarea
          className="min-h-14"
          value={field.criteriaFalse}
          onChange={(e) => onChange({ ...field, criteriaFalse: e.target.value })}
        />
      </Field>
      <ThresholdField
        className="sm:col-span-2"
        label="Yes at ≥"
        value={field.yesAt}
        min={0}
        max={1}
        step={0.05}
        hint="Probability"
        onChange={(yesAt) => onChange({ ...field, yesAt })}
      />
    </div>
  );
}

function ChoiceEditor({ field, onChange }: { field: ChoiceField; onChange: (f: ChoiceField) => void }) {
  const setOption = (i: number, patch: Partial<ChoiceField["options"][number]>) =>
    onChange({
      ...field,
      options: field.options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)),
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Options ({field.options.length}) — key + what belongs to it
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={field.options.length >= 255}
          onClick={() =>
            onChange({
              ...field,
              options: [...field.options, { key: `option_${field.options.length + 1}`, description: "" }],
            })
          }
        >
          + Option
        </Button>
      </div>
      {field.options.map((opt, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-12">
          <Input
            mono
            className="sm:col-span-3"
            aria-label="Option key"
            value={opt.key}
            onChange={(e) => setOption(i, { key: slugify(e.target.value) || e.target.value })}
          />
          <Input
            className="sm:col-span-8"
            aria-label="Option description"
            placeholder="Describe what belongs to this option (and what does not)."
            value={opt.description}
            onChange={(e) => setOption(i, { description: e.target.value })}
          />
          <Button
            size="icon"
            variant="ghost"
            aria-label="Remove option"
            className="sm:col-span-1"
            disabled={field.options.length <= 2}
            onClick={() => onChange({ ...field, options: field.options.filter((_, idx) => idx !== i) })}
          >
            ×
          </Button>
        </div>
      ))}
      <ThresholdField
        className="sm:max-w-48"
        label="Confident when confidence ≥"
        value={field.minConfidence}
        min={0}
        max={1}
        step={0.05}
        hint="Below this the pick is flagged as uncertain."
        onChange={(minConfidence) => onChange({ ...field, minConfidence })}
      />
    </div>
  );
}

function ScoreEditor({ field, onChange }: { field: ScoreField; onChange: (f: ScoreField) => void }) {
  const setLevel = (i: number, text: string) =>
    onChange({ ...field, levels: field.levels.map((l, idx) => (idx === i ? text : l)) });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Levels ({field.levels.length}/10), low → high. Describe situations, not degrees.
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={field.levels.length >= 10}
          onClick={() => onChange({ ...field, levels: [...field.levels, ""] })}
        >
          + Level
        </Button>
      </div>
      {field.levels.map((level, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-6 shrink-0 text-right font-mono text-xs text-muted-foreground">{i}</span>
          <Input
            aria-label={`Level ${i}`}
            value={level}
            placeholder="What does a student at this level look like?"
            onChange={(e) => setLevel(i, e.target.value)}
          />
          <Button
            size="icon"
            variant="ghost"
            aria-label="Remove level"
            disabled={field.levels.length <= 2}
            onClick={() => onChange({ ...field, levels: field.levels.filter((_, idx) => idx !== i) })}
          >
            ×
          </Button>
        </div>
      ))}
      <ThresholdField
        className="sm:max-w-48"
        label="Meets level when score ≥"
        value={field.meetsAt}
        min={0}
        max={Math.max(0, field.levels.length - 1)}
        step={0.1}
        hint={`Fractional score, 0–${Math.max(0, field.levels.length - 1)}.`}
        onChange={(meetsAt) => onChange({ ...field, meetsAt })}
      />
    </div>
  );
}

type ThresholdProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  hint?: string;
  className?: string;
  onChange: (value: number) => void;
};

function ThresholdField({ label, value, min, max, step, hint, className, onChange }: ThresholdProps) {
  return (
    <Field label={label} hint={hint} className={className}>
      <Input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
      />
    </Field>
  );
}
