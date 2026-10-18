# Ledger

Subscriptions and one-time payments, kept by voice with [Gemini 3.8 Live](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live) or [Extended Thinking](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live-extended-thinking). You speak. It records, and it answers.

## Run

```bash
cd apps/live-ledger
bun install
GEMINI_API_KEY=... bun run dev
```

Open `http://localhost:8000/` (or `PORT` if set). The key stays on the server. The page fetches a one-use ephemeral token, then the browser opens the Live WebSocket. Tap Listen. Headphones keep the microphone from hearing the answer.

Other scripts: `bun test`, `bun run build`, `bun run preview`.

## The book

Rows live in this browser. A subscription renews weekly, monthly, quarterly, or yearly, and is active, paused, or canceled. A one-time payment has the day it was paid.

Month and year count active subscriptions only. Weekly is amount × 52 / 12 per month and × 52 per year. Quarterly is ÷ 3 and × 4. Yearly is ÷ 12 and the amount. Paused and canceled rows stay listed and drop out of both figures. One-time spend this month sums paid-once rows in the current month. Currencies stay separate.

A matching row is not changed until you answer. The same active or paused subscription name and currency asks whether to update it, add a second, or leave it. The same one-time name, amount, and currency asks whether to record another. If several rows share a name, a change asks which one. The answer is applied on the next thing you say, not in the same breath.

Clear this browser deletes the local copy. Asking to erase the book goes through the model.

## Session

Audio in is 16-bit PCM at 16 kHz. Audio out is 16-bit PCM at 24 kHz. Transcripts come from audio transcription, because the reply is spoken. On Live, a tool result is spoken when the model is idle. Extended Thinking has no scheduling field. Do not send `thinkingConfig` to `gemini-3.8-live`.
