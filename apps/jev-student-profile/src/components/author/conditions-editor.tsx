import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n-context";
import { opLabel, opsFor } from "@/lib/conditions";
import { uid } from "@/lib/store";
import type { Clause, ClauseOp, Condition, ConditionTone, RubricField } from "@/lib/types";

type Props = {
  conditions: Condition[];
  fields: RubricField[];
  onChange: (conditions: Condition[]) => void;
};

export const TONE_BADGE: Record<ConditionTone, "success" | "info" | "warning"> = {
  positive: "success",
  neutral: "info",
  attention: "warning",
};

export function ConditionsEditor({ conditions, fields, onChange }: Props) {
  const { t } = useI18n();
  const update = (i: number, patch: Partial<Condition>) =>
    onChange(conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const add = () => {
    const first = fields[0];
    onChange([
      ...conditions,
      {
        id: uid("cond"),
        label: t("conditions.defaultLabel"),
        tone: "neutral",
        clauses: first ? [defaultClause(first)] : [],
      },
    ]);
  };

  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>{t("conditions.title")}</CardTitle>
          <CardDescription>{t("conditions.hint")}</CardDescription>
        </div>
        <CardAction>
          <Button size="sm" variant="outline" onClick={add} disabled={fields.length === 0}>
            {t("conditions.add")}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {conditions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("conditions.empty")}</p>
        ) : null}
        {conditions.map((cond, i) => (
          <div key={cond.id} className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-3">
            <div className="grid gap-3 sm:grid-cols-12">
              <Field label={t("conditions.outcomeLabel")} className="sm:col-span-7">
                <Input value={cond.label} onChange={(e) => update(i, { label: e.target.value })} />
              </Field>
              <Field label={t("conditions.tone")} className="sm:col-span-3">
                <Select
                  value={cond.tone}
                  onChange={(e) => update(i, { tone: e.target.value as ConditionTone })}
                >
                  <option value="positive">{t("conditions.tonePositive")}</option>
                  <option value="neutral">{t("conditions.toneNeutral")}</option>
                  <option value="attention">{t("conditions.toneAttention")}</option>
                </Select>
              </Field>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="invisible text-xs font-medium" aria-hidden>
                  {t("conditions.remove")}
                </span>
                <div className="flex h-9 items-center justify-end">
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => onChange(conditions.filter((_, idx) => idx !== i))}
                  >
                    {t("conditions.remove")}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {cond.clauses.map((clause, ci) => (
                <ClauseRow
                  key={ci}
                  clause={clause}
                  fields={fields}
                  prefix={ci === 0 ? t("conditions.when") : t("conditions.and")}
                  onChange={(next) =>
                    update(i, { clauses: cond.clauses.map((c, idx) => (idx === ci ? next : c)) })
                  }
                  onRemove={() => update(i, { clauses: cond.clauses.filter((_, idx) => idx !== ci) })}
                />
              ))}
              <div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={fields.length === 0}
                  onClick={() => update(i, { clauses: [...cond.clauses, defaultClause(fields[0])] })}
                >
                  {t("conditions.andClause")}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{t("conditions.firesAs")}</span>
              <Badge tone={TONE_BADGE[cond.tone]}>{cond.label || t("conditions.untitled")}</Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function defaultClause(field: RubricField): Clause {
  switch (field.type) {
    case "noul":
      return { fieldId: field.id, op: ">=", value: String(field.yesAt) };
    case "score":
      return { fieldId: field.id, op: ">=", value: String(field.meetsAt) };
    case "choice":
      return { fieldId: field.id, op: "is", value: field.options[0]?.key ?? "" };
  }
}

type ClauseRowProps = {
  clause: Clause;
  fields: RubricField[];
  prefix: string;
  onChange: (clause: Clause) => void;
  onRemove: () => void;
};

function ClauseRow({ clause, fields, prefix, onChange, onRemove }: ClauseRowProps) {
  const { t } = useI18n();
  const field = fields.find((f) => f.id === clause.fieldId);
  const ops = field ? opsFor(field.type) : ([">=", "<"] as ClauseOp[]);

  return (
    <div className="grid items-center gap-2 sm:grid-cols-12">
      <span className="font-mono text-xs font-semibold text-muted-foreground sm:col-span-1">{prefix}</span>
      <Select
        className="sm:col-span-5"
        aria-label={t("conditions.question")}
        value={clause.fieldId}
        onChange={(e) => {
          const next = fields.find((f) => f.id === e.target.value);
          onChange(next ? defaultClause(next) : { ...clause, fieldId: e.target.value });
        }}
      >
        {!field ? <option value={clause.fieldId}>{t("conditions.missing", { id: clause.fieldId })}</option> : null}
        {fields.map((f) => (
          <option key={f.id} value={f.id}>
            {t("conditions.fieldType", { label: f.label || f.id, type: f.type })}
          </option>
        ))}
      </Select>
      <Select
        className="sm:col-span-2"
        aria-label={t("conditions.operator")}
        value={clause.op}
        onChange={(e) => onChange({ ...clause, op: e.target.value as ClauseOp })}
      >
        {ops.map((op) => (
          <option key={op} value={op}>
            {opLabel(op, t)}
          </option>
        ))}
      </Select>
      {field?.type === "choice" ? (
        <Select
          className="sm:col-span-3"
          aria-label={t("conditions.option")}
          value={clause.value}
          onChange={(e) => onChange({ ...clause, value: e.target.value })}
        >
          {field.options.map((o) => (
            <option key={o.key} value={o.key}>
              {o.key}
            </option>
          ))}
        </Select>
      ) : (
        <Input
          className="sm:col-span-3"
          aria-label={t("conditions.value")}
          type="number"
          inputMode="decimal"
          step={field?.type === "noul" ? 0.05 : 0.1}
          min={0}
          max={field?.type === "score" ? Math.max(0, field.levels.length - 1) : 1}
          value={clause.value}
          onChange={(e) => onChange({ ...clause, value: e.target.value })}
        />
      )}
      <div className="flex h-9 items-center justify-center sm:col-span-1">
        <Button size="icon" variant="ghost" aria-label={t("conditions.removeClause")} onClick={onRemove}>
          ×
        </Button>
      </div>
    </div>
  );
}
