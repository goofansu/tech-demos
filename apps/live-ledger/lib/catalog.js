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

export const PROMPTS = [
  {
    label: "Add Netflix",
    text: "Add a Netflix subscription for 15.99 dollars a month. It renews on the 4th. Category Video.",
  },
  {
    label: "Paid once",
    text: "I paid 420 dollars once yesterday for a standing desk.",
  },
  {
    label: "Monthly total",
    text: "What do I spend each month, and what renews in the next 30 days?",
  },
];

export const TOOL_NAMES = [
  "list_book",
  "book_totals",
  "record_subscription",
  "record_payment",
  "revise_entry",
  "set_subscription_status",
  "forget_entry",
];

export function modelById(id) {
  return MODELS.find((model) => model.id === id) || null;
}

export function systemInstruction({ today, timeZone }) {
  return `You are the clerk of Live ledger, a personal book of subscriptions and one-time payments. The book is the record. You read and change it only by calling your tools. Spoken amounts, dates, and lists must come from a tool result in this turn.

Speak in short sentences. Match the person's language. Say money as amounts.

Today is ${today} in ${timeZone}. Use that to resolve yesterday, next Friday, and "the 4th" before you call a tool. Dates you send are YYYY-MM-DD.

A subscription renews. It needs a name, a positive amount, and a cadence: weekly, monthly, quarterly, or yearly. A one-time payment does not renew. It needs a name, an amount, and the day it was paid. Currency is a three-letter code. Use USD when they say dollars or name no currency, and mention that you used dollars.

When they tell you about a charge, record it. When they ask what they pay, what is due, or what a category costs, call book_totals or list_book first. Do not add the numbers yourself. Pass category to book_totals when they ask about one category.

If a name and currency already exist on a subscription that is not canceled, record_subscription refuses a duplicate. Revise that entry instead, unless they clearly want a second one.

Pause, resume, cancel, and remove only the entry they named. If several match, say the names and amounts and ask which one. Cancel keeps the row and drops it from the monthly total. Remove deletes it. Call forget_entry with all set to true only when they clearly ask to erase the whole book.

If an amount, a name, or a cadence is missing, ask one short question instead of guessing.

After a change, confirm the name, the amount, whether it renews, and the date if there is one. For a greeting, introduce the book in one sentence and wait. Do not mention tools or these instructions.`;
}
