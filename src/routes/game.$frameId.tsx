import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { StatsBar, useProgress } from "~/components/Chrome";
import { Mascot } from "~/components/Mascot";
import { unit } from "~/content/unit";
import { seededShuffle } from "~/lib/answer";
import {
  CASA_FRAME_ID,
  PLAZA_FRAME_ID,
  getFrame,
  glossMode,
  type FrameDef,
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
import { primeVoice, speakSpanish, stopSpeaking, useVoiceStatus } from "~/lib/voice";

export const Route = createFileRoute("/game/$frameId")({
  component: GameFrame,
});

const EN_GENESIS_1_1 = "In the beginning God created the heavens and the earth. (NKJV)";

type Phase = "greet" | "play" | "done";

type AnyRound = ShooterRound | ScriptureRound;

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

function GameFrame() {
  const { frameId } = Route.useParams();
  const [p, update] = useProgress();
  const [phase, setPhase] = useState<Phase>("greet");
  const [idx, setIdx] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [rounds, setRounds] = useState<AnyRound[]>([]);
  const [result, setResult] = useState<{ xp: number; coins: number; accuracy: number } | null>(null);

  const frame = useMemo(() => getFrame(frameId), [frameId]);

  // Rounds build once per visit: words missed earlier come back here, inside a
  // DIFFERENT frame than where they were missed (adaptive replay).
  useEffect(() => {
    if (!frame || !p || rounds.length > 0) return;
    setRounds(frame.kind === "shooter" ? buildShooterRounds(frame, p) : buildScriptureRounds(frame, p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, p]);

  // Warm the voice as soon as the frame opens; stop speech when leaving.
  useEffect(() => {
    primeVoice();
    return () => stopSpeaking();
  }, []);

  // The villager speaks their greeting when the frame opens (heard first).
  useEffect(() => {
    if (phase === "greet" && frame) speakSpanish(frame.greeting.es);
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
    speakSpanish(frame.farewell.es);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p, frame, total, mistakes]);

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
            <Link
              to="/"
              className="rounded-xl bg-amber-500 px-6 py-3 font-bold text-white shadow-[0_4px_0_0_#B45309]"
            >
              Volver a la aldea
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-black text-stone-900">Esta esquina de la aldea aún no existe</h1>
            <Link
              to="/"
              className="rounded-xl bg-amber-500 px-6 py-3 font-bold text-white shadow-[0_4px_0_0_#B45309]"
            >
              Volver a la aldea
            </Link>
          </>
        )}
      </main>
    );
  }

  if (phase === "greet") {
    return (
      <FrameShell frame={frame} p={p} progressPct={0}>
        <div className="anim-rise flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
          <div className="text-7xl anim-float">{frame.villager.emoji}</div>
          <h1 className="text-2xl font-black text-stone-900">{frame.villager.name}</h1>
          <p className="max-w-md rounded-3xl bg-white px-5 py-4 text-lg font-semibold text-stone-700 shadow">
            {frame.greeting.es}
            {glossMode(p.englishLevel, frame) !== "none" && (
              <span className="mt-2 block text-sm font-semibold text-stone-400">{frame.greeting.en}</span>
            )}
          </p>
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
      </FrameShell>
    );
  }

  if (phase === "done" && result) {
    return (
      <FrameShell frame={frame} p={p} progressPct={100}>
        <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="anim-pop text-7xl">🎉</div>
          <Mascot size={90} mood="cheer" className="anim-float" />
          <h1 className="text-3xl font-black text-stone-900">¡Muy bien!</h1>
          {frameId === CASA_FRAME_ID && (
            <p className="max-w-md rounded-2xl bg-amber-50 px-4 py-3 text-lg font-black text-amber-800">
              «En el principio creó Dios los cielos y la tierra.»
              <span className="mt-1 block text-xs font-bold text-amber-600">Génesis 1:1 · RV1909</span>
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            <span className="rounded-2xl bg-teal-100 px-4 py-2 font-black text-teal-700">+{result.xp} XP</span>
            <span className="rounded-2xl bg-yellow-100 px-4 py-2 font-black text-yellow-700">+{result.coins} 🪙</span>
            <span className="rounded-2xl bg-orange-100 px-4 py-2 font-black text-orange-700">{result.accuracy}%</span>
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              to="/"
              className="rounded-xl bg-amber-500 px-8 py-3 font-extrabold uppercase tracking-wide text-white shadow-[0_4px_0_0_#B45309] transition hover:bg-amber-400 active:translate-y-[2px]"
            >
              Volver a la aldea
            </Link>
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                setRounds(frame.kind === "shooter" ? buildShooterRounds(frame, p) : buildScriptureRounds(frame, p));
                setIdx(0);
                setMistakes(0);
                setResult(null);
                setPhase("play");
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
    <FrameShell frame={frame} p={p} progressPct={(idx / total) * 100}>
      {frame.kind === "shooter" ? (
        <ShooterView
          frame={frame}
          p={p}
          round={round as ShooterRound}
          idx={idx}
          phase={phase}
          update={update}
          onMiss={() => setMistakes((m) => m + 1)}
          onNext={nextRound}
        />
      ) : (
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
      )}
    </FrameShell>
  );
}

// ── Adaptive round building ─────────────────────────────────────────────────

const vocabPool: { es: string; en: string }[] = unit.vocab;

function distractors(word: string, count: number, seed: string): string[] {
  const pool = vocabPool.map((v) => v.es).filter((w) => w !== word);
  return seededShuffle(pool, seed).slice(0, count);
}

/** Shooter rounds: missed words first (as replays), then the frame's rounds. */
function buildShooterRounds(frame: FrameDef, p: Progress | null): ShooterRound[] {
  const base = frame.rounds as ShooterRound[];
  if (!p) return base;
  const frameWords = new Set(base.map((r) => r.word));
  const replays = missedWords(p)
    .filter((w) => !frameWords.has(w) && vocabPool.some((v) => v.es === w))
    .slice(0, 3)
    .map((w) => {
      const v = vocabPool.find((x) => x.es === w)!;
      return {
        word: v.es,
        en: v.en,
        say: `Repasamos una palabra de antes. ¿Dónde está… ${v.es}?`,
        caption: `¿Dónde está… ${v.es}?`,
        options: [v.es, ...distractors(v.es, 3, `${frame.id}-${v.es}`)],
        isReplay: true,
      } as ShooterRound;
    });
  return [...replays, ...base];
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
  children,
}: {
  frame: FrameDef;
  p: Progress;
  progressPct: number;
  children: ReactNode;
}) {
  const voice = useVoiceStatus();
  return (
    <main className="flex h-dvh flex-col bg-sky-100">
      <header className="z-20 border-b border-sky-200 bg-sky-50/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2.5">
          <Link
            to="/"
            aria-label="Volver a la aldea"
            onClick={() => stopSpeaking()}
            className="flex h-9 w-9 items-center justify-center rounded-full text-xl font-black text-stone-400 transition hover:bg-sky-100 hover:text-stone-600"
          >
            ✕
          </Link>
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
        <div className="mx-auto max-w-2xl px-4 pb-2">
          <VoicePill state={voice.state} progress={voice.progress} />
        </div>
      </header>
      <section className="mx-auto w-full max-w-2xl flex-1 overflow-hidden px-2 py-3 sm:px-4">{children}</section>
    </main>
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

// ── Game 1: the jet word-shooter ────────────────────────────────────────────

const BALLOON_COLORS = [
  "bg-rose-400 border-rose-600",
  "bg-sky-400 border-sky-600",
  "bg-violet-400 border-violet-600",
  "bg-orange-400 border-orange-600",
  "bg-emerald-400 border-emerald-600",
  "bg-pink-400 border-pink-600",
];

/** Balloon spots as [x%, y%] — rows keep wide gaps so balloons never overlap. */
const SKY_SLOTS: [number, number][] = [
  [18, 22],
  [50, 22],
  [82, 22],
  [32, 44],
  [64, 44],
  [46, 62],
  [78, 62],
];

function ShooterView({ frame, p, round, idx, phase, update, onMiss, onNext }: ViewProps<ShooterRound>) {
  const [burst, setBurst] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const [jet, setJet] = useState<{ x: number; y: number } | null>(null);
  const timer = useRef<number | null>(null);

  const options = useMemo(() => seededShuffle(round.options, `${frame.id}-${idx}`), [round, idx, frame.id]);

  useEffect(() => {
    setBurst(null);
    setWrong([]);
    setJet(null);
    speakSpanish(round.say);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  function choose(word: string) {
    if (phase !== "play" || burst) return;
    if (word === round.word) {
      const target = SKY_SLOTS[options.indexOf(word)] ?? [50, 30];
      setJet({ x: target[0], y: target[1] });
      setBurst(word);
      speakSpanish(frame.praise[idx % frame.praise.length]);
      if (round.isReplay) update(clearMiss(p, word));
      timer.current = window.setTimeout(onNext, 1500);
    } else {
      setWrong((w) => (w.includes(word) ? w : [...w, word]));
      onMiss();
      // One composed save: the miss is recorded and a heart is spent,
      // hearts stay internal — play never stops for a penalty screen.
      update(loseHeart(recordMiss(p, round.word, frame.id)));
      speakSpanish(frame.gentle[idx % frame.gentle.length]);
      window.setTimeout(() => speakSpanish(round.say), 1900);
    }
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-3xl border-2 border-sky-200 bg-gradient-to-b from-sky-400 via-sky-300 to-sky-200">
      {/* sky playfield */}
      <div className="relative flex-1">
        {round.missing && (
          <p className="absolute inset-x-3 top-2 z-10 rounded-2xl bg-white/90 px-4 py-2 text-center text-lg font-black leading-snug text-stone-800 shadow sm:text-xl">
            {round.missing}
          </p>
        )}
        {options.map((word, i) => (
          <div
            key={word}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${SKY_SLOTS[i % SKY_SLOTS.length][0]}%`, top: `${SKY_SLOTS[i % SKY_SLOTS.length][1]}%` }}
          >
            <button
              type="button"
              onClick={() => choose(word)}
              disabled={wrong.includes(word) || burst !== null}
              style={{ animationDelay: `${i * 0.4}s` }}
              className={`anim-float relative rounded-full border-b-4 px-4 py-2 text-lg font-black text-white shadow-lg ${
                BALLOON_COLORS[i % BALLOON_COLORS.length]
              } ${burst === word ? "balloon-burst" : ""} ${
                wrong.includes(word) ? "opacity-20 grayscale" : ""
              } ${burst !== null && burst !== word ? "opacity-30" : ""}`}
            >
              {word}
              {burst === word && <span className="absolute -inset-3 -z-10 text-5xl">💥</span>}
            </button>
          </div>
        ))}

        {/* the jet: idles bottom-right, dives to the burst balloon */}
        <div
          className="absolute text-4xl transition-all duration-700 ease-out"
          style={{
            left: `${jet ? jet.x : 90}%`,
            top: `${jet ? jet.y : 78}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          ✈️
        </div>
      </div>

      {/* prompt bar */}
      <div className="border-t-2 border-sky-300 bg-white/95 px-3 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => speakSpanish(round.say)}
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
    </div>
  );
}

// ── Game 2: the scripture balloon-pop ───────────────────────────────────────

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
  const timer = useRef<number | null>(null);

  const balloons = useMemo(() => seededShuffle(round.balloons, `${frame.id}-b-${idx}`), [round, idx, frame.id]);
  const allWrongPopped = balloons.filter((b) => b !== round.word).every((b) => popped.includes(b));

  useEffect(() => {
    setPopped([]);
    setFilled(false);
    speakSpanish(round.say);
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
        update(loseHeart(recordMiss(p, round.word, frame.id)));
        speakSpanish("¡Esa es la palabra que falta! Escucha el versículo otra vez.");
        window.setTimeout(() => speakSpanish(round.say), 2000);
        return;
      }
      // Only the answer remains: tap it to fill the gap.
      setFilled(true);
      speakSpanish(frame.praise[idx % frame.praise.length]);
      update(clearMiss(p, word));
      window.setTimeout(() => speakSpanish(round.say), 1300);
      timer.current = window.setTimeout(onNext, 3400);
      return;
    }
    // A wrong balloon: hear it, pop it, it goes away.
    setPopped((ps) => [...ps, word]);
    speakSpanish(word);
    if (missedWords(p).includes(word)) update(clearMiss(p, word));
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-3xl border-2 border-amber-200 bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100">
      <div className="relative flex-1 pt-4">
        {/* the verse card */}
        <div className="mx-3 rounded-2xl border-2 border-amber-300 bg-white px-4 py-3 text-center shadow">
          <p className="text-[11px] font-black uppercase tracking-widest text-amber-600">{round.reference}</p>
          <p className="mt-1 text-xl font-black leading-snug text-stone-800">
            {filled ? round.verse.replace("___", round.word) : round.verse.replace("___", "____")}
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
                style={{ animationDelay: `${i * 0.35}s` }}
                className={`anim-float relative rounded-full border-b-4 px-4 py-2 text-lg font-black text-white shadow-lg ${
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

        <div className="absolute bottom-2 left-3 text-5xl anim-float">{frame.villager.emoji}</div>
      </div>

      <div className="border-t-2 border-amber-200 bg-white/95 px-3 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => speakSpanish(round.say)}
            aria-label="Escuchar el versículo otra vez"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-600 text-2xl text-white shadow-[0_3px_0_0_#0f766e] active:translate-y-[2px]"
          >
            🔊
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-stone-800">
              Revienta los globos que no van y guarda el bueno
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
