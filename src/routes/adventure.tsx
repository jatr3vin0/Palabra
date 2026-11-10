import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { StatsBar, useProgress } from "~/components/Chrome";
import { FrameGame, type MissionResult } from "~/components/FrameGame";
import { stopSpeaking, speakSpanish } from "~/lib/voice";
import { castParams, type VoiceKey } from "~/lib/voiceCast";

export const Route = createFileRoute("/adventure")({
  component: Adventure,
});

/**
 * The adventure front: Eldoria's world (public/eldoria — Phaser 3) runs inside
 * an iframe and stays mounted while mini-games open on top of it, so location,
 * inventory, quest flags and progress survive every mission exactly.
 *
 * Bridge (see public/eldoria/src/palabra.js):
 *   world → app : palabra:hello | palabra:speak | palabra:openMission
 *   app → world : palabra:context | palabra:missionOpen | palabra:missionResult
 *                 | palabra:duck
 * Learning records (XP/mastery/misses) live in the app's storage.ts — the
 * world only keeps Eldoria flags for its own dialogue gating.
 */
type MissionRequest = {
  id: string;
  npc: string;
  game: string;
  frameId: string;
  contentBinding: string;
  difficulty: string;
  proficiency: { cefr: string; unit: string; vocab: string[]; masteryThreshold: number };
  reward: { gems: number };
  doneFlag: string;
};

function Adventure() {
  const [p] = useProgress();
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [mission, setMission] = useState<MissionRequest | null>(null);
  const [booted, setBooted] = useState(false);
  const missionRef = useRef<MissionRequest | null>(null);
  const duckedRef = useRef(false);
  /** Missions completed during this overlay session (avoid double reward posts). */
  const completedRef = useRef<Set<string>>(new Set());

  const postTo = useCallback((msg: Record<string, unknown>) => {
    frameRef.current?.contentWindow?.postMessage({ source: "palabra-app", ...msg });
  }, []);

  const duck = useCallback(
    (on: boolean) => {
      if (duckedRef.current === on) return;
      duckedRef.current = on;
      postTo({ type: "palabra:duck", on });
    },
    [postTo],
  );

  // ── world → app messages ────────────────────────────────────────────────
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const msg = e.data as Record<string, unknown> | null;
      if (!msg || msg.source !== "palabra-world") return;
      switch (msg.type) {
        case "palabra:hello": {
          setBooted(true);
          postTo({ type: "palabra:context", englishLevel: p?.englishLevel ?? 0 });
          break;
        }
        case "palabra:speak": {
          // Voice-first: every world line is spoken through kokoro with the
          // speaker's cast voice; the chiptune ducks beneath it.
          const text = String(msg.text ?? "");
          if (!text) break;
          duck(true);
          speakSpanish(text, castParams(msg.voice as VoiceKey), () => duck(false));
          break;
        }
        case "palabra:openMission": {
          const m = msg.mission as MissionRequest | undefined;
          if (!m?.frameId) break;
          duck(true); // the world holds its breath under the mission
          postTo({ type: "palabra:missionOpen" });
          missionRef.current = m;
          setMission(m);
          break;
        }
        default:
          break;
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [duck, postTo, p?.englishLevel]);

  // ── mission overlay lifecycle ───────────────────────────────────────────
  const closeMission = useCallback(() => {
    const m = missionRef.current;
    missionRef.current = null;
    setMission(null);
    stopSpeaking();
    duck(false);
    // A win already posted missionResult won:true from the frame's own
    // onWin (flags + reward land while the result screen shows). Backing
    // out mid-mission posts won:false — the world just unfreezes, and the
    // handoff dialogue re-offers the game next talk (gate requirement).
    if (m && !completedRef.current.has(m.id)) {
      postTo({ type: "palabra:missionResult", missionId: m.id, won: false });
    }
    completedRef.current.clear();
    // keyboard returns to the world so the child keeps adventuring
    try {
      frameRef.current?.contentWindow?.focus();
    } catch {
      // cross-origin hardening — nothing to do
    }
  }, [duck, postTo]);

  const handleWin = useCallback(
    (result: MissionResult) => {
      const m = missionRef.current;
      if (m) completedRef.current.add(m.id);
      // XP/coins/mastery were already recorded in storage.ts by the frame
      // engine; the bridge now records the world-side flag + reward.
      postTo({
        type: "palabra:missionResult",
        missionId: m?.id,
        won: true,
        xp: result.xp,
        accuracy: result.accuracy,
      });
    },
    [postTo],
  );

  // Leaving the adventure: stop speech, un-duck the world.
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-[#07070d]">
      <header className="z-30 flex items-center justify-between gap-2 border-b border-white/10 bg-[#0b0b18]/95 px-3 py-2">
        <a
          href="/"
          onClick={stopSpeaking}
          className="flex items-center gap-2 text-lg font-black tracking-tight text-amber-200"
        >
          ⚔ Palabra
          <span className="hidden text-xs font-bold text-stone-400 sm:inline">aventura</span>
        </a>
        <div className="flex items-center gap-2">
          {p && <StatsBar p={p} />}
          <a
            href="/"
            onClick={stopSpeaking}
            className="rounded-full bg-stone-800 px-3 py-1 text-xs font-black text-stone-200 hover:bg-stone-700"
          >
            ← Aldea
          </a>
        </div>
      </header>

      <section className="relative flex-1">
        {/* The world stays MOUNTED under missions — hiding it preserves the
            exact room, dialogue and flags (Eldoria save is live in here). */}
        <iframe
          ref={frameRef}
          src="/eldoria/index.html"
          title="Palabra — Aventura"
          className={`h-full w-full border-0 transition-opacity ${mission ? "pointer-events-none opacity-0" : "opacity-100"}`}
          allow="autoplay"
        />
        {!booted && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#07070d] text-sm font-bold text-stone-400">
            Cargando la aventura…
          </div>
        )}
      </section>

      {mission && (
        <div className="fixed inset-0 z-50 overflow-auto bg-sky-100">
          <FrameGame
            key={mission.id + "-" + mission.contentBinding}
            frameId={mission.frameId}
            embedded
            missionDifficulty={mission.difficulty}
            onWin={handleWin}
            onExit={closeMission}
          />
        </div>
      )}
    </main>
  );
}
