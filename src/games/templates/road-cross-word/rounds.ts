/**
 * «¡Cruza la Calle!» — the PURE round/board builders of the road-cross session
 * (game #3). Pulled out of RoadCrossFrame.tsx so the seeded winnability sweep
 * (qa-tmp/road-sweep.ts) exercises the REAL generation code, exactly like
 * sokoban's board-data.ts. No React, no storage, no voice: given a Progress
 * snapshot they are deterministic functions of the seed.
 *
 * R1–R4 come from the a0-u05 pack waves (the round's word = the seeded safe
 * lane; decoys from the word's own curated options — the pack pairs
 * piedra/roca, camino/castillo, norte/oeste); R5 is adaptive replay (up to
 * three one-word rounds from progress.misses ∩ a0-u05; empty → one seeded
 * review round). The safe lane is identified BY LABEL (=== round.word), never
 * a row index (invariant 2).
 */
import { seededShuffle } from "~/lib/answer";
import type { FrameDef } from "~/lib/frames";
import { nearFormDecoys, waveIds, wordFor } from "~/content/packs/a0-u05-sokoban";
import { curve } from "./curve";
import type { RoadCrossBoard, RoadCrossRound } from "./types";

/** Per-round knob tables (PORT-road-cross-word.md knob map; R3 anchors pinned
 * in GAME-source-pins.md #3: speeds [220,260,280,300,330], 25 s, 5 rows). */
export const RC_BASE_SPEEDS = [220, 260, 280, 300, 330];
export const RC_STANDARD_TIME = 25;
/** difficulty → labeled lanes per round: child 3 (target + 2 decoys) → adult 5. */
export const RC_LANES_BY_TIER = [3, 4, 5];

/** Article per a0-u05 word (-a feminine, else masculine — includes el norte…). */
function articleFor(es: string): string {
  return es.endsWith("a") ? "la" : "el";
}

/** The composed TPR command (≤38 chars), COMPOSED at session time, never stored. */
export function composedCrossSay(es: string): string {
  return `¡Cruza por ${articleFor(es)} ${es.toUpperCase()}!… ${es}.`;
}

/** a0-u05 per-source scoping: other packs' misses serve ONLY u05-bound frames. */
export function wordForSafe(es: string): boolean {
  try {
    return wordFor(es).es === es;
  } catch {
    return false;
  }
}

/** The session's rounds (PORT §3). `missWords` = the a0-u05 miss snapshot the
 * SESSION started with (the frame snapshots it — the rounds/board must stay
 * IDENTICAL across the session's progress writes, or every miss would reset
 * the round mid-crossing). Mastery thresholds live in the frame (RC_THRESHOLDS). */
export function buildRoadCrossRounds(frame: FrameDef, missWords: string[], tier: 0 | 1 | 2, sessionId: number): RoadCrossRound[] {
  const labeled = RC_LANES_BY_TIER[tier];
  const rounds: RoadCrossRound[] = [];
  const sessionWords: string[] = [];
  for (let r = 1; r <= 4; r++) {
    const wave = waveIds(r);
    const word = seededShuffle(wave, `${frame.id}-r${r}-t${tier}-s${sessionId}`)[0];
    sessionWords.push(word);
    const decoys = nearFormDecoys([word], labeled - 1, seededShuffle, `${frame.id}-r${r}-d-t${tier}-s${sessionId}`);
    rounds.push({ word, options: [word, ...decoys], wave: r });
  }
  // R5 — adaptive replay: the session-start a0-u05 misses return as safe-lane
  // words (one round each; hit clears the miss, a decoy entry re-records it).
  const replays = seededShuffle(missWords.filter((w) => wordForSafe(w)), `${frame.id}-replay-${sessionId}`).slice(0, 3);
  const replayWords = replays.length > 0 ? replays : [seededShuffle(sessionWords, `${frame.id}-review-${sessionId}`)[0]];
  for (const [i, word] of replayWords.entries()) {
    const decoys = nearFormDecoys([word], Math.min(4, labeled - 1), seededShuffle, `${frame.id}-replay${i}-t${tier}-s${sessionId}`);
    rounds.push({ word, options: [word, ...decoys], wave: 5, isReplay: true });
  }
  return rounds;
}

/** Build the crossing (content stays out of the scene): lane labels onto
 * seeded rows, tier-scaled speeds/clock, source car-count formula. */
export function buildRoadCrossBoard(round: RoadCrossRound, roundIdx: number, tier: 0 | 1 | 2, level: number, seed: string): RoadCrossBoard {
  const labeledRows = seededShuffle([0, 1, 2, 3, 4], `${seed}-rows`).slice(0, Math.min(5, round.options.length));
  const words = seededShuffle(round.options, `${seed}-words`);
  const lanes = Array.from({ length: 5 }, (_, l): { es: string | null; safe: boolean } => {
    const slot = labeledRows.indexOf(l);
    const es = slot >= 0 ? words[slot % words.length] : null;
    return { es, safe: es === round.word };
  });
  const tierMul = [0.6, 1, 1.4][tier];
  const boost = Math.min(curve.ramp.carCap, Math.floor(level / 8)) * curve.ramp.carBoostPer8Levels;
  const difficulty = roundIdx + 1 + boost;
  return {
    lanes,
    carSpeeds: RC_BASE_SPEEDS.map((s) => Math.round(s * tierMul)),
    carCount: Math.min(4, 2 + Math.floor(difficulty / 2)),
    timeLimit: Math.round(RC_STANDARD_TIME / tierMul),
  };
}
