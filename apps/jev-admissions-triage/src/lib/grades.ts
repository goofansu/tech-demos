import type { Locale } from "./i18n";

/** The second entry is deliberately outside the school's configured bands. */
const GRADE_OPTIONS: Record<Locale, string[]> = {
  en: ["Year 7", "Year 8", "Year 9", "Year 11", ""],
  "zh-CN": ["七年级", "八年级", "九年级", "十一年级", ""],
};

export function gradeOptions(locale: Locale): string[] {
  return GRADE_OPTIONS[locale];
}
