import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { StatsBar, useProgress } from "~/components/Chrome";
import { Mascot } from "~/components/Mascot";
import { PhaserIsland } from "~/components/PhaserGame";
import { unit } from "~/content/unit";
import {
  bindingScriptureRound,
  bindingShooterRounds,
  packForBinding,
  packVerse,
  packVocab,
  verseEn,
  type Pack,
} from "~/content/packs/a0-packs";
import { seededShuffle } from "~/lib/answer";
import {
  CASA_FRAME_ID,
  GENESIS_1_1,
  getFrame,
  glossMode,
  type FrameDef,
  type FrameParams,
  type ScriptureRound,
  type ShooterRound,
} from "~/lib/frames";
import {
  bumpImmersion,
  clearMiss,
  completeLesson,
  computeLevelProgress,
  loadGameProgress,
  loseHeart,
  missedWords,
  recordGameWin,
  recordMiss,
  type GameProgress,
  type Progress,
} from "~/lib/storage";
import { primeVoice, speakSpanish, stopSpeaking, useVoiceStatus, type SpeakOpts } from "~/lib/voice";
import { castParams } from "~/lib/voiceCast";
import { createController, type SkyWordsBridge } from "~/games/sky-words-types";
import { generateBoard } from "~/games/templates/sokoban-word/board-data";
import { achievementLabel, curve as sokobanCurve } from "~/games/templates/sokoban-word/curve";
import { createController as createSokobanController, type SokobanRound } from "~/games/templates/sokoban-word/types";
import { nearFormDecoys, waveIds, wordFor } from "~/content/packs/a0-u05-sokoban";
import { RoadCrossFrame } from "~/components/RoadCrossFrame";

export const EN_GENESIS_1_1 = "In the beginning God created the heavens and the earth. (NKJV)";

type Phase = "greet" | "verse" | "play" | "done";

type AnyRound = ShooterRound | ScriptureRound;

export type MissionResult = { xp: number; coins: number; accuracy: number };

// ── Quality-bar copy packs (build/DIALOGUE-sweep-playtest2.md, Blocks E+F) ──

/** Reward explanation: the same words shown next to the chips are SPOKEN. */
export const REWARD_COPY = {
  title: { es: "¡Misión cumplida!", en: "Mission complete!" },
  rows: [
    { key: "xp", es: "XP: tus puntos de aprender.", en: "XP: your learning points." },
    { key: "gems", es: "Gemas: dinero del mundo. Compra allí.", en: "Gems: world money. Spend it in the world." },
    { key: "coins", es: "Monedas: dinero de Palabra.", en: "Coins: Palabra money." },
  ],
  // Spoken in the narrator voice after the farewell line. Never the letters
  // "XP" aloud (kokoro spells it) — say "puntos de experiencia".
  // W2C compressed copy (lead-approved, DIALOGUE-sweep-playtest2.md): 2 lines.
  spoken: [
    "¡Muy bien! Puntos, gemas y monedas.",
    "Puntos de aprender. Gemas del mundo. Monedas de Palabra. Todo guardado.",
  ],
};

/** The scripture moment: verse HEARD and READ before any verse question. */
export const SCRIPTURE_MOMENT = {
  enter: { es: "Escucha la Palabra de Dios.", en: "Listen to the Word of God." },
  reference: { es: "Génesis, capítulo uno, versículo uno.", en: "Genesis, chapter one, verse one." },
  verse: {
    es: GENESIS_1_1,
    en: "In the beginning God created the heavens and the earth.",
  },
  ask: { es: "Ahora tú. ¿Qué palabra falta?", en: "Now you. Which word is missing?" },
  again: { es: "Escucha otra vez.", en: "Listen again." },
  amen: { es: "Palabra de Dios. Amén.", en: "The Word of God. Amen." },
};

/** Verse data for the verse-driven UI: the reference as shown, the reference
 * as spoken, and the verse text — all from the session's pack when a binding
 * is active (Génesis 1:1 stays the a0-u01 default). */
export type SessionVerse = { reference: string; refSay: string; verse: string };

/**
 * The scripture moment (owner item 3): a full-screen spoken verse card —
 * enter → reference → verse, all in the narrator scripture row, text on
 * screen the whole time — before any verse fill-in is asked. Sequence is
 * strict (BLOCK F): heard AND read first, only then the ask + round.
 * Verse-driven (INTEGRATION §2.5): the pack's own verse when a binding is
 * active; Génesis 1:1 is the no-binding default.
 */
function ScriptureMoment({ verse, onDone }: { verse?: SessionVerse; onDone: () => void }) {
  const v = useMemo<SessionVerse>(
    () =>
      verse ?? {
        reference: "Génesis 1:1 · RV1909",
        refSay: SCRIPTURE_MOMENT.reference.es,
        verse: GENESIS_1_1,
      },
    [verse],
  );
  const [stage, setStage] = useState<"listen" | "ask">("listen");
  /** Token of the live chain: bumped by run(), tap-continue and unmount — a
   * callback from a replaced chain is a no-op (no late line ever speaks over
   * the ask screen). */
  const runToken = useRef(0);
  /** Outer chain watchdog: speech end may never fire on some engines — the
   * moment opens the ask on a bound, never on a promise. */
  const chainWatch = useRef<number | null>(null);
  const MOMENT_WATCHDOG_MS = 30000;

  const release = useCallback(() => {
    runToken.current += 1; // no pending chain callback survives the ask
    if (chainWatch.current != null) {
      window.clearTimeout(chainWatch.current);
      chainWatch.current = null;
    }
    setStage("ask");
  }, []);

  // Tap-to-continue (owner P0: the verse moment FROZE on a lost speech end):
  // the player opens the ask themselves and the in-flight line is silenced.
  const continueNow = useCallback(() => {
    runToken.current += 1; // pending chain callbacks die first…
    stopSpeaking(); // …then the line mid-flight is silenced
    release();
  }, [release]);

  const run = useCallback(() => {
    runToken.current += 1;
    const token = runToken.current;
    setStage("listen");
    if (chainWatch.current != null) window.clearTimeout(chainWatch.current);
    chainWatch.current = window.setTimeout(() => {
      if (runToken.current === token) release();
    }, MOMENT_WATCHDOG_MS);
    const step = (text: string, next: () => void) =>
      speakSpanish(text, castParams("scripture"), () => {
        if (runToken.current !== token) return; // replaced by a re-run/tap
        next();
      });
    step(SCRIPTURE_MOMENT.enter.es, () =>
      step(v.refSay, () =>
        step(v.verse, () => {
          if (runToken.current === token) release();
        }),
      ),
    );
  }, [v, release]);

  useEffect(() => {
    run();
    return () => {
      runToken.current += 1; // unmount: pending chain callbacks die
      if (chainWatch.current != null) window.clearTimeout(chainWatch.current);
      stopSpeaking();
    };
  }, [run]);
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-amber-50/95 px-6 text-center">
      <p className="text-[11px] font-black uppercase tracking-widest text-amber-600">{SCRIPTURE_MOMENT.enter.es}</p>
      <p className="text-xs font-black text-amber-700">{v.refSay}</p>
      <p className="max-w-md rounded-2xl border-2 border-amber-300 bg-white px-5 py-4 text-xl font-black leading-snug text-stone-800 shadow">
        «{v.verse}»
      </p>
      <p className="text-[10px] font-bold text-stone-400">
        {v.reference} · {SCRIPTURE_MOMENT.amen.es}
      </p>
      {stage === "ask" ? (
        <>
          <p className="text-sm font-black text-teal-700">{SCRIPTURE_MOMENT.ask.es}</p>
          <button
            type="button"
            onClick={onDone}
            className="rounded-2xl bg-teal-600 px-8 py-3 text-lg font-extrabold uppercase tracking-wide text-white shadow-[0_5px_0_0_#0f766e] transition hover:bg-teal-500 active:translate-y-[3px] active:shadow-[0_2px_0_0_#0f766e]"
          >
            ¡Al juego! ▶
          </button>
        </>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={run}
            aria-label={SCRIPTURE_MOMENT.again.es}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-2xl text-white shadow-[0_3px_0_0_#0f766e] active:translate-y-[2px]"
          >
            🔊
          </button>
          {/* Tap-to-continue: the moment can never hold the round hostage
              waiting on speech — the player opens the ask themselves. */}
          <button
            type="button"
            onClick={continueNow}
            className="rounded-2xl bg-amber-500 px-6 py-3 text-base font-extrabold uppercase tracking-wide text-white shadow-[0_4px_0_0_#B45309] transition hover:bg-amber-400 active:translate-y-[2px] active:shadow-[0_2px_0_0_#B45309]"
          >
            Continuar ▶
          </button>
        </div>
      )}
    </div>
  );
}

/** The how-to card on the greet screen: kid-simple, shown + spoken. */
export function HowtoCard({ frame, showEn }: { frame: FrameDef; showEn: boolean }) {
  return (
    <div className="w-full max-w-md rounded-2xl bg-white px-5 py-3 text-left shadow">
      <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">Cómo se juega</p>
      {frame.howto.es.map((line) => (
        <p key={line} className="text-sm font-bold leading-snug text-stone-700">
          <span aria-hidden className="mr-1">
            •
          </span>
          {line}
        </p>
      ))}
      {showEn &&
        frame.howto.en.map((line) => (
          <p key={line} className="text-[11px] font-semibold leading-snug text-stone-400">
            {line}
          </p>
        ))}
    </div>
  );
}

/** The reward summary: chips above, one Spanish line per reward below. */
export function RewardSummary({ embedded }: { embedded: boolean }) {
  const rows = REWARD_COPY.rows.filter((r) => r.key !== "gems" || embedded);
  return (
    <div className="w-full max-w-sm rounded-2xl bg-white px-4 py-3 text-left shadow">
      {rows.map((r) => (
        <p key={r.key} className="text-[13px] font-bold leading-snug text-stone-700">
          <span aria-hidden className="mr-1">
            •
          </span>
          {r.es}
        </p>
      ))}
    </div>
  );
}

/**
 * The frame engine that plays one mini-game (route /game/$frameId AND the
 * Eldoria mission overlay). `embedded` drops the village chrome: the ✕ button
 * and the done-screen buttons talk to the adventure host instead of routing.
 */
export function FrameGame({
  frameId,
  embedded = false,
  missionDifficulty,
  contentBinding,
  onWin,
  onExit,
}: {
  frameId: string;
  embedded?: boolean;
  /** Session tier preselected when a mission launches it (child → Niño). */
  missionDifficulty?: string;
  /**
   * The mission registry's curriculum binding (e.g. a0-u03). When it resolves
   * to a pack, the frame plays the PACK's rounds and draws decoys/replay from
   * the pack ∪ unit pool union; absent/unknown → the frame's own rounds (the
   * verified gate loop, untouched).
   */
  contentBinding?: string;
  /** Fires once per win, after XP/coins/mastery are recorded in storage. */
  onWin?: (result: MissionResult) => void;
  /** Fires when the learner closes the frame (embedded mode only). */
  onExit?: () => void;
}) {
  const frame = useMemo(() => getFrame(frameId), [frameId]);
  // Phaser templates dispatch by mechanic; everything else keeps the React body.
  if (frame?.kind === "phaser" && frame.mechanic === "shooter-word") {
    return (
      <SkyWordsFrame
        frame={frame}
        embedded={embedded}
        missionDifficulty={missionDifficulty}
        contentBinding={contentBinding}
        onWin={onWin}
        onExit={onExit}
      />
    );
  }
  if (frame?.kind === "phaser" && frame.mechanic === "sokoban-word") {
    return (
      <SokobanFrame
        frame={frame}
        embedded={embedded}
        missionDifficulty={missionDifficulty}
        contentBinding={contentBinding}
        onWin={onWin}
        onExit={onExit}
      />
    );
  }
  if (frame?.kind === "phaser" && frame.mechanic === "road-cross-word") {
    return (
      <RoadCrossFrame
        frame={frame}
        embedded={embedded}
        missionDifficulty={missionDifficulty}
        contentBinding={contentBinding}
        onWin={onWin}
        onExit={onExit}
      />
    );
  }
  return (
    <ClassicFrame
      frame={frame}
      embedded={embedded}
      contentBinding={contentBinding}
      onWin={onWin}
      onExit={onExit}
    />
  );
}

// ── Game 1: Capitán Rico: Sky Words — the Phaser shooter template ───────────

/** Session tiers (GAME-ROADMAP §7): L1 child, L2 standard, L3 adult. */
export const TIERS = [
  { key: "nino", label: "Niño", emoji: "🐣", speedMul: 0.6, similar: false },
  { key: "normal", label: "Normal", emoji: "🐤", speedMul: 1.0, similar: false },
  { key: "adulto", label: "Adulto", emoji: "🦅", speedMul: 1.4, similar: true },
] as const;

const HIT_ADVANCE_MS = 1500;
const MISS_RESPAWN_MS = 1900; // gentle correction now, round.say returns ~1.9 s later
const WAVE_BREAK_MS = 1900;

function SkyWordsFrame({
  frame,
  embedded = false,
  missionDifficulty,
  contentBinding,
  onWin,
  onExit,
}: {
  frame: FrameDef;
  embedded?: boolean;
  missionDifficulty?: string;
  contentBinding?: string;
  onWin?: (result: MissionResult) => void;
  onExit?: () => void;
}) {
  const [p, update] = useProgress();
  const [phase, setPhase] = useState<Phase>("greet");
  const [tier, setTier] = useState<0 | 1 | 2>(missionDifficulty === "child" ? 0 : 1);
  const [waves, setWaves] = useState<ShooterRound[][]>([]);
  const [waveIdx, setWaveIdx] = useState(0);
  const [roundIdx, setRoundIdx] = useState(0);
  const [respawns, setRespawns] = useState(0);
  const [totalHits, setTotalHits] = useState(0);
  const [totalMisses, setTotalMisses] = useState(0);
  const [hitsAtWaveStart, setHitsAtWaveStart] = useState(0);
  const [result, setResult] = useState<{ xp: number; coins: number; accuracy: number } | null>(null);
  // The Génesis wave opens with the scripture moment (once per session).
  const [verseMoment, setVerseMoment] = useState(false);
  const momentShownRef = useRef(false);
  // The session's pack (when the mission carried a known binding) and the
  // round pool every builder draws from: pack words ∪ unit vocab.
  const pack = useMemo(() => packForBinding(contentBinding), [contentBinding]);
  const pool = useMemo(() => poolFor(pack), [pack]);

  // The frame's own voice: the villager who opens it (per-character kokoro).
  const say = useCallback(
    (text: string, opts?: SpeakOpts, onEnd?: () => void) => {
      speakSpanish(text, opts ?? castParams(frame.voice), onEnd);
    },
    [frame.voice],
  );
  const sayRound = useCallback((text: string, onEnd?: () => void) => {
    speakSpanish(text, castParams(frame.roundVoice ?? frame.voice), onEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame.voice, frame.roundVoice]);

  // One command post + one bridge for the whole visit; handlers reach them.
  const ctrl = useMemo(() => createController(), []);
  const hitTimer = useRef<number | undefined>(undefined);
  const missTimer = useRef<number | undefined>(undefined);
  const waveTimer = useRef<number | undefined>(undefined);

  // Live mirror: the bridge handlers are stable closures reading fresh state.
  const live = useRef({
    p: null as Progress | null,
    phase: "greet" as Phase,
    round: null as ShooterRound | null,
    waves: [] as ShooterRound[][],
    waveIdx: 0,
    totalHits: 0,
    totalMisses: 0,
    hitsAtWaveStart: 0,
    threshold: 3,
    tier: 1 as 0 | 1 | 2,
  });
  const updateRef = useRef(update);
  const handleHitRef = useRef<(word: string) => void>(() => {});
  const handleMissRef = useRef<(word: string) => void>(() => {});
  const handleWinRef = useRef<(accuracy: number) => void>(() => {});

  const bridge = useMemo<SkyWordsBridge>(
    () => ({
      params: { speed: 1, difficulty: 5, masteryThreshold: 3 },
      speak: (text) => say(text),
      onHit: (word) => handleHitRef.current(word),
      onMiss: (word) => handleMissRef.current(word),
      onWin: (accuracy) => handleWinRef.current(accuracy),
    }),
    [say],
  );

  // Resolved template params for the chosen tier: speed → descent+spawn,
  // difficulty → enemies per wave (+ rhyming decoys for adults),
  // masteryThreshold → correct hits required to clear a wave.
  const tierParams: FrameParams & { similar: boolean } = useMemo(() => {
    const base = frame.params ?? { speed: 1, difficulty: 5, masteryThreshold: 3 };
    const t = TIERS[tier];
    return {
      speed: Math.round(base.speed * t.speedMul * 100) / 100,
      difficulty:
        t.key === "nino" ? Math.max(3, base.difficulty - 2) : t.key === "adulto" ? base.difficulty + 1 : base.difficulty,
      masteryThreshold:
        t.key === "nino"
          ? Math.max(2, base.masteryThreshold - 1)
          : t.key === "adulto"
            ? Math.min(4, base.masteryThreshold + 1)
            : base.masteryThreshold,
      similar: t.similar,
    };
  }, [frame.params, tier]);

  const wave = waves[waveIdx] ?? [];
  const round = wave.length > 0 ? wave[roundIdx % wave.length] : undefined;

  // Handlers — stable, reading the live mirror so bridge calls are never stale.
  const handleHit = useCallback(
    (word: string) => {
      const L = live.current;
      const r = L.round;
      if (L.phase !== "play" || !r || !L.p) return;
      setTotalHits((h) => h + 1);
      if (r.isReplay) updateRef.current(clearMiss(L.p, word));
      const inWave = L.totalHits + 1 - L.hitsAtWaveStart;
      window.clearTimeout(missTimer.current);
      if (inWave >= L.threshold) {
        if (L.waveIdx >= L.waves.length - 1) {
          const hits = L.totalHits + 1;
          const accuracy = hits + L.totalMisses > 0 ? Math.round((hits / (hits + L.totalMisses)) * 100) : 100;
          handleWinRef.current(accuracy);
          return;
        }
        const next = L.waveIdx + 1;
        // Hit confirm first (the word is heard again), then the wave line.
        sayRound(r.word, () => say(`¡Onda superada! ¡Onda ${next + 1}!`));
        ctrl.showBanner(`¡Onda ${next + 1} de ${L.waves.length}!`, "¡Sigue así, piloto!");
        window.clearTimeout(waveTimer.current);
        waveTimer.current = window.setTimeout(() => {
          setWaveIdx(next);
          setRoundIdx(0);
          setRespawns(0);
          setHitsAtWaveStart(L.totalHits + 1);
        }, WAVE_BREAK_MS);
      } else {
        sayRound(r.word, () => say(frame.praise[L.totalHits % frame.praise.length]));
        window.clearTimeout(hitTimer.current);
        hitTimer.current = window.setTimeout(() => setRoundIdx((i) => i + 1), HIT_ADVANCE_MS);
      }
    },
    [ctrl, frame, say, sayRound],
  );

  const handleMiss = useCallback(
    (_word: string) => {
      const L = live.current;
      const r = L.round;
      if (L.phase !== "play" || !r || !L.p) return;
      setTotalMisses((m) => m + 1);
      // One composed save: the miss is recorded against the round's word and a
      // heart is spent; play never stops for a penalty screen.
      updateRef.current(loseHeart(recordMiss(L.p, r.word, frame.id)));
      // Gentle correction speaks the CORRECT word first, then the comfort line.
      sayRound(r.word, () => say(frame.gentle[L.totalMisses % frame.gentle.length]));
      // The same round returns ~1.9 s later with a fresh formation; its entry
      // effect re-speaks round.say.
      window.clearTimeout(missTimer.current);
      missTimer.current = window.setTimeout(() => setRespawns((n) => n + 1), MISS_RESPAWN_MS);
    },
    [frame, say, sayRound],
  );

  const handleWin = useCallback(
    (accuracy: number) => {
      const L = live.current;
      if (!L.p) return;
      // Composite Spanish-mastery lesson id when a pack binding is active
      // (INTEGRATION §2 step 8) — a second mission on the same frame is a
      // first-clear of its OWN lesson, not a half-XP replay of the gate one.
      const lessonId = pack ? `${frame.id}@${contentBinding}` : frame.id;
      const { next, xpGained, coinsGained } = completeLesson(L.p, lessonId, frame.xp, accuracy);
      updateRef.current(bumpImmersion(next));
      // §10.5 call site 1 of 2: one win writes BOTH stores (per-game level,
      // achievements, unlocks — recognition only; Spanish mastery untouched).
      recordGameWin(frame.id, xpGained, L.tier, {
        accuracy,
        maxStreak: accuracy >= 100 ? L.totalHits : 0,
        replayHits: 0,
        replayTotal: 0,
        isScriptureBinding: false,
      });
      setResult({ xp: xpGained, coins: coinsGained, accuracy });
      setPhase("done");
      ctrl.clear();
      ctrl.celebrate();
      ctrl.showBanner("¡Misión cumplida!", `Precisión ${accuracy}%`);
      // Farewell first, then the reward explanation (BLOCK E) in the narrator
      // voice — the learner hears what XP/coins/gems ARE, not just that they won.
      say(frame.farewell.es, undefined, () =>
        speakSpanish(REWARD_COPY.spoken.join(" "), castParams("narrator")),
      );
      // Mission bridge: the adventure host records the flag + reward in-world.
      onWin?.({ xp: xpGained, coins: coinsGained, accuracy });
    },
    [ctrl, frame, say, onWin, pack, contentBinding],
  );

  // Mirror state into the handlers' view every render.
  useEffect(() => {
    live.current.p = p;
    live.current.phase = phase;
    live.current.round = round ?? null;
    live.current.waves = waves;
    live.current.waveIdx = waveIdx;
    live.current.totalHits = totalHits;
    live.current.totalMisses = totalMisses;
    live.current.hitsAtWaveStart = hitsAtWaveStart;
    live.current.threshold = tierParams.masteryThreshold;
    live.current.tier = tier;
    bridge.params.speed = tierParams.speed;
    bridge.params.difficulty = tierParams.difficulty;
    bridge.params.masteryThreshold = tierParams.masteryThreshold;
    updateRef.current = update;
    handleHitRef.current = handleHit;
    handleMissRef.current = handleMiss;
    handleWinRef.current = handleWin;
  });

  // The session's five waves: the pack's waves 1-4 (or the frame's own rounds
  // without a binding), then the adaptive replay wave built at runtime.
  useEffect(() => {
    if (!p || waves.length > 0) return;
    setWaves(buildShooterWaves(frame, p, pack));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p, waves.length]);

  // Warm the voice, greet the villager + explain the game, leave nothing
  // running on exit. (Quality bar: instructions BEFORE play, spoken.)
  useEffect(() => {
    primeVoice();
    say(frame.greeting.es, undefined, () => say(frame.howto.es.join(" ")));
    return () => {
      stopSpeaking();
      [hitTimer, missTimer, waveTimer].forEach((t) => window.clearTimeout(t.current));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The enemy formation for the current round, and round.say spoken on entry.
  const formation = useMemo(() => {
    if (phase !== "play" || !round) return null;
    const seed = `${frame.id}-${waveIdx}-${roundIdx}-${respawns}`;
    return formationFor(round, tierParams, seed, pool);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round, waveIdx, roundIdx, respawns, tierParams, pool]);

  useEffect(() => {
    if (phase !== "play" || !round || !formation) return;
    if (verseMoment) return;
    // Quality bar (owner item 3): the Génesis wave opens with the spoken
    // scripture moment — verse heard AND read before any verse round plays.
    if (!momentShownRef.current && isScriptureWave(waves[waveIdx])) {
      momentShownRef.current = true;
      setVerseMoment(true);
      return;
    }
    sayRound(round.say);
    ctrl.playRound({ word: round.word, options: formation, isReplay: round.isReplay });
  }, [phase, round, formation, ctrl, sayRound, verseMoment, waveIdx, waves]);

  const hitsInWave = Math.min(tierParams.masteryThreshold, totalHits - hitsAtWaveStart);
  const progressPct =
    phase === "done"
      ? 100
      : phase === "greet"
        ? 0
        : ((waveIdx + (hitsInWave / tierParams.masteryThreshold) * 0.9) / waves.length) * 100;

  if (!p || waves.length === 0) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-orange-50 px-6 text-center">
        <Mascot size={80} className="anim-float" />
        <p className="font-black text-stone-700">Preparando la escena…</p>
        <BackButton embedded={embedded} onExit={onExit} />
      </main>
    );
  }

  const replay = () => {
    stopSpeaking();
    momentShownRef.current = false;
    setVerseMoment(false);
    setWaves(buildShooterWaves(frame, p, pack));
    setWaveIdx(0);
    setRoundIdx(0);
    setRespawns(0);
    setTotalHits(0);
    setTotalMisses(0);
    setHitsAtWaveStart(0);
    setResult(null);
    setPhase("greet");
  };

  return (
    <FrameShell frame={frame} p={p} progressPct={progressPct} embedded={embedded} onExit={onExit}>
      <div className="relative h-full overflow-hidden rounded-3xl border-2 border-sky-200 shadow-lg">
        <PhaserIsland bridge={bridge} ctrl={ctrl} />

        {phase === "play" && round?.missing && (
          <p className="absolute inset-x-3 top-3 z-10 rounded-2xl bg-white/90 px-4 py-2 text-center text-lg font-black leading-snug text-stone-800 shadow">
            {round.missing}
          </p>
        )}

        {phase === "play" && verseMoment && <ScriptureMoment onDone={() => setVerseMoment(false)} />}

        {phase === "greet" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-white/55 px-6 py-4 text-center backdrop-blur-[2px]">
            <div className="text-7xl anim-float">{frame.villager.emoji}</div>
            <h1 className="text-2xl font-black text-stone-900">{frame.villager.name}</h1>
            <p className="max-w-md rounded-3xl bg-white px-5 py-4 text-lg font-semibold text-stone-700 shadow">
              {frame.greeting.es}
              {glossMode(p.englishLevel, frame) !== "none" && (
                <span className="mt-2 block text-sm font-semibold text-stone-400">{frame.greeting.en}</span>
              )}
            </p>
            <HowtoCard frame={frame} showEn={glossMode(p.englishLevel, frame) !== "none"} />
            <button
              type="button"
              onClick={() => say(frame.greeting.es, undefined, () => say(frame.howto.es.join(" ")))}
              aria-label="Escuchar las instrucciones otra vez"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-2xl text-white shadow-[0_3px_0_0_#0f766e] active:translate-y-[2px]"
            >
              🔊
            </button>
            <div className="flex gap-2" role="group" aria-label="Nivel de la sesión">
              {TIERS.map((t, i) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTier(i as 0 | 1 | 2)}
                  aria-pressed={tier === i}
                  className={`rounded-2xl px-4 py-2 text-sm font-black shadow transition ${
                    tier === i
                      ? "bg-teal-600 text-white shadow-[0_3px_0_0_#0f766e]"
                      : "bg-white text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  <span className="mr-1" aria-hidden>
                    {t.emoji}
                  </span>
                  {t.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                setPhase("play");
              }}
              className="rounded-2xl bg-teal-600 px-10 py-4 text-lg font-extrabold uppercase tracking-wide text-white shadow-[0_5px_0_0_#0f766e] transition hover:bg-teal-500 active:translate-y-[3px] active:shadow-[0_2px_0_0_#0f766e]"
            >
              ¡Jugar! ▶
            </button>
          </div>
        )}

        {phase === "play" && round && (
          <div className="absolute inset-x-0 bottom-0 z-10 border-t-2 border-sky-300 bg-white/95 px-3 py-3">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-sky-700">
                Onda {waveIdx + 1}/{waves.length}
              </span>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-amber-700">
                Aciertos {hitsInWave}/{tierParams.masteryThreshold}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => sayRound(round.say)}
                aria-label="Escuchar otra vez"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-600 text-2xl text-white shadow-[0_3px_0_0_#0f766e] active:translate-y-[2px]"
              >
                🔊
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-stone-800">
                  {round.isReplay && (
                    <span className="mr-1 rounded bg-teal-100 px-1 text-[10px] text-teal-700">REPASO 🔄</span>
                  )}
                  {round.caption}
                </p>
                <Gloss level={p.englishLevel} frame={frame} en={round.en} />
              </div>
            </div>
          </div>
        )}

        {phase === "done" && result && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-white/70 px-6 text-center backdrop-blur-[2px]">
            <div className="anim-pop text-7xl">🎉</div>
            <Mascot size={90} mood="cheer" className="anim-float" />
            <h1 className="text-3xl font-black text-stone-900">¡Misión cumplida!</h1>
            <div className="flex flex-wrap justify-center gap-3">
              <span className="rounded-2xl bg-teal-100 px-4 py-2 font-black text-teal-700">+{result.xp} XP</span>
              <span className="rounded-2xl bg-yellow-100 px-4 py-2 font-black text-yellow-700">+{result.coins} 🪙</span>
              <span className="rounded-2xl bg-orange-100 px-4 py-2 font-black text-orange-700">{result.accuracy}%</span>
            </div>
            <RewardSummary embedded={embedded} />
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <ExitButton embedded={embedded} onExit={onExit} />
              <button
                type="button"
                onClick={replay}
                className="rounded-xl bg-teal-600 px-8 py-3 font-extrabold uppercase tracking-wide text-white shadow-[0_4px_0_0_#0f766e] transition hover:bg-teal-500 active:translate-y-[2px]"
              >
                Otra vez 🔁
              </button>
            </div>
          </div>
        )}
      </div>
    </FrameShell>
  );
}

// ── Sky Words round building ────────────────────────────────────────────────

/**
 * The session round pool (buildspec item 2 — the pool-union builder behind the
 * four vocabPool sites): the binding pack's words FIRST, then the unit-01
 * vocab (deduped by es). Decoys and replay candidates never leave this pool.
 * Without a pack this is exactly unit.vocab — the verified gate loop.
 */
function poolFor(pack: Pack | undefined): { es: string; en: string }[] {
  if (!pack) return unit.vocab;
  const seen = new Set(unit.vocab.map((v) => v.es));
  return [...packVocab(pack), ...unit.vocab.filter((v) => !seen.has(v.es))];
}

/** True when a shooter wave is the «En el principio» scripture wave. */
function isScriptureWave(w: ShooterRound[] | undefined): boolean {
  return Array.isArray(w) && w.some((r) => r.caption?.startsWith("Génesis"));
}

function distractors(word: string, count: number, seed: string, pool: { es: string; en: string }[]): string[] {
  const options = pool.map((v) => v.es).filter((w) => w !== word);
  return seededShuffle(options, seed).slice(0, count);
}

/**
 * The five session waves from the frame's contentBinding: the pack's waves
 * 1–4 (or the frame's own rounds without a binding); wave 5 is the adaptive
 * replay wave, built from progress.misses ∩ the session pool with isReplay —
 * a hit clears the miss, a miss re-records it.
 */
function buildShooterWaves(frame: FrameDef, p: Progress | null, pack: Pack | undefined): ShooterRound[][] {
  const base: ShooterRound[] = pack
    ? (bindingShooterRounds(pack) as ShooterRound[])
    : (frame.rounds as ShooterRound[]);
  const pool = poolFor(pack);
  const waves: ShooterRound[][] = [[], [], [], [], []];
  for (const r of base) {
    const w = Math.min(4, Math.max(1, r.wave ?? 1)) - 1;
    waves[w].push(r);
  }
  const replays = (p ? missedWords(p) : [])
    .filter((w) => pool.some((v) => v.es === w))
    .slice(0, 3)
    .map((w) => {
      const v = pool.find((x) => x.es === w)!;
      return {
        word: v.es,
        en: v.en,
        say: `Repasamos una palabra de antes. ¿Dónde está… ${v.es}?`,
        caption: `¿Dónde está… ${v.es}?`,
        options: [v.es, ...distractors(v.es, 3, `${frame.id}-${v.es}`, pool)],
        wave: 5,
        isReplay: true,
      } satisfies ShooterRound;
    });
  waves[4] = replays;
  if (waves[4].length === 0) {
    // Nothing to re-serve: a light review wave keeps the session honest.
    const seen = [...waves[0], ...waves[1], ...waves[2], ...waves[3]];
    waves[4] = seededShuffle(seen, `${frame.id}-review`)
      .slice(0, 2)
      .map((r) => ({ ...r, isReplay: true }));
  }
  return waves.filter((w) => w.length > 0);
}

/** The enemy labels for one formation: target + decoys (curated first, then
 * the session pool; adults get look-alike/rhyming decoys first). Pre-shuffled. */
function formationFor(
  round: ShooterRound,
  params: { difficulty: number; similar: boolean },
  seed: string,
  pool: { es: string; en: string }[],
): string[] {
  const want = Math.max(2, params.difficulty);
  const picks: string[] = [round.word];
  const add = (w: string) => {
    if (picks.length < want && !picks.includes(w)) picks.push(w);
  };
  const vocab = pool.map((v) => v.es).filter((w) => w !== round.word);
  if (params.similar) {
    for (const w of similarWords(round.word, vocab, seed)) add(w);
  }
  for (const w of round.options) add(w);
  for (const w of seededShuffle(vocab, seed)) add(w);
  return seededShuffle(picks, `${seed}-order`);
}

/** Decoys that share sounds with the target — the adult difficulty knob. */
function similarWords(word: string, pool: string[], seed: string): string[] {
  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const w = norm(word);
  return seededShuffle(
    pool.filter((c) => {
      const n = norm(c);
      return n !== w && (n[0] === w[0] || (w.length > 2 && n.slice(-2) === w.slice(-2)));
    }),
    `${seed}-sim`,
  );
}

// ── Game 7: El Almacén de la Palabra — the sokoban template ────────────────

/** Per-round knob table (PORT-sokoban-word.md §2; R3 8×8 = source anchor). */
const BOARD_GRIDS = [6, 7, 8, 8, 8];
const BOARD_WALLS = [0.06, 0.1, 0.13, 0.16, 0.12];
const BOARD_DECOYS = [1, 2, 2, 3, 2];
const BOARD_PAIRS = [2, 2, 3, 3, 3];
const BOARD_ROUND_BREAK_MS = 1500;
const SOKO_MISS_RESPAWN_MS = 1900;
/** Adulto caps (plan §2: walls/decoys capped at Adulto density). */
const SOKO_WALL_CAP = 0.16;
const SOKO_DECOY_CAP = 4;
const SOKO_GRID_MIN = 5;
const SOKO_GRID_MAX = 9;

/** Article per a0-u05 word (-a feminine, else masculine; no exceptions). */
function articleFor(es: string): string {
  return es.endsWith("a") ? "la" : "el";
}

/** The composed entry speech for a named pair (binder-composed, ≤38 chars). */
function composedSay(es: string): string {
  return `¡Empuja ${articleFor(es)} ${es.toUpperCase()}!… ${es}.`;
}

/**
 * The session's five boards (PORT §2 R1–R5): pack waves 1–4, then the
 * adaptive replay board from progress.misses ∩ a0-u05 (R5 — hit clears the
 * miss, a miss re-records). Empty replay → a light review board, isReplay.
 * Tier scales decoys (×0.6/×1.0/×1.4) and rebuilds per tier like the
 * shooter's tierParams; the board knobs (grid/walls/budget) scale at
 * generation time.
 */
function buildSokobanRounds(frame: FrameDef, p: Progress, tier: 0 | 1 | 2, sessionId: number): SokobanRound[] {
  const decoyMul = [0.6, 1, 1.4][tier];
  const decoysFor = (pairs: string[], base: number, r: number): string[] =>
    nearFormDecoys(pairs, Math.min(SOKO_DECOY_CAP, Math.max(1, Math.round(base * decoyMul))), seededShuffle, `${frame.id}-d${r}-t${tier}-s${sessionId}`);
  const rounds: SokobanRound[] = [];
  for (let r = 1; r <= 4; r++) {
    const wave = waveIds(r);
    const pairs = seededShuffle(wave, `${frame.id}-r${r}`).slice(0, BOARD_PAIRS[r - 1]);
    const decoys = decoysFor(pairs, BOARD_DECOYS[r - 1], r);
    rounds.push({ pairs, decoys, options: [...pairs, ...decoys], wave: r });
  }
  // R5 — adaptive replay: a0-u05 misses return as target crates (R7-5).
  const replays = seededShuffle(
    missedWords(p).filter((w) => wordForSafe(w)),
    `${frame.id}-replay-${sessionId}`,
  )
    .slice(0, 3)
    .map((es) => wordFor(es).es);
  if (replays.length > 0) {
    rounds.push({ pairs: replays, decoys: decoysFor(replays, 2, 5), options: [...replays], wave: 5, isReplay: true });
  } else {
    const review = seededShuffle(rounds.flatMap((r) => r.pairs), `${frame.id}-review-${sessionId}`).slice(0, 3);
    rounds.push({ pairs: review, decoys: decoysFor(review, 2, 5), options: [...review], wave: 5, isReplay: true });
  }
  return rounds;
}

/** a0-u05 per-source scoping: u03/u04/u01 misses serve ONLY frames bound to u05. */
function wordForSafe(es: string): boolean {
  try {
    return wordFor(es).es === es;
  } catch {
    return false;
  }
}

function SokobanFrame({
  frame,
  embedded = false,
  missionDifficulty,
  contentBinding,
  onWin,
  onExit,
}: {
  frame: FrameDef;
  embedded?: boolean;
  missionDifficulty?: string;
  contentBinding?: string;
  onWin?: (result: MissionResult) => void;
  onExit?: () => void;
}) {
  const [p, update] = useProgress();
  const [phase, setPhase] = useState<Phase>("greet");
  // Restore: level + tier (Edit 2 — missionDifficulty child→0 only on
  // first-ever play; the stored tier wins from the second visit on).
  const gp0 = useRef<GameProgress>(loadGameProgress(frame.id));
  const baseXp = frame.params?.xpPerLevel ?? 50;
  const [tier, setTier] = useState<0 | 1 | 2>(
    gp0.current.wins > 0 ? gp0.current.difficultyTier : missionDifficulty === "child" ? 0 : 1,
  );
  const [sessionId, setSessionId] = useState(0);
  const [roundIdx, setRoundIdx] = useState(0);
  const [namedIdx, setNamedIdx] = useState(0);
  const [restartKey, setRestartKey] = useState(0);
  const [budgetLeft, setBudgetLeft] = useState<number | null>(null);
  const [pairsDone, setPairsDone] = useState(0);
  const [result, setResult] = useState<{ xp: number; coins: number; accuracy: number } | null>(null);
  const [gameWin, setGameWin] = useState<{
    progress: GameProgress;
    leveledUp: boolean;
    newAchievements: string[];
    newUnlocks: string[];
  } | null>(null);

  const ctrl = useMemo(createSokobanController, []);
  const hitTimer = useRef<number | undefined>(undefined);
  const missTimer = useRef<number | undefined>(undefined);
  const roundTimer = useRef<number | undefined>(undefined);

  const say = useCallback(
    (text: string, opts?: SpeakOpts, onEnd?: () => void) => {
      speakSpanish(text, opts ?? castParams(frame.voice), onEnd);
    },
    [frame.voice],
  );
  const sayRound = useCallback(
    (text: string, onEnd?: () => void) => {
      speakSpanish(text, castParams(frame.roundVoice ?? frame.voice), onEnd);
    },
    [frame.voice, frame.roundVoice],
  );

  // The session's pool is a0-u05 by design (R7-2 CONFIRMED); a mission may
  // only ever pass the same binding, but the resolver stays honest.
  const binding = contentBinding && packForBinding(contentBinding) ? contentBinding : "a0-u05";

  const rounds = useMemo(
    () => (p ? buildSokobanRounds(frame, p, tier, sessionId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p, tier, sessionId],
  );
  const round = rounds[roundIdx];

  const board = useMemo(() => {
    if (!round) return null;
    const tierMul = [0.7, 1, 1.1][tier];
    const ramp = Math.min(sokobanCurve.ramp.gridCap - BOARD_GRIDS[roundIdx], Math.floor(gp0.current.level / 2));
    const size = Math.max(SOKO_GRID_MIN, Math.min(SOKO_GRID_MAX, Math.round(BOARD_GRIDS[roundIdx] * tierMul) + Math.max(0, ramp)));
    const tierBudgetMul = [1.5, 1, 0.75][tier];
    const moveBudget = roundIdx >= 3 ? Math.round(size * size * 2.4 * tierBudgetMul) : 0;
    return generateBoard({
      size,
      targets: round.pairs,
      decoys: round.decoys,
      wallDensity: Math.min(BOARD_WALLS[roundIdx], SOKO_WALL_CAP),
      moveBudget,
      seed: `${frame.id}-L${gp0.current.level}-R${roundIdx}-T${tier}`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, roundIdx, tier, restartKey, sessionId]);

  // The board's OWN targets are the round's EFFECTIVE pairs: generateBoard's
  // documented relaxation ladder may (target rung, last resort) return fewer
  // target crates than the round asked for — the round then completes on what
  // the board actually carries. Order is byte-identical (board.targets keeps
  // the p.targets order, a prefix-subset of round.pairs); with no relaxation
  // this IS round.pairs.
  const effPairs = useMemo(() => (board ? board.targets.map((t) => t.es) : round?.pairs ?? []), [board, round]);

  // Live mirror: handlers are stable closures reading fresh state.
  const live = useRef({
    p: null as Progress | null,
    phase: "greet" as Phase,
    rounds: [] as SokobanRound[],
    round: null as SokobanRound | null,
    effPairs: [] as string[],
    roundIdx: 0,
    namedIdx: 0,
    completed: new Set<string>(),
    namedEs: null as string | null,
    hits: 0,
    misses: 0,
    streak: 0,
    maxStreak: 0,
    replayHits: 0,
    replayTotal: 0,
    tier: 1 as 0 | 1 | 2,
  });
  const updateRef = useRef(update);
  const handleHitRef = useRef<(word: string) => void>(() => {});
  const handleMissRef = useRef<(word: string) => void>(() => {});
  const handleWinRef = useRef<(accuracy: number) => void>(() => {});
  const handleBudgetRef = useRef<() => void>(() => {});

  const bridge = useMemo(
    () => ({
      params: { speed: 1, difficulty: 2, masteryThreshold: 3 },
      speak: (text: string) => say(text),
      onHit: (word: string) => handleHitRef.current(word),
      onMiss: (word: string) => handleMissRef.current(word),
      onWin: (accuracy: number) => handleWinRef.current(accuracy),
      onProgress: (movesUsed: number, left: number | null) => {
        if (left !== null) setBudgetLeft(left);
        else setBudgetLeft(null);
        void movesUsed;
      },
      onBudgetExpired: () => handleBudgetRef.current(),
    }),
    [say],
  );

  const handleHit = useCallback(
    (es: string) => {
      const L = live.current;
      const r = L.round;
      // Effective pairs = the board's own targets (relaxation-ladder aware —
      // a target-rung board returns fewer crates; the round completes on it).
      const eff = L.effPairs.length > 0 ? L.effPairs : (r?.pairs ?? []);
      if (L.phase !== "play" || !r || !L.p || L.completed.has(es)) return;
      L.completed.add(es);
      L.hits += 1;
      L.streak += 1;
      L.maxStreak = Math.max(L.maxStreak, L.streak);
      if (r.isReplay) {
        L.replayHits += 1;
        updateRef.current(clearMiss(L.p, es));
      }
      window.clearTimeout(missTimer.current);
      if (L.completed.size >= eff.length) {
        if (L.roundIdx >= L.rounds.length - 1) {
          const accuracy = L.hits + L.misses > 0 ? Math.round((L.hits / (L.hits + L.misses)) * 100) : 100;
          handleWinRef.current(accuracy);
          return;
        }
        // Hit confirm first (the word is heard again), then the round line.
        sayRound(es, () => say("¡Tablero listo!"));
        ctrl.showBanner(`¡Tablero ${L.roundIdx + 2} de ${L.rounds.length}!`, "¡Sigue empujando!");
        window.clearTimeout(roundTimer.current);
        roundTimer.current = window.setTimeout(() => {
          L.completed = new Set();
          setNamedIdx(0);
          setPairsDone(0);
          setRoundIdx(L.roundIdx + 1);
        }, BOARD_ROUND_BREAK_MS);
        return;
      }
      setPairsDone(L.completed.size);
      sayRound(es, () => say(frame.praise[(L.hits - 1) % frame.praise.length]));
      if (es === eff[L.namedIdx]) {
        const nextIdx = eff.findIndex((w) => !L.completed.has(w));
        if (nextIdx >= 0) {
          L.namedIdx = nextIdx;
          setNamedIdx(nextIdx);
          const next = eff[nextIdx];
          // hit confirm → then the next pair is named (composed say, ≤38)
          window.clearTimeout(hitTimer.current);
          hitTimer.current = window.setTimeout(() => sayRound(composedSay(next)), 900);
        }
      }
      // An unnamed pair completed early just counts (R7-3) — prompt stays.
    },
    [ctrl, frame, say, sayRound],
  );

  const handleMiss = useCallback(
    (_es: string) => {
      const L = live.current;
      const named = L.namedEs;
      if (L.phase !== "play" || !L.p || !named) return;
      L.misses += 1;
      L.streak = 0;
      // One composed save: the miss records the NAMED pair's es (R7-3) and a
      // heart is spent; play never stops for a penalty screen.
      updateRef.current(loseHeart(recordMiss(L.p, named, frame.id)));
      // Gentle correction now, the named pair re-spoken ~1.9 s later.
      say(frame.gentle[(L.misses - 1) % frame.gentle.length]);
      window.clearTimeout(missTimer.current);
      missTimer.current = window.setTimeout(() => sayRound(composedSay(named)), SOKO_MISS_RESPAWN_MS);
    },
    [frame, say, sayRound],
  );

  // Move-budget expiry / child-initiated restart: mechanical, NO miss, NO
  // heart, pair progress resets — the same board re-loads (R7-5).
  const restartBoard = useCallback(() => {
    const L = live.current;
    L.completed = new Set();
    L.namedIdx = 0;
    setNamedIdx(0);
    setPairsDone(0);
    setRestartKey((k) => k + 1);
  }, []);

  const handleWin = useCallback(
    (accuracy: number) => {
      const L = live.current;
      if (!L.p) return;
      // Composite Spanish-mastery lesson id (INTEGRATION §2 step 8).
      const lessonId = `${frame.id}@${binding}`;
      const { next, xpGained, coinsGained } = completeLesson(L.p, lessonId, frame.xp, accuracy);
      updateRef.current(bumpImmersion(next));
      // §10.5: the per-game store writes at the frame engine's win sites —
      // sokoban's is this one. Spanish mastery (palabra.progress.v1) is
      // untouched by the game level, achievements and unlocks.
      const gw = recordGameWin(frame.id, xpGained, L.tier, {
        accuracy,
        maxStreak: L.maxStreak,
        replayHits: L.replayHits,
        // The win fires only on the LAST round — the replay board — whose
        // effective pairs are live in the mirror (target rung may trim it).
        replayTotal: L.effPairs.length || L.rounds.filter((r) => r.isReplay).reduce((a, r) => a + r.pairs.length, 0),
        isScriptureBinding: false,
      });
      gp0.current = gw.progress;
      setGameWin(gw);
      setResult({ xp: xpGained, coins: coinsGained, accuracy });
      setPhase("done");
      ctrl.clear();
      ctrl.celebrate();
      ctrl.showBanner("¡Misión cumplida!", `Precisión ${accuracy}%`);
      // Farewell first, then rewards (BLOCK E) in the narrator voice, then
      // the achievements the win just earned (§10.5: display + spoken).
      say(frame.farewell.es, undefined, () => {
        speakSpanish(REWARD_COPY.spoken.join(" "), castParams("narrator"), () => {
          const lines = gw.newAchievements.map((id) => `¡Logro: ${achievementLabel(id).label.replace(/¡|!/g, "")}!`);
          if (lines.length > 0) speakSpanish(lines.join(" "), castParams("narrator"));
        });
      });
      // Mission bridge: the adventure host records the flag + reward in-world.
      onWin?.({ xp: xpGained, coins: coinsGained, accuracy });
    },
    [binding, ctrl, frame, onWin, say],
  );

  // Mirror state into the handlers' view every render.
  useEffect(() => {
    live.current.p = p;
    live.current.phase = phase;
    live.current.rounds = rounds;
    live.current.round = round ?? null;
    live.current.roundIdx = roundIdx;
    live.current.namedIdx = namedIdx;
    live.current.effPairs = effPairs;
    live.current.namedEs = round ? (effPairs[namedIdx] ?? null) : null;
    live.current.tier = tier;
    bridge.params.speed = [0.6, 1, 1.4][tier];
    bridge.params.difficulty = 2;
    bridge.params.masteryThreshold = effPairs.length > 0 ? effPairs.length : 3;
    updateRef.current = update;
    handleHitRef.current = handleHit;
    handleMissRef.current = handleMiss;
    handleWinRef.current = handleWin;
    handleBudgetRef.current = restartBoard;
  });

  // Warm the voice, greet Mira + explain the game (spoken + text BEFORE
  // play), stop speech on exit.
  useEffect(() => {
    primeVoice();
    say(frame.greeting.es, undefined, () => say(frame.howtoSpoken ?? frame.howto.es.join(" ")));
    return () => {
      stopSpeaking();
      [hitTimer, missTimer, roundTimer].forEach((t) => window.clearTimeout(t.current));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Board load: when a fresh board arrives, the scene gets it + the named
  // pair is spoken (composed say). Re-points use namePair, never a rebuild.
  useEffect(() => {
    if (phase !== "play" || !round || !board) return;
    const named = effPairs[namedIdx] ?? effPairs[0] ?? null;
    ctrl.playBoard(board, named);
    setBudgetLeft(board.moveBudget > 0 ? board.moveBudget : null);
    sayRound(composedSay(named ?? effPairs[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, board]);

  // Named-pair re-point (no board rebuild — completed crates stay merged).
  useEffect(() => {
    if (phase !== "play" || !round) return;
    ctrl.namePair(effPairs[namedIdx] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, namedIdx, round]);

  const levelBadge = computeLevelProgress(gp0.current, baseXp);
  const progressPct =
    phase === "done" ? 100 : phase === "greet" ? 0 : ((roundIdx + (round ? pairsDone / effPairs.length : 0)) / Math.max(1, rounds.length)) * 100;

  if (!p || rounds.length === 0) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-orange-50 px-6 text-center">
        <Mascot size={80} className="anim-float" />
        <p className="font-black text-stone-700">Preparando la escena…</p>
        <BackButton embedded={embedded} onExit={onExit} />
      </main>
    );
  }

  const replay = () => {
    stopSpeaking();
    gp0.current = loadGameProgress(frame.id);
    setSessionId((s) => s + 1);
    setRoundIdx(0);
    setNamedIdx(0);
    setRestartKey((k) => k + 1);
    setPairsDone(0);
    setResult(null);
    setGameWin(null);
    setPhase("greet");
  };

  const namedEs = effPairs[namedIdx] ?? null;

  return (
    <FrameShell frame={frame} p={p} progressPct={progressPct} embedded={embedded} onExit={onExit}>
      <div className="relative h-full overflow-hidden rounded-3xl border-2 border-amber-200 shadow-lg">
        <PhaserIsland bridge={bridge} ctrl={ctrl} loader={() => import("~/games/templates/sokoban-word")} opts={{ gloss: glossMode(p.englishLevel, frame) }} />

        {phase === "greet" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-white/55 px-6 py-4 text-center backdrop-blur-[2px]">
            <div className="text-7xl anim-float">{frame.villager.emoji}</div>
            <h1 className="text-2xl font-black text-stone-900">{frame.villager.name}</h1>
            <p className="max-w-md rounded-3xl bg-white px-5 py-4 text-lg font-semibold text-stone-700 shadow">
              {frame.greeting.es}
              {glossMode(p.englishLevel, frame) !== "none" && (
                <span className="mt-2 block text-sm font-semibold text-stone-400">{frame.greeting.en}</span>
              )}
            </p>
            <HowtoCard frame={frame} showEn={glossMode(p.englishLevel, frame) !== "none"} />
            <button
              type="button"
              onClick={() => say(frame.greeting.es, undefined, () => say(frame.howtoSpoken ?? frame.howto.es.join(" ")))}
              aria-label="Escuchar las instrucciones otra vez"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-2xl text-white shadow-[0_3px_0_0_#0f766e] active:translate-y-[2px]"
            >
              🔊
            </button>
            <span className="rounded-full bg-amber-100 px-4 py-1 text-sm font-black text-amber-700">{levelBadge.title}</span>
            <div className="flex gap-2" role="group" aria-label="Nivel de la sesión">
              {TIERS.map((t, i) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTier(i as 0 | 1 | 2)}
                  aria-pressed={tier === i}
                  className={`rounded-2xl px-4 py-2 text-sm font-black shadow transition ${
                    tier === i ? "bg-teal-600 text-white shadow-[0_3px_0_0_#0f766e]" : "bg-white text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  <span className="mr-1" aria-hidden>
                    {t.emoji}
                  </span>
                  {t.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                setPhase("play");
              }}
              className="rounded-2xl bg-teal-600 px-10 py-4 text-lg font-extrabold uppercase tracking-wide text-white shadow-[0_5px_0_0_#0f766e] transition hover:bg-teal-500 active:translate-y-[3px] active:shadow-[0_2px_0_0_#0f766e]"
            >
              ¡Jugar! ▶
            </button>
          </div>
        )}

        {phase === "play" && round && (
          <div className="absolute inset-x-0 bottom-0 z-10 border-t-2 border-amber-300 bg-white/95 px-3 py-3">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-amber-700">
                Tablero {roundIdx + 1}/{rounds.length}
              </span>
              <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-teal-700">
                Emparejados {pairsDone}/{effPairs.length}
              </span>
              {budgetLeft !== null && (
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-rose-700">
                  Empujes {budgetLeft}
                </span>
              )}
              {round.isReplay && <span className="rounded-full bg-teal-100 px-1 text-[10px] font-black text-teal-700">REPASO 🔄</span>}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => namedEs && sayRound(composedSay(namedEs))}
                aria-label="Escuchar la palabra otra vez"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-600 text-2xl text-white shadow-[0_3px_0_0_#0f766e] active:translate-y-[2px]"
              >
                🔊
              </button>
              <button
                type="button"
                onClick={restartBoard}
                aria-label="Reiniciar el tablero"
                title="Reiniciar el tablero (sin fallo)"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500 text-2xl text-white shadow-[0_3px_0_0_#B45309] active:translate-y-[2px]"
              >
                ↺
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-stone-800">{namedEs ? `Empuja: ${namedEs}` : "…"}</p>
                <Gloss level={p.englishLevel} frame={frame} en={namedEs ? wordFor(namedEs).en : ""} />
              </div>
            </div>
          </div>
        )}

        {phase === "done" && result && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 overflow-y-auto bg-white/70 px-6 py-4 text-center backdrop-blur-[2px]">
            <div className="anim-pop text-7xl">🎉</div>
            <Mascot size={90} mood="cheer" className="anim-float" />
            <h1 className="text-3xl font-black text-stone-900">¡Misión cumplida!</h1>
            <div className="flex flex-wrap justify-center gap-3">
              <span className="rounded-2xl bg-teal-100 px-4 py-2 font-black text-teal-700">+{result.xp} XP</span>
              <span className="rounded-2xl bg-yellow-100 px-4 py-2 font-black text-yellow-700">+{result.coins} 🪙</span>
              <span className="rounded-2xl bg-orange-100 px-4 py-2 font-black text-orange-700">{result.accuracy}%</span>
              {gameWin && <span className="rounded-2xl bg-amber-100 px-4 py-2 font-black text-amber-700">{computeLevelProgress(gameWin.progress, baseXp).title}</span>}
            </div>
            {gameWin && (gameWin.newAchievements.length > 0 || gameWin.newUnlocks.length > 0) && (
              <div className="flex max-w-sm flex-wrap justify-center gap-2">
                {gameWin.newAchievements.map((id) => {
                  const a = achievementLabel(id);
                  return (
                    <span key={id} className="rounded-full bg-teal-50 px-3 py-1 text-sm font-black text-teal-700">
                      {a.emoji} ¡Logro: {a.label}!
                    </span>
                  );
                })}
                {gameWin.newUnlocks.map((id) => {
                  const u = sokobanCurve.unlocks.find((x) => x.id === id);
                  return (
                    <span key={id} className="rounded-full bg-amber-50 px-3 py-1 text-sm font-black text-amber-700">
                      {u?.emoji ?? "🎁"} {u?.label ?? id}
                    </span>
                  );
                })}
              </div>
            )}
            <RewardSummary embedded={embedded} />
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <ExitButton embedded={embedded} onExit={onExit} />
              <button
                type="button"
                onClick={replay}
                className="rounded-xl bg-teal-600 px-8 py-3 font-extrabold uppercase tracking-wide text-white shadow-[0_4px_0_0_#0f766e] transition hover:bg-teal-500 active:translate-y-[2px]"
              >
                Otra vez 🔁
              </button>
            </div>
          </div>
        )}
      </div>
    </FrameShell>
  );
}

// ── The classic React body (scripture frames) ───────────────────────────────

type ViewProps<R extends AnyRound> = {
  frame: FrameDef;
  p: Progress;
  round: R;
  idx: number;
  phase: Phase;
  update: (p: Progress) => void;
  onMiss: () => void;
  onNext: () => void;
};

function ClassicFrame({
  frame,
  embedded = false,
  contentBinding,
  onWin,
  onExit,
}: {
  frame: FrameDef | undefined;
  embedded?: boolean;
  contentBinding?: string;
  onWin?: (result: MissionResult) => void;
  onExit?: () => void;
}) {
  const [p, update] = useProgress();
  const [phase, setPhase] = useState<Phase>("greet");
  const [idx, setIdx] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [rounds, setRounds] = useState<AnyRound[]>([]);
  const [result, setResult] = useState<{ xp: number; coins: number; accuracy: number } | null>(null);
  // The session's pack (when the mission carried a known binding) and its
  // verse: every scripture-flavored screen (moment, farewell, done card) is
  // verse-driven from the pack's scripture block — Génesis 1:1 stays the
  // no-binding default (INTEGRATION §2.5).
  const pack = useMemo(() => packForBinding(contentBinding), [contentBinding]);
  const pv = useMemo(() => (pack?.scripture ? packVerse(pack) : undefined), [pack]);
  const sessionVerse: SessionVerse | undefined = useMemo(
    () =>
      pv
        ? {
            reference: pv.reference.replace(/ \(RV1909\)$/, " · RV1909"),
            refSay: pv.refSay,
            verse: pv.verse,
          }
        : undefined,
    [pv],
  );
  // The farewell, verse-swapped when a pack binding is active: the frame's own
  // farewell strings keep their shape; the Génesis quote inside them is
  // replaced by the pack's verse bytes (the EN side by the pack's EN clause).
  const farewell = useMemo(() => {
    if (!frame) return { es: "", en: "" };
    if (!pv || !pack) return { es: frame.farewell.es, en: frame.farewell.en };
    const clause = verseEn(pack);
    return {
      es: frame.farewell.es.replace(`«${GENESIS_1_1}»`, `«${pv.verse}»`),
      en: clause
        ? frame.farewell.en.replace("In the beginning God created the heavens and the earth.", clause)
        : frame.farewell.en,
    };
  }, [frame, pack, pv]);

  const say = useCallback(
    (text: string, opts?: SpeakOpts, onEnd?: () => void) => {
      speakSpanish(text, opts ?? castParams(frame?.voice), onEnd);
    },
    [frame],
  );
  // Scripture read reverently by the narrator cast row (Génesis 1:1).
  const sayVerse = useCallback(
    (text: string, onEnd?: () => void) => {
      speakSpanish(text, castParams("scripture"), onEnd);
    },
    [],
  );
  // The reward explanation, narrator voice (REWARD_COPY.spoken).
  const speakReward = useCallback(() => {
    speakSpanish(REWARD_COPY.spoken.join(" "), castParams("narrator"));
  }, []);

  // The session's rounds: the pack's scripture round under a binding, else the
  // frame's own rounds; words missed earlier come back inside a DIFFERENT
  // frame than where they were missed (adaptive replay).
  const roundsFor = useCallback((): AnyRound[] => {
    if (!frame) return [];
    if (frame.kind !== "scripture") return frame.rounds as AnyRound[];
    const base: ScriptureRound[] = pack
      ? [bindingScriptureRound(pack) as ScriptureRound]
      : (frame.rounds as ScriptureRound[]);
    return buildScriptureRounds(base, p);
  }, [frame, pack, p]);

  // Rounds build once per visit.
  useEffect(() => {
    if (!frame || !p || rounds.length > 0) return;
    setRounds(roundsFor());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, p, roundsFor]);

  // Warm the voice as soon as the frame opens; stop speech when leaving.
  useEffect(() => {
    primeVoice();
    return () => stopSpeaking();
  }, []);

  // The villager speaks their greeting when the frame opens (heard first),
  // then the how-to — all BEFORE ¡Jugar! (quality bar: instructions precede
  // play). W2C ruling: the greet-tail verse is GONE — the ScriptureMoment
  // between ¡Jugar! and round 1 is the verse's one hearing.
  useEffect(() => {
    if (phase === "greet" && frame) {
      say(frame.greeting.es, castParams(frame.voice), () =>
        say(frame.howto.es.join(" "), castParams(frame.voice)),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, frame]);

  const total = rounds.length;
  const round: AnyRound | undefined = rounds[idx];
  const isLast = idx + 1 >= total;

  const finish = useCallback(() => {
    if (!p || !frame) return;
    const accuracy = total > 0 ? Math.max(0, Math.round(((total - mistakes) / total) * 100)) : 100;
    // Composite Spanish-mastery lesson id when a pack binding is active
    // (INTEGRATION §2 step 8) — the second mission is its own first-clear.
    const lessonId = pack ? `${frame.id}@${contentBinding}` : frame.id;
    const { next, xpGained, coinsGained } = completeLesson(p, lessonId, frame.xp, accuracy);
    update(bumpImmersion(next));
    // §10.5 call site 2 of 2: one win writes BOTH stores (classic frames keep
    // their own per-game level too; scripture bindings earn versiculo).
    recordGameWin(frame.id, xpGained, 1, {
      accuracy,
      maxStreak: accuracy >= 100 ? total : 0,
      replayHits: 0,
      replayTotal: 0,
      isScriptureBinding: Boolean(pack?.scripture),
    });
    setResult({ xp: xpGained, coins: coinsGained, accuracy });
    setPhase("done");
    // Farewell (+ the session's verse on scripture frames), then the reward
    // explanation (BLOCK E) in the narrator voice: what XP/coins/gems ARE,
    // spoken.
    if (frame.kind === "scripture") {
      say(farewell.es, castParams(frame.voice), () =>
        sayVerse(pv ? pv.verse : GENESIS_1_1, () => speakReward()),
      );
    } else {
      say(farewell.es, castParams(frame.voice), () => speakReward());
    }
    onWin?.({ xp: xpGained, coins: coinsGained, accuracy });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p, frame, total, mistakes, say, sayVerse, onWin, pack, contentBinding, pv, farewell]);

  const nextRound = useCallback(() => {
    stopSpeaking();
    if (isLast) {
      finish();
    } else {
      setIdx((i) => i + 1);
      setPhase("play");
    }
  }, [isLast, finish]);

  if (!frame || !p || total === 0) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-orange-50 px-6 text-center">
        <Mascot size={80} mood={frame ? "happy" : "sad"} />
        {frame ? (
          <>
            <p className="font-black text-stone-700">Preparando la escena…</p>
            <BackButton embedded={embedded} onExit={onExit} />
          </>
        ) : (
          <>
            <h1 className="text-xl font-black text-stone-900">Esta esquina de la aldea aún no existe</h1>
            <BackButton embedded={embedded} onExit={onExit} />
          </>
        )}
      </main>
    );
  }

  if (phase === "greet") {
    return (
      <FrameShell frame={frame} p={p} progressPct={0} embedded={embedded} onExit={onExit}>
        <div className="anim-rise flex h-full flex-col items-center justify-center gap-3 overflow-y-auto px-6 py-4 text-center">
          <div className="text-7xl anim-float">{frame.villager.emoji}</div>
          <h1 className="text-2xl font-black text-stone-900">{frame.villager.name}</h1>
          <p className="max-w-md rounded-3xl bg-white px-5 py-4 text-lg font-semibold text-stone-700 shadow">
            {frame.greeting.es}
            {glossMode(p.englishLevel, frame) !== "none" && (
              <span className="mt-2 block text-sm font-semibold text-stone-400">{frame.greeting.en}</span>
            )}
          </p>
          <HowtoCard frame={frame} showEn={glossMode(p.englishLevel, frame) !== "none"} />
          <button
            type="button"
            onClick={() =>
              say(frame.greeting.es, castParams(frame.voice), () =>
                say(frame.howto.es.join(" "), castParams(frame.voice)),
              )
            }
            aria-label="Escuchar las instrucciones otra vez"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-2xl text-white shadow-[0_3px_0_0_#0f766e] active:translate-y-[2px]"
          >
            🔊
          </button>
          <button
            type="button"
            onClick={() => {
              stopSpeaking();
              // Scripture frames hear + read the verse FIRST (owner item 3):
              // the moment sits between ¡Jugar! and the first verse round.
              setPhase(frame.kind === "scripture" ? "verse" : "play");
            }}
            className="rounded-2xl bg-teal-600 px-10 py-4 text-lg font-extrabold uppercase tracking-wide text-white shadow-[0_5px_0_0_#0f766e] transition hover:bg-teal-500 active:translate-y-[3px] active:shadow-[0_2px_0_0_#0f766e]"
          >
            ¡Jugar! ▶
          </button>
        </div>
      </FrameShell>
    );
  }

  if (phase === "verse") {
    return (
      <FrameShell frame={frame} p={p} progressPct={0} embedded={embedded} onExit={onExit}>
        <div className="flex h-full items-center justify-center">
          <ScriptureMoment
            verse={sessionVerse}
            onDone={() => {
              stopSpeaking();
              setPhase("play");
            }}
          />
        </div>
      </FrameShell>
    );
  }

  if (phase === "done" && result) {
    return (
      <FrameShell frame={frame} p={p} progressPct={100} embedded={embedded} onExit={onExit}>
        <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="anim-pop text-7xl">🎉</div>
          <Mascot size={90} mood="cheer" className="anim-float" />
          <h1 className="text-3xl font-black text-stone-900">¡Muy bien!</h1>
          {frame.id === CASA_FRAME_ID && (
            <p className="max-w-md rounded-2xl bg-amber-50 px-4 py-3 text-lg font-black text-amber-800">
              «{pv ? pv.verse : GENESIS_1_1}»
              <span className="mt-1 block text-xs font-bold text-amber-600">
                {pv ? pv.reference.replace(/ \(RV1909\)$/, " · RV1909") : "Génesis 1:1 · RV1909"}
              </span>
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            <span className="rounded-2xl bg-teal-100 px-4 py-2 font-black text-teal-700">+{result.xp} XP</span>
            <span className="rounded-2xl bg-yellow-100 px-4 py-2 font-black text-yellow-700">+{result.coins} 🪙</span>
            <span className="rounded-2xl bg-orange-100 px-4 py-2 font-black text-orange-700">{result.accuracy}%</span>
          </div>
          <RewardSummary embedded={embedded} />
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <ExitButton embedded={embedded} onExit={onExit} />
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                setRounds(roundsFor());
                setIdx(0);
                setMistakes(0);
                setResult(null);
                setPhase(frame.kind === "scripture" ? "verse" : "play");
              }}
              className="rounded-xl bg-teal-600 px-8 py-3 font-extrabold uppercase tracking-wide text-white shadow-[0_4px_0_0_#0f766e] transition hover:bg-teal-500 active:translate-y-[2px]"
            >
              Otra vez 🔁
            </button>
          </div>
        </div>
      </FrameShell>
    );
  }

  return (
    <FrameShell frame={frame} p={p} progressPct={(idx / total) * 100} embedded={embedded} onExit={onExit}>
      {frame.kind === "scripture" ? (
        <ScriptureView
          frame={frame}
          p={p}
          round={round as ScriptureRound}
          idx={idx}
          phase={phase}
          update={update}
          onMiss={() => setMistakes((m) => m + 1)}
          onNext={nextRound}
        />
      ) : null}
    </FrameShell>
  );
}

/** Scripture rounds: the verse rounds, with missed words slipped in as balloons. */
function buildScriptureRounds(base: ScriptureRound[], p: Progress | null): ScriptureRound[] {
  if (!p) return base;
  const answerWords = new Set(base.map((r) => r.word));
  const missed = missedWords(p).filter((w) => !answerWords.has(w)).slice(0, 2);
  if (missed.length === 0) return base;
  return base.map((r) => ({
    ...r,
    balloons: [...r.balloons, ...missed.filter((w) => !r.balloons.includes(w))],
  }));
}

// ── Shared shell ────────────────────────────────────────────────────────────

export function FrameShell({
  frame,
  p,
  progressPct,
  embedded,
  onExit,
  children,
}: {
  frame: FrameDef;
  p: Progress;
  progressPct: number;
  embedded: boolean;
  onExit?: () => void;
  children: ReactNode;
}) {
  const voice = useVoiceStatus();
  return (
    <main className="flex h-dvh flex-col bg-sky-100">
      <header className="z-20 border-b border-sky-200 bg-sky-50/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2.5">
          {embedded ? (
            <button
              type="button"
              onClick={() => onExit?.()}
              aria-label="Volver a la aventura"
              className="flex h-9 w-9 items-center justify-center rounded-full text-xl font-black text-stone-400 transition hover:bg-sky-100 hover:text-stone-600"
            >
              ✕
            </button>
          ) : (
            <Link
              to="/"
              aria-label="Volver a la aldea"
              onClick={() => stopSpeaking()}
              className="flex h-9 w-9 items-center justify-center rounded-full text-xl font-black text-stone-400 transition hover:bg-sky-100 hover:text-stone-600"
            >
              ✕
            </Link>
          )}
          <div
            className="h-3 flex-1 overflow-hidden rounded-full bg-sky-200"
            role="progressbar"
            aria-label="Progreso del juego"
            aria-valuenow={Math.round(progressPct)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-teal-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <StatsBar p={p} />
        </div>
        {(!embedded || voice.state === "loading") && (
          <div className="mx-auto max-w-2xl px-4 pb-2">
            {/* First-download indicator (owner P0): the ~86 MB model fetch shows
            its progress pill EVERYWHERE — embedded mission overlays included. */}
            <VoicePill state={voice.state} progress={voice.progress} />
          </div>
        )}
      </header>
      <section
        className="mx-auto w-full max-w-2xl flex-1 overflow-hidden px-2 py-3 sm:px-4"
        aria-label={`Escena: ${frame.place}`}
      >
        {children}
      </section>
    </main>
  );
}

export function BackButton({ embedded, onExit }: { embedded: boolean; onExit?: () => void }) {
  return embedded ? (
    <ExitButton embedded onExit={onExit} />
  ) : (
    <Link
      to="/"
      className="rounded-xl bg-amber-500 px-6 py-3 font-bold text-white shadow-[0_4px_0_0_#B45309]"
    >
      Volver a la aldea
    </Link>
  );
}

export function ExitButton({ embedded, onExit }: { embedded: boolean; onExit?: () => void }) {
  if (!embedded) {
    return (
      <Link
        to="/"
        onClick={() => stopSpeaking()}
        className="rounded-xl bg-amber-500 px-8 py-3 font-extrabold uppercase tracking-wide text-white shadow-[0_4px_0_0_#B45309] transition hover:bg-amber-400 active:translate-y-[2px]"
      >
        Volver a la aldea
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        stopSpeaking();
        onExit?.();
      }}
      className="rounded-xl bg-amber-500 px-8 py-3 font-extrabold uppercase tracking-wide text-white shadow-[0_4px_0_0_#B45309] transition hover:bg-amber-400 active:translate-y-[2px]"
    >
      Volver a la aventura ▶
    </button>
  );
}

function VoicePill({ state, progress }: { state: string; progress: number }) {
  if (state === "ready") {
    return <p className="text-center text-[11px] font-bold text-teal-700">🔊 voz natural · kokoro · español</p>;
  }
  if (state === "loading") {
    return (
      <p className="text-center text-[11px] font-bold text-amber-700">
        Descargando la voz natural… {Math.round(progress * 100)}% (una sola vez, luego sin internet)
      </p>
    );
  }
  return (
    <p className="text-center text-[11px] font-bold text-stone-500">
      🔊 voz del navegador mientras llega la voz natural…
    </p>
  );
}

// ── Game 2: the scripture balloon-pop ───────────────────────────────────────

const BALLOON_COLORS = [
  "bg-rose-400 border-rose-600",
  "bg-sky-400 border-sky-600",
  "bg-violet-400 border-violet-600",
  "bg-orange-400 border-orange-600",
  "bg-emerald-400 border-emerald-600",
  "bg-pink-400 border-pink-600",
];

/** Balloon spots below the verse card — rows keep wide gaps. */
const VERSE_SLOTS: [number, number][] = [
  [16, 34],
  [46, 34],
  [76, 34],
  [28, 52],
  [60, 52],
  [42, 68],
  [74, 68],
];

function ScriptureView({ frame, p, round, idx, phase, update, onMiss, onNext }: ViewProps<ScriptureRound>) {
  const [popped, setPopped] = useState<string[]>([]);
  const [filled, setFilled] = useState(false);
  // Streak = good pops in a row this round (an early answer-tap breaks it).
  const [streak, setStreak] = useState(0);
  const timer = useRef<number | null>(null);

  // Every verse line is SPOKEN in the narrator cast row; praise stays in the
  // villager's own voice.
  const sayRound = useCallback(
    (text: string, onEnd?: () => void) => {
      speakSpanish(text, castParams("scripture"), onEnd);
    },
    [],
  );
  const sayPraise = useCallback(
    (text: string) => {
      speakSpanish(text, castParams(frame.voice));
    },
    [frame.voice],
  );

  const balloons = useMemo(() => seededShuffle(round.balloons, `${frame.id}-b-${idx}`), [round, idx, frame.id]);
  const allWrongPopped = balloons.filter((b) => b !== round.word).every((b) => popped.includes(b));

  useEffect(() => {
    setPopped([]);
    setFilled(false);
    setStreak(0);
    sayRound(round.say);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  function pop(word: string) {
    if (phase !== "play" || filled) return;
    if (word === round.word) {
      if (!allWrongPopped) {
        // Popping the answer early: gentle correction, the balloon stays.
        onMiss();
        setStreak(0);
        update(loseHeart(recordMiss(p, round.word, frame.id)));
        sayPraise("¡Esa es la palabra que falta! Escucha el versículo otra vez.");
        window.setTimeout(() => sayRound(round.say), 2000);
        return;
      }
      // Only the answer remains: tap it to fill the gap.
      setFilled(true);
      sayPraise(frame.praise[idx % frame.praise.length]);
      update(clearMiss(p, word));
      window.setTimeout(() => sayRound(round.say), 1300);
      timer.current = window.setTimeout(onNext, 3400);
      return;
    }
    // A wrong balloon: hear it, pop it, it goes away — and the streak grows.
    setPopped((ps) => [...ps, word]);
    setStreak((s) => {
      const next = s + 1;
      if (next === 3) sayPraise("¡Tres seguidas! ¡Muy bien!");
      return next;
    });
    sayRound(word);
    if (missedWords(p).includes(word)) update(clearMiss(p, word));
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-3xl border-2 border-amber-200 bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100">
      <div className="relative flex-1 pt-4">
        {/* the verse card */}
        <div className="mx-3 rounded-2xl border-2 border-amber-300 bg-white px-4 py-3 text-center shadow">
          <p className="text-[11px] font-black uppercase tracking-widest text-amber-600">{round.reference}</p>
          <p className={`mt-1 text-xl font-black leading-snug text-stone-800 ${filled ? "anim-pop" : ""}`}>
            {filled ? (
              <>
                {round.verse.slice(0, round.verse.indexOf("___"))}
                <span className="mx-0.5 inline-block rounded-lg bg-amber-200 px-1">{round.label ?? round.word}</span>
                {round.verse.slice(round.verse.indexOf("___") + 3)}
              </>
            ) : (
              round.verse.replace("___", "____")
            )}
          </p>
          {glossMode(p.englishLevel, frame) !== "none" && (
            <p className="mt-1 text-[11px] font-semibold text-stone-400">{round.en}</p>
          )}
        </div>

        {balloons.map((word, i) => {
          const gone = popped.includes(word);
          const isAnswer = word === round.word;
          // The answer balloon displays the verse form when the KEY migrated
          // (word "cielo" shows as "cielos" inside the RV1909 verse).
          const text = isAnswer && round.label ? round.label : word;
          return (
            <div
              key={`${word}-${i}`}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${VERSE_SLOTS[i % VERSE_SLOTS.length][0]}%`, top: `${VERSE_SLOTS[i % VERSE_SLOTS.length][1]}%` }}
            >
              <button
                type="button"
                onClick={() => pop(word)}
                disabled={gone}
                style={{
                  animationDelay: `${i * 0.35}s`,
                  // varied float tempo: every balloon drifts at its own speed
                  animationDuration: `${2.4 + (i % 4) * 0.55}s`,
                }}
                className={`anim-float relative rounded-full border-b-4 px-4 py-2 text-lg font-black text-white shadow-lg transition active:scale-95 ${
                  BALLOON_COLORS[i % BALLOON_COLORS.length]
                } ${gone ? "balloon-burst pointer-events-none" : ""} ${
                  isAnswer && allWrongPopped && !filled ? "ring-4 ring-amber-400" : ""
                }`}
              >
                {text}
                {gone && <span className="absolute -inset-3 -z-10 text-5xl">💥</span>}
              </button>
            </div>
          );
        })}

        {filled && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-6xl anim-pop">
            ✨
          </div>
        )}
        <div className="absolute bottom-2 left-3 text-5xl anim-float">{frame.villager.emoji}</div>
      </div>

      <div className="border-t-2 border-amber-200 bg-white/95 px-3 py-3">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          {streak >= 2 && (
            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-rose-700">
              Racha {streak} 🔥
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => sayRound(round.say)}
            aria-label="Escuchar el versículo otra vez"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-600 text-2xl text-white shadow-[0_3px_0_0_#0f766e] active:translate-y-[2px]"
          >
            🔊
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-stone-800">
              {allWrongPopped ? "¡Toca el bueno!" : "Revienta los que no van."}
            </p>
            <Gloss level={p.englishLevel} frame={frame} en={round.en} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** English gloss per progressive immersion: full, faded (tap ℹ️), or none. */
export function Gloss({ level, frame, en }: { level: number; frame: FrameDef; en: string }) {
  const mode = glossMode(level, frame);
  const [open, setOpen] = useState(false);
  if (mode === "none") return null;
  if (mode === "full") {
    return <p className="truncate text-xs font-semibold text-stone-400">{en}</p>;
  }
  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className="truncate text-xs font-semibold text-stone-400 underline decoration-dotted"
    >
      {open ? en : "ℹ️ inglés"}
    </button>
  );
}
