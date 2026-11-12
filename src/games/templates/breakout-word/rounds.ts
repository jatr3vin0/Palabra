/**
 * «Ladrillos del Alfabeto» — the PURE board builders of the breakout session
 * (game #4). Pulled out of BreakoutFrame.tsx so the seeded winnability sweep
 * (qa-tmp/breakout-sweep.ts) exercises the REAL generation code, exactly like
 * sokoban's board-data.ts and road-cross's rounds.ts. No React, no storage,
 * no voice, no Phaser: given a miss snapshot they are deterministic functions
 * of the seed.
 *
 * R1–R4 come from the round pools of the binder (PORT-breakout-word.md §2:
 * R1 {pan,sal,uva} serves 2 · R2 {miel,agua} both · R3 {madre,padre,maíz} all
 * three · R4 syllables serves 3 of 6); R5 is adaptive replay (up to three
 * boards from progress.misses ∩ the bound pool, syllable-spelled with the
 * whole-word defensive branch; empty → a seeded review board). Every board is
 * one WORD: seq bricks + seeded decoys fill the grid capacity.
 */
import { seededShuffle } from "~/lib/answer";
import type { FrameDef } from "~/lib/frames";
import {
  ROUND_POOLS,
  boundSafe,
  composedSpellSay,
  decoysFor,
  inventoryFor,
  replayInventories,
  spellingFor,
  spellingForReplay,
  wordRow,
} from "~/content/packs/a0-u04-breakout";
import { curve } from "./curve";
import type { BreakoutBoard } from "./types";

// ── knob tables (PORT §2; the R3 column = the pinned source anchor) ─────────

/** Grid capacity: 5 cols × rows per round (R3 5×5 = the source anchor). */
export const BR_COLS = 5;
export const BR_ROWS = [2, 3, 5, 3, 4];
/** Paddle width ratio per round (source anchor 0.25 at R3). */
export const BR_PADDLE_RATIO = [0.34, 0.3, 0.25, 0.25, 0.22];
/** Tier paddle multipliers: ×1.2 Niño / ×1.0 / ×0.85 Adulto, floor 0.16. */
export const BR_TIER_PADDLE_MUL = [1.2, 1, 0.85];
export const BR_PADDLE_FLOOR = 0.16;
/** Words to spell per round (masteryThreshold; supersedes winScore 250). */
export const BR_THRESHOLDS = [2, 2, 3, 3, 3];
/** Ball speed clamp px/s per tier (source [600,1000]; ×0.8 on R1–R2). */
export const BR_TIER_CLAMP: [number, number][] = [
  [360, 600],
  [600, 1000],
  [840, 1400],
];
/** The round clock: source code-default 60 s (config timeLimit 2 is a broken
 * tuning, pins #4), tier-inverse 100/60/43 s — all rounds (plan §2). */
export const BR_TIME_LIMITS = [100, 60, 43];

/** Mechanical ball-loss ladder (PORT §3 + §9 ruling 3): Niño respawn-keep ·
 * Normal R1–R2 keep / R3–R5 reset · Adulto session restart. */
export function keepsProgress(roundIdx: number, tier: 0 | 1 | 2): boolean {
  if (tier === 0) return true;
  if (tier === 1) return roundIdx <= 1;
  return false;
}

export type BreakoutSession = {
  /** The flat word-boards, in play order (round boundaries = roundSizes). */
  boards: BreakoutBoard[];
  /** Boards per round (length 5; the last round serves what replay has). */
  roundSizes: number[];
};

/** Round index of a flat board index, or -1 past the end. */
export function roundOfBoard(session: BreakoutSession, boardIdx: number): number {
  let acc = 0;
  for (let r = 0; r < session.roundSizes.length; r++) {
    acc += session.roundSizes[r];
    if (boardIdx < acc) return r;
  }
  return -1;
}

/** The tier-scaled ball clamp for a round (R1–R2 anchor ×0.8). */
export function ballClamp(roundIdx: number, tier: 0 | 1 | 2): [number, number] {
  const [min, max] = BR_TIER_CLAMP[tier];
  const f = roundIdx <= 1 ? 0.8 : 1;
  return [Math.round(min * f), Math.round(max * f)];
}

/** The tier+ramp paddle ratio for a round (plan §2 + §10.5 ramp, floored). */
export function paddleRatio(roundIdx: number, tier: 0 | 1 | 2, level: number): number {
  const shrink = Math.min(4, Math.floor(level / 8)) * curve.ramp.paddleShrinkPer8Levels;
  const raw = BR_PADDLE_RATIO[roundIdx] * BR_TIER_PADDLE_MUL[tier] - shrink / 100;
  return Math.max(BR_PADDLE_FLOOR, Math.round(raw * 1000) / 1000);
}

/** The composed chant (binder's ≤38-asserted composer). */
export function boardSay(board: BreakoutBoard): string {
  return composedSpellSay(board.word, board.seq);
}

/**
 * The session's boards (PORT §3). `missWords` = the miss snapshot the SESSION
 * started with (the frame snapshots it — boards stay IDENTICAL across the
 * session's progress writes). Tier scales the mechanical knobs only; content
 * stays A0 at every tier.
 */
export function buildBreakoutSession(frame: FrameDef, missWords: string[], tier: 0 | 1 | 2, sessionId: number, level: number): BreakoutSession {
  const boards: BreakoutBoard[] = [];
  const roundSizes: number[] = [];
  const sessionWords: string[] = [];

  for (let r = 0; r < 4; r++) {
    const pool = ROUND_POOLS[r];
    const chosen = seededShuffle(pool.words, `${frame.id}-r${r + 1}-t${tier}-s${sessionId}`).slice(0, BR_THRESHOLDS[r]);
    const inv = inventoryFor(pool.words, pool.mode);
    roundSizes.push(chosen.length);
    for (const word of chosen) {
      sessionWords.push(word);
      boards.push(makeBoard(frame, word, spellingFor(word, pool.mode), inv, r, tier, sessionId, false, level));
    }
  }

  // R5 — adaptive replay: bound-pool misses return, syllable-spelled (the
  // 1-syllable defensive branch serves the whole word as one brick).
  const replays = seededShuffle(missWords.filter(boundSafe), `${frame.id}-replay-${sessionId}`).slice(0, 3);
  const replayWords = replays.length > 0 ? replays : seededShuffle(sessionWords, `${frame.id}-review-${sessionId}`).slice(0, 3);
  const inv5 = replayInventories();
  roundSizes.push(replayWords.length);
  for (const word of replayWords) {
    const { seq } = spellingForReplay(word);
    boards.push(makeBoard(frame, word, seq, seq.length === 1 ? inv5.whole : inv5.syllables, 4, tier, sessionId, true, level));
  }
  return { boards, roundSizes };
}

/** One word-board: seq bricks + seeded unique decoys up to the grid capacity. */
function makeBoard(
  frame: FrameDef,
  word: string,
  seq: string[],
  inventory: string[],
  roundIdx: number,
  tier: 0 | 1 | 2,
  sessionId: number,
  isReplay: boolean,
  level: number,
): BreakoutBoard {
  const rows = BR_ROWS[roundIdx];
  const cap = rows * BR_COLS - seq.length;
  const decoys = decoysFor(seq, inventory, cap, `${frame.id}-b${roundIdx}-${word}-t${tier}-s${sessionId}`);
  const [ballMin, ballMax] = ballClamp(roundIdx, tier);
  return {
    word,
    en: wordRow(word).en,
    seq,
    decoys,
    rows,
    cols: BR_COLS,
    paddleRatio: paddleRatio(roundIdx, tier, level),
    ballMin,
    ballMax,
    timeLimit: BR_TIME_LIMITS[tier],
    wave: roundIdx + 1,
    isReplay: isReplay || undefined,
  };
}
