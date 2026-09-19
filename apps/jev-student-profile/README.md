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
TYPESAFE_API_KEY=... bun run dev
```

Open `http://localhost:8000/` (or `PORT` if set). A TypeSafe API key is
required; without it the header warns **No API key** and Evaluate is disabled.

The chrome, sample rubric, and sample students ship in **English** and
**Simplified Chinese**. Use the header language toggle; the bundled sample
swaps with the locale, and a custom rubric is left as-is. The choice is
remembered in `localStorage`.

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
  Blank inputs are sent as empty strings (not omitted) so a question that
  cites `work_sample` can see that the excerpt is missing.

## Server

`server/evaluate.ts` is a Vite plugin (dev **and** preview) exposing:

- `GET /api/status` → `{ ready, model }`
- `POST /api/evaluate` `{ state, questions }` → `{ model, answers, usage, latencyMs }`

`TYPESAFE_API_KEY` is read from `process.env` inside that plugin only. Vite
ships only `VITE_*` variables to the client, so the key never reaches the
browser. Requests are validated (question types, criteria arity, id format)
before being forwarded to `https://api.typesafe.ai/v1/systemone` with
`model: "jev-latest"`; upstream 401/422/429/529 are mapped to readable
errors. Without a key, `GET /api/status` reports `ready: false` and
`POST /api/evaluate` returns 503 with a user-facing warning. There is no
mock evaluator.

## Lint

`@shadcn/lint` via Oxlint (`.oxlintrc.json`) enforces the local design
system: `no-restyle` (layout only, with contracts for `Card*`),
`no-raw-colors`, `no-arbitrary-values`, `no-inline-styles`,
`no-unknown-classes`, `require-static-classes`. Tokens live in
`src/index.css` (`@theme`); dynamic widths use CSS custom properties
(`w-(--meter-w)`).

## Structure

- `server/evaluate.ts` — API routes, Jev client, validation
- `src/lib/types.ts` — Jev wire types + rubric model
- `src/lib/sample.ts` — sample rubric and students
- `src/lib/jev.ts` — rubric → Jev questions, request builder, client
- `src/lib/conditions.ts` — threshold verdicts and condition evaluation
- `src/lib/store.ts` — localStorage persistence
- `src/components/ui/` — Button, Input/Textarea/Select, Field, Card, Badge, Meter
- `src/components/author/` — inputs, question, and conditions editors
- `src/components/run/` — student form, answer cards, profile summary
