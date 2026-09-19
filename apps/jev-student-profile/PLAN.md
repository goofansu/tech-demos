# PLAN — Student Profile Rubric Builder (TypeSafe Jev)

Self-contained demo under `apps/jev-student-profile/`. Follows the repo's
`AGENTS.md`: Bun + Vite + React, port 8000 (or `PORT`), `host: true`,
`allowedHosts: true`, no root tooling.

## What it is

A teacher/counselor builds a **student profile rubric** — a set of typed
questions plus thresholds and conditions — then runs it against a student's
text (teacher notes, self-reflection, work sample). The rubric is evaluated
by **TypeSafe Jev** (System One) in **one `systemone` call** that carries all
questions. The UI shows every calibrated answer (probabilities, confidence,
noul) and the profile outcomes that the author's conditions derive from them.

Jev is the only model used. Jev answers narrow judgments; all control flow
(thresholds, conditions, tags) lives in code, per TypeSafe's guidance.

## Modes

### Author mode

Edits the rubric and persists it to `localStorage` (`jev-student-profile.rubric.v1`).
"Reset to sample" restores the bundled sample rubric.

- **Inputs** — the keys of the `state` object sent to Jev
  (e.g. `teacher_notes`, `student_reflection`, `work_sample`). Label,
  placeholder, single- vs multi-line.
- **Questions** — one card per question. Common: id (slug, used as the
  question key), label, `instructions`. Per type:
  - `noul` — optional `criteria.true` / `criteria.false`; threshold
    `yesAt` (probability at or above which the statement counts as true).
  - `choice` — 2..255 options, each `key` + description; threshold
    `minConfidence` (below it the pick is shown as "uncertain").
  - `score` — 2..10 ordered level descriptions (low → high); threshold
    `meetsAt` (fractional score at or above which the level is "met").
- **Conditions** — profile outcomes. Each has a label, tone
  (`positive` / `neutral` / `attention`), and an AND-list of clauses
  `{ questionId, op, value }`:
  - noul: `>=` / `<` probability
  - score: `>=` / `<` fractional score
  - choice: `is` / `is_not` option key
  A condition fires when every clause holds; the summary panel lists fired
  conditions in tone groups.

### Run mode

- Form built from the rubric's inputs, prefilled from one of a few bundled
  sample students (selectable).
- **Evaluate** sends `{ state, questions }` to `POST /api/evaluate`. The
  server forwards one request to `https://api.typesafe.ai/v1/systemone`
  with `model: "jev-latest"`. Every authored input key is included in
  `state`, including empty strings. Omitting a blank `work_sample` used
  to leave notes/reflection as the only writing, so Jev scored those
  instead of the missing excerpt.
- Result cards per question:
  - noul → probability meter, verdict vs `yesAt`.
  - choice → picked option, confidence, bar per option, verdict vs
    `minConfidence`.
  - score → fractional score on the level scale, legend, bar per level,
    confidence, verdict vs `meetsAt`.
- Profile summary: fired conditions, grouped by tone.
- Footer: resolved model, token usage, latency.
- Collapsible "request payload" so the demo shows exactly what Jev received.
- Header language toggle: English and Simplified Chinese. Chrome, bundled
  sample rubric, and sample students follow the locale; a custom rubric does
  not. Choice is persisted in `localStorage`.
- Without `TYPESAFE_API_KEY`, Evaluate is disabled and the UI warns that
  there is no API key. There is no mock evaluator.

## Server: `POST /api/evaluate`

Implemented as a Vite plugin (`server/evaluate.ts`) registered in
`vite.config.ts` for both `configureServer` and `configurePreviewServer`, so
`bun run dev` is the only process. Reads `TYPESAFE_API_KEY` from
`process.env` on the server. Vite only exposes `VITE_*` variables to the
browser, so the key never reaches the client.

- Validates body: `state` is a non-empty object of strings; `questions` is a
  map of well-formed Jev questions (type, instructions, criteria arity).
- With a key: forwards to Jev; relays `answers`, `model`, `usage`. Maps
  upstream 401/422/429/529 into readable errors.
- Without a key: `GET /api/status` reports `{ ready: false }` and
  `POST /api/evaluate` returns 503 with a user-facing warning. No mock.

## Stack

- Bun, Vite 6, React 19, TypeScript, Tailwind v4 via `@tailwindcss/vite`.
- Theme tokens in `src/index.css` (`@theme`): `background`, `foreground`,
  `card`, `muted`, `muted-foreground`, `border`, `primary`,
  `primary-foreground`, `success`, `warning`, `danger`, plus radius.
- Small local UI kit in `src/components/ui/` (`Button`, `Input`, `Textarea`,
  `Select`, `Badge`, `Card`, `Field`) so forms are consistent and
  `@shadcn/lint` has components to enforce contracts on.
- Lint: Oxlint + `@shadcn/lint` (`.oxlintrc.json`), `bun run lint`. Rules:
  `no-restyle` (allow layout), `no-raw-colors`, `no-arbitrary-values`,
  `no-inline-styles`, `no-unknown-classes`, `require-static-classes`.
  Dynamic bar widths use CSS custom properties (`w-(--w)`), which the
  inline-style rule allows.

## Files

```
apps/jev-student-profile/
  PLAN.md  README.md  package.json  vite.config.ts  tsconfig.json
  .oxlintrc.json  .gitignore  .env.example  index.html
  server/evaluate.ts        # /api/evaluate + /api/status, Jev client
  src/main.tsx  src/App.tsx  src/index.css
  src/lib/types.ts          # Rubric, Question, Condition, Jev answer types
  src/lib/i18n.ts           # EN / zh-CN catalogs and translate()
  src/lib/i18n-context.tsx  # locale provider, language persistence
  src/lib/sample.ts         # sample rubric + sample students
  src/lib/sample.zh-CN.ts   # Simplified Chinese sample rubric + students
  src/lib/store.ts          # localStorage load/save/reset
  src/lib/jev.ts            # buildQuestions(rubric) → Jev questions map
  src/lib/conditions.ts     # threshold verdicts + condition evaluation
  src/components/ui/*       # Button, Input, Textarea, Select, Badge, Card, Field
  src/components/author/*   # InputsEditor, QuestionEditor, ConditionsEditor
  src/components/run/*      # StudentForm, AnswerCard, ProfileSummary
```

## Done criteria

- `cd apps/jev-student-profile && bun install && bun run dev` serves on 8000.
- `bun run lint` passes; `bun run build` passes.
- Root `README.md` bullet + `tracking/seen-bookmarks.json` → `built`.
- One PR with screenshot and video of the running app.
