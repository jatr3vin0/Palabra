/**
 * «Empuja la Palabra» board data — the seeded generator + push-reachability
 * validator (PORT-sokoban-word.md §6). Pure geometry: no Phaser, no React,
 * no storage. A board the validator rejects never reaches a child — failure
 * is a loud generation-time error, not an unsolvable room.
 *
 * Calibration (R7-1 pins, SHA 98ca2ade): the source's 3 sparse levels live on
 * a FIXED 8×8 grid with ZERO internal walls and DIFFICULTY = level-ORDER
 * permutations — so every grid/walls/decoy knob here is a port-side feature
 * and the source's sparse crate/goal/player layouts are the spacing reference.
 * Completion ports crate-on-goal → crate-on-ITS-tile (R7-3/R7-5).
 */

import type { SokobanBoard } from "./types";

// ── deterministic PRNG (same shape as lib/answer.ts — SSR-safe, reproducible) ─

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
  };
}

export type BoardParams = {
  /** Square grid edge: 5–9 (R1 6×6 … Adulto anchor 9×9; source mid 8×8). */
  size: number;
  /** Target es ids, one crate + one meaning tile each (byte-identical). */
  targets: string[];
  /** Decoy es ids (within-pool obstacles). */
  decoys: string[];
  /** Internal-wall density 0–0.2 (source-true rooms have 0 — port feature). */
  wallDensity: number;
  /** Push budget for this board; 0 = unlimited (R1–R3, source-true). */
  moveBudget: number;
  /** hash(frameId, storedLevel, roundIndex, tier) — same seed, same board. */
  seed: string;
};

const MAX_ATTEMPTS = 200;
/** Per-rung budget once knobs have relaxed (each rung is a fresh PRNG stream). */
const RELAX_ATTEMPTS = 50;
/** A board always carries at least ONE target crate (0 is a data bug, not a
 * tier seed — guarded in generateBoard). */
const TARGET_FLOOR = 1;

/** One rung of the relaxation ladder: the knobs as they stand for a pass. */
type Knobs = { wallDensity: number; decoyCount: number; targetCount: number };

/**
 * The knob-relaxation ladder, in the DOCUMENTED ORDER every seed follows
 * (board-4 dead-end fix, R7-QA): a legitimate tier seed must always return a
 * board, never throw to the error boundary. When a pass exhausts its attempt
 * budget, the knobs relax one rung and generation retries — walls first
 * (the purest port-side feature; 0 walls is the source-true room), then
 * decoys (obstacles go before objectives), then — LAST resort — targets
 * toward the floor of 1. Later rungs keep earlier relaxations. The last-rung
 * room (no walls, no decoys, 1 target) validates with probability ≈1, so the
 * ladder does not bottom out; if it ever does, the throw is a data-bug
 * report, not a child's unsolvable board. Rungs are pure functions of the
 * params — the same seed always walks the same ladder and returns the same
 * board (the frame reads the returned board's targets back as the round's
 * effective pairs when the target rung fires).
 */
function relaxLadder(p: BoardParams): Knobs[] {
  const rungs: Knobs[] = [
    { wallDensity: p.wallDensity, decoyCount: p.decoys.length, targetCount: p.targets.length },
  ];
  // 1. wall density DOWN: halve per rung until 0 (≤0.03 rounds to 0).
  let wd = p.wallDensity;
  while (wd > 0) {
    wd = wd <= 0.03 ? 0 : Math.round((wd / 2) * 1000) / 1000;
    rungs.push({ wallDensity: wd, decoyCount: p.decoys.length, targetCount: p.targets.length });
  }
  // 2. decoys DOWN: one per rung toward the floor of 0 (walls stay 0).
  for (let d = p.decoys.length - 1; d >= 0; d--) {
    rungs.push({ wallDensity: 0, decoyCount: d, targetCount: p.targets.length });
  }
  // 3. targets DOWN: one per rung toward the TARGET_FLOOR (last resort).
  for (let t = p.targets.length - 1; t >= TARGET_FLOOR; t--) {
    rungs.push({ wallDensity: 0, decoyCount: 0, targetCount: t });
  }
  return rungs;
}

/** Generate + validate a board. Never throws for a legitimate tier seed:
 * the relaxation ladder above relaxes knobs rung by rung until one pass
 * validates. A throw means a data bug (e.g. zero pairs) or a ladder that
 * bottomed out — a loud generation-time error, never an unsolvable room. */
export function generateBoard(p: BoardParams): SokobanBoard {
  if (p.targets.length < TARGET_FLOOR) {
    throw new Error(`sokoban-board: seed "${p.seed}" has ${p.targets.length} targets — a data bug, not a tier seed`);
  }
  const base = hashSeed(p.seed);
  let lastError = "no attempt";
  const ladder = relaxLadder(p);
  for (let rung = 0; rung < ladder.length; rung++) {
    const k = ladder[rung];
    const relaxed = rung > 0;
    const attempts = relaxed ? RELAX_ATTEMPTS : MAX_ATTEMPTS;
    for (let attempt = 0; attempt < attempts; attempt++) {
      // Rung 0 keeps the exact historical stream (rung term is 0), so seeds
      // that already generated stay byte-identical; relaxed rungs shift the
      // stream so each rung explores fresh placements.
      const rand = mulberry32(base + Math.imul(attempt + 1, 0x9e3779b9) + Math.imul(rung, 0x85ebca6b));
      try {
        const board = buildOnce(
          {
            ...p,
            wallDensity: k.wallDensity,
            decoys: p.decoys.slice(0, k.decoyCount),
            targets: p.targets.slice(0, k.targetCount),
          },
          rand,
        );
        if (relaxed) {
          console.warn(
            `sokoban-board: relaxed knobs for seed "${p.seed}" (rung ${rung}: walls ${k.wallDensity}, ` +
              `${k.decoyCount} decoys, ${k.targetCount} targets) — first rung error: ${lastError}`,
          );
        }
        return board;
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
      }
    }
  }
  throw new Error(
    `sokoban-board: relaxation ladder exhausted for seed "${p.seed}" ` +
      `(${p.size}×${p.size}, ${p.targets.length} targets, ${p.decoys.length} decoys) — data bug, please report; ` +
      `last error: ${lastError}`,
  );
}

type Cell = { x: number; y: number };

function buildOnce(p: BoardParams, rand: () => number): SokobanBoard {
  const n = p.size;
  const at = (c: Cell): number => c.y * n + c.x;

  // 1. internal walls (port-side feature; the bounds do source-true blocking)
  const walls: boolean[][] = Array.from({ length: n }, () => Array<boolean>(n).fill(false));
  const wallCount = Math.min(Math.floor(n * n * p.wallDensity), Math.floor(n * n * 0.2));
  let placedWalls = 0;
  let guard = 0;
  while (placedWalls < wallCount && guard++ < n * n * 8) {
    const c = { x: Math.floor(rand() * n), y: Math.floor(rand() * n) };
    if (!walls[c.y][c.x]) {
      walls[c.y][c.x] = true;
      placedWalls++;
    }
  }

  // Occupied-cell ledger (player + crates) — MUST exist before the first
  // pickFree() call: pickFree reads it, so declaring it any later is a TDZ
  // ReferenceError on EVERY board (caught live in the sokoban QA play-check;
  // the minifier only renames it — the bug is in the source order).
  const taken = new Set<number>();

  // 2. meaning tiles — one per pair, never occupied at start
  const tiles: { es: string; x: number; y: number }[] = [];
  const tileSet = new Set<number>();
  for (const es of p.targets) {
    const c = pickFree();
    tiles.push({ es, x: c.x, y: c.y });
    tileSet.add(at(c));
  }

  // 3. player start — free, off the tiles
  const player = pickFree();
  taken.add(at(player));

  // 4. target crates — one per tile, never ON a tile, never on the player
  const targets = p.targets.map((es) => {
    const c = pickFree();
    taken.add(at(c));
    return { es, x: c.x, y: c.y };
  });

  // 5. decoys — obstacles that may never sit on a meaning tile either
  const decoys = p.decoys.map((es) => {
    const c = pickFree();
    taken.add(at(c));
    return { es, x: c.x, y: c.y };
  });

  function pickFree(): Cell {
    const free: Cell[] = [];
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (walls[y][x] || tileSet.has(at({ x, y })) || taken.has(at({ x, y }))) continue;
        free.push({ x, y });
      }
    }
    if (free.length === 0) throw new Error("no free cell left");
    return free[Math.floor(rand() * free.length)];
  }

  const board: SokobanBoard = {
    size: n,
    walls,
    player: { x: player.x, y: player.y },
    targets,
    decoys,
    tiles,
    moveBudget: p.moveBudget,
  };
  validateBoard(board);
  return board;
}

// ── the validator (generation-time throw) ───────────────────────────────────

const DIRS: { dx: number; dy: number }[] = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
];

function validateBoard(b: SokobanBoard): void {
  const n = b.size;
  const isWall = (x: number, y: number): boolean => x < 0 || y < 0 || x >= n || y >= n || b.walls[y][x];
  const crateAt = (x: number, y: number): boolean =>
    [...b.targets, ...b.decoys].some((c) => c.x === x && c.y === y);
  const tileAt = (x: number, y: number): boolean => b.tiles.some((t) => t.x === x && t.y === y);

  // meaning tiles never start occupied
  for (const t of b.tiles) {
    if (isWall(t.x, t.y)) throw new Error(`tile ${t.es} on a wall`);
    if (crateAt(t.x, t.y)) throw new Error(`tile ${t.es} starts occupied`);
    if (b.player.x === t.x && b.player.y === t.y) throw new Error(`player starts on tile ${t.es}`);
  }
  // player never starts inside something
  if (isWall(b.player.x, b.player.y) || crateAt(b.player.x, b.player.y)) throw new Error("player start blocked");

  // no crate starts pinned in a corner (a cornered crate can never move)
  const cornered = (x: number, y: number): boolean => {
    const vBlocked = isWall(x, y - 1) || isWall(x, y + 1);
    const hBlocked = isWall(x - 1, y) || isWall(x + 1, y);
    return vBlocked && hBlocked;
  };
  for (const c of [...b.targets, ...b.decoys]) {
    if (isWall(c.x, c.y)) throw new Error(`crate ${c.es} inside a wall`);
    if (tileAt(c.x, c.y)) throw new Error(`crate ${c.es} starts on a meaning tile`);
    if (cornered(c.x, c.y)) throw new Error(`crate ${c.es} starts pinned in a corner`);
  }

  // every TARGET crate has a legal-push route to ITS tile (other crates static)
  for (const crate of b.targets) {
    const tile = b.tiles.find((t) => t.es === crate.es);
    if (!tile) throw new Error(`crate ${crate.es} has no matching tile`);
    if (!pushRouteExists(b, crate, tile)) {
      throw new Error(`crate ${crate.es} has no legal-push route to its tile`);
    }
  }
}

/** BFS over push positions for ONE crate (other crates static); each push
 * step additionally requires the pusher cell to be player-reachable. */
function pushRouteExists(
  b: SokobanBoard,
  crate: { es: string; x: number; y: number },
  tile: { x: number; y: number },
): boolean {
  const n = b.size;
  const isWall = (x: number, y: number): boolean => x < 0 || y < 0 || x >= n || y >= n || b.walls[y][x];
  const others = [...b.targets, ...b.decoys].filter((c) => !(c.x === crate.x && c.y === crate.y));
  const otherAt = (x: number, y: number): boolean => others.some((c) => c.x === x && c.y === y);

  const playerCanReach = (to: Cell, crateCell: Cell): boolean => {
    const from = { x: b.player.x, y: b.player.y };
    if (from.x === to.x && from.y === to.y) return true;
    const blocked = (x: number, y: number): boolean =>
      isWall(x, y) || otherAt(x, y) || (x === crateCell.x && y === crateCell.y);
    const seen = new Set<number>([from.y * n + from.x]);
    const q: Cell[] = [from];
    while (q.length > 0) {
      const cur = q.shift()!;
      for (const d of DIRS) {
        const nx = cur.x + d.dx;
        const ny = cur.y + d.dy;
        const key = ny * n + nx;
        if (seen.has(key) || blocked(nx, ny)) continue;
        if (nx === to.x && ny === to.y) return true;
        seen.add(key);
        q.push({ x: nx, y: ny });
      }
    }
    return false;
  };

  const start = `${crate.x},${crate.y}`;
  const goal = `${tile.x},${tile.y}`;
  const seen = new Set([start]);
  const q: Cell[] = [{ x: crate.x, y: crate.y }];
  while (q.length > 0) {
    const cur = q.shift()!;
    for (const d of DIRS) {
      const pushFrom = { x: cur.x - d.dx, y: cur.y - d.dy };
      const dest = { x: cur.x + d.dx, y: cur.y + d.dy };
      if (isWall(dest.x, dest.y) || otherAt(dest.x, dest.y)) continue;
      if (isWall(pushFrom.x, pushFrom.y) || otherAt(pushFrom.x, pushFrom.y)) continue;
      if (!playerCanReach(pushFrom, cur)) continue;
      const key = `${dest.x},${dest.y}`;
      if (seen.has(key)) continue;
      if (key === goal) return true;
      seen.add(key);
      q.push(dest);
    }
  }
  return false;
}
