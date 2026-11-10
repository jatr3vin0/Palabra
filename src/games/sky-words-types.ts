/**
 * Capitán Rico: Sky Words — the seam between the Phaser island and React.
 *
 * This module is deliberately Phaser-free: React holds the controller (and
 * thus can queue commands) before the lazily-imported engine has booted. The
 * scene talks ONLY to the bridge — storage, progress and all audio stay in
 * React (src/lib/storage.ts, src/lib/voice.ts), per the integration contract.
 */

/** One formation: the target word plus the enemy words descending with it. */
export type SkyWordRound = {
  word: string;
  /** Enemy labels; the entry equal to `word` is the target. Pre-shuffled. */
  options: string[];
  /** Replay rounds clear a recorded miss when hit. */
  isReplay?: boolean;
};

/**
 * The bridge object the scenes receive. Wired in React:
 *   speak   → speakSpanish (kokoro, speechSynthesis fallback)
 *   onHit   → praise speech; on replay rounds clearMiss(p, word)
 *   onMiss  → loseHeart(recordMiss(p, round.word, frame.id)) + gentle speech
 *             + re-speak of round.say ~1.9 s later (fresh formation)
 *   onWin   → completeLesson(p, frame.id, frame.xp, accuracy) + farewell speech
 */
export type SkyWordsBridge = {
  params: { speed: number; difficulty: number; masteryThreshold: number };
  speak: (text: string) => void;
  onHit: (word: string) => void;
  onMiss: (word: string) => void;
  onWin: (accuracy: number) => void;
};

/** What the scene implements; the controller forwards commands to it. */
export type SkyWordsSceneApi = {
  playRound: (round: SkyWordRound | null) => void;
  showBanner: (title: string, sub?: string) => void;
  clear: () => void;
  celebrate: () => void;
};

/** What React holds: a stable command post that buffers until the scene boots. */
export type SkyWordsHandle = {
  playRound: (round: SkyWordRound | null) => void;
  showBanner: (title: string, sub?: string) => void;
  clear: () => void;
  celebrate: () => void;
};

/**
 * Command post — only the latest command of each kind matters (a queued round
 * is replaced by the next one before the scene even boots), so the scene
 * receives exactly the current state when it attaches.
 */
export function createController(): SkyWordsHandle {
  let scene: SkyWordsSceneApi | null = null;
  let pendingRound: SkyWordRound | null | undefined; // undefined = none queued
  let pendingBanner: { title: string; sub?: string } | null = null;
  let pendingClear = false;
  let pendingCelebrate = false;

  function flush(): void {
    if (!scene) return;
    if (pendingRound !== undefined) scene.playRound(pendingRound);
    else if (pendingClear) scene.clear();
    if (pendingBanner) scene.showBanner(pendingBanner.title, pendingBanner.sub);
    if (pendingCelebrate) scene.celebrate();
    pendingRound = undefined;
    pendingBanner = null;
    pendingClear = false;
    pendingCelebrate = false;
  }

  return {
    playRound(round) {
      pendingRound = round;
      pendingClear = round === null;
      if (scene) scene.playRound(round);
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
    __attach(sceneApi: SkyWordsSceneApi) {
      scene = sceneApi;
      flush();
    },
  } as SkyWordsHandle & { __attach: (scene: SkyWordsSceneApi) => void };
}

/** Called by the engine once its scene is live. Not part of the public handle. */
export function attachScene(handle: SkyWordsHandle, scene: SkyWordsSceneApi): void {
  (handle as { __attach?: (s: SkyWordsSceneApi) => void }).__attach?.(scene);
}
