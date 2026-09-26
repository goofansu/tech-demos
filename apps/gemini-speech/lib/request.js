export const MODELS = [
  {
    id: "gemini-3.8-flash-tts",
    label: "Flash",
    blurb: "Highest fidelity, dialects, and acting.",
  },
  {
    id: "gemini-3.8-flash-lite-tts",
    label: "Flash-Lite",
    blurb: "Lower latency for read-aloud and everyday lines.",
  },
];

export const FORMATS = {
  "wav-24": {
    mimeType: "audio/wav",
    sampleRate: 24000,
    label: "WAV · 24 kHz",
    hint: "Studio file with a standard header.",
    encoding: "wav",
  },
  "pcm-16": {
    mimeType: "audio/l16",
    sampleRate: 16000,
    label: "PCM · 16 kHz",
    hint: "Headerless 16-bit linear PCM.",
    encoding: "l16",
  },
  "pcm-24": {
    mimeType: "audio/l16",
    sampleRate: 24000,
    label: "PCM · 24 kHz",
    hint: "What a live stream sends, chunk by chunk.",
    encoding: "l16",
    hidden: true,
  },
  "mulaw-8": {
    mimeType: "audio/mulaw",
    sampleRate: 8000,
    label: "μ-law · 8 kHz",
    hint: "Telephony in North America and Japan.",
    encoding: "mulaw",
  },
  "alaw-8": {
    mimeType: "audio/alaw",
    sampleRate: 8000,
    label: "A-law · 8 kHz",
    hint: "Telephony in Europe and on international lines.",
    encoding: "alaw",
  },
};

const MAX_TURNS = 8;
const MAX_TURN = 1800;
const MAX_TOTAL = 4000;
const MAX_STYLE = 180;

const VOICE_RE =
  /^(?:voice_|voicekey_)[A-Za-z0-9_-]{1,128}$|^[A-Za-z][A-Za-z0-9_ .'()-]{0,80}$/;
const NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} .'_-]{0,39}$/u;

export function isCustomVoice(voice) {
  return voice.startsWith("voice_") || voice.startsWith("voicekey_");
}

export function visibleFormats() {
  return Object.entries(FORMATS)
    .filter(([, format]) => !format.hidden)
    .map(([id, format]) => ({ id, ...format }));
}

/**
 * Build an Interactions API speech request.
 * Text is the verbatim transcript. Style and speaker live in speech_metadata.
 */
export function buildSpeechRequest(input) {
  const model = input?.model;
  if (!MODELS.some((item) => item.id === model)) {
    return { error: "Choose Flash or Flash-Lite." };
  }

  const stream = Boolean(input?.stream);
  const formatId = stream ? "pcm-24" : input?.format || "wav-24";
  const format = FORMATS[formatId];
  if (!format) return { error: "Choose an audio format." };

  const speakersIn = Array.isArray(input?.speakers) ? input.speakers : [];
  if (speakersIn.length < 1 || speakersIn.length > 2) {
    return { error: "Use one voice, or two for a scene." };
  }

  const names = new Set();
  const speakers = [];
  for (const speaker of speakersIn) {
    const name = String(speaker?.name ?? "").trim();
    const voice = String(speaker?.voice ?? "").trim();
    if (!NAME_RE.test(name)) return { error: "Give each speaker a short readable name." };
    if (names.has(name)) return { error: "Give each speaker a different name." };
    if (!VOICE_RE.test(voice)) return { error: "That voice id is not usable." };
    names.add(name);
    speakers.push({ name, voice });
  }

  const turnsIn = Array.isArray(input?.turns) ? input.turns : [];
  if (turnsIn.length < 1 || turnsIn.length > MAX_TURNS) {
    return { error: `Use 1 to ${MAX_TURNS} turns.` };
  }

  const named = speakers.length > 1;
  const turns = [];
  let total = 0;
  for (const turn of turnsIn) {
    const text = String(turn?.text ?? "")
      .replaceAll("\u0000", "")
      .trim();
    const style = String(turn?.style ?? "").trim();
    if (!text) return { error: "Every turn needs something to say." };
    if (text.length > MAX_TURN) return { error: "One of those turns is too long." };
    if (style.length > MAX_STYLE) return { error: "Keep each style note to a short phrase." };
    total += text.length;
    let speaker = String(turn?.speaker ?? "").trim();
    if (named) {
      if (!names.has(speaker)) return { error: "Each turn needs one of the two speakers." };
    } else {
      speaker = speakers[0].name;
    }
    turns.push({ speaker, text, style });
  }
  if (total > MAX_TOTAL) {
    return { error: "Trim the script. One request holds about 4,000 characters." };
  }

  const content = turns.map((turn) => {
    const block = { type: "text", text: turn.text };
    const meta = { type: "speech_metadata" };
    if (named) meta.speaker = turn.speaker;
    if (turn.style) meta.style = turn.style;
    if (meta.speaker || meta.style) block.annotations = [meta];
    return block;
  });

  const speechConfig = named
    ? {
        mode: "conversational",
        speakers: speakers.map((speaker) => ({
          speaker: speaker.name,
          voice: speaker.voice,
        })),
      }
    : [{ voice: speakers[0].voice }];

  return {
    request: {
      model,
      input: [{ type: "user_input", content }],
      response_format: {
        type: "audio",
        mime_type: format.mimeType,
        sample_rate: format.sampleRate,
      },
      generation_config: { speech_config: speechConfig },
    },
    format,
    stream,
    joinTurns: named && speakers.some((speaker) => isCustomVoice(speaker.voice)),
    speakers,
    turns,
  };
}

export function buildJoinRequests(built) {
  return built.turns.map((turn) => {
    const speaker = built.speakers.find((item) => item.name === turn.speaker);
    const piece = buildSpeechRequest({
      model: built.request.model,
      format: "pcm-24",
      speakers: [{ name: speaker.name, voice: speaker.voice }],
      turns: [{ speaker: speaker.name, text: turn.text, style: turn.style }],
    });
    if (piece.error) return piece;
    return piece;
  });
}
