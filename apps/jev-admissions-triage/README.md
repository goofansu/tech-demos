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

## Language

**English** and **Simplified Chinese**. Use the header language toggle. The
preset questions, the 100 fabricated applicants, and the school config all
swap with the locale, so the state and questions sent to Jev are in the
selected language. Switching clears any batch results — stored answers came
from the other locale's questions. The choice is remembered in
`localStorage`.

Identifiers stay English in both locales: judgment ids, Choice option keys,
applicant ids and tags, and the `APPLICANT_STATE_KEYS` of the state object.
They are the keys Jev answers against. The 503 body for a missing API key is
also English — it comes from the server, which has no locale.

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
- Both locales ship the same judgment ids, thresholds, verdict maps, and
  applicant ids/tags. `src/lib/i18n.test.ts` is what holds the two mirrors
  together — if you add a judgment or a fixture, add it on both sides.

## Server

Same contract as `apps/jev-student-profile/`:

- `GET /api/status` → `{ ready, model }`
- `POST /api/evaluate` `{ state, questions }` → `{ model, answers, usage, latencyMs }`

`model: "jev-latest"`. Upstream 401 / 422 / 429 / 529 map to readable errors.
