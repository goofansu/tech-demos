# Student Profile Rubric Builder (TypeSafe Jev)

Build a customizable student-profile rubric out of TypeSafe Jev's three
primitives — **Choice**, **Score**, **Noul** — then evaluate a student's
notes/reflection/work sample with **one `systemone` call** and see every
calibrated probability, confidence, and the profile outcomes your thresholds
derive from them. Jev is the only model used.

Design notes and scope: [`PLAN.md`](./PLAN.md).

## Run

```bash
cd apps/jev-student-profile
bun install
TYPESAFE_API_KEY=... bun run dev   # omit the key for labeled mock mode
```

Open `http://localhost:8000/` (or `PORT` if set). The header badge shows
**Live** or **Mock mode**.

Other scripts: `bun run lint` (Oxlint + `@shadcn/lint`), `bun run build`
(typecheck + Vite build), `bun run preview`.

## Modes

- **Author** — edit inputs (state keys), questions (type, instructions,
  criteria, thresholds) and conditions (AND-clauses over answers →
  labelled outcomes). Persisted in `localStorage`; "Reset to sample"
  restores the bundled Grade 8 learner profile.
- **Run** — pick a sample student or paste your own text, click Evaluate.
  Cards show `noul` probability, `choice` pick + per-option probabilities +
  confidence, `score` fractional value + legend + per-level probabilities +
  confidence, and each field's threshold verdict. The summary lists which
  conditions fired. Expand the request panel to see the exact payload.

## Server

`server/evaluate.ts` is a Vite plugin (dev **and** preview) exposing:

- `GET /api/status` → `{ mode: "live" | "mock", model }`
- `POST /api/evaluate` `{ state, questions }` → `{ model, answers, usage, mock, latencyMs }`

`TYPESAFE_API_KEY` is read from `process.env` inside that plugin only. Vite
ships only `VITE_*` variables to the client, so the key never reaches the
browser. Requests are validated (question types, criteria arity, id format)
before being forwarded to `https://api.typesafe.ai/v1/systemone` with
`model: "jev-latest"`; upstream 401/422/429/529 are mapped to readable
errors. Without a key the server returns deterministic, Jev-shaped mock
answers flagged `mock: true`, and the UI labels them.

## Lint

`@shadcn/lint` via Oxlint (`.oxlintrc.json`) enforces the local design
system: `no-restyle` (layout only, with contracts for `Card*`),
`no-raw-colors`, `no-arbitrary-values`, `no-inline-styles`,
`no-unknown-classes`, `require-static-classes`. Tokens live in
`src/index.css` (`@theme`); dynamic widths use CSS custom properties
(`w-(--meter-w)`).

## Structure

- `server/evaluate.ts` — API routes, Jev client, validation, mock
- `src/lib/types.ts` — Jev wire types + rubric model
- `src/lib/sample.ts` — sample rubric and students
- `src/lib/jev.ts` — rubric → Jev questions, request builder, client
- `src/lib/conditions.ts` — threshold verdicts and condition evaluation
- `src/lib/store.ts` — localStorage persistence
- `src/components/ui/` — Button, Input/Textarea/Select, Field, Card, Badge, Meter
- `src/components/author/` — inputs, question, and conditions editors
- `src/components/run/` — student form, answer cards, profile summary
