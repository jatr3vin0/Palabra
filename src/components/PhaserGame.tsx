import { useEffect, useRef, type ReactNode } from "react";

/** A lazily-imported game module (mechanic-keyed). The island is the seam:
 * each frame types its own bridge/handle at its call site; the module's
 * createGame receives them untyped here. */
type GameModule = {
  createGame: (parent: HTMLElement, bridge: unknown, ctrl: unknown, opts?: unknown) => { destroy: (removeCanvas?: boolean) => void };
};

/**
 * The Phaser canvas island (game route + mission overlays). Phaser is
 * lazy-imported here — the engine never enters the village bundle, and
 * exactly one game instance exists at a time, destroyed on unmount. React
 * keeps ownership of progress and audio; the canvas talks through the bridge
 * + command controller only. `loader` picks the mechanic's module (default:
 * game #1's shooter); `opts` rides to createGame.
 */
export function PhaserIsland({
  bridge,
  ctrl,
  loader,
  opts,
}: {
  bridge: unknown;
  ctrl: unknown;
  loader?: () => Promise<GameModule>;
  opts?: unknown;
}): ReactNode {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let disposed = false;
    let game: { destroy: (removeCanvas?: boolean) => void } | null = null;
    void (async () => {
      const mod: GameModule = await (loader ? loader() : import("~/games/sky-words"));
      if (disposed || !hostRef.current) return;
      game = mod.createGame(hostRef.current, bridge, ctrl, opts);
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
