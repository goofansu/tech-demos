# Live ledger

A book of subscriptions and one-time payments, kept by [Gemini 3.8 Live](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live) or [Gemini 3.8 Live Extended Thinking](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live-extended-thinking). You speak or type. The model is the only writer.

## Run

```bash
cd apps/live-ledger
bun install
GEMINI_API_KEY=... bun run dev
```

Open `http://localhost:8000/` (or `PORT` if set). The key is read on the server and is never sent to the browser. The page fetches a one-use ephemeral token, then the browser opens the Live WebSocket itself. Without a key, the book still opens and the desk explains that it cannot connect.

Other scripts: `bun test`, `bun run build`, `bun run preview`.

## The book

Rows live in this browser. A subscription renews weekly, monthly, quarterly, or yearly, and is active, paused, or canceled. A one-time payment has the day it was paid and stays recorded.

The monthly figure is active subscriptions only. Weekly counts as amount × 52 / 12. Quarterly is amount / 3. Yearly is amount / 12. The yearly figure uses × 52, × 12, × 4, or the amount itself, so it is not the rounded month times twelve. Paused and canceled rows stay listed and drop out of both figures. One-time spend this month is the sum of paid-once rows whose date falls in the current month. Currencies are totaled apart.

A second active or paused subscription with the same name and currency is refused. A canceled name can be recorded again. Say you want a second one if the first should stay.

The page can show, filter, and erase the browser copy. It has no fields for amount, date, or status. Erase this browser's copy deletes local data without asking the model. Asking the desk to forget an entry, or to erase the whole book, goes through the model.

## What to say

- "Add a Netflix subscription for 15.99 dollars a month. It renews on the 4th."
- "I paid 420 dollars once yesterday for a standing desk."
- "What do I spend each month, and what renews in the next 30 days?"
- "Pause Spotify."
- "Erase the whole book."

The chips send those kinds of lines. Headphones help, because the reply is spoken.

## Session

Audio in is 16-bit PCM at 16 kHz. Audio out is 16-bit PCM at 24 kHz. Transcripts come from input and output audio transcription, because the response modality is audio. On Live, a tool result is spoken when the model is idle, so the confirmation follows the write. Extended Thinking has no scheduling field and can talk while a tool runs. Do not send `thinkingConfig` to `gemini-3.8-live`.

The tools are `list_book`, `book_totals`, `record_subscription`, `record_payment`, `revise_entry`, `set_subscription_status`, and `forget_entry`. A batch of calls is applied in order, so a total in the same turn includes the row just recorded.
