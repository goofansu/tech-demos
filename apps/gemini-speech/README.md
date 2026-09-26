# Speech studio

A booth for [Gemini 3.8 text-to-speech](https://ai.google.dev/gemini-api/docs/speech-generation#javascript). The transcript is spoken verbatim. Delivery goes in `speech_metadata.style`. Laughs, breaths, and pauses are angle-bracket tags in the line.

## Run

```bash
cd apps/gemini-speech
bun install
GEMINI_API_KEY=... bun run dev
```

Open `http://localhost:8000/` (or `PORT` if set). The key is read on the server and is never sent to the browser. Without it, the page still lets you draft a script and inspect the request.

Other scripts: `bun test`, `bun run build`, `bun run preview`.

## Desks

- **Speak** — one prebuilt voice, or a voice id you designed. Style chips, vocal tags, ten languages, WAV / PCM / μ-law / A-law, live PCM streaming, and a side-by-side Flash vs Flash-Lite take.
- **Scene** — one narrator with changing beats, or two speakers in conversational mode. Presets cover a podcast, a launch check with backchannels, a support call, a short story, a language lesson, and overlapping lines. `|like this|` is the other speaker inside a turn.
- **Design** — describe a persona with Flash, keep the `voice_…` id, play the preview, then say a new line in that voice (Flash or Flash-Lite). Stored voices can be sampled or deleted. A designed voice cannot share a single two-speaker request, so a scene that uses one is spoken turn by turn and joined.
- **Library** — filter the extended voice catalog and audition a sentence.

Flash (`gemini-3.8-flash-tts`) is the acting model. Flash-Lite (`gemini-3.8-flash-lite-tts`) is the quicker everyday model. Voice replication from a recording is a separate Voices API flow and is not part of this booth.
