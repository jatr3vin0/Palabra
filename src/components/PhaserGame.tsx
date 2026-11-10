import { useEffect, useRef, type ReactNode } from "react";

import type { SkyWordsBridge, SkyWordsHandle } from "~/games/sky-words-types";

/**
 * The Phaser canvas island (game route only). Phaser is lazy-imported here —
 * the engine never enters the village bundle, and exactly one game instance
 * exists at a time, destroyed on unmount. React keeps ownership of progress
 * and audio; the canvas talks through the bridge + command controller only.
 */
export function PhaserIsland({ bridge, ctrl }: { bridge: SkyWordsBridge; ctrl: SkyWordsHandle }): ReactNode {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let disposed = false;
    let game: { destroy: (removeCanvas?: boolean) => void } | null = null;
    void (async () => {
      const mod = await import("~/games/sky-words");
      if (disposed || !hostRef.current) return;
      game = mod.createGame(hostRef.current, bridge, ctrl);
    })();
    return () => {
      disposed = true;
      game?.destroy(true);
      game = null;
    };
    // One game per island lifetime; bridge/ctrl are stable objects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The host div is where Phaser mounts its canvas; it renders nothing itself.
  return <div ref={hostRef} className="absolute inset-0 overflow-hidden rounded-3xl bg-sky-300" />;
}
