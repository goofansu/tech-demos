import type { Locale } from "./i18n";
import { sampleRubric } from "./sample";
import type { Rubric } from "./types";

export const STORAGE_KEY = "jev-student-profile.rubric.v1";

export function loadRubric(locale: Locale): Rubric {
  const fallback = clone(sampleRubric(locale));
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Rubric>;
    if (
      !parsed ||
      !Array.isArray(parsed.inputs) ||
      !Array.isArray(parsed.fields) ||
      !Array.isArray(parsed.conditions)
    ) {
      return fallback;
    }
    return {
      name: typeof parsed.name === "string" ? parsed.name : fallback.name,
      inputs: parsed.inputs,
      fields: parsed.fields,
      conditions: parsed.conditions,
    };
  } catch {
    return fallback;
  }
}

export function saveRubric(rubric: Rubric): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rubric));
  } catch {
    // Quota or private mode: the in-memory rubric still works for this session.
  }
}

export function resetRubric(locale: Locale): Rubric {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  return clone(sampleRubric(locale));
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}
