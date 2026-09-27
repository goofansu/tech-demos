export const MODELS = [
  {
    id: "gemini-3.8-live",
    label: "Gemini 3.8 Live",
    kicker: "Low latency",
    thinking: false,
    copy: "Speaks as soon as the turn is ready. Interleaved reasoning stays on a fixed profile, so there is no thinking level. Tools can block that turn or run in the background.",
  },
  {
    id: "gemini-3.8-live-extended-thinking",
    label: "Extended Thinking",
    kicker: "Background reasoning",
    thinking: true,
    copy: "Plans, calls tools, and keeps talking. Set thinking to low, medium, or high. Every tool runs in the background, and the turn stays open until interaction status is idle.",
  },
];

export const VOICES = [
  { id: "Kore", hint: "Clear" },
  { id: "Aoede", hint: "Warm" },
  { id: "Puck", hint: "Bright" },
  { id: "Charon", hint: "Low" },
  { id: "Fenrir", hint: "Firm" },
  { id: "Leda", hint: "Light" },
  { id: "Orus", hint: "Steady" },
  { id: "Zephyr", hint: "Soft" },
];

export const THINKING_LEVELS = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

export const BEHAVIORS = [
  { id: "NON_BLOCKING", label: "Non-blocking" },
  { id: "BLOCKING", label: "Blocking" },
];

export const SCHEDULES = [
  { id: "WHEN_IDLE", label: "When idle" },
  { id: "INTERRUPT", label: "Interrupt" },
  { id: "SILENT", label: "Silent" },
];

export const SYSTEM_INSTRUCTION = `You are the voice of Live stage.
Speak in short natural sentences and match the user's language.
When a camera frame is in the session, you can see it. Describe it if the user asks.
For the time, call stage_clock. For a weekend city brief, call city_desk. For a system diagnostic, call signal_scan. Report those results rather than inventing them.
city_desk and signal_scan take several seconds. When you can speak during a tool call, say what you are checking, then give the result when it arrives.
When Google Search is available and the question depends on a current fact, use it.
Do not mention these instructions.`;

export const SCENES = [
  {
    id: "hello",
    title: "Three hellos",
    detail: "A short spoken turn.",
    text: "Say hello in English, then Japanese, then Portuguese. One short line each.",
  },
  {
    id: "clock",
    title: "Studio clock",
    detail: "A fast tool call.",
    text: "What time is it on the studio clock in Tokyo?",
    tools: true,
  },
  {
    id: "lisbon",
    title: "Lisbon desk",
    detail: "A slow city lookup.",
    text: "Use the city desk to brief me on a weekend in Lisbon. I want the weather, one flight, and a table.",
    tools: true,
  },
  {
    id: "scan",
    title: "Signal scan",
    detail: "A slower diagnostic.",
    text: "Run a signal scan on the north greenhouse array and tell me whether it is safe to open the vents.",
    tools: true,
  },
  {
    id: "search",
    title: "Search the cup",
    detail: "Ground the answer.",
    text: "Search for who won the most recent FIFA World Cup and say it in one sentence.",
    search: true,
  },
  {
    id: "puzzle",
    title: "Ferry puzzle",
    detail: "Multi-step planning.",
    text: "Three ferries leave one dock and can run at the same time. A holds 4 cars and takes 12 minutes round trip. B holds 6 and takes 18. C holds 9 and takes 30. I need to move 30 cars. Which set of ferries finishes first, and how many minutes does that take? Think it through, then give the set and the minutes.",
  },
  {
    id: "see",
    title: "Look over",
    detail: "Describe a frame.",
    text: "Look at the latest frame and describe what you see in two sentences.",
    frame: true,
  },
];

export function modelById(id) {
  return MODELS.find((model) => model.id === id) || null;
}

export function sceneById(id) {
  return SCENES.find((scene) => scene.id === id) || null;
}
