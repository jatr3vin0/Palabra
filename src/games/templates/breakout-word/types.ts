/**
 * «Ladrillos del Alfabeto» — the breakout-word seam between the Phaser island
 * and React (game #4, build/PORT-breakout-word.md; frame `ladrillos-alfabeto`,
 * ruling 2). Phaser-free, storage-free, voice-free (§10 invariant 6): React
 * holds the controller and owns progress/misses/speech (src/lib/storage.ts,
 * src/lib/voice.ts); the scene talks ONLY to the bridge.
 *
 * Source dispositions (build/GAME-source-pins.md #4, SHA c97ef8be, MIT —
 * sausi-7/games `games/arcade/breakoid`): static paddle + updateFromGameObject,
 * relative-hit ±75° bounce, per-frame speed clamp, open-bottom loss zone,
 * 1-second tick clock, pointer-drag paddle — the rules engine ports to
 * Phaser 3; the anonymous brick wall becomes the label-aware spelling loop
 * (the plan's ONE deep change, §3). Brick hits are the ONLY language events:
 * correct-next = the word progresses; out-of-order = bounce (never breaks);
 * decoy = breaks (board thins). Ball loss and clock expiry are MECHANICAL
 * (the knob'd ladder) and NEVER speak.
 */

/** One word-board: the word to spell + its bricks. Built by the pure builder
 * (rounds.ts) and seed-swept; the scene only renders and referees. */
export type BreakoutBoard = {
  /** The word being spelled — byte-identical es from the bound pool. */
  word: string;
  /** EN gloss (the immersion-faded caption). */
  en: string;
  /** The target bricks in SPOKEN order (letters or syllables). */
  seq: string[];
  /** Decoy labels — unique, never a seq label (no ambiguous brick). */
  decoys: string[];
  /** Grid capacity (rows × 5 cols); the board shrinks to its brick count. */
  rows: number;
  cols: number;
  /** Paddle width ratio (round knob × tier mul, floored — plan §2). */
  paddleRatio: number;
  /** Ball speed clamp px/s (tier anchor, ×0.8 on R1–R2 — plan §2). */
  ballMin: number;
  ballMax: number;
  /** Round clock, seconds (source code-default 60 anchor, tier-inverse). */
  timeLimit: number;
  /** Session round 1–5 (5 = adaptive replay, built at runtime). */
  wave: number;
  /** True when this board re-serves a word missed in another frame. */
  isReplay?: boolean;
};

/**
 * The bridge the scene receives. Wired in React:
 *   speak   → speakSpanish (instant-first device voice; kokoro substitution)
 *   onHit   → the COMPLETED WORD's es (contract-critical — never a letter or
 *             syllable; replay keys on word ids, byte-identical). Praise +
 *             clearMiss on replay rounds + advance to the next word-board.
 *   onMiss  → a language miss (decoy break or out-of-order graze, one event
 *             per brick per 250 ms): records the ROUND'S word, spends a
 *             heart, gentle speech + the chant re-spoken ~1.9 s later.
 *   onMechanical → ball below the bottom or the clock expired: the knob'd
 *             ladder (Niño keep / Normal reset / Adulto session restart —
 *             PORT §9 ruling 3). NO heart, NO miss, NO speech.
 *   onProgress → HUD clock (timeLeft seconds; null limit = no timer).
 *   onWin   → completeLesson + recordGameWin (both stores) + farewell speech
 *             (fired React-side when the last board clears; scene never calls it)
 */
export type BreakoutBridge = {
  params: { speed: number; difficulty: number; masteryThreshold: number };
  speak: (text: string) => void;
  onHit: (word: string) => void;
  onMiss: (word: string) => void;
  onMechanical?: () => void;
  onProgress?: (timeLeft: number, timeLimit: number | null) => void;
  onWin: (accuracy: number) => void;
};

/** What the scene implements; the controller forwards commands to it. */
export type BreakoutSceneApi = {
  /** Load a word-board (null clears). Launches after the chant watchdog. */
  playBoard: (board: BreakoutBoard | null) => void;
  /** Start the launch early (React calls it when the chant finishes). */
  launch: () => void;
  /** Mechanical keep-progress respawn: the ball returns, bricks stay. */
  respawnBall: () => void;
  showBanner: (title: string, sub?: string) => void;
  clear: () => void;
  celebrate: () => void;
};

/** What React holds: a stable command post that buffers until the scene boots. */
export type BreakoutHandle = BreakoutSceneApi;

/**
 * Command post — only the latest command of each kind matters (a queued board
 * is replaced by the next one before the scene even boots), so the scene
 * receives exactly the current state when it attaches.
 */
export function createController(): BreakoutHandle {
  let scene: BreakoutSceneApi | null = null;
  let pendingBoard: BreakoutBoard | null | undefined;
  let pendingLaunch = false;
  let pendingRespawn = false;
  let pendingBanner: { title: string; sub?: string } | null = null;
  let pendingCelebrate = false;

  function flush(): void {
    if (!scene) return;
    if (pendingBoard !== undefined) scene.playBoard(pendingBoard);
    if (pendingLaunch) scene.launch();
    if (pendingRespawn) scene.respawnBall();
    if (pendingBanner) scene.showBanner(pendingBanner.title, pendingBanner.sub);
    if (pendingCelebrate) scene.celebrate();
    pendingBoard = undefined;
    pendingLaunch = false;
    pendingRespawn = false;
    pendingBanner = null;
    pendingCelebrate = false;
  }

  return {
    playBoard(board) {
      pendingBoard = board;
      pendingLaunch = false; // a fresh board re-arms the launch
      if (scene) scene.playBoard(board);
    },
    launch() {
      pendingLaunch = true;
      if (scene) scene.launch();
    },
    respawnBall() {
      pendingRespawn = true;
      if (scene) scene.respawnBall();
    },
    showBanner(title, sub) {
      pendingBanner = { title, sub };
      if (scene) scene.showBanner(title, sub);
    },
    clear() {
      pendingBoard = null;
      if (scene) scene.clear();
    },
    celebrate() {
      pendingCelebrate = true;
      if (scene) scene.celebrate();
    },
    // Engine-only hook, stripped from the public type:
    __attach(sceneApi: BreakoutSceneApi) {
      scene = sceneApi;
      flush();
    },
  } as BreakoutHandle & { __attach: (scene: BreakoutSceneApi) => void };
}

/** Called by the engine once its scene is live. Not part of the public handle. */
export function attachScene(handle: BreakoutHandle, scene: BreakoutSceneApi): void {
  (handle as { __attach?: (s: BreakoutSceneApi) => void }).__attach?.(scene);
}
