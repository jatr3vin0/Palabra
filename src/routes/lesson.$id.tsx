import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { StatsBar, useProgress } from "~/components/Chrome";
import { Mascot } from "~/components/Mascot";
import { ExerciseView, type ExerciseOutcome } from "~/components/Exercise";
import { answerText, findLesson, unit } from "~/content/unit";
import { speak } from "~/lib/speech";
import {
  CHECKPOINT_XP,
  HEART_REGEN_MS,
  completeLesson,
  heartTimerMs,
  isMiniUnlocked,
  loseHeart,
  type Progress,
} from "~/lib/storage";

export const Route = createFileRoute("/lesson/$id")({
  component: LessonPage,
});

function fmt(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function LessonPage() {
  const { id } = Route.useParams();
  const [p, update] = useProgress();
  const lesson = useMemo(() => findLesson(id), [id]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"answer" | "feedback">("answer");
  const [last, setLast] = useState<ExerciseOutcome | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [result, setResult] = useState<{
    xpGained: number;
    coinsGained: number;
    accuracy: number;
    leveledUp: boolean;
  } | null>(null);
  // One physical Enter can do double duty: the input's keydown submits the
  // answer, and because the Continue button takes focus (autoFocus) during the
  // re-render inside that same keydown, the browser then fires Enter's native
  // button-activation click on Continue — verified via event log. advance()
  // therefore refuses to run within 300 ms of a submit, so the keypress that
  // opened the feedback can never also skip it.
  const submittedAt = useRef(0);

  const total = lesson?.exercises.length ?? 0;
  const current = lesson && idx < total ? lesson.exercises[idx] : null;

  // Enter = Continue while feedback is showing (advance() self-guards against
  // the submit keypress, see submittedAt above)
  useEffect(() => {
    if (phase !== "feedback") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") advance();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx, p, lesson]);

  if (!lesson) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-orange-50 px-6 text-center">
        <Mascot size={80} mood="sad" />
        <h1 className="text-xl font-black text-stone-900">Lesson not found</h1>
        <Link to="/" className="rounded-xl bg-amber-500 px-6 py-3 font-bold text-white shadow-[0_4px_0_0_#B45309]">
          Back to the path
        </Link>
      </main>
    );
  }

  if (!p || !current) {
    if (p && result) return <CompleteScreen p={p} result={result} checkpoint={lesson.id === unit.checkpoint.id} />;
    return (
      <main className="flex min-h-dvh items-center justify-center bg-orange-50">
        <Mascot size={80} className="anim-float" />
      </main>
    );
  }

  function finish() {
    if (!p || !lesson) return;
    const accuracy = Math.max(0, Math.round(((total - mistakes) / total) * 100));
    const { next, xpGained, coinsGained, leveledUp } = completeLesson(
      p,
      lesson.id,
      lesson.xp ?? CHECKPOINT_XP,
      accuracy,
    );
    update(next);
    setResult({ xpGained, coinsGained, accuracy, leveledUp });
  }

  function advance() {
    if (Date.now() - submittedAt.current < 300) return;
    if (idx + 1 < total) {
      setIdx(idx + 1);
      setPhase("answer");
      setLast(null);
    } else {
      // Move past the last exercise so `current` is null and the
      // CompleteScreen (not the finished exercise) is what renders.
      setIdx(total);
      finish();
    }
  }

  function onResult(outcome: ExerciseOutcome) {
    if (phase === "feedback") return;
    submittedAt.current = Date.now();
    setLast(outcome);
    setPhase("feedback");
    // Match-pair slips cost no hearts; a missed answer costs one.
    if (!outcome.correct && !outcome.noHeartCost) {
      if (p) update(loseHeart(p));
      setMistakes((m) => m + 1);
    }
  }

  // Out of hearts: stop the lesson, offer the path back. Hearts refill on their own.
  // Checked only while answering, so the learner still sees the feedback for a miss.
  if (p.hearts <= 0 && !result && phase === "answer") {
    return <OutOfHearts />;
  }

  const progressPct = ((idx + (phase === "feedback" ? 1 : 0)) / total) * 100;
  const isCheckpoint = lesson.id === unit.checkpoint.id;

  return (
    <main className="flex min-h-dvh flex-col bg-orange-50">
      <header className="sticky top-0 z-20 border-b border-orange-100 bg-orange-50/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            to="/"
            aria-label="Leave the lesson and go back to the path"
            className="flex h-9 w-9 items-center justify-center rounded-full text-xl font-black text-stone-400 transition hover:bg-orange-100 hover:text-stone-600"
          >
            ✕
          </Link>
          <div
            className="h-4 flex-1 overflow-hidden rounded-full bg-orange-200"
            role="progressbar"
            aria-label="Lesson progress"
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
      </header>

      <section className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {isCheckpoint && (
          <p className="mb-3 text-center text-xs font-black uppercase tracking-widest text-teal-700">
            Unit checkpoint — everything you have learned
          </p>
        )}
        <div key={current.id} className="anim-rise">
          <ExerciseView ex={current} revealed={phase === "feedback"} onResult={onResult} />
        </div>
      </section>

      {phase === "feedback" && last && (
        <footer
          className={`anim-rise sticky bottom-0 border-t-2 ${
            last.correct ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
          }`}
        >
          <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-4">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl ${
                last.correct ? "bg-emerald-100" : "bg-red-100"
              }`}
              aria-hidden
            >
              {last.correct ? "✅" : "💔"}
            </span>
            <div className="flex-1">
              <p className={`font-black ${last.correct ? "text-emerald-700" : "text-red-700"}`}>
                {last.correct ? "¡Muy bien!" : "Not quite"}
              </p>
              {!last.correct && (
                <p className="text-sm font-semibold text-stone-600">
                  Answer:{" "}
                  <button
                    type="button"
                    onClick={() => speak(answerText(current))}
                    className="underline decoration-dotted"
                  >
                    {answerText(current)} 🔊
                  </button>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={advance}
              autoFocus
              className={`rounded-xl px-8 py-3 font-extrabold uppercase tracking-wide text-white shadow-[0_4px_0_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-[0_2px_0_0_rgba(0,0,0,0.25)] ${
                last.correct ? "bg-emerald-500 hover:bg-emerald-400" : "bg-red-500 hover:bg-red-400"
              }`}
            >
              Continue
            </button>
          </div>
        </footer>
      )}
    </main>
  );
}

function OutOfHearts() {
  const [p] = useProgress();
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const waiting = p ? heartTimerMs(p) : 0;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-orange-50 px-6 text-center">
      <Mascot size={90} mood="sad" />
      <h1 className="text-2xl font-black text-stone-900">You're out of hearts 💔</h1>
      <p className="max-w-sm font-semibold text-stone-600">
        One heart refills every {HEART_REGEN_MS / 60000} minutes — no paying to win, just a short
        rest. Next heart in{" "}
        <span className="font-black tabular-nums text-rose-600">{fmt(waiting)}</span>
      </p>
      <Link
        to="/"
        className="rounded-xl bg-amber-500 px-8 py-3 font-extrabold uppercase tracking-wide text-white shadow-[0_4px_0_0_#B45309] transition hover:bg-amber-400 active:translate-y-[2px]"
      >
        Back to the path
      </Link>
      <p className="text-xs font-semibold text-stone-400">
        Hearts are only lost on lessons you haven't mastered — replaying is always free.
      </p>
    </main>
  );
}

function CompleteScreen({
  p,
  result,
  checkpoint,
}: {
  p: Progress;
  result: { xpGained: number; coinsGained: number; accuracy: number; leveledUp: boolean };
  checkpoint: boolean;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-orange-50 px-6 text-center">
      <div className="anim-pop">
        <Mascot size={130} mood="cheer" />
      </div>
      <h1 className="text-3xl font-black text-stone-900">
        {checkpoint ? "¡Unidad completada! 🎉" : "¡Lección completa! 🎉"}
      </h1>
      {result.leveledUp && (
        <p className="anim-rise rounded-full bg-teal-600 px-4 py-1 text-sm font-black text-white">
          ⭐ LEVEL UP — you reached level {Math.floor(p.xp / 100) + 1}
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <span className="rounded-2xl bg-teal-100 px-4 py-2 font-black text-teal-700">
          +{result.xpGained} XP
        </span>
        <span className="rounded-2xl bg-yellow-100 px-4 py-2 font-black text-yellow-700">
          +{result.coinsGained} 🪙
        </span>
        <span className="rounded-2xl bg-amber-100 px-4 py-2 font-black text-amber-700">
          {result.accuracy}% accuracy
        </span>
        <span className="rounded-2xl bg-orange-100 px-4 py-2 font-black text-orange-700">
          🔥 {p.streak} day streak
        </span>
      </div>
      <p className="max-w-sm text-sm font-semibold text-stone-500">
        {result.accuracy === 100
          ? "Flawless — every answer right on the first try."
          : "Every miss costs a heart, but every lesson makes you stronger. ¡Sigue así!"}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className="rounded-xl bg-amber-500 px-8 py-3 font-extrabold uppercase tracking-wide text-white shadow-[0_4px_0_0_#B45309] transition hover:bg-amber-400 active:translate-y-[2px]"
        >
          Back to the path
        </Link>
        {isMiniUnlocked(p) && (
          <Link
            to="/minigame"
            className="rounded-xl bg-teal-600 px-8 py-3 font-extrabold uppercase tracking-wide text-white shadow-[0_4px_0_0_#0f766e] transition hover:bg-teal-500 active:translate-y-[2px]"
          >
            Play Palabra rápida ⚡
          </Link>
        )}
      </div>
    </main>
  );
}
