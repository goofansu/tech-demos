import { TOOL_NAMES } from "./catalog.js";

export function functionDeclarations(behavior) {
  return [
    {
      name: "list_book",
      description:
        "Read subscriptions and one-time payments. Use this before answering what is in the book, and whenever a name might match more than one entry.",
      behavior,
      parameters: {
        type: "OBJECT",
        properties: {
          kind: {
            type: "STRING",
            description: "subscription or once. Omit for both.",
          },
          status: {
            type: "STRING",
            description: "active, paused, canceled, or recorded.",
          },
          category: { type: "STRING", description: "Exact category, case-insensitive." },
          query: { type: "STRING", description: "Case-insensitive substring of the name or notes." },
        },
      },
    },
    {
      name: "book_totals",
      description:
        "Compute monthly and yearly cost of active subscriptions, paused monthly cost, one-time spend, and renewals due within 30 days. Use this whenever you state a total. Do not add the numbers yourself.",
      behavior,
      parameters: {
        type: "OBJECT",
        properties: {
          category: {
            type: "STRING",
            description: "Limit the totals to one category. Omit for the whole book.",
          },
        },
      },
    },
    {
      name: "record_subscription",
      description:
        "Add a recurring subscription. Amount is major units, such as 15.99. Currency defaults to USD. Refuses a second active or paused subscription with the same name and currency unless allowDuplicate is true.",
      behavior,
      parameters: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          amount: { type: "NUMBER" },
          currency: { type: "STRING", description: "ISO 4217 code. Defaults to USD." },
          cadence: {
            type: "STRING",
            description: "weekly, monthly, quarterly, or yearly.",
          },
          category: { type: "STRING", description: "Short label such as Video, Music, or Rent." },
          renewsOn: { type: "STRING", description: "Next charge date, YYYY-MM-DD." },
          notes: { type: "STRING" },
          allowDuplicate: {
            type: "BOOLEAN",
            description: "True only when the person wants a second entry with the same name.",
          },
        },
        required: ["name", "amount", "cadence"],
      },
    },
    {
      name: "record_payment",
      description:
        "Record a one-time payment that does not renew. paidOn defaults to today. Amount is major units, such as 420.",
      behavior,
      parameters: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          amount: { type: "NUMBER" },
          currency: { type: "STRING", description: "ISO 4217 code. Defaults to USD." },
          paidOn: { type: "STRING", description: "YYYY-MM-DD. The day the money was paid." },
          category: { type: "STRING" },
          notes: { type: "STRING" },
        },
        required: ["name", "amount"],
      },
    },
    {
      name: "revise_entry",
      description:
        "Change one existing entry's name, amount, currency, category, notes, cadence, renewal date, or paid date. Identify it by id, or by its current name when only one entry matches. Does not pause, cancel, or resume.",
      behavior,
      parameters: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          name: { type: "STRING", description: "Current name, used only to find the entry when id is omitted." },
          newName: { type: "STRING", description: "Replacement name." },
          amount: { type: "NUMBER" },
          currency: { type: "STRING" },
          cadence: { type: "STRING", description: "weekly, monthly, quarterly, or yearly. Subscriptions only." },
          category: { type: "STRING" },
          renewsOn: { type: "STRING", description: "YYYY-MM-DD. Subscriptions only. Empty clears it." },
          paidOn: { type: "STRING", description: "YYYY-MM-DD. One-time payments only." },
          notes: { type: "STRING" },
        },
      },
    },
    {
      name: "set_subscription_status",
      description:
        "Pause, resume, or cancel one subscription. Canceled and paused subscriptions stay in the book and drop out of the monthly total. Resume sets status to active.",
      behavior,
      parameters: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          name: { type: "STRING" },
          kind: { type: "STRING", description: "subscription. Use it when a one-time payment shares the name." },
          status: { type: "STRING", description: "active, paused, or canceled." },
        },
        required: ["status"],
      },
    },
    {
      name: "forget_entry",
      description:
        "Remove one entry, or the entire book when all is true. Use all only after the person clearly asks to erase everything.",
      behavior,
      parameters: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          name: { type: "STRING" },
          kind: { type: "STRING", description: "subscription or once, when the name exists as both." },
          all: { type: "BOOLEAN" },
        },
      },
    },
  ];
}

export function declaredToolNames() {
  return functionDeclarations("NON_BLOCKING").map((tool) => tool.name);
}

export function toolsMatchCatalog() {
  const names = declaredToolNames();
  return names.length === TOOL_NAMES.length && TOOL_NAMES.every((name, index) => name === names[index]);
}
