# Live stage

A booth for [Gemini 3.8 Live](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live) and [Gemini 3.8 Live Extended Thinking](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live-extended-thinking). Talk freely (`/talk`) is an open conversation: voice, camera, photos, lookups, and search, with no prepared question. The other pages each demonstrate one capability. The activity list is the connection log: audio, turn boundaries, interaction status, and tool calls.

## Run

```bash
cd apps/gemini-live
bun install
GEMINI_API_KEY=... bun run dev
```

Open `http://localhost:8000/` (or `PORT` if set). The key is read on the server and is never sent to the browser. The page fetches a one-use ephemeral token, then the browser opens the Live WebSocket itself. Without a key, the controls still let you read the scenes.

Other scripts: `bun test`, `bun run build`, `bun run preview`.

## What to try

Talk freely is `/talk`. Each demonstration is a page under `/try/<id>` and says what to listen for before you ask.

- **Three hellos** (`/try/hello`) — a short spoken turn. Live answers as soon as the turn is ready.
- **Studio clock** (`/try/clock`) — `stage_clock`, which returns immediately.
- **Lisbon desk** (`/try/lisbon`) and **Signal scan** (`/try/scan`) — fixture tools with a few seconds of delay. On Live, speech waits for the result unless you change when it is spoken. On Extended Thinking, the model talks while the tool runs, `turnComplete` can arrive with `interactionStatus: IN_PROGRESS`, and the lamp returns to listening only at `IDLE`.
- **Search the cup** (`/try/search`) — Google Search grounding.
- **Ferry puzzle** (`/try/puzzle`) — multi-step planning. On Extended Thinking, raise thinking to high. Live has no thinking control.
- **Look over** (`/try/see`) — a camera frame or a still. Frames go out as JPEG, at most one a second while streaming. On a phone with a front and a rear camera, Rear camera switches between them after the camera is on.

Tool behavior and result scheduling (`when idle`, `interrupt`, `silent`) apply to Live. Extended Thinking always uses non-blocking tools and has no scheduling field. Do not send `thinkingConfig` to `gemini-3.8-live`.

## Session

Audio in is 16-bit PCM at 16 kHz. Audio out is 16-bit PCM at 24 kHz. Transcripts come from input and output audio transcription, because the response modality is audio. Context window compression and session resumption are enabled. A resumable handle can reopen the same conversation after the socket closes. Proactive audio stays on, and affective dialogue is not set.
