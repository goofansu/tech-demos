import * as React from "react";
import { ApplicantMode } from "@/components/applicant/applicant-mode";
import { PresetMode } from "@/components/preset/preset-mode";
import { QueueMode } from "@/components/queue/queue-mode";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_CONFIDENCE_FLOOR } from "@/lib/admissions-preset";
import { APPLICANTS } from "@/lib/applicants";
import { cloneApplicant } from "@/lib/fields";
import { fetchStatus } from "@/lib/jev";
import { SCHOOL } from "@/lib/school";
import { cn } from "@/lib/utils";
import type { ApiStatus, Applicant, ApplicantResult } from "@/lib/types";

type Mode = "queue" | "applicant" | "preset";

const MODES: { id: Mode; label: string }[] = [
  { id: "queue", label: "Queue" },
  { id: "applicant", label: "Applicant" },
  { id: "preset", label: "Preset" },
];

export default function App() {
  const [mode, setMode] = React.useState<Mode>("queue");
  const [confidenceFloor, setConfidenceFloor] = React.useState(DEFAULT_CONFIDENCE_FLOOR);
  const [applicants, setApplicants] = React.useState<Applicant[]>(() => APPLICANTS.map(cloneApplicant));
  const [selectedId, setSelectedId] = React.useState(APPLICANTS[0]?.id ?? "A-0001");
  const [results, setResults] = React.useState<Record<string, ApplicantResult>>({});
  const [status, setStatus] = React.useState<ApiStatus | null>(null);

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

  const openApplicant = (id: string) => {
    setSelectedId(id);
    setMode("applicant");
  };

  const patchApplicant = (id: string, patch: Partial<Applicant>) => {
    setApplicants((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3">
          <h1 className="min-w-0 truncate text-sm font-semibold tracking-tight">Admissions Triage · Jev</h1>
          <div className="flex flex-wrap items-center gap-2">
            <nav aria-label="Mode" className="flex rounded-lg bg-muted p-1">
              {MODES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={mode === item.id}
                  onClick={() => setMode(item.id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    mode === item.id
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <StatusBadge status={status} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-6">
        {mode === "queue" ? (
          <QueueMode
            applicants={applicants}
            school={SCHOOL}
            results={results}
            setResults={setResults}
            confidenceFloor={confidenceFloor}
            onFloorChange={setConfidenceFloor}
            status={status}
            onOpenApplicant={openApplicant}
          />
        ) : null}
        {mode === "applicant" ? (
          <ApplicantMode
            applicants={applicants}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={patchApplicant}
            school={SCHOOL}
            results={results}
            setResults={setResults}
            confidenceFloor={confidenceFloor}
            status={status}
          />
        ) : null}
        {mode === "preset" ? (
          <PresetMode confidenceFloor={confidenceFloor} onFloorChange={setConfidenceFloor} />
        ) : null}
      </main>

      <footer className="mx-auto max-w-7xl px-5 pb-8 text-xs text-muted-foreground">
        Fabricated applicants only. Each evaluate is one <code className="font-mono">systemone</code> call (
        <code className="font-mono">POST /api/evaluate</code>) with Jev as the only model. The API key stays on the
        server.
      </footer>
    </div>
  );
}

function StatusBadge({ status }: { status: ApiStatus | null }) {
  if (!status || status.ready) return null;
  return <Badge tone="warning">No API key</Badge>;
}
