import { noulLesson } from "./noul.js";

export const lessons = [noulLesson];

export const planned = [
  { id: "noul", label: "Noul" },
  { id: "choice", label: "Choice" },
  { id: "score", label: "Score" },
];

export function lessonFromHash(hash) {
  const id = (hash || "").replace(/^#/, "") || "noul";
  return lessons.find((lesson) => lesson.id === id) ?? null;
}
