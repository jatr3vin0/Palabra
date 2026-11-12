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
  /** Parent control: chiptune music muted (voices + SFX stay). */
  musicMuted: boolean;
  /** Audio settings panel: music / voices / effects, each 0–1. Voices meter
   * * the voice gain (voice.ts); the world mirrors all three for its pause menu. */
  musicVol: number;
  voiceVol: number;
  sfxVol: number;
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
    musicMuted: false,
    musicVol: 0.9,
    voiceVol: 1,
    sfxVol: 1,
  };
}

export function loadProgress(): Progress {
  if (typeof window === "undefined") return fresh();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fresh();
    return regenHearts(migrateMissKeys({ ...fresh(), ...(JSON.parse(raw) as Progress) }));
  } catch {
    return fresh();
  }
}

/**
 * One-time miss-key repair: the casa frame's third round used to record its
 * miss under the verse form "cielos"; the round KEY migrated to the canonical
 * unit vocab id "cielo" (GAME-ROADMAP §ruling 3 — the KEY migrates, the verse
 * text keeps "los cielos"). Miss matching is EXACT, so a stale "cielos" key
 * would never be cleared or re-served — rename it once on load.
 */
function migrateMissKeys(p: Progress): Progress {
  const stale = p.misses.cielos;
  if (!stale) return p;
  const misses = { ...p.misses };
  delete misses.cielos;
  const cur = misses.cielo;
  misses.cielo = cur ? { n: Math.max(cur.n, stale.n), game: cur.game } : stale;
  return { ...p, misses };
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
 * the lesson in different games". Matching is EXACT on the miss key: the key
 * recorded is the canonical vocab id the round carries (e.g. "cielo" — the
 * old verse-form key "cielos" is renamed once in loadProgress, above), so
 * record/clear always agree on the same string.
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

// ── Per-game levels store (pillar 1 track 2 — GAME-ROADMAP §10.5) ───────────
//
// Each mini-game owns an INDEPENDENT progression: levels, achievements and
// unlocks under `palabra.game.<frameId>.v1`, written ONLY by recordGameWin at
// the frame engine's two win call sites. Spanish mastery (palabra.progress.v1)
// is untouched by all of it, and gameplay levels never gate Spanish content.

/** One game's progress. `wins` is the lifetime win counter (lead ruling). */
export type GameProgress = {
  v: 1;
  level: number;
  xpWithinLevel: number;
  achievements: string[];
  unlocks: string[];
  difficultyTier: 0 | 1 | 2;
  updatedAt: number;
  wins: number;
};

function gameKey(frameId: string): string {
  return `palabra.game.${frameId}.v1`;
}

function freshGameProgress(): GameProgress {
  return { v: 1, level: 1, xpWithinLevel: 0, achievements: [], unlocks: [], difficultyTier: 1, updatedAt: 0, wins: 0 };
}

/** Load one game's store; corrupt → fresh semantics, never a crash. */
export function loadGameProgress(frameId: string): GameProgress {
  if (typeof window === "undefined") return freshGameProgress();
  try {
    const raw = window.localStorage.getItem(gameKey(frameId));
    if (!raw) return freshGameProgress();
    const p = JSON.parse(raw) as Partial<GameProgress>;
    if (p.v !== 1 || typeof p.level !== "number" || !(p.level >= 1)) return freshGameProgress();
    return {
      ...freshGameProgress(),
      ...p,
      level: Math.max(1, Math.floor(p.level)),
      xpWithinLevel: Math.max(0, Math.floor(p.xpWithinLevel ?? 0)),
      achievements: Array.isArray(p.achievements) ? p.achievements.filter((a) => typeof a === "string") : [],
      unlocks: Array.isArray(p.unlocks) ? p.unlocks.filter((u) => typeof u === "string") : [],
      difficultyTier: p.difficultyTier === 0 || p.difficultyTier === 2 ? p.difficultyTier : 1,
      wins: Math.max(0, Math.floor(p.wins ?? 0)),
    };
  } catch {
    return freshGameProgress();
  }
}

/** §10.5 curve: xpForNextLevel(l) = round(base × min(2, 0.4 + 0.1(l−1))). */
export function xpForNextLevel(level: number, base: number): number {
  return Math.round(base * Math.min(2, 0.4 + 0.1 * (level - 1)));
}

/** Where the learner stands in one game: badge title «Nivel <n>» + pct. */
export function computeLevelProgress(gp: GameProgress, base: number): { level: number; pct: number; xpToNext: number; title: string } {
  const level = Math.min(20, gp.level);
  const need = xpForNextLevel(level, base);
  return {
    level,
    pct: level >= 20 ? 100 : Math.min(100, Math.round((gp.xpWithinLevel / need) * 100)),
    xpToNext: level >= 20 ? 0 : Math.max(0, need - gp.xpWithinLevel),
    title: `Nivel ${level}`,
  };
}

/** Win stats the frame engines assemble (§10.5 — the ONE stats shape). */
export type GameWinStats = {
  accuracy: number;
  maxStreak: number;
  replayHits: number;
  replayTotal: number;
  isScriptureBinding: boolean;
};

/** The §10.5 achievement taxonomy (generic ids; instances are the defaults).
 * recordGameWin is the only evaluator; unknown prefixes fail loudly. */
const ACHIEVEMENT_PREFIXES = [
  "primer-nivel",
  "sin-fallos",
  "racha-",
  "repaso-limpio",
  "maraton-",
  "adulto",
  "versiculo",
  "coleccionista",
] as const;

function assertKnownAchievement(id: string): void {
  if (!ACHIEVEMENT_PREFIXES.some((p) => (p.endsWith("-") ? id.startsWith(p) : id === p))) {
    throw new Error(`recordGameWin: unknown achievement id ${id}`);
  }
}

/** Cosmetic unlock ladder ids per level (template-declared instances). */
const UNLOCK_LEVELS: { level: number; id: string }[] = [
  { level: 3, id: "caja-madera" },
  { level: 8, id: "caja-cedro" },
  { level: 12, id: "caja-jade" },
  { level: 20, id: "corona" },
];

/**
 * Record ONE win in a game's own store: XP into the per-game curve (replays
 * pay half — pass the already-halved xpGained from completeLesson), level
 * ups, achievements evaluated from stats, cosmetic unlocks. Levels key on
 * frame.id only and never decrease; corrupt stores parse fresh. Recognition
 * only — achievements and unlocks unlock nothing. Returns the delta so the
 * frame can celebrate what is new.
 */
export function recordGameWin(
  frameId: string,
  xpGained: number,
  tier: 0 | 1 | 2,
  stats: GameWinStats,
): { progress: GameProgress; leveledUp: boolean; newAchievements: string[]; newUnlocks: string[] } {
  const gp = loadGameProgress(frameId);
  let level = gp.level;
  let xpWithinLevel = gp.xpWithinLevel + Math.max(0, Math.round(xpGained));
  let leveledUp = false;
  while (level < 20 && xpWithinLevel >= xpForNextLevel(level, 50)) {
    xpWithinLevel -= xpForNextLevel(level, 50);
    level += 1;
    leveledUp = true;
  }
  if (level >= 20) xpWithinLevel = Math.min(xpWithinLevel, xpForNextLevel(20, 50) - 1);

  const earned = new Set(gp.achievements);
  const newAchievements: string[] = [];
  const earn = (id: string): void => {
    assertKnownAchievement(id);
    if (!earned.has(id)) {
      earned.add(id);
      newAchievements.push(id);
    }
  };
  if (leveledUp) earn("primer-nivel");
  if (stats.accuracy >= 100) earn("sin-fallos");
  if (stats.maxStreak >= 3) earn("racha-3");
  if (stats.replayTotal > 0 && stats.replayHits >= stats.replayTotal) earn("repaso-limpio");
  const wins = gp.wins + 1;
  if (wins >= 5) earn("maraton-5");
  if (wins >= 25) earn("maraton-25");
  if (tier === 2 && stats.accuracy >= 100) earn("adulto");
  if (stats.isScriptureBinding) earn("versiculo");
  // auto capstone: every other declared achievement already earned
  const capstoneCandidates = [
    "primer-nivel",
    "sin-fallos",
    "racha-3",
    "repaso-limpio",
    "maraton-5",
    "maraton-25",
    "adulto",
  ].filter((id) => earned.has(id));
  if (capstoneCandidates.length >= 7) earn("coleccionista");

  const unlocks = new Set(gp.unlocks);
  const newUnlocks: string[] = [];
  for (const u of UNLOCK_LEVELS) {
    if (level >= u.level && !unlocks.has(u.id)) {
      unlocks.add(u.id);
      newUnlocks.push(u.id);
    }
  }

  const next: GameProgress = {
    v: 1,
    level,
    xpWithinLevel,
    achievements: [...earned],
    unlocks: [...unlocks],
    difficultyTier: tier,
    updatedAt: Date.now(),
    wins,
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(gameKey(frameId), JSON.stringify(next));
    } catch {
      // storage unavailable — the session still celebrates its win
    }
  }
  return { progress: next, leveledUp, newAchievements, newUnlocks };
}
