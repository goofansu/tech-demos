import * as React from "react";
import { AuthorMode } from "@/components/author/author-mode";
import { BatchMode } from "@/components/batch/batch-mode";
import { RunMode } from "@/components/run/run-mode";
import { Badge } from "@/components/ui/badge";
import { BATCH_CONCURRENCY, BATCH_SIZE } from "@/lib/batch";
import { RichText, useI18n } from "@/lib/i18n-context";
import { LOCALES, LOCALE_LABELS, type Locale, type MessagePath } from "@/lib/i18n";
import { fetchStatus } from "@/lib/jev";
import { isBundledSample, rubricsEqual, sampleRubric } from "@/lib/sample";
import { clone, loadRubric, resetRubric, saveRubric } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ApiStatus, Rubric } from "@/lib/types";

type Mode = "author" | "run" | "batch";

const MODES: Mode[] = ["run", "batch", "author"];

const MODE_PATH: Record<Mode, MessagePath> = {
  run: "app.run",
  batch: "app.batch",
  author: "app.author",
};

export default function App() {
  const { locale, setLocale, t } = useI18n();
  const [mode, setMode] = React.useState<Mode>("run");
  const [rubric, setRubric] = React.useState<Rubric>(() => {
    const loaded = loadRubric(locale);
    if (isBundledSample(loaded) && !rubricsEqual(loaded, sampleRubric(locale))) {
      return clone(sampleRubric(locale));
    }
    return loaded;
  });
  const [status, setStatus] = React.useState<ApiStatus | null>(null);

  React.useEffect(() => {
    saveRubric(rubric);
  }, [rubric]);

  React.useEffect(() => {
    let cancelled = false;
    fetchStatus()
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const changeLocale = (next: Locale) => {
    if (next === locale) return;
    setRubric((current) => {
      if (isBundledSample(current) && !rubricsEqual(current, sampleRubric(next))) {
        return clone(sampleRubric(next));
      }
      return current;
    });
    setLocale(next);
  };

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-5 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary font-mono text-sm font-bold text-primary-foreground">
              J
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-tight">{t("app.title")}</h1>
              <p className="truncate text-xs text-muted-foreground">
                {mode === "batch"
                  ? t("app.batchSubtitle", { count: BATCH_SIZE, limit: BATCH_CONCURRENCY })
                  : t("app.subtitle", { name: rubric.name, count: rubric.fields.length })}
              </p>
            </div>
          </div>

          <nav aria-label={t("app.mode")} className="flex rounded-lg bg-muted p-1">
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  mode === m
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(MODE_PATH[m])}
              </button>
            ))}
          </nav>

          <nav aria-label={t("app.language")} className="flex rounded-lg bg-muted p-1">
            {LOCALES.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={locale === id}
                onClick={() => changeLocale(id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  locale === id
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {id === "en" ? "EN" : LOCALE_LABELS[id]}
              </button>
            ))}
          </nav>

          <StatusBadge status={status} />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-6">
        {mode === "author" ? (
          <AuthorMode
            rubric={rubric}
            onChange={setRubric}
            onReset={() => setRubric(resetRubric(locale))}
          />
        ) : mode === "batch" ? (
          <BatchMode status={status} />
        ) : (
          <RunMode rubric={rubric} status={status} onGoAuthor={() => setMode("author")} />
        )}
      </main>

      <footer className="mx-auto max-w-7xl px-5 pb-8 text-xs text-muted-foreground">
        <RichText
          path={mode === "batch" ? "app.batchFooter" : "app.footer"}
          tokens={{
            systemone: <code className="font-mono">systemone</code>,
            evaluate: <code className="font-mono">POST /api/evaluate</code>,
          }}
        />
      </footer>
    </div>
  );
}

function StatusBadge({ status }: { status: ApiStatus | null }) {
  const { t } = useI18n();
  if (!status || status.ready) return null;
  return <Badge tone="warning">{t("status.noKey")}</Badge>;
}
