# Fruit primer

A step-by-step look at how a Jev request is built and how to read the reply.
The examples are fruit, so the question itself is not the hard part. Every
number on the page comes from a live `systemone` call. Jev is the only model.

## Run

```bash
cd apps/jev-fruit-primer
bun install
TYPESAFE_API_KEY=... bun run dev
```

Open `http://localhost:8000/` (or `PORT` if set). The key is read in
`server/evaluate.js` and never sent to the browser. Without it, the page
says so and does not invent an answer.

Other scripts: `bun test`, `bun run build`, `bun run preview`.

## Pages

- **Noul** — is this fruit a citrus? A lemon, then the same question on a mango. The walk builds the request field by field, sends it, then reads `model`, `type`, `noul`, and `usage` on the live reply.
- **Choice** — which fruit is this? A kiwi, then an orange that is not in the list. The reply adds `choice`, `probabilities`, and `confidence`.
- **Score** — how ripe is this banana? Four ordered levels, a fractional score, the weighted sum that produces it, `legend`, and `confidence`. A second, greener banana moves the score.

## Server

- `GET /api/status` → `{ ready, model }`
- `POST /api/evaluate` `{ state, questions }` → `{ model, answers, usage, latencyMs }`

The server adds `model: "jev-latest"` and forwards the body to
`https://api.typesafe.ai/v1/systemone`.
