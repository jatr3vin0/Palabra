/**
 * «Empuja la Palabra» — the sokoban-word seam between the Phaser island and
 * React (game #7, build/PORT-sokoban-word.md; frame `almacen-palabra`, R7-6).
 *
 * This module is deliberately Phaser-free: React holds the controller (and
 * can queue commands) before the lazily-imported engine has booted. The scene
 * talks ONLY to the bridge — storage, progress and all audio stay in React
 * (src/lib/storage.ts, src/lib/voice.ts), per the integration contract
 * (GAME-ROADMAP §10 invariant 6: templates import nothing from storage/voice).
 *
 * Source dispositions (build/GAME-source-pins.md, SHAs 98ca2ade + 9f08ca75):
 * the rules engine ports prateek121's grid-push math to Phaser 3 (8×8 grid,
 * crate-on-goal completion, RESTART-only, no undo, no move limit source-true);
 * swipe is a PATTERN-ONLY Phaser 3 re-implementation of noowxela's pointer
 * gesture (R7-7 — zero copied code); d-pad is the road-cross-shape addition.
 */

import type { PackWord } from "~/content/packs/a0-packs";

/** One board: the target pair ids + decoy es ids (R7-3, R7-5). */
export type SokobanRound = {
  /** The board's target es ids — byte-identical from the a0-u05 pack. */
  pairs: string[];
  /** Pushable obstacles that can never occupy a meaning tile (within-pool). */
  decoys: string[];
  /** Pack conformance: the round's word pool (target ∪ decoys). */
  options: string[];
  /** Session wave 1–5 (5 = adaptive replay, built at runtime). */
  wave: number;
  /** True when this board re-serves words missed in another frame. */
  isReplay?: boolean;
};

/**
 * The bridge object the scene receives. Wired in React:
 *   speak   → speakSpanish (kokoro, speechSynthesis fallback)
 *   onHit   → the COMPLETED PAIR's es (R7-3 — early completion counts);
 *             praise speech; on replay boards clearMiss(p, word)
 *   onMiss  → ALWAYS the NAMED pair's es (R7-3); loseHeart(recordMiss(p,
 *             named, frame.id)) + gentle speech + re-speak ~1.9 s later.
 *             Wrong-tile pushes bounce back scene-side (R7-5); wall/crate
 *             blocked pushes are silent mechanical — they NEVER call onMiss.
 *   onWin   → completeLesson + recordGameWin (both stores) + farewell speech
 */
export type SokobanBridge = {
  params: { speed: number; difficulty: number; masteryThreshold: number };
  speak: (text: string) => void;
  onHit: (word: string) => void;
  onMiss: (word: string) => void;
  onWin: (accuracy: number) => void;
  /** Push HUD (moves used / budget left; null budget = unlimited). */
  onProgress?: (movesUsed: number, budgetLeft: number | null) => void;
  /** Move-budget expiry → mechanical board restart, no language event. */
  onBudgetExpired?: () => void;
};

/** What the scene implements; the controller forwards commands to it. */
export type SokobanSceneApi = {
  /** Load a board (null clears). namedEs = the pair the session names now. */
  playBoard: (board: SokobanBoard | null, namedEs: string | null) => void;
  /** Re-point the named pair without rebuilding the board. */
  namePair: (namedEs: string | null) => void;
  showBanner: (title: string, sub?: string) => void;
  clear: () => void;
  celebrate: () => void;
};

/** What React holds: a stable command post that buffers until the scene boots. */
export type SokobanHandle = SokobanSceneApi;

/** A generated board: walls, player start, crates and meaning tiles. */
export type SokobanBoard = {
  /** Grid is square (5–9 per the knob map; source anchor 8×8). */
  size: number;
  /** walls[y][x] — internal walls are a port-side generator feature
   * (source-true: prateek121 boards have ZERO internal walls, pins #7). */
  walls: boolean[][];
  player: { x: number; y: number };
  /** Target crates: one per pair, es byte-identical from the pack. */
  targets: { es: string; x: number; y: number }[];
  /** Decoy crates: pushable obstacles, never matched to a tile. */
  decoys: { es: string; x: number; y: number }[];
  /** Meaning tiles: one per pair, the crate's matching destination. */
  tiles: { es: string; x: number; y: number }[];
  /** Move budget for this board (0 = none — R1–R3, source-true). */
  moveBudget: number;
};

/**
 * Command post — only the latest command of each kind matters (a queued board
 * is replaced by the next one before the scene even boots), so the scene
 * receives exactly the current state when it attaches.
 */
export function createController(): SokobanHandle {
  let scene: SokobanSceneApi | null = null;
  let pendingBoard: { board: SokobanBoard | null; namedEs: string | null } | undefined; // undefined = none queued
  let pendingName: string | null | undefined;
  let pendingBanner: { title: string; sub?: string } | null = null;
  let pendingClear = false;
  let pendingCelebrate = false;

  function flush(): void {
    if (!scene) return;
    if (pendingBoard !== undefined) scene.playBoard(pendingBoard.board, pendingBoard.namedEs);
    if (pendingName !== undefined) scene.namePair(pendingName);
    if (pendingBanner) scene.showBanner(pendingBanner.title, pendingBanner.sub);
    if (pendingCelebrate) scene.celebrate();
    pendingBoard = undefined;
    pendingName = undefined;
    pendingBanner = null;
    pendingClear = false;
    pendingCelebrate = false;
  }

  return {
    playBoard(board, namedEs) {
      pendingBoard = { board, namedEs };
      if (scene) scene.playBoard(board, namedEs);
    },
    namePair(namedEs) {
      pendingName = namedEs;
      if (scene) scene.namePair(namedEs);
    },
    showBanner(title, sub) {
      pendingBanner = { title, sub };
      if (scene) scene.showBanner(title, sub);
    },
    clear() {
      pendingClear = true;
      if (scene) scene.clear();
    },
    celebrate() {
      pendingCelebrate = true;
      if (scene) scene.celebrate();
    },
    // Engine-only hook, stripped from the public type:
    __attach(sceneApi: SokobanSceneApi) {
      scene = sceneApi;
      flush();
    },
  } as SokobanHandle & { __attach: (scene: SokobanSceneApi) => void };
}

/** Called by the engine once its scene is live. Not part of the public handle. */
export function attachScene(handle: SokobanHandle, scene: SokobanSceneApi): void {
  (handle as { __attach?: (s: SokobanSceneApi) => void }).__attach?.(scene);
}

/** The binder's word row: pack bytes + the procedural icon key. */
export type SokobanWord = PackWord & { icon: string };
