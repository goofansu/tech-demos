import type { SchoolConfig } from "./types";

export const SCHOOL: SchoolConfig = {
  name: "Faria International School",
  country: "GB",
  current_academic_year: 2026,
  grades: [
    { name: "Year 7", min_age: 11, max_age: 12 },
    { name: "Year 9", min_age: 13, max_age: 14 },
    { name: "Year 11", min_age: 15, max_age: 16 },
  ],
};

export function gradeBand(school: SchoolConfig, grade: string | null) {
  if (!grade) return undefined;
  return school.grades.find((g) => g.name === grade);
}

export function formatGradeBands(school: SchoolConfig): string {
  return school.grades
    .map((g) => `${g.name}: typical ages ${g.min_age}–${g.max_age}`)
    .join("; ");
}
