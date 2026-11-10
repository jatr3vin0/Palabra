import raw from "./unit-01.json";

import type { Exercise, Lesson, Unit } from "~/lib/types";

/** Unit 1 content, authored by the curriculum team and rendered as-is. */
export const unit = raw as unknown as Unit;

export const pathLessons: Lesson[] = [...unit.lessons, unit.checkpoint];

export function findLesson(id: string): Lesson | undefined {
  return pathLessons.find((l) => l.id === id);
}

/** The human-readable correct answer, shown in the feedback bar after a miss. */
export function answerText(ex: Exercise): string {
  switch (ex.type) {
    case "match_pairs":
      return "All pairs matched";
    case "speak":
      return ex.target;
    default:
      return ex.answer;
  }
}
