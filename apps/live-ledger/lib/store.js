import { sanitizeBook } from "./ledger.js";

export const BOOK_KEY = "live-ledger.v1";

export function loadBook(storage, key = BOOK_KEY) {
  if (!storage) return [];
  try {
    return sanitizeBook(JSON.parse(storage.getItem(key) || "[]"));
  } catch {
    return [];
  }
}

export function saveBook(storage, book, key = BOOK_KEY) {
  storage.setItem(key, JSON.stringify(book));
}
