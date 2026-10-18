import { describe, expect, test } from "bun:test";
import { dispatch, dispatchAll, localDateISO, sanitizeBook, summarize } from "./ledger.js";

const ctx = {
  today: "2026-10-18",
  now: new Date("2026-10-18T15:00:00Z"),
  idFactory: sequentialIds(),
};

describe("dispatch", () => {
  test("records a subscription and a one-time payment", () => {
    let book = [];
    const sub = dispatch(book, "record_subscription", {
      name: "Netflix",
      amount: "15.99",
      cadence: "monthly",
      category: "Video",
      renewsOn: "2026-11-04",
    }, ctx);
    expect(sub.result.ok).toBe(true);
    expect(sub.result.line).toBe("Netflix at 15.99 USD a month, next charge 2026-11-04.");
    book = sub.book;
    const paid = dispatch(book, "record_payment", {
      name: "Standing desk",
      amount: 420,
      paidOn: "2026-10-17",
      category: "Home",
    }, ctx);
    expect(paid.result.line).toBe("Standing desk at 420.00 USD, paid once on 2026-10-17.");
    const totals = dispatch(paid.book, "book_totals", {}, ctx);
    expect(totals.result.byCurrency[0]).toMatchObject({
      currency: "USD",
      monthly: 15.99,
      yearly: 191.88,
      onceThisMonth: 420,
      activeCount: 1,
    });
    expect(totals.result.byCurrency[0].upcoming).toEqual([
      expect.objectContaining({ name: "Netflix", daysUntil: 17 }),
    ]);
  });

  test("rolls weekly, quarterly, and yearly into one monthly total", () => {
    let book = [];
    book = dispatch(book, "record_subscription", { name: "Gym", amount: 10, cadence: "weekly" }, ctx).book;
    book = dispatch(book, "record_subscription", { name: "Tax", amount: 90, cadence: "quarterly" }, ctx).book;
    book = dispatch(book, "record_subscription", { name: "Domain", amount: 12, cadence: "yearly" }, ctx).book;
    const summary = summarize(book, "2026-10-18");
    expect(summary.byCurrency[0].monthly).toBe(74.33);
    expect(summary.byCurrency[0].yearly).toBe(892);
  });

  test("keeps currencies apart and skips paused or canceled rows", () => {
    let book = [];
    book = dispatch(book, "record_subscription", { name: "Netflix", amount: 15, cadence: "monthly", currency: "USD" }, ctx).book;
    book = dispatch(book, "record_subscription", { name: "Spotify", amount: 11, cadence: "monthly", currency: "EUR" }, ctx).book;
    book = dispatch(book, "set_subscription_status", { name: "Spotify", status: "paused" }, ctx).book;
    const summary = summarize(book, "2026-10-18");
    const usd = summary.byCurrency.find((row) => row.currency === "USD");
    const eur = summary.byCurrency.find((row) => row.currency === "EUR");
    expect(usd.monthly).toBe(15);
    expect(eur.monthly).toBe(0);
    expect(eur.pausedMonthly).toBe(11);
  });

  test("asks before a duplicate subscription, then updates, adds, or leaves it", () => {
    let book = [];
    book = dispatch(book, "record_subscription", {
      name: "Netflix",
      amount: 15.99,
      cadence: "monthly",
      category: "Video",
      renewsOn: "2026-11-04",
    }, ctx).book;
    const held = dispatch(book, "record_subscription", { name: "netflix", amount: 19, cadence: "monthly" }, ctx);
    expect(held.result.needsConfirmation).toBe(true);
    expect(held.result.choices).toEqual(["update", "second", "leave"]);
    expect(held.result.ask).toMatch(/Update it, add a second, or leave it/);
    expect(held.book).toHaveLength(1);
    expect(held.book[0].amount).toBe(15.99);

    const left = dispatch(held.book, "confirm_duplicate", {
      confirmationId: held.pending.id,
      choice: "leave",
    }, { ...ctx, pending: held.pending });
    expect(left.result.action).toBe("left");
    expect(left.book[0].amount).toBe(15.99);
    expect(left.pending).toBeNull();

    const updated = dispatch(held.book, "confirm_duplicate", {
      confirmationId: held.pending.id,
      choice: "update",
    }, { ...ctx, pending: held.pending });
    expect(updated.book[0].amount).toBe(19);
    expect(updated.book[0].category).toBe("Video");
    expect(updated.book[0].renewsOn).toBe("2026-11-04");

    const again = dispatch(updated.book, "record_subscription", { name: "Netflix", amount: 9, cadence: "yearly" }, ctx);
    const second = dispatch(again.book, "confirm_duplicate", {
      confirmationId: again.pending.id,
      choice: "second",
    }, { ...ctx, pending: again.pending });
    expect(second.book).toHaveLength(2);

    let canceled = dispatch(book, "set_subscription_status", { name: "Netflix", status: "canceled" }, ctx).book;
    canceled = dispatch(canceled, "record_subscription", { name: "Netflix", amount: 16, cadence: "monthly" }, ctx).book;
    expect(canceled.filter((entry) => entry.status === "active")).toHaveLength(1);
  });

  test("does not confirm a duplicate in the same batch", () => {
    const book = dispatch([], "record_subscription", { name: "Netflix", amount: 15, cadence: "monthly" }, ctx).book;
    const batch = dispatchAll(book, [
      { id: "1", name: "record_subscription", args: { name: "Netflix", amount: 19, cadence: "monthly" } },
      { id: "2", name: "confirm_duplicate", args: { confirmationId: "c0001", choice: "update" } },
    ], ctx);
    expect(batch.book).toHaveLength(1);
    expect(batch.book[0].amount).toBe(15);
    expect(batch.results[0].result.needsConfirmation).toBe(true);
    expect(batch.results[1].result.error).toMatch(/wait/);
    expect(batch.pending?.id).toBe(batch.results[0].result.confirmationId);
  });

  test("asks before recording the same one-time payment again", () => {
    const book = dispatch([], "record_payment", { name: "Train ticket", amount: 80, paidOn: "2026-10-18" }, ctx).book;
    const other = dispatch(book, "record_payment", { name: "Train ticket", amount: 12 }, ctx);
    expect(other.result.ok).toBe(true);
    const held = dispatch(book, "record_payment", { name: "train ticket", amount: 80 }, ctx);
    expect(held.result.choices).toEqual(["another", "leave"]);
    expect(held.book).toHaveLength(1);
    const extra = dispatch(held.book, "confirm_duplicate", {
      confirmationId: held.pending.id,
      choice: "another",
    }, { ...ctx, pending: held.pending });
    expect(extra.book.filter((entry) => entry.amount === 80)).toHaveLength(2);
  });

  test("revises by name, renames with newName, and asks which duplicate", () => {
    let book = [];
    book = dispatch(book, "record_subscription", { name: "Netflix", amount: 15, cadence: "monthly" }, ctx).book;
    book = dispatch(book, "record_payment", { name: "Netflix", amount: 15, paidOn: "2026-10-01" }, ctx).book;
    const ambiguous = dispatch(book, "revise_entry", { name: "Netflix", amount: 18 }, ctx);
    expect(ambiguous.result.needsConfirmation).toBe(true);
    expect(ambiguous.result.choices).toEqual(["use", "leave"]);
    expect(ambiguous.book[0].amount).toBe(15);
    const id = book.find((entry) => entry.kind === "subscription").id;
    const chosen = dispatch(ambiguous.book, "confirm_duplicate", {
      confirmationId: ambiguous.pending.id,
      choice: "use",
      entryId: id,
    }, { ...ctx, pending: ambiguous.pending });
    expect(chosen.book.find((entry) => entry.id === id).amount).toBe(18);
    expect(chosen.book.find((entry) => entry.kind === "once").amount).toBe(15);
    const revised = dispatch(chosen.book, "revise_entry", { id, newName: "Netflix Premium", amount: 22.5 }, ctx);
    expect(revised.result.line).toBe("Updated Netflix Premium to 22.50 USD a month.");
    expect(revised.book.find((entry) => entry.id === id).name).toBe("Netflix Premium");
  });

  test("rejects a bad date, a zero amount, and a status change through revise", () => {
    const badDate = dispatch([], "record_subscription", {
      name: "Gym",
      amount: 10,
      cadence: "monthly",
      renewsOn: "2026-02-31",
    }, ctx);
    expect(badDate.result.error).toMatch(/real calendar date/);
    const zero = dispatch([], "record_payment", { name: "Coffee", amount: 0 }, ctx);
    expect(zero.result.error).toMatch(/greater than zero/);
    const book = dispatch([], "record_subscription", { name: "Gym", amount: 10, cadence: "monthly" }, ctx).book;
    const status = dispatch(book, "revise_entry", { name: "Gym", status: "paused" }, ctx);
    expect(status.result.error).toMatch(/set_subscription_status/);
    expect(status.book[0].status).toBe("active");
  });

  test("defaults a missing paid date to today and counts only this month", () => {
    let book = dispatch([], "record_payment", { name: "Lamp", amount: 40 }, ctx).book;
    book = dispatch(book, "record_payment", { name: "Chair", amount: 80, paidOn: "2026-09-02" }, ctx).book;
    const summary = summarize(book, "2026-10-18");
    expect(book.find((entry) => entry.name === "Lamp").paidOn).toBe("2026-10-18");
    expect(summary.byCurrency[0].onceThisMonth).toBe(40);
    expect(summary.byCurrency[0].onceAllTime).toBe(120);
  });

  test("forgets one row, and erases the book only when that is the whole request", () => {
    let book = dispatch([], "record_subscription", { name: "Gym", amount: 10, cadence: "weekly" }, ctx).book;
    book = dispatch(book, "record_payment", { name: "Mug", amount: 12 }, ctx).book;
    const mixed = dispatch(book, "forget_entry", { all: true, name: "Gym" }, ctx);
    expect(mixed.result.ok).toBe(false);
    expect(mixed.book).toHaveLength(2);
    const one = dispatch(book, "forget_entry", { name: "Mug" }, ctx);
    expect(one.result.line).toBe("Removed Mug at 12.00 USD.");
    const all = dispatch(one.book, "forget_entry", { all: true }, ctx);
    expect(all.book).toEqual([]);
    expect(all.result.line).toBe("Erased 1 entry.");
  });

  test("applies a batch in order so the total includes the new row", () => {
    const batch = dispatchAll([], [
      { id: "1", name: "record_subscription", args: { name: "News", amount: 5, cadence: "monthly" } },
      { id: "2", name: "book_totals", args: {} },
    ], ctx);
    expect(batch.book).toHaveLength(1);
    expect(batch.results[1].result.byCurrency[0].monthly).toBe(5);
  });

  test("filters a category and leaves an unknown tool untouched", () => {
    let book = dispatch([], "record_subscription", {
      name: "Netflix",
      amount: 15,
      cadence: "monthly",
      category: "Video",
    }, ctx).book;
    book = dispatch(book, "record_subscription", {
      name: "Figma",
      amount: 12,
      cadence: "monthly",
      category: "Software",
    }, ctx).book;
    const video = dispatch(book, "book_totals", { category: "video" }, ctx);
    expect(video.result.byCurrency[0].monthly).toBe(15);
    expect(video.result.line).toMatch(/Video, USD: 15.00/);
    const listed = dispatch(book, "list_book", { query: "fig" }, ctx);
    expect(listed.result.entries.map((entry) => entry.name)).toEqual(["Figma"]);
    const unknown = dispatch(book, "wire_transfer", {}, ctx);
    expect(unknown.result.ok).toBe(false);
    expect(unknown.book).toHaveLength(2);
  });

  test("drops a corrupt saved book and keeps a valid row", () => {
    const book = sanitizeBook([
      { id: "bad", kind: "subscription", name: "", amount: 5, cadence: "monthly", status: "active" },
      {
        id: "s0001",
        kind: "once",
        name: "Mug",
        amount: 12.5,
        currency: "usd",
        paidOn: "2026-10-02",
        status: "nope",
      },
      "nope",
    ]);
    expect(book).toHaveLength(1);
    expect(book[0]).toMatchObject({ name: "Mug", currency: "USD", status: "recorded", category: "General" });
  });

  test("upcoming includes day 30 and skips a renewal after that", () => {
    let book = dispatch([], "record_subscription", {
      name: "Soon",
      amount: 3,
      cadence: "monthly",
      renewsOn: "2026-11-17",
    }, ctx).book;
    book = dispatch(book, "record_subscription", {
      name: "Later",
      amount: 3,
      cadence: "monthly",
      renewsOn: "2026-11-18",
    }, ctx).book;
    const upcoming = summarize(book, "2026-10-18").byCurrency[0].upcoming.map((row) => row.name);
    expect(upcoming).toEqual(["Soon"]);
  });
});

describe("localDateISO", () => {
  test("uses the timezone, not the UTC date alone", () => {
    const instant = new Date("2026-10-18T03:00:00Z");
    expect(localDateISO(instant, "UTC")).toBe("2026-10-18");
    expect(localDateISO(instant, "America/Los_Angeles")).toBe("2026-10-17");
  });
});

function sequentialIds() {
  let n = 0;
  return (kind) => `${kind === "once" ? "p" : "s"}${String(++n).padStart(4, "0")}`;
}
