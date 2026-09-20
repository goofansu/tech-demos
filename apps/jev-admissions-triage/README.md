# Admissions Triage · Jev

Triage 100 fabricated applications with TypeSafe Jev. One `systemone` call per
applicant returns eight calibrated judgments; code turns those into four-state
field verdicts and a sorted attention queue. Jev is the only model used.

## Run

```bash
cd apps/jev-admissions-triage
bun install
TYPESAFE_API_KEY=... bun run dev
```

Open `http://localhost:8000/` (or `PORT` if set). Without a key the header
warns **No API key** and evaluation is disabled. The key is read only in
`server/evaluate.ts` and never reaches the browser.

Other scripts: `bun run test`, `bun run lint`, `bun run build`.

## Modes

- **Queue** — headline view. Evaluate all 100 files with bounded concurrency
  (6). Rows sort by attention score descending, then confidence ascending,
  then id. Click a name to open the applicant without losing batch results.
- **Applicant** — edit a fabricated record and evaluate one file. Six field
  rows show Met / Not Met / Needs Review / Missing plus the semantic answer
  and distribution. Attention and attention reason stay queue metadata.
- **Preset** — read-only admissions questions. The confidence floor (0.5 /
  0.6 / 0.7) is the operational dial; changing it re-derives verdicts from
  stored answers.

## Rules the UI must keep

- Empty fields are Missing in code and omitted from that applicant's
  question map. Attention still sees them as `(not provided)`.
- `never_not_met` judgments cannot emit Not Met.
- An applied grade the school has not configured is Needs Review, never
  Not Met.
- Scores are not rounded. Verdicts use level bands on the weighted score.
- Low confidence means a spread distribution, not that the model is
  probably wrong. Below the floor, the verdict becomes Needs Review.
- Attention must weigh the file, not tally missing fields.

## Server

Same contract as `apps/jev-student-profile/`:

- `GET /api/status` → `{ ready, model }`
- `POST /api/evaluate` `{ state, questions }` → `{ model, answers, usage, latencyMs }`

`model: "jev-latest"`. Upstream 401 / 422 / 429 / 529 map to readable errors.
