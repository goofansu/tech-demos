import { useI18n } from "@/lib/i18n-context";

type Props = { show: boolean };

export function KeyWarning({ show }: Props) {
  const { t } = useI18n();
  if (!show) return null;
  return (
    <div role="alert" className="rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-sm">
      <p className="font-medium text-warning-foreground">{t("keyWarning.title")}</p>
      <p className="mt-1 text-warning-foreground/90">{t("keyWarning.body")}</p>
    </div>
  );
}
