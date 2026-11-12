/**
 * «Ladrillos del Alfabeto» — the React session for the breakout template
 * (game #4, build/PORT-breakout-word.md). Lives beside the frame engine's
 * other sessions; the frame engine (FrameGame.tsx) dispatches by mechanic
 * `breakout-word`. React owns everything the scene may not touch: storage,
 * hearts, misses/replay, speech, the mechanical ladder, the per-game §10.5
 * store, and the mission bridge. The shared UI atoms (FrameShell/HowtoCard/
 * Gloss/…) are imported from FrameGame.tsx — ONE shell, no drift.
 *
 * Mechanical vs language (PORT §3): the ONLY language miss is a brick hit
 * (decoy break / out-of-order graze). Ball loss and clock expiry follow the
 * knob'd ladder and never speak: Niño respawn-keep · Normal R1–R2 keep,
 * R3–R5 board reset · Adulto session restart (PORT §9 ruling 3). Hearts
 * reset to full at every word-board (within-round misses only — road-cross
 * economy ruling), so a session never dies from accumulated misses.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Mascot } from "~/components/Mascot";
import { useProgress } from "~/components/Chrome";
import { PhaserIsland } from "~/components/PhaserGame";
import { BackButton, ExitButton, FrameShell, Gloss, HowtoCard, REWARD_COPY, RewardSummary, TIERS, type MissionResult } from "~/components/FrameGame";
import { glossMode, type FrameDef } from "~/lib/frames";
import {
  bumpImmersion,
  clearMiss,
  completeLesson,
  computeLevelProgress,
  HEART_MAX,
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
import { boundSafe as boundMisses } from "~/content/packs/a0-u04-breakout";
import { achievementLabel as breakoutAchievementLabel, curve as breakoutCurve } from "~/games/templates/breakout-word/curve";
import { BR_THRESHOLDS, boardSay, buildBreakoutSession, keepsProgress, roundOfBoard, type BreakoutSession } from "~/games/templates/breakout-word/rounds";
import { createController as createBreakoutController, type BreakoutBoard } from "~/games/templates/breakout-word/types";

type Phase = "greet" | "play" | "over" | "done";

const BR_ROUND_BREAK_MS = 1500;
const BR_WORD_BREAK_MS = 1200;
const BR_MISS_RESPAWN_MS = 1900;

export function BreakoutFrame({
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
  const [boardIdx, setBoardIdx] = useState(0);
  const [wordsDone, setWordsDone] = useState(0);
  const [restartKey, setRestartKey] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [result, setResult] = useState<{ xp: number; coins: number; accuracy: number } | null>(null);
  const [gameWin, setGameWin] = useState<{
    progress: GameProgress;
    leveledUp: boolean;
    newAchievements: string[];
    newUnlocks: string[];
  } | null>(null);

  const ctrl = useMemo(createBreakoutController, []);
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

  // The session's pool is a0-u04 (+ the l4 cut) by design (plan §2); a mission
  // may only ever pass the same binding, but the resolver stays honest.
  const binding = contentBinding && packForBinding(contentBinding) ? contentBinding : "a0-u04";

  // R5 replay pool, SNAPSHOTTED at session start (sessionId change). Boards
  // must keep their identity across the session's progress writes — a miss
  // records a heart + miss and MUST NOT rebuild the boards mid-word.
  const [sessionMisses, setSessionMisses] = useState<string[]>([]);
  useEffect(() => {
    if (p) setSessionMisses(missedWords(p).filter(boundMisses));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const pReady = !!p;
  const session: BreakoutSession = useMemo(
    () =>
      pReady
        ? buildBreakoutSession(frame, sessionMisses, tier, sessionId, gp0.current.level)
        : { boards: [], roundSizes: [] },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pReady, sessionMisses, tier, sessionId, restartKey],
  );
  const board: BreakoutBoard | undefined = session.boards[boardIdx];
  const roundIdx = roundOfBoard(session, boardIdx);
  const threshold = roundIdx >= 0 && roundIdx < BR_THRESHOLDS.length ? BR_THRESHOLDS[roundIdx] : 3;

  // Live mirror: handlers are stable closures reading fresh state.
  const live = useRef({
    p: null as Progress | null,
    phase: "greet" as Phase,
    session: null as BreakoutSession | null,
    board: null as BreakoutBoard | null,
    boardIdx: 0,
    roundIdx: 0,
    threshold: 3,
    wordsDone: 0,
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
  const handleMechRef = useRef<() => void>(() => {});
  const handleWinRef = useRef<(accuracy: number) => void>(() => {});

  const bridge = useMemo(
    () => ({
      params: { speed: 1, difficulty: 2, masteryThreshold: 3 },
      speak: (text: string) => say(text),
      onHit: (word: string) => handleHitRef.current(word),
      onMiss: (word: string) => handleMissRef.current(word),
      onMechanical: () => handleMechRef.current(),
      onProgress: (left: number, limit: number | null) => setTimeLeft(limit === null ? null : left),
      onWin: (accuracy: number) => handleWinRef.current(accuracy),
    }),
    [say],
  );

  /** WORD COMPLETE (the scene fires it once per board, the word's es id):
   * praise + the word echoed; replay hits clear the miss; the session
   * advances — next word, or the round banner, or the win. */
  const handleHit = useCallback(
    (word: string) => {
      const L = live.current;
      const r = L.board;
      if (L.phase !== "play" || !r || !L.p || word !== r.word) return;
      L.hits += 1;
      L.streak += 1;
      L.maxStreak = Math.max(L.maxStreak, L.streak);
      if (r.isReplay) {
        L.replayHits += 1;
        updateRef.current(clearMiss(L.p, r.word));
      }
      window.clearTimeout(missTimer.current);
      const done = L.wordsDone + 1;
      L.wordsDone = done;
      setWordsDone(done);
      // Hit confirm first (the word is heard whole again), then praise.
      sayRound(`¡${r.word}!`, () => say(frame.praise[(L.hits - 1) % frame.praise.length]));
      const lastBoard = L.boardIdx >= (L.session?.boards.length ?? 0) - 1;
      const nextRoundIdx = roundOfBoard(L.session ?? { boards: [], roundSizes: [] }, L.boardIdx + 1);
      const newRound = nextRoundIdx !== L.roundIdx;
      if (lastBoard) {
        const accuracy = L.hits + L.misses > 0 ? Math.round((L.hits / (L.hits + L.misses)) * 100) : 100;
        handleWinRef.current(accuracy);
        return;
      }
      if (newRound) {
        say("¡Ronda lista!");
        ctrl.showBanner(`¡Ronda ${nextRoundIdx + 1} de 5!`, "¡Sigue deletreando!");
        window.clearTimeout(roundTimer.current);
        roundTimer.current = window.setTimeout(() => {
          L.wordsDone = 0;
          setWordsDone(0);
          setBoardIdx(L.boardIdx + 1);
        }, BR_ROUND_BREAK_MS);
      } else {
        window.clearTimeout(hitTimer.current);
        hitTimer.current = window.setTimeout(() => setBoardIdx(L.boardIdx + 1), BR_WORD_BREAK_MS);
      }
    },
    [ctrl, frame, say, sayRound],
  );

  /** D2 economy — hearts 0: freeze the board (showBanner locks the scene),
   * speak the gentle game-over, and offer the same-board same-seed retry. */
  const enterGameOver = useCallback(() => {
    const L = live.current;
    setPhase("over");
    [hitTimer, missTimer, roundTimer].forEach((t) => window.clearTimeout(t.current));
    ctrl.showBanner("¡Sin corazones!", "Respira y otra vez");
    say(frame.gentle[(L.misses - 1) % frame.gentle.length], undefined, () => say("Sin corazones. Respira, escucha y otra vez."));
  }, [ctrl, frame, say]);

  /** A language miss (decoy break / out-of-order graze): the miss records the
   * BOARD's word (contract-critical es) and a heart is spent; the gentle line
   * speaks now and the spelling chant returns ~1.9 s later. */
  const handleMiss = useCallback(
    (_label: string) => {
      const L = live.current;
      const named = L.board?.word;
      if (L.phase !== "play" || !L.p || !named) return;
      L.misses += 1;
      L.streak = 0;
      const next = loseHeart(recordMiss(L.p, named, frame.id));
      updateRef.current(next);
      if (next.hearts <= 0) {
        enterGameOver();
        return;
      }
      say(frame.gentle[(L.misses - 1) % frame.gentle.length]);
      window.clearTimeout(missTimer.current);
      missTimer.current = window.setTimeout(() => sayRound(boardSay(L.board!)), BR_MISS_RESPAWN_MS);
    },
    [enterGameOver, frame, say, sayRound],
  );

  /** THE MECHANICAL LADDER (PORT §9 ruling 3) — ball loss and clock expiry
   * take the SAME knob: Niño respawn-keep · Normal R1–R2 keep / R3–R5 board
   * reset · Adulto session restart. No heart, no miss, NO speech. */
  const handleMechanical = useCallback(() => {
    const L = live.current;
    if (L.phase !== "play") return;
    if (keepsProgress(L.roundIdx, L.tier)) {
      ctrl.respawnBall();
      return;
    }
    if (L.tier === 2) {
      // session restart (source-true loseGame→scene.restart, escalated):
      // the SAME session seed rebuilds the SAME boards from board 1.
      ctrl.showBanner("¡Otra vez!", "El muro vuelve a empezar");
      window.clearTimeout(roundTimer.current);
      roundTimer.current = window.setTimeout(() => {
        L.wordsDone = 0;
        setWordsDone(0);
        setBoardIdx(0);
        setRestartKey((k) => k + 1);
      }, BR_ROUND_BREAK_MS);
      return;
    }
    // Normal R3–R5: the word's board reloads, same seed, progress resets.
    ctrl.showBanner("¡La pelota se cayó!", "El muro vuelve");
    window.clearTimeout(roundTimer.current);
    roundTimer.current = window.setTimeout(() => setRestartKey((k) => k + 1), BR_ROUND_BREAK_MS);
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
      // breakout's is this one. Spanish mastery (palabra.progress.v1) is
      // untouched by the game level, achievements and unlocks.
      const gw = recordGameWin(frame.id, xpGained, L.tier, {
        accuracy,
        maxStreak: L.maxStreak,
        replayHits: L.replayHits,
        // The win fires only on the LAST board — the replay round's boards.
        replayTotal: L.session?.roundSizes[4] ?? 0,
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
          const lines = gw.newAchievements.map((id) => `¡Logro: ${breakoutAchievementLabel(id).label.replace(/¡|!/g, "")}!`);
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
    live.current.session = session;
    live.current.board = board ?? null;
    live.current.boardIdx = boardIdx;
    live.current.roundIdx = roundIdx;
    live.current.threshold = threshold;
    live.current.wordsDone = wordsDone;
    live.current.tier = tier;
    bridge.params.speed = [0.6, 1, 1.4][tier];
    bridge.params.difficulty = roundIdx + 1;
    bridge.params.masteryThreshold = threshold;
    updateRef.current = update;
    handleHitRef.current = handleHit;
    handleMissRef.current = handleMiss;
    handleMechRef.current = handleMechanical;
    handleWinRef.current = handleWin;
  });

  // Hearts RESET to full at every word-board load — they measure within-board
  // language misses only (road-cross economy ruling). Declared AFTER the
  // mirror effect so live.current.p is this render's.
  useEffect(() => {
    if (phase !== "play") return;
    const cur = live.current.p;
    if (cur && cur.hearts < HEART_MAX) {
      updateRef.current({ ...cur, hearts: HEART_MAX, heartsAt: Date.now() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, boardIdx, restartKey, sessionId]);

  // Warm the voice, greet Joss + explain the game (spoken + text BEFORE
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

  // Board load: the scene gets the board + the spelling chant speaks; the
  // launch waits for the chant (scene watchdog 3.2 s is the bound).
  useEffect(() => {
    if (phase !== "play" || !board) return;
    ctrl.playBoard(board);
    setTimeLeft(board.timeLimit);
    sayRound(boardSay(board), () => ctrl.launch());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, board, restartKey]);

  const levelBadge = computeLevelProgress(gp0.current, baseXp);
  const progressPct =
    phase === "done"
      ? 100
      : phase === "greet" || roundIdx < 0
        ? 0
        : ((roundIdx + (threshold > 0 ? Math.min(1, wordsDone / threshold) : 0)) / 5) * 100;

  if (!p || session.boards.length === 0) {
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
    setBoardIdx(0);
    setWordsDone(0);
    setRestartKey((k) => k + 1);
    setResult(null);
    setGameWin(null);
    setPhase("greet");
  };

  return (
    <FrameShell frame={frame} p={p} progressPct={progressPct} embedded={embedded} onExit={onExit}>
      <div className="relative h-full overflow-hidden rounded-3xl border-2 border-indigo-200 shadow-lg">
        <PhaserIsland bridge={bridge} ctrl={ctrl} loader={() => import("~/games/templates/breakout-word")} opts={{ gloss: glossMode(p.englishLevel, frame) }} />

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

        {phase === "play" && board && (
          <div className="absolute inset-x-0 bottom-0 z-10 border-t-2 border-indigo-300 bg-white/95 px-3 py-3">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-indigo-700">
                Ronda {roundIdx + 1}/5
              </span>
              <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-teal-700">
                Palabras {wordsDone}/{threshold}
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
              {board.isReplay && <span className="rounded-full bg-teal-100 px-1 text-[10px] font-black text-teal-700">REPASO 🔄</span>}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => sayRound(boardSay(board))}
                aria-label="Escuchar la palabra otra vez"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-600 text-2xl text-white shadow-[0_3px_0_0_#0f766e] active:translate-y-[2px]"
              >
                🔊
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-stone-800">Rompe en orden: {board.word}</p>
                <Gloss level={p.englishLevel} frame={frame} en={board.en} />
              </div>
            </div>
          </div>
        )}

        {phase === "over" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 overflow-y-auto bg-white/75 px-6 py-4 text-center backdrop-blur-[2px]">
            <div className="anim-pop text-7xl">💔</div>
            <h1 className="text-2xl font-black text-stone-900">¡Sin corazones!</h1>
            <p className="max-w-md rounded-3xl bg-white px-5 py-4 text-lg font-semibold text-stone-700 shadow">
              Respira, escucha y otra vez. El muro espera.
            </p>
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                [hitTimer, missTimer, roundTimer].forEach((t) => window.clearTimeout(t.current));
                const L = live.current;
                L.wordsDone = 0;
                setWordsDone(0);
                setPhase("play");
                setRestartKey((k) => k + 1);
              }}
              className="rounded-2xl bg-teal-600 px-10 py-4 text-lg font-extrabold uppercase tracking-wide text-white shadow-[0_5px_0_0_#0f766e] transition hover:bg-teal-500 active:translate-y-[3px] active:shadow-[0_2px_0_0_#0f766e]"
            >
              Otra vez 🔁
            </button>
            <ExitButton embedded={embedded} onExit={onExit} />
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
                  const a = breakoutAchievementLabel(id);
                  return (
                    <span key={id} className="rounded-full bg-teal-50 px-3 py-1 text-sm font-black text-teal-700">
                      {a.emoji} ¡Logro: {a.label}!
                    </span>
                  );
                })}
                {gameWin.newUnlocks.map((id) => {
                  const u = breakoutCurve.unlocks.find((x) => x.id === id);
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
