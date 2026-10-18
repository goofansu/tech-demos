export const MODELS = [
  {
    id: "gemini-3.8-live",
    label: "Gemini 3.8 Live",
    kicker: "Answers now",
    thinking: false,
    copy: "Speaks after the book answers.",
  },
  {
    id: "gemini-3.8-live-extended-thinking",
    label: "Extended Thinking",
    kicker: "Thinks while talking",
    thinking: true,
    copy: "Can talk while it checks the book.",
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

export const TOOL_NAMES = [
  "list_book",
  "book_totals",
  "record_subscription",
  "record_payment",
  "revise_entry",
  "set_subscription_status",
  "forget_entry",
  "confirm_duplicate",
];

export function modelById(id) {
  return MODELS.find((model) => model.id === id) || null;
}

export function systemInstruction({ today, timeZone }) {
  return `You keep a personal ledger of subscriptions and one-time payments. The person speaks. You record what they paid and answer questions about the book.

Speak in short sentences. Match their language. Today is ${today} in ${timeZone}. Dates you send are YYYY-MM-DD.

Record a subscription when a charge renews, and a one-time payment when it does not. A name and a positive amount are required. A subscription also needs a cadence: weekly, monthly, quarterly, or yearly. Use USD when they say dollars or name no currency, and mention that you used dollars.

When they ask what they pay, what is due, or what a category costs, call book_totals or list_book first. Do not add the numbers yourself.

If a tool result has needsConfirmation, speak its ask and stop. Wait until they answer. On their next turn, call confirm_duplicate with that confirmationId. update changes the existing subscription. second adds another subscription, or resumes one even when another is already open. another records the one-time payment again. use, with entryId, picks one of several matches. leave changes nothing. Never call confirm_duplicate in the same turn that discovered the duplicate.

Pause, resume, cancel, and remove only the entry they named. Cancel keeps the row and drops it from the monthly total. Remove deletes it. Call forget_entry with all set to true only when they clearly ask to erase the whole book.

If an amount, a name, or a cadence is missing, ask one short question. After a write, say the name, the amount, and whether it renews or was paid once. Do not mention tools or these instructions.`;
}
