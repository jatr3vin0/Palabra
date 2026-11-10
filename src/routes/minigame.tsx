import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { useProgress } from "~/components/Chrome";
import { Mascot } from "~/components/Mascot";
import { unit } from "~/content/unit";
import { seededShuffle } from "~/lib/answer";
import { saveProgress, touchStreak, MINI_UNLOCK_LESSON, type Progress } from "~/lib/storage";

export const Route = createFileRoute("/minigame")({
  component: MiniGame,
});

const GAME_SECONDS = 45;

type Question = { es: string; en: string; options: string[] };

function buildQuestion(seed: string): Question {
  const entries = unit.vocab;
  const shuffled = seededShuffle(entries, seed);
  const target = shuffled[0];
  const distractors = shuffled.slice(1, 4).map((v) => v.en);
  const options = seededShuffle([target.en, ...distractors], `${seed}-opts`);
  return { es: target.es, en: target.en, options };
}

function MiniGame() {
  const [p, update] = useProgress();
  const [stage, setStage] = useState<"start" | "play" | "end">("start");
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(GAME_SECONDS);
  const [round, setRound] = useState(0);
  const [flash, setFlash] = useState<"hit" | "miss" | null>(null);
  const [banked, setBanked] = useState(false);
  const [prevBest, setPrevBest] = useState(0);

  const q = useMemo(() => buildQuestion(`r${round}-${unit.unitId}`), [round]);

  useEffect(() => {
    if (stage !== "play") return;
    if (left <= 0) {
      setStage("end");
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, left]);

  // Bank the coins + best score once, when the run ends.
  useEffect(() => {
    if (stage !== "end" || !p || banked) return;
    setBanked(true);
    let next: Progress = {
      ...p,
      coins: p.coins + score,
      miniBest: Math.max(p.miniBest, score),
    };
    next = touchStreak(next);
    saveProgress(next);
    update(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, p, banked, score]);

  if (!p) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-orange-50">
        <Mascot size={80} className="anim-float" />
      </main>
    );
  }

  const locked = !p.completed[MINI_UNLOCK_LESSON];

  const start = () => {
    setScore(0);
    setLeft(GAME_SECONDS);
    setRound(0);
    setBanked(false);
    setPrevBest(p.miniBest);
    setStage("play");
  };

  const answer = (option: string) => {
    const hit = option === q.en;
    setFlash(hit ? "hit" : "miss");
    if (hit) setScore((s) => s + 1);
    setTimeout(() => {
      setFlash(null);
      setRound((r) => r + 1);
    }, 350);
  };

  return (
    <main className="flex min-h-dvh flex-col bg-teal-950 text-white">
      <header className="flex items-center justify-between px-4 py-3">
        <Link to="/" className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">
          ✕ Leave
        </Link>
        <div className="flex items-center gap-3 font-black tabular-nums">
          {stage === "play" && (
            <>
              <span className="rounded-full bg-amber-400 px-3 py-1 text-amber-950">{score} ⚡</span>
              <span className={left <= 10 ? "text-red-400" : ""}>{left}s</span>
            </>
          )}
        </div>
      </header>

      {stage === "start" && (
        <section className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
          <Mascot size={120} mood="cheer" />
          <h1 className="text-3xl font-black">Palabra rápida</h1>
          <p className="max-w-sm font-semibold text-teal-100">
            Tap the English meaning of each Spanish word. You have {GAME_SECONDS} seconds — every
            correct tap earns a coin. Best run: {p.miniBest}
          </p>
          <button
            type="button"
            onClick={start}
            disabled={locked}
            className="rounded-xl bg-amber-500 px-10 py-4 text-lg font-extrabold uppercase tracking-wide text-white shadow-[0_5px_0_0_#B45309] transition hover:bg-amber-400 active:translate-y-[3px] active:shadow-[0_2px_0_0_#B45309] disabled:opacity-40 disabled:shadow-none"
          >
            {locked ? "Locked — finish lesson 3" : "Start ⚡"}
          </button>
        </section>
      )}

      {stage === "play" && (
        <section className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
          <div
            className={`rounded-3xl bg-white px-8 py-6 text-4xl font-black text-stone-900 transition ${
              flash === "hit" ? "anim-pop ring-8 ring-emerald-400" : flash === "miss" ? "anim-shake ring-8 ring-red-500" : ""
            }`}
          >
            {q.es}
          </div>
          <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
            {q.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => answer(option)}
                disabled={flash !== null}
                className="rounded-2xl border-2 border-white/20 bg-white/10 p-4 text-lg font-bold transition hover:border-amber-400 hover:bg-white/20 active:translate-y-[2px] focus-visible:outline-2 focus-visible:outline-amber-400"
              >
                {option}
              </button>
            ))}
          </div>
        </section>
      )}

      {stage === "end" && (
        <section className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
          <Mascot size={110} mood={score >= Math.max(5, p.miniBest) ? "cheer" : "happy"} />
          <h1 className="text-3xl font-black">{score} coins earned 🪙</h1>
          <p className="font-semibold text-teal-100">
            {score > prevBest ? "New best run!" : `Best run: ${Math.max(prevBest, score)}`}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={start}
              className="rounded-xl bg-amber-500 px-8 py-3 font-extrabold uppercase tracking-wide text-white shadow-[0_4px_0_0_#B45309] transition hover:bg-amber-400 active:translate-y-[2px]"
            >
              Play again
            </button>
            <Link
              to="/"
              className="rounded-xl bg-white/10 px-8 py-3 font-extrabold uppercase tracking-wide transition hover:bg-white/20"
            >
              Back to the path
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
