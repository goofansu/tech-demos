export const MODELS = [
  {
    id: "gemini-3.8-live",
    label: "Gemini 3.8 Live",
    kicker: "Answers now",
    thinking: false,
    copy: "Answers right away.",
  },
  {
    id: "gemini-3.8-live-extended-thinking",
    label: "Extended Thinking",
    kicker: "Thinks while talking",
    thinking: true,
    copy: "Talks while it looks things up.",
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
    shows: "A normal spoken reply",
    detail: "One greeting in English, Japanese, and Portuguese.",
    ask: "Ask for three hellos",
    points: [
      "Nothing is looked up. This is only the voice.",
      "Live starts speaking as soon as it can. Extended Thinking may pause before the same greeting.",
    ],
    text: "Say hello in English, then Japanese, then Portuguese. One short line each.",
  },
  {
    id: "clock",
    title: "Studio clock",
    shows: "A tool that answers immediately",
    detail: "The time in Tokyo, from the studio clock.",
    ask: "Ask the time in Tokyo",
    points: [
      "The model has to call the studio clock. The time you hear comes from that result.",
      "The clock returns at once, so there is no wait to talk over.",
    ],
    text: "What time is it on the studio clock in Tokyo?",
    tools: true,
  },
  {
    id: "lisbon",
    title: "Lisbon desk",
    shows: "A lookup that takes a few seconds",
    detail: "A weekend brief: weather, a flight, and a table.",
    ask: "Ask for the Lisbon brief",
    points: [
      "The desk waits about 3 seconds. The brief has to use that result.",
      "On Live, the reply waits for the desk. On Extended Thinking, it can talk while the desk is still working.",
      "On Live, Voice and when to speak can make the result wait, cut in, or stay silent.",
    ],
    text: "Use the city desk to brief me on a weekend in Lisbon. I want the weather, one flight, and a table.",
    tools: true,
    schedule: true,
  },
  {
    id: "scan",
    title: "Signal scan",
    shows: "The same slow lookup, held longer",
    detail: "Whether the greenhouse vents are safe to open.",
    ask: "Run the signal scan",
    points: [
      "The check waits about 4.5 seconds, so the pause is easier to hear than on Lisbon desk.",
      "On Extended Thinking, it can talk during that wait, then give the verdict.",
      "On Live, the reply waits unless you change when the result is spoken.",
    ],
    text: "Run a signal scan on the north greenhouse array and tell me whether it is safe to open the vents.",
    tools: true,
    schedule: true,
  },
  {
    id: "search",
    title: "Search the cup",
    shows: "A current fact from Google Search",
    detail: "Who won the most recent World Cup.",
    ask: "Search for the winner",
    points: [
      "Search is on for this page. The winner should come from the web.",
      "The activity list shows the search.",
    ],
    text: "Search for who won the most recent FIFA World Cup and say it in one sentence.",
    search: true,
  },
  {
    id: "puzzle",
    title: "Ferry puzzle",
    shows: "A plan with no tool",
    detail: "Which ferries move 30 cars first.",
    ask: "Ask the ferry puzzle",
    thinkingNote: "High spends longer on this plan. Low answers sooner.",
    points: [
      "No clock, desk, or search. The model works out the minutes itself.",
      "On Extended Thinking, High is the setting that spends longer. Live has no thinking control.",
    ],
    text: "Three ferries leave one dock and can run at the same time. A holds 4 cars and takes 12 minutes round trip. B holds 6 and takes 18. C holds 9 and takes 30. I need to move 30 cars. Which set of ferries finishes first, and how many minutes does that take? Think it through, then give the set and the minutes.",
  },
  {
    id: "see",
    title: "Look over",
    shows: "A photo the model can see",
    detail: "Two sentences about whatever is in front of the camera.",
    ask: "Describe this photo",
    points: [
      "Turn the camera on or choose a photo, then ask. That picture goes with the question.",
      "Keep sending the camera sends one frame a second while this conversation is connected.",
    ],
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
