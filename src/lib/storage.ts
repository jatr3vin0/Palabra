/**
 * Game state, persisted to localStorage behind this module only. Swapping this
 * file for a database backend later must not require touching any UI code.
 */

export const HEART_MAX = 5;
export const HEART_REGEN_MS = 30 * 60 * 1000; // one heart every 30 minutes
export const XP_PER_LEVEL = 100;
/** The mini-game unlocks once this lesson is completed. */
export const MINI_UNLOCK_LESSON = "a0-u01-l3";
/** The checkpoint carries no xp in the content; the app awards a completion bonus. */
export const CHECKPOINT_XP = 15;

const KEY = "palabra.progress.v1";

export type LessonRecord = { times: number; best: number };

/** A word/concept the learner missed, and the frame it was missed in. */
export type MissRecord = { n: number; game: string };

export type Progress = {
  xp: number;
  coins: number;
  hearts: number;
  heartsAt: number;
  streak: number;
  lastDay: string;
  completed: Record<string, LessonRecord>;
  miniBest: number;
  /** Misses per word, for adaptive replay inside a DIFFERENT frame later. */
  misses: Record<string, MissRecord>;
  /** Progressive immersion 0–3: English captions/glosses fade as it rises. */
  englishLevel: number;
};

function fresh(): Progress {
  return {
    xp: 0,
    coins: 10,
    hearts: HEART_MAX,
    heartsAt: Date.now(),
    streak: 0,
    lastDay: "",
    completed: {},
    miniBest: 0,
    misses: {},
    englishLevel: 0,
  };
}

export function loadProgress(): Progress {
  if (typeof window === "undefined") return fresh();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fresh();
    return regenHearts({ ...fresh(), ...(JSON.parse(raw) as Progress) });
  } catch {
    return fresh();
  }
}

export function saveProgress(p: Progress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage unavailable (private mode etc.) — play on without persistence
  }
}

/** Refill hearts from elapsed time. Mutates the copy it is given and returns it. */
export function regenHearts(p: Progress): Progress {
  if (p.hearts >= HEART_MAX) {
    p.heartsAt = Date.now();
    return p;
  }
  const steps = Math.floor((Date.now() - p.heartsAt) / HEART_REGEN_MS);
  if (steps > 0) {
    p.hearts = Math.min(HEART_MAX, p.hearts + steps);
    p.heartsAt += steps * HEART_REGEN_MS;
    if (p.hearts >= HEART_MAX) p.heartsAt = Date.now();
  }
  return p;
}

export function loseHeart(p: Progress): Progress {
  if (p.hearts <= 0) return p;
  const hearts = p.hearts - 1;
  return {
    ...p,
    hearts,
    heartsAt: hearts === HEART_MAX - 1 ? Date.now() : p.heartsAt,
  };
}

export function heartTimerMs(p: Progress): number {
  if (p.hearts >= HEART_MAX) return 0;
  return Math.max(0, p.heartsAt + HEART_REGEN_MS - Date.now());
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function today(): string {
  return dayKey(new Date());
}

/** Roll the daily streak the first time progress is made on a given day. */
export function touchStreak(p: Progress): Progress {
  const now = today();
  if (p.lastDay === now) return p;
  const yesterday = dayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
  return {
    ...p,
    streak: p.lastDay === yesterday ? p.streak + 1 : 1,
    lastDay: now,
  };
}

export function levelFor(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function levelProgress(xp: number): number {
  return (xp % XP_PER_LEVEL) / XP_PER_LEVEL;
}

export function isLessonDone(p: Progress, lessonId: string): boolean {
  return Boolean(p.completed[lessonId]);
}

export function isMiniUnlocked(p: Progress): boolean {
  return Boolean(p.completed[MINI_UNLOCK_LESSON]);
}

/** Nodes on the path, in order: the 8 lessons then the unit checkpoint. */
export function pathNodes(unit: {
  lessons: { id: string }[];
  checkpoint: { id: string };
}): { id: string; isCheckpoint: boolean }[] {
  return [
    ...unit.lessons.map((l) => ({ id: l.id, isCheckpoint: false })),
    { id: unit.checkpoint.id, isCheckpoint: true },
  ];
}

/** A node is playable when it is the first unfinished one, or already completed. */
export function nodeStatus(
  p: Progress,
  unit: { lessons: { id: string }[]; checkpoint: { id: string } },
): Map<string, "done" | "open" | "locked"> {
  const map = new Map<string, "done" | "open" | "locked">();
  let openAssigned = false;
  for (const node of pathNodes(unit)) {
    if (p.completed[node.id]) {
      map.set(node.id, "done");
      continue;
    }
    if (node.isCheckpoint) {
      const allLessons = unit.lessons.every((l) => Boolean(p.completed[l.id]));
      map.set(node.id, allLessons && !openAssigned ? "open" : "locked");
      continue;
    }
    if (!openAssigned) {
      map.set(node.id, "open");
      openAssigned = true;
    } else {
      map.set(node.id, "locked");
    }
  }
  return map;
}

/** Rewards for finishing a lesson. First clear pays full; replays pay a token amount. */
export function completeLesson(
  p: Progress,
  lessonId: string,
  lessonXp: number,
  accuracyPct: number,
): { next: Progress; xpGained: number; coinsGained: number; leveledUp: boolean } {
  const first = !p.completed[lessonId];
  const xpGained = first ? lessonXp : Math.max(2, Math.round(lessonXp / 2));
  const coinsGained = first ? 5 + Math.round(lessonXp / 2) : 2;
  const best = Math.max(p.completed[lessonId]?.best ?? 0, accuracyPct);
  let next: Progress = {
    ...p,
    xp: p.xp + xpGained,
    coins: p.coins + coinsGained,
    completed: {
      ...p.completed,
      [lessonId]: { times: (p.completed[lessonId]?.times ?? 0) + 1, best },
    },
  };
  next = touchStreak(next);
  return { next, xpGained, coinsGained, leveledUp: levelFor(next.xp) > levelFor(p.xp) };
}

// ── Adaptive tailoring: misses per word, replayed inside a different frame ──

/** Record a miss on a word, remembering which frame it happened in. */
export function recordMiss(p: Progress, word: string, game: string): Progress {
  const prev = p.misses[word];
  return {
    ...p,
    misses: {
      ...p.misses,
      [word]: { n: (prev?.n ?? 0) + 1, game },
    },
  };
}

/**
 * Clear a miss once the word is answered correctly somewhere else — "repeat
 * the lesson in different games". Accepts a near-miss match, so clearing on a
 * correct answer still works when the frame stores e.g. "cielos" for "cielo".
 */
export function clearMiss(p: Progress, word: string): Progress {
  if (!p.misses[word]) return p;
  const misses = { ...p.misses };
  delete misses[word];
  return { ...p, misses };
}

export function clearMisses(p: Progress, words: string[]): Progress {
  let next = p;
  for (const w of words) next = clearMiss(next, w);
  return next;
}

/** Words the learner has missed, ready to be re-served by a future frame. */
export function missedWords(p: Progress): string[] {
  return Object.keys(p.misses).filter((w) => (p.misses[w]?.n ?? 0) > 0);
}

/** The learner's immersion level advances every two finished frames (cap 3). */
export function bumpImmersion(p: Progress): Progress {
  const finished = Object.keys(p.completed).length;
  return { ...p, englishLevel: Math.max(0, Math.min(3, Math.floor(finished / 2))) };
}
