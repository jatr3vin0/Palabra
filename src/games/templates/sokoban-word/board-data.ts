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

/** Generate + validate a board. Throws (loud) if 200 attempts all fail —
 * that is a data bug, never a child's unsolvable board. */
export function generateBoard(p: BoardParams): SokobanBoard {
  const base = hashSeed(p.seed);
  let lastError = "no attempt";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rand = mulberry32(base + Math.imul(attempt + 1, 0x9e3779b9));
    try {
      return buildOnce(p, rand);
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(
    `sokoban-board: no valid board for seed "${p.seed}" (${p.size}×${p.size}, ${p.targets.length} targets, ` +
      `${p.decoys.length} decoys, walls ${p.wallDensity}) — last error: ${lastError}`,
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
