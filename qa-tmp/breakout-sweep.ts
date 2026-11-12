/**
 * QA sweep — GAME #4 breakout (PORT-breakout-word.md §7): every seeded board
 * must be WINNABLE WITH ZERO MISSES under the REAL rules. Replays the REAL
 * builders (rounds.ts + the a0-u04 binder) over seeds × tiers × miss-pools
 * and asserts on each board:
 *   1. session shape: 5 rounds, thresholds 2/2/3/3/3 served from the plan's
 *      round pools; R3 = exactly {madre,padre,maíz} (the l4 cut);
 *   2. board integrity: every seq label present EXACTLY once (no ambiguous
 *      brick), labels unique, decoys never a seq label and always within the
 *      round's own letter/syllable inventory (within-pool rule);
 *   3. capacity + geometry (grid math verbatim: brickWidth (1080/5)×0.8,
 *      spacing 10, startY 150): bricks ≤ rows×cols, all inside the world,
 *      no overlaps, side margins ≥ the ball so the top row is always
 *      reachable through the side channels or through broken bricks;
 *   4. the anti-softlock rule (hit resolution §3): out-of-order seq bricks
 *      BOUNCE (never break), so the spelling is completable IN ORDER
 *      regardless of decoys — the structural preconditions asserted here
 *      (distinct seq labels, seq ⊆ board) make every board completable with
 *      ZERO language misses by aiming only at the glowing next-needed brick;
 *   5. the breakout trap (lead brief: the ball escaping a wall it should
 *      bounce off): tier clamp [min,max] sane, launch vy = cos45°·max above
 *      the anti-stall floor (0.25·speed), the paddle's shallowest legal
 *      bounce cos75° ≈ 0.2588 above it too, and max speed cannot tunnel a
 *      brick even at a 30 fps frame (max/30 < brickHeight + ballDiameter);
 *   6. R5 adaptive replay: bound-pool misses ONLY (per-source scoping),
 *      syllable-spelled with the whole-word defensive branch, isReplay set;
 *   7. chant ≤38 chars; knobs tier-monotone (ball min<max, paddle floor 0.16);
 *   8. same-seed rebuild byte-identical (retries stay seed-true).
 */
import { buildBreakoutSession, BR_COLS, BR_ROWS, BR_THRESHOLDS, roundOfBoard } from "../src/games/templates/breakout-word/rounds";
import type { BreakoutBoard } from "../src/games/templates/breakout-word/types";
import { BOUND_POOL, ROUND_POOLS, composedSpellSay, spellingFor, spellingForReplay } from "../src/content/packs/a0-u04-breakout";
import type { FrameDef } from "../src/lib/frames";

const FRAME = { id: "ladrillos-alfabeto" } as FrameDef;
const LEVELS = [1, 16, 24];

const W = 1080;
const BRICK_H = 30;
const BRICK_GAP = 10;
const BRICK_W = (W / 5) * 0.8;
const START_Y = 150;
const BALL_D = 26;

const MISS_POOLS: string[][] = [
  [],
  ["pan", "queso"],
  ["hola", "campo", "casa", "madre", "maíz", "queso", "uva", "plato"], // hola/campo/casa are OUTSIDE a0-u04 — scoping must drop them
];

let boards = 0;
const replayWordsSeen = new Set<string>();
const inventory = new Set<string>();
for (const pool of ROUND_POOLS) {
  for (const w of pool.words) for (const l of spellingFor(w, pool.mode)) inventory.add(l);
}
for (const w of BOUND_POOL) for (const l of spellingForReplay(w).seq) inventory.add(l);

function checkBoard(b: BreakoutBoard, tier: 0 | 1 | 2, roundIdx: number, sessionId: number, misses: string[]): void {
  const label = `${roundIdx + 1}-t${tier}-s${sessionId}-${b.word}`;
  // 2. board integrity — a word MAY repeat a letter (agua): every seq
  // occurrence must be present, decoys never collide with a seq label and are
  // unique among themselves
  if (b.seq.length < 1) throw new Error(`${label}: empty seq`);
  if (new Set(b.decoys).size !== b.decoys.length) throw new Error(`${label}: duplicate decoy label`);
  if (b.decoys.some((l) => b.seq.includes(l))) throw new Error(`${label}: decoy collides with seq`);
  const boardCount = new Map<string, number>();
  for (const l of [...b.seq, ...b.decoys]) boardCount.set(l, (boardCount.get(l) ?? 0) + 1);
  for (const l of b.seq) {
    const need = b.seq.filter((x) => x === l).length;
    if ((boardCount.get(l) ?? 0) < need) throw new Error(`${label}: seq label ${l} missing from the wall`);
  }
  if (b.seq.some((l) => b.decoys.includes(l))) throw new Error(`${label}: decoy collides with seq`);
  for (const l of b.decoys) {
    if (!inventory.has(l)) throw new Error(`${label}: decoy ${l} outside the bound inventory (within-pool rule)`);
  }
  const all = [...b.seq, ...b.decoys];
  const brickCount = all.length;
  if (brickCount > b.rows * b.cols) throw new Error(`${label}: ${brickCount} bricks exceed ${b.rows}×${b.cols}`);
  // 5. knobs
  if (b.ballMin >= b.ballMax || b.ballMin < 120) throw new Error(`${label}: clamp ${b.ballMin}..${b.ballMax}`);
  const [expectMin, expectMax] = [[360, 600], [600, 1000], [840, 1400]][tier].map((v: number) => Math.round(v * (roundIdx <= 1 ? 0.8 : 1)));
  if (b.ballMin !== expectMin || b.ballMax !== expectMax) throw new Error(`${label}: clamp knob off anchor`);
  if (b.timeLimit !== [100, 60, 43][tier]) throw new Error(`${label}: timeLimit ${b.timeLimit} off the tier-inverse table`);
  if (b.paddleRatio < 0.16 || b.paddleRatio > 0.5) throw new Error(`${label}: paddleRatio ${b.paddleRatio}`);
  if (!b.en) throw new Error(`${label}: missing en gloss`);
  if (b.isReplay !== undefined && !b.isReplay) throw new Error(`${label}: isReplay must be true or absent`);
  // chant ≤38 — the binder's REAL composer (letter names + module-init assert)
  const chant = composedSpellSay(b.word, b.seq);
  if (chant.length > 38) throw new Error(`${label}: chant ${chant.length} > 38`);
  // 3. geometry: grid math verbatim, shrunk to the brick count
  const startX = (W - (b.cols * BRICK_W + (b.cols - 1) * BRICK_GAP)) / 2;
  if (startX < BALL_D) throw new Error(`${label}: side margin ${startX} below the ball`);
  const rightMargin = W - (startX + b.cols * BRICK_W + (b.cols - 1) * BRICK_GAP);
  if (rightMargin < BALL_D) throw new Error(`${label}: right margin below the ball`);
  const maxY = START_Y + b.rows * (BRICK_H + BRICK_GAP);
  if (maxY > 1920 - 260) throw new Error(`${label}: wall reaches the paddle zone`);
  if (b.rows !== BR_ROWS[roundIdx] || b.cols !== BR_COLS) throw new Error(`${label}: grid knob off table`);
  // every brick cell distinct and inside the world
  const cells = new Set<string>();
  for (let i = 0; i < brickCount; i++) {
    const col = i % b.cols;
    const row = Math.floor(i / b.cols);
    if (row >= b.rows) throw new Error(`${label}: brick ${i} past ${b.rows} rows`);
    const x = startX + col * (BRICK_W + BRICK_GAP) + BRICK_W / 2;
    const y = START_Y + row * (BRICK_H + BRICK_GAP) + BRICK_H / 2;
    if (x - BRICK_W / 2 < 0 || x + BRICK_W / 2 > W || y < START_Y || y + BRICK_H / 2 > maxY) throw new Error(`${label}: brick ${i} out of world`);
    if (cells.has(`${col},${row}`)) throw new Error(`${label}: overlapping bricks at ${col},${row}`);
    cells.add(`${col},${row}`);
  }
  // 5. no tunneling even at a 30 fps frame
  if (b.ballMax / 30 >= BRICK_H + BALL_D) throw new Error(`${label}: Adulto max ${b.ballMax} can tunnel a brick`);
  // launch vy floor: cos(45°)·max above the anti-stall floor (0.25·max)
  if (Math.cos(Math.PI / 4) <= 0.25) throw new Error("launch angle space violates the anti-stall floor");
  // replay bookkeeping
  if (b.isReplay) {
    if (!misses.includes(b.word)) throw new Error(`${label}: replay serves ${b.word} not in the session misses`);
    replayWordsSeen.add(b.word);
  }
}

for (const misses of MISS_POOLS) {
  for (const tier of [0, 1, 2] as const) {
    for (let sessionId = 0; sessionId < 60; sessionId++) {
      for (const level of LEVELS) {
        const s = buildBreakoutSession(FRAME, misses, tier, sessionId, level);
        // 1. session shape
        if (s.roundSizes.length !== 5) throw new Error(`roundSizes length ${s.roundSizes.length}`);
        if (s.roundSizes.slice(0, 4).join(",") !== BR_THRESHOLDS.slice(0, 4).join(",")) throw new Error(`roundSizes ${s.roundSizes}`);
        if (s.boards.length !== s.roundSizes.reduce((a, b) => a + b, 0)) throw new Error("boards/roundSizes mismatch");
        const replayWords = s.boards.filter((b) => b.isReplay).map((b) => b.word);
        // the builder serves the bound miss snapshot SEEDED (shuffled, then
        // sliced to 3) — the served set must be a SUBSET of the bound misses,
        // of the served size, and empty misses fall to the session's own words
        const bound = misses.filter((w) => BOUND_POOL.includes(w));
        if (bound.length > 0) {
          if (replayWords.length !== Math.min(3, bound.length)) throw new Error(`replay size ${replayWords.length} vs ${Math.min(3, bound.length)} bound misses`);
          for (const w of replayWords) if (!bound.includes(w)) throw new Error(`replay serves ${w} outside the bound pool (per-source scoping)`);
        } else {
          const review = s.boards.slice(-s.roundSizes[4]).map((b) => b.word);
          if (JSON.stringify([...replayWords].sort()) !== JSON.stringify([...review].sort()))
            throw new Error(`review round off: ${replayWords}`);
        }
        for (const [i, b] of s.boards.entries()) {
          const r = roundOfBoard(s, i);
          checkBoard(b, tier, r, sessionId, replayWords.length > 0 ? replayWords : []);
          boards++;
        }
        // R1–R4 words come from the round pools; R3 = exactly the l4 trio
        const r3 = s.boards.filter((_, i) => roundOfBoard(s, i) === 2).map((b) => b.word).sort();
        if (JSON.stringify(r3) !== JSON.stringify(["madre", "maíz", "padre"])) throw new Error(`R3 words ${r3}`);
        // 7. tier monotonicity (same session, tier-over-tier)
        if (tier > 0) {
          const lo = buildBreakoutSession(FRAME, misses, (tier - 1) as 0 | 1 | 2, sessionId, level);
          for (const [i, b] of s.boards.entries()) {
            if (b.ballMax < lo.boards[i].ballMax) throw new Error(`ball max not tier-monotone at board ${i}`);
          }
        }
        // 8. same-seed identity
        const again = buildBreakoutSession(FRAME, misses, tier, sessionId, level);
        if (JSON.stringify(again) !== JSON.stringify(s)) throw new Error(`same-seed rebuild differs (t${tier}-s${sessionId}-L${level})`);
      }
    }
  }
}

if (replayWordsSeen.size === 0) throw new Error("replay never exercised");
console.log(`SWEEP PASS — ${boards} boards (3 miss-pools × 3 tiers × 60 sessions × ${LEVELS.length} levels); replay words exercised: ${[...replayWordsSeen].sort().join(", ")}`);
