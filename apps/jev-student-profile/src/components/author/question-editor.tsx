import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n-context";
import type { Translate } from "@/lib/i18n";
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

function typeHelp(type: JevQuestionType, t: Translate): string {
  switch (type) {
    case "noul":
      return t("questions.helpNoul");
    case "choice":
      return t("questions.helpChoice");
    case "score":
      return t("questions.helpScore");
  }
}

export function QuestionEditor({ field, index, total, onChange, onRemove, onMove }: Props) {
  const { t } = useI18n();
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
          { key: "other", description: t("questions.defaultOther") },
        ],
        minConfidence: 0.3,
      });
    } else {
      onChange({
        ...base,
        type,
        levels: [t("questions.defaultLow"), t("questions.defaultMedium"), t("questions.defaultHigh")],
        meetsAt: 1,
      });
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
          <Button
            size="icon"
            variant="ghost"
            aria-label={t("questions.moveUp")}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            ↑
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={t("questions.moveDown")}
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            ↓
          </Button>
          <Button size="sm" variant="danger" onClick={onRemove}>
            {t("questions.remove")}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-12">
        <Field label={t("questions.label")} className="sm:col-span-5">
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
        <Field label={t("questions.id")} className="sm:col-span-4" hint={t("questions.idHint")}>
          <Input
            mono
            value={field.id}
            onChange={(e) => setCommon({ id: slugify(e.target.value) || e.target.value })}
          />
        </Field>
        <Field label={t("questions.type")} className="sm:col-span-3">
          <Select value={field.type} onChange={(e) => changeType(e.target.value as JevQuestionType)}>
            <option value="noul">{t("questions.typeNoul")}</option>
            <option value="choice">{t("questions.typeChoice")}</option>
            <option value="score">{t("questions.typeScore")}</option>
          </Select>
        </Field>
      </div>

      <Field label={t("questions.instructions")} hint={typeHelp(field.type, t)}>
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
  const { t } = useI18n();
  return (
    <div className="grid gap-3 sm:grid-cols-12">
      <Field label={t("noul.criteriaTrue")} className="sm:col-span-5">
        <Textarea
          className="min-h-14"
          value={field.criteriaTrue}
          onChange={(e) => onChange({ ...field, criteriaTrue: e.target.value })}
        />
      </Field>
      <Field label={t("noul.criteriaFalse")} className="sm:col-span-5">
        <Textarea
          className="min-h-14"
          value={field.criteriaFalse}
          onChange={(e) => onChange({ ...field, criteriaFalse: e.target.value })}
        />
      </Field>
      <ThresholdField
        className="sm:col-span-2"
        label={t("noul.yesAt")}
        value={field.yesAt}
        min={0}
        max={1}
        step={0.05}
        hint={t("noul.probability")}
        onChange={(yesAt) => onChange({ ...field, yesAt })}
      />
    </div>
  );
}

function ChoiceEditor({ field, onChange }: { field: ChoiceField; onChange: (f: ChoiceField) => void }) {
  const { t } = useI18n();
  const setOption = (i: number, patch: Partial<ChoiceField["options"][number]>) =>
    onChange({
      ...field,
      options: field.options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)),
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {t("choice.options", { count: field.options.length })}
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
          {t("choice.add")}
        </Button>
      </div>
      {field.options.map((opt, i) => (
        <div key={i} className="grid items-center gap-2 sm:grid-cols-12">
          <Input
            mono
            className="sm:col-span-3"
            aria-label={t("choice.key")}
            value={opt.key}
            onChange={(e) => setOption(i, { key: slugify(e.target.value) || e.target.value })}
          />
          <Input
            className="sm:col-span-8"
            aria-label={t("choice.description")}
            placeholder={t("choice.descriptionPlaceholder")}
            value={opt.description}
            onChange={(e) => setOption(i, { description: e.target.value })}
          />
          <div className="flex h-9 items-center justify-center sm:col-span-1">
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("choice.remove")}
              disabled={field.options.length <= 2}
              onClick={() => onChange({ ...field, options: field.options.filter((_, idx) => idx !== i) })}
            >
              ×
            </Button>
          </div>
        </div>
      ))}
      <ThresholdField
        className="sm:max-w-48"
        label={t("choice.confidentWhen")}
        value={field.minConfidence}
        min={0}
        max={1}
        step={0.05}
        hint={t("choice.confidentHint")}
        onChange={(minConfidence) => onChange({ ...field, minConfidence })}
      />
    </div>
  );
}

function ScoreEditor({ field, onChange }: { field: ScoreField; onChange: (f: ScoreField) => void }) {
  const { t } = useI18n();
  const setLevel = (i: number, text: string) =>
    onChange({ ...field, levels: field.levels.map((l, idx) => (idx === i ? text : l)) });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {t("score.levels", { count: field.levels.length })}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={field.levels.length >= 10}
          onClick={() => onChange({ ...field, levels: [...field.levels, ""] })}
        >
          {t("score.add")}
        </Button>
      </div>
      {field.levels.map((level, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-6 shrink-0 text-right font-mono text-xs text-muted-foreground">{i}</span>
          <Input
            aria-label={t("score.level", { n: i })}
            value={level}
            placeholder={t("score.placeholder")}
            onChange={(e) => setLevel(i, e.target.value)}
          />
          <div className="flex h-9 items-center justify-center">
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("score.remove")}
              disabled={field.levels.length <= 2}
              onClick={() => onChange({ ...field, levels: field.levels.filter((_, idx) => idx !== i) })}
            >
              ×
            </Button>
          </div>
        </div>
      ))}
      <ThresholdField
        className="sm:max-w-48"
        label={t("score.meetsWhen")}
        value={field.meetsAt}
        min={0}
        max={Math.max(0, field.levels.length - 1)}
        step={0.1}
        hint={t("score.meetsHint", { max: Math.max(0, field.levels.length - 1) })}
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
