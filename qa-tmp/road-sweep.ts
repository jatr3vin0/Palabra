/** QA sweep — ROAD-CROSS economy ruling (2026-11-11): every seeded round must
 * be WINNABLE WITH ZERO MISSES. Replays the REAL builders (rounds.ts) over
 * seeds × tiers × safe rows and asserts on each board:
 *   1. exactly ONE safe lane, labeled with the round's es, row 1–5;
 *   2. THE MISS ECONOMY, mirrored on the scene's ACTUAL rules:
 *        movement (the ladder + horizontal + pass-through decoy lanes) is
 *        FREE — entering a lane never fires the miss; the ONLY language miss
 *        is the GOAL ATTEMPT (the explicit leap: tap/space/gold centre) from
 *        a NON-SAFE lane, which fires ONCE per arming (re-arms on the safe
 *        lane; respawn/clock-retry re-arm unchanged); the win is the leap
 *        (up or the explicit leap) FROM the safe lane, straight to row 0;
 *   3. 'winnable with 0 misses': a BFS over those rules reaches the goal
 *      from the sidewalk start WITHOUT a single miss — and the wrong goal
 *      attempt IS reachable (the gentle line can fire in real play);
 *   4. same-seed rebuild is byte-identical (retryRound stays seed-true);
 *   5. knobs sane: carCount ≤ 4, speeds > 0, clock ≥ 1 s, options distinct,
 *      every labeled lane has an a0-u05 icon.
 */
import { buildRoadCrossBoard, buildRoadCrossRounds } from "../src/games/templates/road-cross-word/rounds";
import type { FrameDef } from "../src/lib/frames";
import { words as u05Words } from "../src/content/packs/a0-u05-sokoban";
const FRAME = { id: "camino-road-cross" } as FrameDef;
const LEVELS = [1, 16, 24]; // boost 0 / 1 / cap 2 → carCount 2..4

const PROGRESS: string[][] = [[], ["campo", "piedra", "norte"], ["hola", "campo", "árbol", "río", "serpiente", "castillo"]];

/** The scene's MISS-ECONOMY state machine, mirrored EXACTLY from index.ts
 * (rowAbove/rowBelow/tryLeap/onArrive). One state = (row, missArmed); columns
 * collapse — horizontal movement is free and gates nothing. */
type St = { row: number; armed: boolean };
const key = (s: St): string => `${s.row}|${s.armed ? 1 : 0}`;

let boards = 0;
let maxLabeled = 0;
let freePassBoards = 0;
const safeRowSeen = new Set<number>();

for (const p of PROGRESS) {
  for (const tier of [0, 1, 2] as const) {
    for (let sessionId = 0; sessionId < 60; sessionId++) {
      const rounds = buildRoadCrossRounds(FRAME, p, tier, sessionId);
      {
        const missCount = p.filter((w) => u05Words.has(w)).length;
        const expect = 4 + Math.max(1, Math.min(3, missCount));
        if (rounds.length !== expect) throw new Error(`round count ${rounds.length} ≠ ${expect} (session ${sessionId}, tier ${tier})`);
      }
      for (const [roundIdx, round] of rounds.entries()) {
        const level = LEVELS[roundIdx % LEVELS.length];
        const seed = `${FRAME.id}-L${level}-R${roundIdx}-T${tier}-S${sessionId}`;
        const board = buildRoadCrossBoard(round, roundIdx, tier, level, seed);
        const safeRow = board.lanes.findIndex((l) => l.safe) + 1;

        // (4) same-seed rebuild identical — retryRound stays seed-true
        const again = buildRoadCrossBoard(round, roundIdx, tier, level, seed);
        if (JSON.stringify(board) !== JSON.stringify(again)) throw new Error(`seed drift: ${seed}`);

        // (5) knobs
        if (board.lanes.length !== 5) throw new Error(`lanes ≠ 5: ${seed}`);
        if (board.carCount < 2 || board.carCount > 4) throw new Error(`carCount ${board.carCount}: ${seed}`);
        if (board.carSpeeds.some((s) => s <= 0) || board.timeLimit < 1) throw new Error(`knob: ${seed}`);
        if (new Set(round.options).size !== round.options.length) throw new Error(`duplicate options: ${seed}`);

        // (1) exactly one safe lane, labeled, row 1–5, word's icon exists
        if (safeRow < 1 || safeRow > 5) throw new Error(`no safe lane: ${seed}`);
        const safe = board.lanes[safeRow - 1];
        if (safe.es !== round.word) throw new Error(`safe label ≠ word: ${seed}`);
        if (!u05Words.has(safe.es!)) throw new Error(`safe es not in a0-u05: ${seed}`);
        const labeledCount = board.lanes.filter((l) => l.es !== null).length;
        if (labeledCount > maxLabeled) maxLabeled = labeledCount;
        safeRowSeen.add(safeRow);
        for (const l of board.lanes) {
          if (l.es !== null && !round.options.includes(l.es)) throw new Error(`lane es ∉ options: ${seed}`);
          if (l.safe && l.es === null) throw new Error(`unlabeled safe lane: ${seed}`);
        }
        if (board.lanes.filter((l) => l.safe).length !== 1) throw new Error(`multiple safe lanes: ${seed}`);

        // (2)+(3) THE MISS-ECONOMY INVARIANT — BFS over the scene's rules:
        // movement free (pass-through costs nothing), the ONLY miss = the
        // wrong goal attempt (armed once), the win = the leap from the safe
        // lane. 'winnable with 0 misses' = row 0 reachable with armed kept
        // true the whole way (no miss ever fired); the wrong attempt must
        // ALSO be reachable (the gentle line exists in real play).
        const start: St = { row: 6, armed: true };
        const seen = new Set<string>([key(start)]);
        const q: St[] = [start];
        let won = false;
        let missReachable = false;
        let passThroughSeen = false;
        /** Arriving on a lane re-arms the miss ONLY on the safe lane (ruling). */
        const arrive = (row: number, armed: boolean): St => ({ row, armed: row === safeRow ? true : armed });
        while (q.length > 0) {
          const st = q.shift()!;
          const push = (row: number, armed: boolean): void => {
            const ns = arrive(row, armed);
            const k = key(ns);
            if (!seen.has(k)) { seen.add(k); q.push(ns); }
          };
          if (st.row === safeRow) {
            won = true; // the leap (up or the explicit one) wins from here
            // movement away stays free: down re-enters the ladder (up IS the win)
            const down = st.row >= 2 ? st.row - 1 : 6;
            push(down, st.armed);
            continue;
          }
          // movement — ALWAYS free, never a language event:
          const up = st.row === 6 ? 1 : st.row >= 1 && st.row <= 4 ? st.row + 1 : null; // row 5: road top
          if (up !== null) {
            if (board.lanes[up - 1]?.es !== null && up !== safeRow) passThroughSeen = true; // a labeled decoy passed for free
            push(up, st.armed);
          }
          const down = st.row >= 2 && st.row <= 5 ? st.row - 1 : st.row === 1 ? 6 : null;
          if (down !== null) {
            if (board.lanes[down - 1]?.es !== null && down !== safeRow) passThroughSeen = true;
            push(down, st.armed);
          }
          // horizontal within a lane: free (columns collapse in this BFS)
          // THE GOAL ATTEMPT (tryLeap) from a lane:
          if (st.row >= 1 && st.row <= 5) {
            if (st.row !== safeRow) {
              if (st.armed) {
                missReachable = true; // the gentle line fires ONCE per arming
                push(st.row, false); // disarmed; re-arms on returning to the safe lane
              }
              // an unarmed repeat = a mechanical nudge (state unchanged)
            }
          }
        }
        if (!won) throw new Error(`NOT winnable: ${seed}`);
        // The wrong attempt needs a reachable WRONG lane — every board with the
        // safe lane on row ≥ 2 has one (the climb passes lane 1); a row-1 safe
        // lane leaves no wrong lane at all, so the gentle line simply never
        // fires there (the round is one climb + one leap).
        if (!missReachable && safeRow > 1) throw new Error(`wrong goal attempt unreachable: ${seed}`);
        boards++;
        if (passThroughSeen) freePassBoards++;
      }
    }
  }
}

if (![1, 2, 3, 4, 5].every((r) => safeRowSeen.has(r))) {
  throw new Error(`safe-lane shuffle never covered rows: ${[...safeRowSeen].join(",")}`);
}
console.log(`SWEEP PASS: ${boards} boards (3 progress × 3 tiers × 60 sessions × all rounds)`);
console.log(`  safe-lane rows covered: ${[...safeRowSeen].sort().join(",")} · max labeled lanes: ${maxLabeled}`);
console.log(`  every round WINNABLE WITH 0 MISSES · wrong goal attempt reachable · labeled-decoy pass-through used free on ${freePassBoards} boards`);
