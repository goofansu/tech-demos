export const CADENCES = ["weekly", "monthly", "quarterly", "yearly"];
export const SUB_STATUSES = ["active", "paused", "canceled"];

const NAME_MAX = 80;
const NOTES_MAX = 200;
const CATEGORY_MAX = 40;
const AMOUNT_MAX = 1_000_000_000;
const LIST_LIMIT = 40;

export function localDateISO(date, timeZone = "UTC") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function createIdFactory(seed = Date.now()) {
  let n = 0;
  return (kind) => {
    n += 1;
    const prefix = kind === "once" ? "p" : "s";
    return `${prefix}${Number(seed).toString(36)}${n.toString(36)}`.slice(0, 40);
  };
}

export function summarize(book, today, options = {}) {
  const requested = String(options.category || "").trim();
  const rows = filterCategory(book, requested);
  const category = requested ? (rows.find((entry) => entry.category)?.category || requested) : "";
  const currencies = [...new Set(rows.map((entry) => entry.currency))].sort();
  const horizon = addDays(today, 30);
  const month = today.slice(0, 7);
  const byCurrency = currencies.map((currency) => {
    const mine = rows.filter((entry) => entry.currency === currency);
    const active = mine.filter((entry) => entry.kind === "subscription" && entry.status === "active");
    const paused = mine.filter((entry) => entry.kind === "subscription" && entry.status === "paused");
    const once = mine.filter((entry) => entry.kind === "once");
    const activeRoll = rollup(active);
    const pausedRoll = rollup(paused);
    const upcoming = active
      .filter((entry) => entry.renewsOn && entry.renewsOn >= today && entry.renewsOn <= horizon)
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        amount: entry.amount,
        currency: entry.currency,
        renewsOn: entry.renewsOn,
        daysUntil: daysBetween(today, entry.renewsOn),
      }))
      .sort((a, b) => a.renewsOn.localeCompare(b.renewsOn) || a.name.localeCompare(b.name));
    return {
      currency,
      activeCount: active.length,
      pausedCount: paused.length,
      canceledCount: mine.filter((entry) => entry.kind === "subscription" && entry.status === "canceled").length,
      onceCount: once.length,
      monthly: activeRoll.monthly,
      yearly: activeRoll.yearly,
      pausedMonthly: pausedRoll.monthly,
      onceThisMonth: roundMoney(once.filter((entry) => (entry.paidOn || "").startsWith(month)).reduce((sum, entry) => sum + entry.amount, 0)),
      onceAllTime: roundMoney(once.reduce((sum, entry) => sum + entry.amount, 0)),
      upcoming,
    };
  });
  return {
    asOf: today,
    category,
    empty: rows.length === 0,
    byCurrency,
  };
}

export function sortBook(book) {
  return [...book].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "subscription" ? -1 : 1;
    if (a.kind === "subscription") {
      const rank = statusRank(a.status) - statusRank(b.status);
      if (rank) return rank;
      const renew = (a.renewsOn || "9999-99-99").localeCompare(b.renewsOn || "9999-99-99");
      if (renew) return renew;
    } else {
      const paid = (b.paidOn || "").localeCompare(a.paidOn || "");
      if (paid) return paid;
    }
    return a.name.localeCompare(b.name);
  });
}

export function sanitizeBook(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const book = [];
  for (const item of raw) {
    const entry = coerceStored(item, seen);
    if (!entry) continue;
    seen.add(entry.id);
    book.push(entry);
  }
  return book;
}

export function dispatch(book, name, args = {}, ctx = {}) {
  const source = cloneBook(book);
  const today = validToday(ctx.today) || localDateISO(ctx.now instanceof Date ? ctx.now : new Date(), safeZone(ctx.timeZone));
  const nowIso = (ctx.now instanceof Date ? ctx.now : new Date()).toISOString();
  const ids = typeof ctx.idFactory === "function" ? ctx.idFactory : createIdFactory(Date.parse(nowIso) || Date.now());
  const clean = args && typeof args === "object" && !Array.isArray(args) ? args : {};
  return apply(source, String(name || ""), clean, { today, nowIso, ids });
}

export function dispatchAll(book, calls, ctx = {}) {
  let current = cloneBook(book);
  const results = [];
  for (const call of calls || []) {
    const outcome = dispatch(current, call?.name, call?.args || {}, ctx);
    current = outcome.book;
    results.push({
      id: call?.id || "",
      name: call?.name || "",
      result: outcome.result,
    });
  }
  return { book: current, results };
}

function apply(book, name, args, ctx) {
  if (name === "list_book") return listBook(book, args);
  if (name === "book_totals") return totals(book, args, ctx);
  if (name === "record_subscription") return recordSubscription(book, args, ctx);
  if (name === "record_payment") return recordPayment(book, args, ctx);
  if (name === "revise_entry") return reviseEntry(book, args, ctx);
  if (name === "set_subscription_status") return setStatus(book, args, ctx);
  if (name === "forget_entry") return forgetEntry(book, args);
  return fail(book, { error: `Unknown tool: ${name || "missing name"}` });
}

function listBook(book, args) {
  let rows = sortBook(book);
  if (args.kind === "subscription" || args.kind === "once") {
    rows = rows.filter((entry) => entry.kind === args.kind);
  }
  if (typeof args.status === "string" && args.status.trim()) {
    const status = args.status.trim().toLowerCase();
    rows = rows.filter((entry) => entry.status === status);
  }
  if (typeof args.category === "string" && args.category.trim()) {
    rows = filterCategory(rows, args.category);
  }
  if (typeof args.query === "string" && args.query.trim()) {
    const query = norm(args.query);
    rows = rows.filter((entry) => norm(entry.name).includes(query) || norm(entry.notes).includes(query));
  }
  const entries = rows.slice(0, LIST_LIMIT).map(present);
  const count = rows.length;
  return {
    book,
    result: {
      ok: true,
      action: "list",
      count,
      returned: entries.length,
      truncated: count > entries.length,
      entries,
      line: count ? `${count} in the book.` : "The book is empty.",
    },
  };
}

function totals(book, args, ctx) {
  const category = typeof args.category === "string" ? args.category.trim() : "";
  const summary = summarize(book, ctx.today, { category });
  return {
    book,
    result: {
      ok: true,
      action: "totals",
      ...summary,
      line: totalsLine(summary),
    },
  };
}

function recordSubscription(book, args, ctx) {
  const parsed = parseSubscription(args);
  if (parsed.error) return fail(book, { error: parsed.error });
  const duplicate = openSubscription(book, parsed.value.name, parsed.value.currency);
  if (duplicate && !truthy(args.allowDuplicate)) {
    return fail(book, {
      error: `${duplicate.name} in ${duplicate.currency} is already in the book. Revise it, or set allowDuplicate only if the person wants a second one.`,
      conflict: true,
      existing: present(duplicate),
    });
  }
  const entry = {
    ...parsed.value,
    id: freshId(book, ctx.ids, "subscription"),
    kind: "subscription",
    status: "active",
    paidOn: null,
    createdAt: ctx.nowIso,
    updatedAt: ctx.nowIso,
  };
  const next = [...book, entry];
  return ok(next, {
    action: "recorded",
    entry: present(entry),
    line: `${entry.name} at ${money(entry)} a ${cadenceWord(entry.cadence)}${entry.renewsOn ? `, next charge ${entry.renewsOn}` : ""}.`,
  });
}

function recordPayment(book, args, ctx) {
  const name = parseName(args.name);
  if (name.error) return fail(book, { error: name.error });
  const amount = parseAmount(args.amount);
  if (amount.error) return fail(book, { error: amount.error });
  const currency = parseCurrency(args.currency);
  if (currency.error) return fail(book, { error: currency.error });
  const category = parseCategory(args.category);
  if (category.error) return fail(book, { error: category.error });
  const notes = parseNotes(args.notes);
  if (notes.error) return fail(book, { error: notes.error });
  const paid = parseDate(args.paidOn == null || args.paidOn === "" ? ctx.today : args.paidOn, "Paid date");
  if (paid.error) return fail(book, { error: paid.error });
  if (!paid.value) return fail(book, { error: "A one-time payment needs the day it was paid." });
  const entry = {
    id: freshId(book, ctx.ids, "once"),
    kind: "once",
    name: name.value,
    amount: amount.value,
    currency: currency.value,
    cadence: null,
    category: category.value,
    status: "recorded",
    renewsOn: null,
    paidOn: paid.value,
    notes: notes.value,
    createdAt: ctx.nowIso,
    updatedAt: ctx.nowIso,
  };
  return ok([...book, entry], {
    action: "recorded",
    entry: present(entry),
    line: `${entry.name} at ${money(entry)}, paid once on ${entry.paidOn}.`,
  });
}

function reviseEntry(book, args, ctx) {
  const found = findOne(book, args);
  if (found.error) return fail(book, { error: found.error, matches: found.matches });
  const current = found.entry;
  const patch = {};
  if (has(args, "newName")) {
    const name = parseName(args.newName);
    if (name.error) return fail(book, { error: name.error });
    patch.name = name.value;
  }
  if (has(args, "amount")) {
    const amount = parseAmount(args.amount);
    if (amount.error) return fail(book, { error: amount.error });
    patch.amount = amount.value;
  }
  if (has(args, "currency")) {
    const currency = parseCurrency(args.currency, "");
    if (currency.error) return fail(book, { error: currency.error });
    if (!currency.value) return fail(book, { error: "Currency must be a three-letter code, such as USD." });
    patch.currency = currency.value;
  }
  if (has(args, "category")) {
    const category = parseCategory(args.category);
    if (category.error) return fail(book, { error: category.error });
    patch.category = category.value;
  }
  if (has(args, "notes")) {
    const notes = parseNotes(args.notes);
    if (notes.error) return fail(book, { error: notes.error });
    patch.notes = notes.value;
  }
  if (current.kind === "subscription") {
    if (has(args, "cadence")) {
      const cadence = parseCadence(args.cadence);
      if (cadence.error) return fail(book, { error: cadence.error });
      patch.cadence = cadence.value;
    }
    if (has(args, "renewsOn")) {
      const renews = parseDate(args.renewsOn, "Renewal date");
      if (renews.error) return fail(book, { error: renews.error });
      patch.renewsOn = renews.value;
    }
    if (has(args, "paidOn")) return fail(book, { error: "A subscription uses renewsOn. paidOn is for a one-time payment." });
  } else {
    if (has(args, "cadence") || has(args, "renewsOn")) {
      return fail(book, { error: "A one-time payment has no cadence or renewal. Change the amount, date, name, or notes." });
    }
    if (has(args, "paidOn")) {
      const paid = parseDate(args.paidOn, "Paid date");
      if (paid.error) return fail(book, { error: paid.error });
      if (!paid.value) return fail(book, { error: "A one-time payment needs the day it was paid." });
      patch.paidOn = paid.value;
    }
  }
  if (has(args, "status")) {
    return fail(book, { error: "Use set_subscription_status to pause, resume, or cancel." });
  }
  if (!Object.keys(patch).length) return fail(book, { error: "Say what should change." });
  const nextEntry = { ...current, ...patch, updatedAt: ctx.nowIso };
  if (nextEntry.kind === "subscription" && nextEntry.status !== "canceled") {
    const clash = openSubscription(book, nextEntry.name, nextEntry.currency, nextEntry.id);
    if (clash) {
      return fail(book, {
        error: `${clash.name} in ${clash.currency} is already in the book.`,
        conflict: true,
        existing: present(clash),
      });
    }
  }
  const next = book.map((entry) => (entry.id === current.id ? nextEntry : entry));
  return ok(next, {
    action: "revised",
    entry: present(nextEntry),
    line: revisedLine(nextEntry),
  });
}

function setStatus(book, args, ctx) {
  const status = String(args.status || "").trim().toLowerCase();
  if (!SUB_STATUSES.includes(status)) {
    return fail(book, { error: "Status must be active, paused, or canceled." });
  }
  const found = findOne(book, args);
  if (found.error) return fail(book, { error: found.error, matches: found.matches });
  if (found.entry.kind !== "subscription") {
    return fail(book, { error: "One-time payments stay recorded. They are not paused or canceled." });
  }
  if (status === "active") {
    const clash = openSubscription(book, found.entry.name, found.entry.currency, found.entry.id);
    if (clash) {
      return fail(book, {
        error: `${clash.name} in ${clash.currency} is already active or paused.`,
        conflict: true,
        existing: present(clash),
      });
    }
  }
  const nextEntry = { ...found.entry, status, updatedAt: ctx.nowIso };
  const next = book.map((entry) => (entry.id === found.entry.id ? nextEntry : entry));
  const verb = status === "active" ? "Resumed" : status === "paused" ? "Paused" : "Canceled";
  const extra = status === "canceled" || status === "paused"
    ? " It stays in the book and is left out of the monthly total."
    : " It counts in the monthly total again.";
  return ok(next, {
    action: "status",
    entry: present(nextEntry),
    line: `${verb} ${nextEntry.name} at ${money(nextEntry)} a ${cadenceWord(nextEntry.cadence)}.${extra}`,
  });
}

function forgetEntry(book, args) {
  if (truthy(args.all)) {
    if (has(args, "name") || has(args, "id")) {
      return fail(book, { error: "Erase one entry or the whole book, not both in the same call." });
    }
    return ok([], {
      action: "forget",
      removed: book.length,
      line: book.length ? `Erased ${book.length} ${book.length === 1 ? "entry" : "entries"}.` : "The book was already empty.",
    });
  }
  const found = findOne(book, args);
  if (found.error) return fail(book, { error: found.error, matches: found.matches });
  const next = book.filter((entry) => entry.id !== found.entry.id);
  return ok(next, {
    action: "forget",
    removed: 1,
    entry: present(found.entry),
    line: `Removed ${found.entry.name} at ${money(found.entry)}.`,
  });
}

function parseSubscription(args) {
  const name = parseName(args.name);
  if (name.error) return name;
  const amount = parseAmount(args.amount);
  if (amount.error) return amount;
  const currency = parseCurrency(args.currency);
  if (currency.error) return currency;
  const cadence = parseCadence(args.cadence);
  if (cadence.error) return cadence;
  const category = parseCategory(args.category);
  if (category.error) return category;
  const notes = parseNotes(args.notes);
  if (notes.error) return notes;
  const renews = parseDate(args.renewsOn, "Renewal date");
  if (renews.error) return renews;
  return {
    value: {
      name: name.value,
      amount: amount.value,
      currency: currency.value,
      cadence: cadence.value,
      category: category.value,
      notes: notes.value,
      renewsOn: renews.value,
    },
  };
}

function findOne(book, args) {
  if (has(args, "id") && String(args.id).trim()) {
    const id = String(args.id).trim();
    const hit = book.find((entry) => entry.id === id);
    if (!hit) return { error: `No entry has id ${id}.` };
    return { entry: hit };
  }
  const name = parseName(args.name);
  if (name.error) return { error: "Say which entry, by name or id." };
  let hits = book.filter((entry) => norm(entry.name) === norm(name.value));
  if (args.kind === "subscription" || args.kind === "once") {
    hits = hits.filter((entry) => entry.kind === args.kind);
  }
  if (!hits.length) return { error: `Nothing in the book is named ${name.value}.` };
  if (hits.length > 1) {
    return {
      error: "Several entries match. Ask which one, and use its id.",
      matches: hits.map(present),
    };
  }
  return { entry: hits[0] };
}

function openSubscription(book, name, currency, exceptId = "") {
  const key = norm(name);
  return book.find((entry) =>
    entry.kind === "subscription"
    && entry.status !== "canceled"
    && entry.currency === currency
    && norm(entry.name) === key
    && entry.id !== exceptId
  ) || null;
}

function coerceStored(item, seen) {
  if (!item || typeof item !== "object") return null;
  const kind = item.kind === "once" || item.kind === "subscription" ? item.kind : "";
  if (!kind) return null;
  const id = String(item.id || "").trim();
  if (!/^[A-Za-z0-9_-]{4,40}$/.test(id) || seen.has(id)) return null;
  const name = parseName(item.name);
  const amount = parseAmount(item.amount);
  const currency = parseCurrency(item.currency);
  const category = parseCategory(item.category);
  const notes = parseNotes(item.notes);
  if (name.error || amount.error || currency.error || category.error || notes.error) return null;
  const createdAt = typeof item.createdAt === "string" ? item.createdAt : "";
  const updatedAt = typeof item.updatedAt === "string" ? item.updatedAt : createdAt;
  if (kind === "subscription") {
    const cadence = parseCadence(item.cadence);
    const renews = parseDate(item.renewsOn, "Renewal date");
    if (cadence.error || renews.error || !SUB_STATUSES.includes(item.status)) return null;
    return {
      id,
      kind,
      name: name.value,
      amount: amount.value,
      currency: currency.value,
      cadence: cadence.value,
      category: category.value,
      status: item.status,
      renewsOn: renews.value,
      paidOn: null,
      notes: notes.value,
      createdAt,
      updatedAt,
    };
  }
  const paid = parseDate(item.paidOn, "Paid date");
  if (paid.error || !paid.value) return null;
  return {
    id,
    kind,
    name: name.value,
    amount: amount.value,
    currency: currency.value,
    cadence: null,
    category: category.value,
    status: "recorded",
    renewsOn: null,
    paidOn: paid.value,
    notes: notes.value,
    createdAt,
    updatedAt,
  };
}

function present(entry) {
  return {
    id: entry.id,
    kind: entry.kind,
    name: entry.name,
    amount: entry.amount,
    currency: entry.currency,
    cadence: entry.cadence,
    category: entry.category,
    status: entry.status,
    renewsOn: entry.renewsOn,
    paidOn: entry.paidOn,
    notes: entry.notes,
  };
}

function ok(book, result) {
  return { book, result: { ok: true, ...result } };
}

function fail(book, result) {
  return { book, result: { ok: false, ...result } };
}

function totalsLine(summary) {
  if (summary.empty) {
    return summary.category ? `Nothing in ${summary.category}.` : "The book is empty.";
  }
  return summary.byCurrency.map((row) => {
    const scope = summary.category ? `${summary.category}, ` : "";
    return `${scope}${row.currency}: ${row.monthly.toFixed(2)} a month from active subscriptions, ${row.yearly.toFixed(2)} a year, ${row.onceThisMonth.toFixed(2)} paid once this month.`;
  }).join(" ");
}

function revisedLine(entry) {
  if (entry.kind === "once") return `Updated ${entry.name} to ${money(entry)}, paid once on ${entry.paidOn}.`;
  const when = entry.renewsOn ? `, next charge ${entry.renewsOn}` : "";
  return `Updated ${entry.name} to ${money(entry)} a ${cadenceWord(entry.cadence)}${when}.`;
}

function money(entry) {
  return `${entry.amount.toFixed(2)} ${entry.currency}`;
}

function cadenceWord(cadence) {
  if (cadence === "weekly") return "week";
  if (cadence === "monthly") return "month";
  if (cadence === "quarterly") return "quarter";
  if (cadence === "yearly") return "year";
  return "term";
}

function rollup(entries) {
  let monthly = 0;
  let yearly = 0;
  for (const entry of entries) {
    monthly += monthlyRaw(entry.amount, entry.cadence);
    yearly += yearlyRaw(entry.amount, entry.cadence);
  }
  return { monthly: roundMoney(monthly), yearly: roundMoney(yearly) };
}

function monthlyRaw(amount, cadence) {
  if (cadence === "weekly") return (amount * 52) / 12;
  if (cadence === "monthly") return amount;
  if (cadence === "quarterly") return amount / 3;
  if (cadence === "yearly") return amount / 12;
  return 0;
}

function yearlyRaw(amount, cadence) {
  if (cadence === "weekly") return amount * 52;
  if (cadence === "monthly") return amount * 12;
  if (cadence === "quarterly") return amount * 4;
  if (cadence === "yearly") return amount;
  return 0;
}

export function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseAmount(raw) {
  const n = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() ? Number(raw.trim()) : NaN;
  if (!Number.isFinite(n)) return { error: "Amount must be a number, such as 15.99." };
  const amount = roundMoney(n);
  if (amount <= 0) return { error: "Amount must be greater than zero." };
  if (amount > AMOUNT_MAX) return { error: "That amount is too large to record." };
  return { value: amount };
}

function parseCurrency(raw, fallback = "USD") {
  const text = String(raw ?? "").trim().toUpperCase();
  if (!text) {
    if (!fallback) return { value: "" };
    return { value: fallback };
  }
  if (!/^[A-Z]{3}$/.test(text)) return { error: "Currency must be a three-letter code, such as USD." };
  return { value: text };
}

function parseDate(raw, label) {
  if (raw == null || String(raw).trim() === "") return { value: null };
  const text = String(raw).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return { error: `${label} must be YYYY-MM-DD.` };
  const [y, m, d] = text.split("-").map(Number);
  if (y < 1990 || y > 2100) return { error: `${label} must fall between 1990 and 2100.` };
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return { error: `${label} is not a real calendar date.` };
  }
  return { value: text };
}

function parseName(raw) {
  const name = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!name) return { error: "A name is required." };
  if (name.length > NAME_MAX) return { error: `The name must be ${NAME_MAX} characters or fewer.` };
  return { value: name };
}

function parseNotes(raw) {
  const notes = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (notes.length > NOTES_MAX) return { error: `Notes must be ${NOTES_MAX} characters or fewer.` };
  return { value: notes };
}

function parseCategory(raw) {
  const category = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!category) return { value: "General" };
  if (category.length > CATEGORY_MAX) return { error: `Category must be ${CATEGORY_MAX} characters or fewer.` };
  return { value: category };
}

function parseCadence(raw) {
  const cadence = String(raw ?? "").trim().toLowerCase();
  if (!CADENCES.includes(cadence)) return { error: "Cadence must be weekly, monthly, quarterly, or yearly." };
  return { value: cadence };
}

function filterCategory(book, category) {
  const text = String(category || "").trim();
  if (!text) return book;
  const key = norm(text);
  return book.filter((entry) => norm(entry.category) === key);
}

function freshId(book, ids, kind) {
  const used = new Set(book.map((entry) => entry.id));
  let id = ids(kind);
  while (!id || used.has(id)) id = `${ids(kind)}${used.size}`;
  return id;
}

function cloneBook(book) {
  return (Array.isArray(book) ? book : []).map((entry) => ({ ...entry }));
}

function has(args, key) {
  return Object.prototype.hasOwnProperty.call(args, key) && args[key] != null;
}

function truthy(value) {
  return value === true || value === "true";
}

function norm(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function statusRank(status) {
  if (status === "active") return 0;
  if (status === "paused") return 1;
  if (status === "canceled") return 2;
  return 9;
}

function validToday(value) {
  const parsed = parseDate(value, "Today");
  return parsed.value || "";
}

function safeZone(zone) {
  const value = String(zone || "UTC").trim();
  if (!/^[A-Za-z0-9_+\-/]{1,64}$/.test(value)) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return value;
  } catch {
    return "UTC";
  }
}

function addDays(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(from, to) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86400000);
}
