import { describe, expect, test } from "bun:test";
import { loadBook, saveBook } from "./store.js";

describe("store", () => {
  test("saves a book and drops junk on load", () => {
    const storage = memory();
    saveBook(storage, [{
      id: "s0001",
      kind: "subscription",
      name: "Gym",
      amount: 10,
      currency: "USD",
      cadence: "monthly",
      category: "Health",
      status: "active",
      renewsOn: null,
      paidOn: null,
      notes: "",
      createdAt: "",
      updatedAt: "",
    }]);
    expect(loadBook(storage)).toHaveLength(1);
    storage.setItem("live-ledger.v1", "{");
    expect(loadBook(storage)).toEqual([]);
  });
});

function memory() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
}
