import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { StatsBar, useProgress } from "~/components/Chrome";
import { Mascot } from "~/components/Mascot";
import { PhaserIsland } from "~/components/PhaserGame";
import { unit } from "~/content/unit";
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
  loseHeart,
  missedWords,
  recordMiss,
  type Progress,
} from "~/lib/storage";
import { primeVoice, speakSpanish, stopSpeaking, useVoiceStatus, type SpeakOpts } from "~/lib/voice";
import { castParams } from "~/lib/voiceCast";
import { createController, type SkyWordsBridge } from "~/games/sky-words-types";

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
  spoken: [
    "¡Muy bien! Ganaste puntos, gemas y monedas.",
    "Los puntos son de aprender. Más puntos, más sabes.",
    "Las gemas son del mundo. Las monedas son de Palabra.",
    "Todo queda guardado. ¡Hasta la próxima!",
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

/**
 * The scripture moment (owner item 3): a full-screen spoken verse card —
 * enter → reference → verse, all in the narrator scripture row, text on
 * screen the whole time — before any verse fill-in is asked. Sequence is
 * strict (BLOCK F): heard AND read first, only then the ask + round.
 */
function ScriptureMoment({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState<"listen" | "ask">("listen");
  const alive = useRef(true);
  const run = useCallback(() => {
    alive.current = true;
    setStage("listen");
    speakSpanish(SCRIPTURE_MOMENT.enter.es, castParams("scripture"), () =>
      speakSpanish(SCRIPTURE_MOMENT.reference.es, castParams("scripture"), () =>
        speakSpanish(SCRIPTURE_MOMENT.verse.es, castParams("scripture"), () => {
          if (alive.current) setStage("ask");
        }),
      ),
    );
  }, []);
  useEffect(() => {
    run();
    return () => {
      alive.current = false;
      stopSpeaking();
    };
  }, [run]);
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-amber-50/95 px-6 text-center">
      <p className="text-[11px] font-black uppercase tracking-widest text-amber-600">{SCRIPTURE_MOMENT.enter.es}</p>
      <p className="text-xs font-black text-amber-700">{SCRIPTURE_MOMENT.reference.es}</p>
      <p className="max-w-md rounded-2xl border-2 border-amber-300 bg-white px-5 py-4 text-xl font-black leading-snug text-stone-800 shadow">
        «{SCRIPTURE_MOMENT.verse.es}»
      </p>
      <p className="text-[10px] font-bold text-stone-400">
        Génesis 1:1 · RV1909 · {SCRIPTURE_MOMENT.amen.es}
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
        <button
          type="button"
          onClick={run}
          aria-label={SCRIPTURE_MOMENT.again.es}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-2xl text-white shadow-[0_3px_0_0_#0f766e] active:translate-y-[2px]"
        >
          🔊
        </button>
      )}
    </div>
  );
}

/** The how-to card on the greet screen: kid-simple, shown + spoken. */
function HowtoCard({ frame, showEn }: { frame: FrameDef; showEn: boolean }) {
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
function RewardSummary({ embedded }: { embedded: boolean }) {
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
  onWin,
  onExit,
}: {
  frameId: string;
  embedded?: boolean;
  /** Session tier preselected when a mission launches it (child → Niño). */
  missionDifficulty?: string;
  /** Fires once per win, after XP/coins/mastery are recorded in storage. */
  onWin?: (result: MissionResult) => void;
  /** Fires when the learner closes the frame (embedded mode only). */
  onExit?: () => void;
}) {
  const frame = useMemo(() => getFrame(frameId), [frameId]);
  // Game #1: the Phaser shooter template. Everything else keeps the React body.
  if (frame?.kind === "phaser" && frame.mechanic === "shooter-word") {
    return (
      <SkyWordsFrame frame={frame} embedded={embedded} missionDifficulty={missionDifficulty} onWin={onWin} onExit={onExit} />
    );
  }
  return <ClassicFrame frame={frame} embedded={embedded} onWin={onWin} onExit={onExit} />;
}

// ── Game 1: Capitán Rico: Sky Words — the Phaser shooter template ───────────

/** Session tiers (GAME-ROADMAP §7): L1 child, L2 standard, L3 adult. */
const TIERS = [
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
  onWin,
  onExit,
}: {
  frame: FrameDef;
  embedded?: boolean;
  missionDifficulty?: string;
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
      const { next, xpGained, coinsGained } = completeLesson(L.p, frame.id, frame.xp, accuracy);
      updateRef.current(bumpImmersion(next));
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
    [ctrl, frame, say, onWin],
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
    bridge.params.speed = tierParams.speed;
    bridge.params.difficulty = tierParams.difficulty;
    bridge.params.masteryThreshold = tierParams.masteryThreshold;
    updateRef.current = update;
    handleHitRef.current = handleHit;
    handleMissRef.current = handleMiss;
    handleWinRef.current = handleWin;
  });

  // The session's five waves: saludos ×2, cortesía, «En el principio», replay.
  useEffect(() => {
    if (!p || waves.length > 0) return;
    setWaves(buildShooterWaves(frame, p));
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
    return formationFor(round, tierParams, seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round, waveIdx, roundIdx, respawns, tierParams]);

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
    setWaves(buildShooterWaves(frame, p));
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

const vocabPool: { es: string; en: string }[] = unit.vocab;

/** True when a shooter wave is the «En el principio» scripture wave. */
function isScriptureWave(w: ShooterRound[] | undefined): boolean {
  return Array.isArray(w) && w.some((r) => r.caption?.startsWith("Génesis"));
}

function distractors(word: string, count: number, seed: string): string[] {
  const pool = vocabPool.map((v) => v.es).filter((w) => w !== word);
  return seededShuffle(pool, seed).slice(0, count);
}

/**
 * The five session waves from the frame's contentBinding: rounds carry a wave
 * tag (1–2 saludos, 3 cortesía, 4 «En el principio»); wave 5 is the adaptive
 * replay wave, built from progress.misses with isReplay — a hit clears the
 * miss, a miss re-records it.
 */
function buildShooterWaves(frame: FrameDef, p: Progress | null): ShooterRound[][] {
  const base = frame.rounds as ShooterRound[];
  const waves: ShooterRound[][] = [[], [], [], [], []];
  for (const r of base) {
    const w = Math.min(4, Math.max(1, r.wave ?? 1)) - 1;
    waves[w].push(r);
  }
  const replays = (p ? missedWords(p) : [])
    .filter((w) => vocabPool.some((v) => v.es === w))
    .slice(0, 3)
    .map((w) => {
      const v = vocabPool.find((x) => x.es === w)!;
      return {
        word: v.es,
        en: v.en,
        say: `Repasamos una palabra de antes. ¿Dónde está… ${v.es}?`,
        caption: `¿Dónde está… ${v.es}?`,
        options: [v.es, ...distractors(v.es, 3, `${frame.id}-${v.es}`)],
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
 * unit vocab; adults get look-alike/rhyming decoys first). Pre-shuffled. */
function formationFor(
  round: ShooterRound,
  params: { difficulty: number; similar: boolean },
  seed: string,
): string[] {
  const want = Math.max(2, params.difficulty);
  const picks: string[] = [round.word];
  const add = (w: string) => {
    if (picks.length < want && !picks.includes(w)) picks.push(w);
  };
  const vocab = vocabPool.map((v) => v.es).filter((w) => w !== round.word);
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
  onWin,
  onExit,
}: {
  frame: FrameDef | undefined;
  embedded?: boolean;
  onWin?: (result: MissionResult) => void;
  onExit?: () => void;
}) {
  const [p, update] = useProgress();
  const [phase, setPhase] = useState<Phase>("greet");
  const [idx, setIdx] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [rounds, setRounds] = useState<AnyRound[]>([]);
  const [result, setResult] = useState<{ xp: number; coins: number; accuracy: number } | null>(null);

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

  // Rounds build once per visit: words missed earlier come back here, inside a
  // DIFFERENT frame than where they were missed (adaptive replay).
  useEffect(() => {
    if (!frame || !p || rounds.length > 0) return;
    setRounds(frame.kind === "scripture" ? buildScriptureRounds(frame, p) : (frame.rounds as AnyRound[]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, p]);

  // Warm the voice as soon as the frame opens; stop speech when leaving.
  useEffect(() => {
    primeVoice();
    return () => stopSpeaking();
  }, []);

  // The villager speaks their greeting when the frame opens (heard first),
  // then the how-to; on scripture frames the verse follows in the narrator's
  // voice — all BEFORE ¡Jugar! (quality bar: instructions precede play).
  useEffect(() => {
    if (phase === "greet" && frame) {
      if (frame.kind === "scripture") {
        say(frame.greeting.es, castParams(frame.voice), () =>
          say(frame.howto.es.join(" "), castParams(frame.voice), () => sayVerse(GENESIS_1_1)),
        );
      } else {
        say(frame.greeting.es, castParams(frame.voice), () =>
          say(frame.howto.es.join(" "), castParams(frame.voice)),
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, frame]);

  const total = rounds.length;
  const round: AnyRound | undefined = rounds[idx];
  const isLast = idx + 1 >= total;

  const finish = useCallback(() => {
    if (!p || !frame) return;
    const accuracy = total > 0 ? Math.max(0, Math.round(((total - mistakes) / total) * 100)) : 100;
    const { next, xpGained, coinsGained } = completeLesson(p, frame.id, frame.xp, accuracy);
    update(bumpImmersion(next));
    setResult({ xp: xpGained, coins: coinsGained, accuracy });
    setPhase("done");
    // Farewell (+ the verse on scripture frames), then the reward explanation
    // (BLOCK E) in the narrator voice: what XP/coins/gems ARE, spoken.
    if (frame.kind === "scripture") {
      say(frame.farewell.es, castParams(frame.voice), () =>
        sayVerse(GENESIS_1_1, () => speakReward()),
      );
    } else {
      say(frame.farewell.es, castParams(frame.voice), () => speakReward());
    }
    onWin?.({ xp: xpGained, coins: coinsGained, accuracy });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p, frame, total, mistakes, say, sayVerse, onWin]);

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
            onClick={() => {
              if (frame.kind === "scripture") {
                say(frame.greeting.es, castParams(frame.voice), () =>
                  say(frame.howto.es.join(" "), castParams(frame.voice), () => sayVerse(GENESIS_1_1)),
                );
              } else {
                say(frame.greeting.es, castParams(frame.voice), () =>
                  say(frame.howto.es.join(" "), castParams(frame.voice)),
                );
              }
            }}
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
              «{GENESIS_1_1}»
              <span className="mt-1 block text-xs font-bold text-amber-600">Génesis 1:1 · RV1909</span>
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
                setRounds(frame.kind === "scripture" ? buildScriptureRounds(frame, p) : (frame.rounds as AnyRound[]));
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
function buildScriptureRounds(frame: FrameDef, p: Progress | null): ScriptureRound[] {
  const base = frame.rounds as ScriptureRound[];
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

function FrameShell({
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
        {!embedded && (
          <div className="mx-auto max-w-2xl px-4 pb-2">
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

function BackButton({ embedded, onExit }: { embedded: boolean; onExit?: () => void }) {
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

function ExitButton({ embedded, onExit }: { embedded: boolean; onExit?: () => void }) {
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
                <span className="mx-0.5 inline-block rounded-lg bg-amber-200 px-1">{round.word}</span>
                {round.verse.slice(round.verse.indexOf("___") + 3)}
              </>
            ) : (
              round.verse.replace("___", "____")
            )}
          </p>
          {glossMode(p.englishLevel, frame) !== "none" && (
            <p className="mt-1 text-[11px] font-semibold text-stone-400">{EN_GENESIS_1_1}</p>
          )}
        </div>

        {balloons.map((word, i) => {
          const gone = popped.includes(word);
          const isAnswer = word === round.word;
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
                {word}
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
              Revienta los que no van. Al final, toca el bueno.
            </p>
            <Gloss level={p.englishLevel} frame={frame} en={round.en} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** English gloss per progressive immersion: full, faded (tap ℹ️), or none. */
function Gloss({ level, frame, en }: { level: number; frame: FrameDef; en: string }) {
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
