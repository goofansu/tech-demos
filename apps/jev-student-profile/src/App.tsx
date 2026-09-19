import * as React from "react";
import { AuthorMode } from "@/components/author/author-mode";
import { RunMode } from "@/components/run/run-mode";
import { Badge } from "@/components/ui/badge";
import { fetchStatus } from "@/lib/jev";
import { loadRubric, resetRubric, saveRubric } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ApiStatus, Rubric } from "@/lib/types";

type Mode = "author" | "run";

export default function App() {
  const [mode, setMode] = React.useState<Mode>("run");
  const [rubric, setRubric] = React.useState<Rubric>(() => loadRubric());
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

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-5 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary font-mono text-sm font-bold text-primary-foreground">
              J
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-tight">
                Student Profile Rubric Builder
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                {rubric.name} · {rubric.fields.length} questions · TypeSafe Jev only
              </p>
            </div>
          </div>

          <nav aria-label="Mode" className="flex rounded-lg bg-muted p-1">
            {(["run", "author"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                  mode === m
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "run" ? "Run" : "Author"}
              </button>
            ))}
          </nav>

          <StatusBadge status={status} />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-6">
        {mode === "author" ? (
          <AuthorMode rubric={rubric} onChange={setRubric} onReset={() => setRubric(resetRubric())} />
        ) : (
          <RunMode rubric={rubric} onGoAuthor={() => setMode("author")} />
        )}
      </main>

      <footer className="mx-auto max-w-7xl px-5 pb-8 text-xs text-muted-foreground">
        Jev is asked every question in one <code className="font-mono">systemone</code> request; thresholds
        and conditions are evaluated in code. The API key stays on the server behind{" "}
        <code className="font-mono">POST /api/evaluate</code>.
      </footer>
    </div>
  );
}

function StatusBadge({ status }: { status: ApiStatus | null }) {
  if (!status) return <Badge tone="outline">API status unknown</Badge>;
  if (status.mode === "live") return <Badge tone="success">Live · {status.model}</Badge>;
  return (
    <Badge tone="warning" title="Set TYPESAFE_API_KEY on the server to call Jev for real.">
      Mock mode · no API key
    </Badge>
  );
}
