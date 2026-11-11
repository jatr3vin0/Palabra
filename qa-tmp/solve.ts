/** QA solver — offline board generation + push-solver for the REAL live seeds
 * (almacen-palabra, level 1, child tier T0, boards R1–R5). Emits the arrow-key
 * plan the browser QA replays. Matches FrameGame knobs exactly. Crates are
 * placed sequentially in the LIVE state (orderings searched); tiles are never
 * crossed except as a crate's own goal. */
import { generateBoard } from "../src/games/templates/sokoban-word/board-data";
import { seededShuffle } from "../src/lib/answer";
import { waveIds, nearFormDecoys } from "../src/content/packs/a0-u05-sokoban";
import { writeFileSync, mkdirSync } from "node:fs";

const FRAME = "almacen-palabra";
const L = 1;
const TIER = 0;
const BOARD_GRIDS = [6, 7, 8, 8, 8];
const BOARD_WALLS = [0.06, 0.1, 0.13, 0.16, 0.12];
const BOARD_DECOYS = [1, 2, 2, 3, 2];
const BOARD_PAIRS = [2, 2, 3, 3, 3];
const SOKO_DECOY_CAP = 4;
const tierMul = [0.7, 1, 1.1];

type Cell = { x: number; y: number };
const KEY = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"] as const; // dy -1 / +1, dx -1 / +1
const DIRS = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
];
function perms<T>(a: T[]): T[][] {
  if (a.length <= 1) return [a];
  const out: T[][] = [];
  for (let i = 0; i < a.length; i++) {
    const rest = [...a.slice(0, i), ...a.slice(i + 1)];
    for (const p of perms(rest)) out.push([a[i], ...p]);
  }
  return out;
}

const plan: { board: string; seed: string; size: number; pairs: string[]; pushes: number; steps: string[] }[] = [];
const roundPairs: string[][] = [];

for (let r = 0; r < 5; r++) {
  let pairs: string[];
  let decoyBase: number;
  if (r < 4) {
    pairs = seededShuffle(waveIds(r + 1), `${FRAME}-r${r}`).slice(0, BOARD_PAIRS[r]);
    roundPairs.push(pairs);
    decoyBase = BOARD_DECOYS[r];
  } else {
    // Review board: seededShuffle(rounds.flatMap(pairs), `${id}-review-0`).slice(0,3)
    pairs = seededShuffle(roundPairs.flat(), `${FRAME}-review-0`).slice(0, 3);
    decoyBase = 2;
  }
  const decoyCount = Math.min(SOKO_DECOY_CAP, Math.max(1, Math.round(decoyBase * tierMul[TIER])));
  const decoys = nearFormDecoys(pairs, decoyCount, seededShuffle, `${FRAME}-d${r}-t${TIER}-s0`);
  const ramp = Math.min(9 - BOARD_GRIDS[r], Math.floor(L / 2));
  const size = Math.max(5, Math.min(9, Math.round(BOARD_GRIDS[r] * tierMul[TIER]) + Math.max(0, ramp)));
  const moveBudget = r >= 3 ? Math.round(size * size * 2.4 * [1.5, 1, 0.75][TIER]) : 0;
  const seed = `${FRAME}-L${L}-R${r}-T${TIER}`;
  const b = generateBoard({ size, targets: pairs, decoys, wallDensity: Math.min(BOARD_WALLS[r], 0.16), moveBudget, seed });

  const n = b.size;
  const isWall = (x: number, y: number): boolean => x < 0 || y < 0 || x >= n || y >= n || b.walls[y][x];
  const crates = new Map<string, Cell>([...b.targets, ...b.decoys].map((c) => [c.es, { x: c.x, y: c.y }]));
  const tiles = new Map<string, Cell>(b.tiles.map((t) => [t.es, { x: t.x, y: t.y }]));

  const solve = (): { steps: string[]; pushes: number } => {
    // Joint player+crate BFS (arrow key = one move; a push is a move into a
    // crate with a free cell behind it). Merged crates (on their own tile)
    // are locked — they can never be pushed again, matching the frame.
    const at = (c: Cell): number => c.y * n + c.x;
    const tileOf = new Map([...tiles]);
    const onTile = (es: string, c: Cell): boolean => {
      const t = tileOf.get(es);
      return !!t && t.x === c.x && t.y === c.y;
    };
    type State = { p: Cell; crates: Map<string, Cell>; from: State | null; via: number; push: boolean };
    const crateAt = (m: Map<string, Cell>, x: number, y: number): string | null =>
      [...m.entries()].find(([, c]) => c.x === x && c.y === y)?.[0] ?? null;
    const enc = (p: Cell, cr: Map<string, Cell>): string => {
      const parts = [...cr.entries()].filter(([es]) => !onTile(es, cr.get(es)!)).map(([es, c]) => `${es}:${at(c)}`).sort();
      return `${p.y * n + p.x}|${parts.join(",")}`;
    };
    const startCrates = new Map(crates);
    const init: State = { p: { ...b.player }, crates: startCrates, from: null, via: -1, push: false };
    const seen = new Set<string>([enc(init.p, init.crates)]);
    const q: State[] = [init];
    let goal: State | null = null;
    const targetSet = new Set(b.targets.map((t) => t.es));
    const done = (st: State): boolean => [...st.crates.entries()].filter(([es]) => targetSet.has(es)).every(([es, c]) => onTile(es, c));
    if (done(init)) goal = init;
    outer: while (q.length > 0) {
      const cur = q.shift()!;
      for (let di = 0; di < 4; di++) {
        const d = DIRS[di];
        const nx = cur.p.x + d.dx;
        const ny = cur.p.y + d.dy;
        if (isWall(nx, ny)) continue;
        const hit = crateAt(cur.crates, nx, ny);
        const nextCrates = new Map(cur.crates);
        let push = false;
        if (hit) {
          const c = nextCrates.get(hit)!;
          if (onTile(hit, c)) continue; // merged crates are locked
          const bx = nx + d.dx;
          const by = ny + d.dy;
          if (isWall(bx, by) || crateAt(cur.crates, bx, by)) continue;
          nextCrates.set(hit, { x: bx, y: by });
          push = true;
        }
        const st: State = { p: { x: nx, y: ny }, crates: nextCrates, from: cur, via: di, push };
        const k = enc(st.p, st.crates);
        if (seen.has(k)) continue;
        seen.add(k);
        if (done(st)) {
          goal = st;
          break outer;
        }
        q.push(st);
      }
    }
    if (!goal) throw new Error("joint BFS found no solution");
    const moves: number[] = [];
    let pushes = 0;
    for (let st: State | null = goal; st.from; st = st.from) {
      moves.push(st.via);
      if (st.push) pushes++;
    }
    moves.reverse();
    return { steps: moves.map((di) => KEY[di]), pushes };
  };

  const solved = solve();
  if (moveBudget > 0 && solved.pushes > moveBudget) throw new Error(`budget overrun ${seed}: ${solved.pushes} > ${moveBudget}`);
  plan.push({ board: `R${r + 1}`, seed, size: n, pairs: [...pairs], pushes: solved.pushes, steps: solved.steps });
  console.log(`R${r + 1} (${n}×${n}, ${pairs.length}T/${decoys.length}D, budget ${moveBudget || "∞"}): ${solved.pushes} pushes, ${solved.steps.length} keys`);
}

mkdirSync("/tmp/soko-qa", { recursive: true });
const totalKeys = plan.reduce((a, p) => a + p.steps.length, 0);
const totalMs = totalKeys * 170 + 4 * 4200 + 2500;
writeFileSync("/tmp/soko-qa/plan.json", JSON.stringify({ plan, totalKeys, estMs: totalMs }, null, 1));
console.log(`plan written: ${totalKeys} keys, est ${Math.round(totalMs / 1000)}s`);
