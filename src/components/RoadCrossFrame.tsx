/**
 * «¡Cruza la Calle!» — the React session for the road-cross template (game #3,
 * build/PORT-road-cross-word.md). Lives beside the frame engine's other
 * sessions; the frame engine (FrameGame.tsx) dispatches by mechanic
 * `road-cross-word`. React owns everything the scene may not touch: storage,
 * hearts, misses/replay, speech, the per-game §10.5 store, and the mission
 * bridge. The shared UI atoms (FrameShell/HowtoCard/Gloss/…) are imported from
 * FrameGame.tsx — ONE shell, no drift.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Mascot } from "~/components/Mascot";
import { useProgress } from "~/components/Chrome";
import { PhaserIsland } from "~/components/PhaserGame";
import { BackButton, ExitButton, FrameShell, Gloss, HowtoCard, REWARD_COPY, RewardSummary, TIERS, type MissionResult } from "~/components/FrameGame";
import { seededShuffle } from "~/lib/answer";
import { glossMode, type FrameDef } from "~/lib/frames";
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
import { primeVoice, speakSpanish, stopSpeaking, type SpeakOpts } from "~/lib/voice";
import { castParams } from "~/lib/voiceCast";
import { packForBinding } from "~/content/packs/a0-packs";
import { nearFormDecoys, waveIds, wordFor } from "~/content/packs/a0-u05-sokoban";
import { achievementLabel as roadCrossAchievementLabel, curve as roadCrossCurve } from "~/games/templates/road-cross-word/curve";
import { createController as createRoadCrossController, type RoadCrossBoard, type RoadCrossRound } from "~/games/templates/road-cross-word/types";

type Phase = "greet" | "play" | "done";

/** Per-round knob tables (PORT-road-cross-word.md knob map; R3 anchors pinned
 * in GAME-source-pins.md #3: speeds [220,260,280,300,330], 25 s, 5 rows). */
const RC_BASE_SPEEDS = [220, 260, 280, 300, 330];
const RC_STANDARD_TIME = 25;
/** masteryThreshold SUPERSEDES the source score counter (R1–R2 = 2, R3–R5 = 3). */
const RC_THRESHOLDS = [2, 2, 3, 3, 3];
/** difficulty → labeled lanes per round: child 3 (target + 2 decoys) → adult 5. */
const RC_LANES_BY_TIER = [3, 4, 5];
const RC_ROUND_BREAK_MS = 1500;
const RC_MISS_RESPAWN_MS = 1900;
const RC_RETRY_MS = 1400;

/** Article per a0-u05 word (-a feminine, else masculine — includes el norte…). */
function articleFor(es: string): string {
  return es.endsWith("a") ? "la" : "el";
}

/** The composed TPR command (≤38 chars), COMPOSED at session time, never stored. */
function composedCrossSay(es: string): string {
  return `¡Cruza por ${articleFor(es)} ${es.toUpperCase()}!… ${es}.`;
}

/** a0-u05 per-source scoping: other packs' misses serve ONLY u05-bound frames. */
function wordForSafe(es: string): boolean {
  try {
    return wordFor(es).es === es;
  } catch {
    return false;
  }
}

/**
 * The session's rounds (PORT §3): R1–R4 from the a0-u05 pack waves (the
 * round's word = the seeded safe lane; lane options = the word's own curated
 * decoys first — the pack pairs piedra/roca, camino/castillo, norte/oeste),
 * then R5: up to three adaptive-replay rounds (one safe word each, from
 * progress.misses ∩ a0-u05; empty → one light review round). The safe lane is
 * identified BY LABEL (=== round.word), never a row index (invariant 2).
 */
function buildRoadCrossRounds(frame: FrameDef, p: Progress, tier: 0 | 1 | 2, sessionId: number): RoadCrossRound[] {
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
  // R5 — adaptive replay: a0-u05 misses return as safe-lane words (one round
  // each; hit clears the miss, a decoy entry re-records it).
  const replays = seededShuffle(missedWords(p).filter((w) => wordForSafe(w)), `${frame.id}-replay-${sessionId}`).slice(0, 3);
  const replayWords = replays.length > 0 ? replays : [seededShuffle(sessionWords, `${frame.id}-review-${sessionId}`)[0]];
  for (const [i, word] of replayWords.entries()) {
    const decoys = nearFormDecoys([word], Math.min(4, labeled - 1), seededShuffle, `${frame.id}-replay${i}-t${tier}-s${sessionId}`);
    rounds.push({ word, options: [word, ...decoys], wave: 5, isReplay: true });
  }
  return rounds;
}

/** Build the crossing React-side (content stays out of the scene): lane
 * labels onto seeded rows, tier-scaled speeds/clock, source car-count formula. */
function buildRoadCrossBoard(round: RoadCrossRound, roundIdx: number, tier: 0 | 1 | 2, level: number, seed: string): RoadCrossBoard {
  const labeledRows = seededShuffle([0, 1, 2, 3, 4], `${seed}-rows`).slice(0, Math.min(5, round.options.length));
  const words = seededShuffle(round.options, `${seed}-words`);
  const lanes = Array.from({ length: 5 }, (_, l): { es: string | null; safe: boolean } => {
    const slot = labeledRows.indexOf(l);
    const es = slot >= 0 ? words[slot % words.length] : null;
    return { es, safe: es === round.word };
  });
  const tierMul = [0.6, 1, 1.4][tier];
  const boost = Math.min(roadCrossCurve.ramp.carCap, Math.floor(level / 8)) * roadCrossCurve.ramp.carBoostPer8Levels;
  const difficulty = roundIdx + 1 + boost;
  return {
    lanes,
    carSpeeds: RC_BASE_SPEEDS.map((s) => Math.round(s * tierMul)),
    carCount: Math.min(4, 2 + Math.floor(difficulty / 2)),
    timeLimit: Math.round(RC_STANDARD_TIME / tierMul),
  };
}

export function RoadCrossFrame({
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
  const [crossings, setCrossings] = useState(0);
  const [restartKey, setRestartKey] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [result, setResult] = useState<{ xp: number; coins: number; accuracy: number } | null>(null);
  const [gameWin, setGameWin] = useState<{
    progress: GameProgress;
    leveledUp: boolean;
    newAchievements: string[];
    newUnlocks: string[];
  } | null>(null);

  const ctrl = useMemo(createRoadCrossController, []);
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

  // The session's pool is a0-u05 by design (R7-2 + plan §3); a mission may
  // only ever pass the same binding, but the resolver stays honest.
  const binding = contentBinding && packForBinding(contentBinding) ? contentBinding : "a0-u05";

  const rounds = useMemo(
    () => (p ? buildRoadCrossRounds(frame, p, tier, sessionId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p, tier, sessionId],
  );
  const round = rounds[roundIdx];
  const threshold = roundIdx < RC_THRESHOLDS.length ? RC_THRESHOLDS[roundIdx] : 3;

  const board = useMemo(
    () => (round ? buildRoadCrossBoard(round, roundIdx, tier, gp0.current.level, `${frame.id}-L${gp0.current.level}-R${roundIdx}-T${tier}-S${sessionId}`) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [round, roundIdx, tier, restartKey, sessionId],
  );

  // Live mirror: handlers are stable closures reading fresh state.
  const live = useRef({
    p: null as Progress | null,
    phase: "greet" as Phase,
    rounds: [] as RoadCrossRound[],
    round: null as RoadCrossRound | null,
    roundIdx: 0,
    crossings: 0,
    threshold: 3,
    hits: 0,
    misses: 0,
    streak: 0,
    maxStreak: 0,
    replayHits: 0,
    tier: 1 as 0 | 1 | 2,
  });
  const updateRef = useRef(update);
  const handleHitRef = useRef<(word: string) => void>(() => {});
  const handleMissRef = useRef<(word: string) => void>(() => {});
  const handleWinRef = useRef<(accuracy: number) => void>(() => {});
  const handleTimeRef = useRef<() => void>(() => {});

  const bridge = useMemo(
    () => ({
      params: { speed: 1, difficulty: 1, masteryThreshold: 3 },
      speak: (text: string) => say(text),
      onHit: (word: string) => handleHitRef.current(word),
      onMiss: (word: string) => handleMissRef.current(word),
      onWin: (accuracy: number) => handleWinRef.current(accuracy),
      onProgress: (left: number, limit: number | null) => setTimeLeft(limit === null ? null : left),
      onTimeExpired: () => handleTimeRef.current(),
    }),
    [say],
  );

  const handleHit = useCallback(
    (es: string) => {
      const L = live.current;
      const r = L.round;
      if (L.phase !== "play" || !r || !L.p || es !== r.word) return;
      L.hits += 1;
      L.streak += 1;
      L.maxStreak = Math.max(L.maxStreak, L.streak);
      if (r.isReplay) {
        L.replayHits += 1;
        updateRef.current(clearMiss(L.p, r.word));
      }
      window.clearTimeout(missTimer.current);
      const done = L.crossings + 1;
      L.crossings = done;
      setCrossings(done);
      // Hit confirm first (the word is heard again), then praise.
      sayRound(r.word, () => say(frame.praise[(L.hits - 1) % frame.praise.length]));
      if (done >= L.threshold) {
        if (L.roundIdx >= L.rounds.length - 1) {
          const accuracy = L.hits + L.misses > 0 ? Math.round((L.hits / (L.hits + L.misses)) * 100) : 100;
          handleWinRef.current(accuracy);
          return;
        }
        say("¡Cruce listo!");
        ctrl.showBanner(`¡Ronda ${L.roundIdx + 2} de ${L.rounds.length}!`, "¡Sigue cruzando!");
        window.clearTimeout(roundTimer.current);
        roundTimer.current = window.setTimeout(() => {
          L.crossings = 0;
          setCrossings(0);
          setRoundIdx(L.roundIdx + 1);
        }, RC_ROUND_BREAK_MS);
      }
    },
    [ctrl, frame, say, sayRound],
  );

  const handleMiss = useCallback(
    (_es: string) => {
      const L = live.current;
      const named = L.round?.word;
      if (L.phase !== "play" || !L.p || !named) return;
      L.misses += 1;
      L.streak = 0;
      // One composed save: the miss records the ROUND's word (contract-
      // critical es, never a lane index) and a heart is spent; play continues.
      updateRef.current(loseHeart(recordMiss(L.p, named, frame.id)));
      // Gentle correction now, the command re-spoken ~1.9 s later.
      say(frame.gentle[(L.misses - 1) % frame.gentle.length]);
      window.clearTimeout(missTimer.current);
      missTimer.current = window.setTimeout(() => sayRound(composedCrossSay(named)), RC_MISS_RESPAWN_MS);
    },
    [frame, say, sayRound],
  );

  // Clock expiry: MECHANICAL retry — no heart, no miss; the same round reloads
  // and the command is spoken again (language vs gaming skill separation).
  const retryRound = useCallback(() => {
    const L = live.current;
    L.crossings = 0;
    setCrossings(0);
    ctrl.showBanner("¡Se acabó el tiempo!", "¡Otra vez!");
    window.clearTimeout(roundTimer.current);
    roundTimer.current = window.setTimeout(() => setRestartKey((k) => k + 1), RC_RETRY_MS);
  }, [ctrl]);

  const handleWin = useCallback(
    (accuracy: number) => {
      const L = live.current;
      if (!L.p) return;
      // Composite Spanish-mastery lesson id (INTEGRATION §2 step 8).
      const lessonId = `${frame.id}@${binding}`;
      const { next, xpGained, coinsGained } = completeLesson(L.p, lessonId, frame.xp, accuracy);
      updateRef.current(bumpImmersion(next));
      // §10.5: the per-game store writes at the frame engine's win sites —
      // road-cross's is this one. Spanish mastery (palabra.progress.v1) is
      // untouched by the game level, achievements and unlocks.
      const gw = recordGameWin(frame.id, xpGained, L.tier, {
        accuracy,
        maxStreak: L.maxStreak,
        replayHits: L.replayHits,
        // The win fires only on the LAST round — a replay round when misses
        // were served (one safe word per replay round).
        replayTotal: L.rounds.filter((r) => r.isReplay).length,
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
          const lines = gw.newAchievements.map((id) => `¡Logro: ${roadCrossAchievementLabel(id).label.replace(/¡|!/g, "")}!`);
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
    live.current.crossings = crossings;
    live.current.threshold = threshold;
    live.current.tier = tier;
    bridge.params.speed = [0.6, 1, 1.4][tier];
    bridge.params.difficulty = roundIdx + 1;
    bridge.params.masteryThreshold = threshold;
    updateRef.current = update;
    handleHitRef.current = handleHit;
    handleMissRef.current = handleMiss;
    handleWinRef.current = handleWin;
    handleTimeRef.current = retryRound;
  });

  // Warm the voice, greet Tomás + explain the game (spoken + text BEFORE
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

  // Crossing load: when a fresh board arrives, the scene gets it + the safe
  // lane's command is spoken (composed TPR say, ≤38 chars).
  useEffect(() => {
    if (phase !== "play" || !round || !board) return;
    ctrl.playBoard(board, round.word);
    setTimeLeft(board.timeLimit);
    sayRound(composedCrossSay(round.word));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, board]);

  const levelBadge = computeLevelProgress(gp0.current, baseXp);
  const progressPct =
    phase === "done" ? 100 : phase === "greet" ? 0 : ((roundIdx + (round ? Math.min(1, crossings / threshold) : 0)) / Math.max(1, rounds.length)) * 100;

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
    setCrossings(0);
    setRestartKey((k) => k + 1);
    setResult(null);
    setGameWin(null);
    setPhase("greet");
  };

  return (
    <FrameShell frame={frame} p={p} progressPct={progressPct} embedded={embedded} onExit={onExit}>
      <div className="relative h-full overflow-hidden rounded-3xl border-2 border-amber-200 shadow-lg">
        <PhaserIsland bridge={bridge} ctrl={ctrl} loader={() => import("~/games/templates/road-cross-word")} opts={{ gloss: glossMode(p.englishLevel, frame) }} />

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
                Ronda {roundIdx + 1}/{rounds.length}
              </span>
              <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-teal-700">
                Cruces {crossings}/{threshold}
              </span>
              {timeLeft !== null && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide ${
                    timeLeft <= 10 ? "animate-pulse bg-rose-100 text-rose-700" : "bg-stone-100 text-stone-600"
                  }`}
                >
                  ⏱ {timeLeft}s
                </span>
              )}
              {round.isReplay && <span className="rounded-full bg-teal-100 px-1 text-[10px] font-black text-teal-700">REPASO 🔄</span>}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => sayRound(composedCrossSay(round.word))}
                aria-label="Escuchar el comando otra vez"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-600 text-2xl text-white shadow-[0_3px_0_0_#0f766e] active:translate-y-[2px]"
              >
                🔊
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-stone-800">Cruza por: {round.word}</p>
                <Gloss level={p.englishLevel} frame={frame} en={wordFor(round.word).en} />
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
                  const a = roadCrossAchievementLabel(id);
                  return (
                    <span key={id} className="rounded-full bg-teal-50 px-3 py-1 text-sm font-black text-teal-700">
                      {a.emoji} ¡Logro: {a.label}!
                    </span>
                  );
                })}
                {gameWin.newUnlocks.map((id) => {
                  const u = roadCrossCurve.unlocks.find((x) => x.id === id);
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
