/**
 * «¡Cruza la Calle!» — the road-cross-word seam between the Phaser island and
 * React (game #3, build/PORT-road-cross-word.md; frame `camino-road-cross`,
 * ruling 5 reconciliation).
 *
 * Phaser-free, storage-free, voice-free (§10 invariant 6): React holds the
 * controller, owns progress/misses/speech (src/lib/storage.ts, src/lib/voice.ts);
 * the scene talks ONLY to the bridge. The a0-u05 pool, waves and the shared
 * icon table come from the pack binder (~/content/packs/a0-u05-sokoban.ts —
 * R7-4: ONE a0-u05 table for every u05-bound template; road-cross joins it at
 * this landing).
 *
 * Source dispositions (build/GAME-source-pins.md, SHA c97ef8be, MIT —
 * sausi-7/games `games/arcade/road-cross`): hop-one-tile grid, 5 car lanes with
 * per-lane speeds + alternating directions + wrap-around, car overlap = death,
 * countdown timer, d-pad — the rules engine ports to Phaser 3; anonymous lanes
 * become the spoken-command safe lane (the plan's ONE deep change). Car hit and
 * timeout are MECHANICAL (no language event); the ONLY language miss is the
 * explicit GOAL ATTEMPT (the leap) from a non-safe lane (economy ruling
 * 2026-11-11 — pass-through lane entry costs nothing); the goal is entered
 * ONLY by the leap from the safe lane.
 */

import type { PackWord } from "~/content/packs/a0-packs";

/** One round: the SAFE lane word + the lane label pool (target first). */
export type RoadCrossRound = {
  /** The safe lane — the word the spoken command names (byte-identical es). */
  word: string;
  /** Lane label pool: the round's target + within-pool decoys (word first). */
  options: string[];
  /** Session wave 1–5 (5 = adaptive replay, built at runtime). */
  wave: number;
  /** True when this round re-serves a word missed in another frame. */
  isReplay?: boolean;
};

/** One lane row, bottom → top. `es: null` = an unlabeled plain road lane. */
export type RoadCrossLane = {
  /** Lane label id (byte-identical es) — null when the lane carries no word. */
  es: string | null;
  /** The safe lane: the one labeled round.word (never a row index — invariant 2). */
  safe: boolean;
};

/** A generated crossing: lanes, traffic and the tier-scaled clock. */
export type RoadCrossBoard = {
  /** Exactly 5 lanes, bottom → top (source geometry stays). */
  lanes: RoadCrossLane[];
  /** Per-lane car speed px/s (base [220,260,280,300,330] × tier, plan knob 1). */
  carSpeeds: number[];
  /** Cars per lane (source formula 2 + ⌊level/2⌋ folded into the knob). */
  carCount: number;
  /** Crossing clock, seconds (25 standard; ≈42 child / ≈18 adult, ruling 2). */
  timeLimit: number;
};

/**
 * The bridge the scene receives. Wired in React:
 *   speak   → speakSpanish (instant-first device voice; kokoro substitution)
 *   onHit   → the SAFE crossing completed: ALWAYS the round's es id
 *             (CONTRACT-CRITICAL — never a lane index; replay keys on word ids);
 *             praise speech; on replay rounds clearMiss(p, word)
 *   onMiss → the WRONG GOAL ATTEMPT (economy ruling 2026-11-11): the player
 *             tried the explicit leap (tap/space/gold d-pad centre) for the
 *             grass from a NON-SAFE lane. Payload = the WRONG lane's es
 *             ("" when that lane is unlabeled); React speaks the gentle line
 *             naming BOTH lanes' words (wrong + target), records the ROUND'S
 *             word + a heart, and re-speaks the command ~1.9 s later. Fires at
 *             most once per wrong choice (re-arms on the safe lane / respawn /
 *             round reload). Pass-through lane entry NEVER calls onMiss
 *             (movement is free); car hits and the timeout NEVER call onMiss
 *             (mechanical).
 *   onWin   → completeLesson + recordGameWin (both stores) + farewell speech
 *             (fired React-side when the last round clears; scene never calls it)
 *   onProgress → HUD clock (timeLeft seconds; null limit = no timer)
 *   onTimeExpired → clock ran out: MECHANICAL loss — session retries the round,
 *             no heart, no miss (language vs gaming skill separation, §8:219)
 */
export type RoadCrossBridge = {
  params: { speed: number; difficulty: number; masteryThreshold: number };
  speak: (text: string) => void;
  onHit: (word: string) => void;
  onMiss: (word: string) => void;
  onWin: (accuracy: number) => void;
  onProgress?: (timeLeft: number, timeLimit: number | null) => void;
  onTimeExpired?: () => void;
};

/** What the scene implements; the controller forwards commands to it. */
export type RoadCrossSceneApi = {
  /** Load a crossing (null clears). commandEs = the safe lane's word. */
  playBoard: (board: RoadCrossBoard | null, commandEs: string | null) => void;
  showBanner: (title: string, sub?: string) => void;
  clear: () => void;
  celebrate: () => void;
};

/** What React holds: a stable command post that buffers until the scene boots. */
export type RoadCrossHandle = RoadCrossSceneApi;

/**
 * Command post — only the latest command of each kind matters (a queued board
 * is replaced by the next one before the scene even boots), so the scene
 * receives exactly the current state when it attaches.
 */
export function createController(): RoadCrossHandle {
  let scene: RoadCrossSceneApi | null = null;
  let pendingBoard: { board: RoadCrossBoard | null; commandEs: string | null } | undefined;
  let pendingBanner: { title: string; sub?: string } | null = null;
  let pendingCelebrate = false;

  function flush(): void {
    if (!scene) return;
    if (pendingBoard !== undefined) scene.playBoard(pendingBoard.board, pendingBoard.commandEs);
    if (pendingBanner) scene.showBanner(pendingBanner.title, pendingBanner.sub);
    if (pendingCelebrate) scene.celebrate();
    pendingBoard = undefined;
    pendingBanner = null;
    pendingCelebrate = false;
  }

  return {
    playBoard(board, commandEs) {
      pendingBoard = { board, commandEs };
      if (scene) scene.playBoard(board, commandEs);
    },
    showBanner(title, sub) {
      pendingBanner = { title, sub };
      if (scene) scene.showBanner(title, sub);
    },
    clear() {
      pendingBoard = { board: null, commandEs: null };
      if (scene) scene.clear();
    },
    celebrate() {
      pendingCelebrate = true;
      if (scene) scene.celebrate();
    },
    // Engine-only hook, stripped from the public type:
    __attach(sceneApi: RoadCrossSceneApi) {
      scene = sceneApi;
      flush();
    },
  } as RoadCrossHandle & { __attach: (scene: RoadCrossSceneApi) => void };
}

/** Called by the engine once its scene is live. Not part of the public handle. */
export function attachScene(handle: RoadCrossHandle, scene: RoadCrossSceneApi): void {
  (handle as { __attach?: (s: RoadCrossSceneApi) => void }).__attach?.(scene);
}

/** The binder's word row: pack bytes + the procedural icon key (R7-4 table). */
export type RoadCrossWord = PackWord & { icon: string };
