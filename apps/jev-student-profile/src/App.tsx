import * as React from "react";
import { AuthorMode } from "@/components/author/author-mode";
import { BatchMode } from "@/components/batch/batch-mode";
import { RunMode } from "@/components/run/run-mode";
import { Badge } from "@/components/ui/badge";
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
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
          <h1 className="text-sm font-semibold tracking-tight text-pretty">{t("app.title")}</h1>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <nav aria-label={t("app.mode")} className="flex rounded-lg bg-muted p-1">
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors sm:px-3",
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
                    "shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors sm:px-3",
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
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-5 sm:py-6">
        {mode === "author" ? (
          <AuthorMode
            rubric={rubric}
            onChange={setRubric}
            onReset={() => setRubric(resetRubric(locale))}
          />
        ) : mode === "batch" ? (
          <BatchMode rubric={rubric} status={status} onGoAuthor={() => setMode("author")} />
        ) : (
          <RunMode rubric={rubric} status={status} onGoAuthor={() => setMode("author")} />
        )}
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-8 text-xs break-words text-muted-foreground sm:px-5">
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
