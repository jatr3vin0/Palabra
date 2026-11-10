import { useEffect, useMemo, useRef, useState } from "react";

import { isCorrect, seededShuffle } from "~/lib/answer";
import { createRecognizer, recognitionAvailable, scoreSpeech, speak } from "~/lib/speech";
import type { Exercise } from "~/lib/types";

export type ExerciseOutcome = { correct: boolean; show?: string; noHeartCost?: boolean };

const checkBtn =
  "mt-6 w-full rounded-xl bg-amber-500 px-6 py-3.5 text-base font-extrabold uppercase tracking-wide text-white shadow-[0_4px_0_0_#B45309] transition hover:bg-amber-400 active:translate-y-[2px] active:shadow-[0_2px_0_0_#B45309] disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none focus-visible:outline-2 focus-visible:outline-amber-600";

const cardBtn =
  "w-full rounded-2xl border-2 bg-white p-4 text-left font-semibold text-stone-800 transition focus-visible:outline-2 focus-visible:outline-amber-600";

const speakerBtn =
  "inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-teal-200 bg-teal-50 text-lg text-teal-700 transition hover:border-teal-400 hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-teal-600";

function Speaker({ text, className = "" }: { text: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => speak(text)}
      className={`${speakerBtn} ${className}`}
      aria-label={`Hear «${text}»`}
    >
      🔊
    </button>
  );
}

/** Renders every exercise type. Calls onResult once when the learner answers. */
export function ExerciseView({
  ex,
  revealed,
  onResult,
}: {
  ex: Exercise;
  revealed: boolean;
  onResult: (outcome: ExerciseOutcome) => void;
}) {
  switch (ex.type) {
    case "multiple_choice":
      return <MultipleChoice key={ex.id} ex={ex} revealed={revealed} onResult={onResult} />;
    case "translate":
      return <Translate key={ex.id} ex={ex} revealed={revealed} onResult={onResult} />;
    case "listen_type":
      return <ListenType key={ex.id} ex={ex} revealed={revealed} onResult={onResult} />;
    case "order_words":
      return <OrderWords key={ex.id} ex={ex} revealed={revealed} onResult={onResult} />;
    case "match_pairs":
      return <MatchPairs key={ex.id} ex={ex} revealed={revealed} onResult={onResult} />;
    case "fill_blank":
      return <FillBlank key={ex.id} ex={ex} revealed={revealed} onResult={onResult} />;
    case "speak":
      return <Speak key={ex.id} ex={ex} revealed={revealed} onResult={onResult} />;
  }
}

function Instruction({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-bold uppercase tracking-wide text-stone-400">{children}</p>;
}

function MultipleChoice({
  ex,
  revealed,
  onResult,
}: {
  ex: Extract<Exercise, { type: "multiple_choice" }>;
  revealed: boolean;
  onResult: (o: ExerciseOutcome) => void;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const style = (choice: string) => {
    if (revealed) {
      if (choice === ex.answer) return "border-emerald-500 bg-emerald-50";
      if (choice === chosen) return "border-red-500 bg-red-50";
      return "border-stone-200 opacity-60";
    }
    if (choice === chosen) return "border-amber-500 bg-amber-50";
    return "border-stone-200 hover:border-amber-400 hover:bg-amber-50";
  };
  return (
    <div className="flex flex-col gap-4">
      <Instruction>{ex.instruction}</Instruction>
      <h2 className="text-2xl font-extrabold text-stone-900">{ex.prompt}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {ex.choices.map((choice) => (
          <button
            key={choice}
            type="button"
            disabled={revealed}
            onClick={() => setChosen(choice)}
            className={`${cardBtn} ${style(choice)}`}
          >
            <span className="text-xl">{choice}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className={checkBtn}
        disabled={chosen === null || revealed}
        onClick={() => chosen !== null && onResult({ correct: isCorrect(chosen, ex.answer) })}
      >
        Check
      </button>
    </div>
  );
}

function Translate({
  ex,
  revealed,
  onResult,
}: {
  ex: Extract<Exercise, { type: "translate" }>;
  revealed: boolean;
  onResult: (o: ExerciseOutcome) => void;
}) {
  const [text, setText] = useState("");
  const submit = () => {
    if (!text.trim() || revealed) return;
    onResult({ correct: isCorrect(text, ex.answer, ex.accepted) });
  };
  return (
    <div className="flex flex-col gap-4">
      <Instruction>{ex.instruction}</Instruction>
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
          🇬🇧
        </div>
        <h2 className="text-2xl font-extrabold text-stone-900">{ex.prompt}</h2>
      </div>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        disabled={revealed}
        placeholder="Escribe en español…"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-label="Your answer in Spanish"
        className="w-full rounded-2xl border-2 border-stone-200 bg-white p-4 text-lg font-semibold text-stone-900 outline-none transition focus:border-amber-500"
      />
      <button type="button" className={checkBtn} disabled={!text.trim() || revealed} onClick={submit}>
        Check
      </button>
    </div>
  );
}

function ListenType({
  ex,
  revealed,
  onResult,
}: {
  ex: Extract<Exercise, { type: "listen_type" }>;
  revealed: boolean;
  onResult: (o: ExerciseOutcome) => void;
}) {
  const [text, setText] = useState("");
  useEffect(() => {
    speak(ex.audioText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex.id]);
  const submit = () => {
    if (!text.trim() || revealed) return;
    onResult({ correct: isCorrect(text, ex.answer, ex.accepted) });
  };
  return (
    <div className="flex flex-col gap-4">
      <Instruction>{ex.instruction}</Instruction>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => speak(ex.audioText)}
          className="inline-flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-teal-600 text-4xl text-white shadow-[0_5px_0_0_#115e59] transition hover:bg-teal-500 active:translate-y-[3px] active:shadow-[0_2px_0_0_#115e59]"
          aria-label="Play the Spanish audio"
        >
          🔊
        </button>
        <button
          type="button"
          onClick={() => speak(ex.audioText, true)}
          className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-2xl shadow-[0_3px_0_0_#99f6e4] transition active:translate-y-[2px]"
          aria-label="Play slowly"
        >
          🐢
        </button>
        <p className="text-sm font-semibold text-stone-500">
          Listen as many times as you like, then type what you hear.
        </p>
      </div>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        disabled={revealed}
        placeholder="Type the Spanish you hear…"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-label="The Spanish you heard"
        className="w-full rounded-2xl border-2 border-stone-200 bg-white p-4 text-lg font-semibold text-stone-900 outline-none transition focus:border-amber-500"
      />
      <button type="button" className={checkBtn} disabled={!text.trim() || revealed} onClick={submit}>
        Check
      </button>
    </div>
  );
}

function OrderWords({
  ex,
  revealed,
  onResult,
}: {
  ex: Extract<Exercise, { type: "order_words" }>;
  revealed: boolean;
  onResult: (o: ExerciseOutcome) => void;
}) {
  const bank = useMemo(
    () => seededShuffle(ex.words, ex.id).map((word, i) => ({ word, uid: i })),
    [ex.id, ex.words],
  );
  const [chosen, setChosen] = useState<number[]>([]);
  const pick = (uid: number) => revealed || setChosen((c) => [...c, uid]);
  const unpick = (uid: number) => revealed || setChosen((c) => c.filter((u) => u !== uid));
  const sentence = chosen.map((uid) => bank.find((b) => b.uid === uid)!.word).join(" ");
  const submit = () => {
    if (chosen.length === 0 || revealed) return;
    onResult({ correct: isCorrect(sentence, ex.answer) });
  };
  return (
    <div className="flex flex-col gap-4">
      <Instruction>{ex.instruction}</Instruction>
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
          🇬🇧
        </div>
        <h2 className="text-2xl font-extrabold text-stone-900">{ex.prompt}</h2>
      </div>
      <div
        className="flex min-h-20 flex-wrap content-start items-start gap-2 rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-3"
        aria-label="Your sentence"
      >
        {chosen.length === 0 && (
          <span className="text-sm font-semibold text-stone-400">Tap the words below in order…</span>
        )}
        {chosen.map((uid) => {
          const token = bank.find((b) => b.uid === uid)!.word;
          return (
            <button
              key={uid}
              type="button"
              onClick={() => unpick(uid)}
              className="rounded-xl border-2 border-amber-500 bg-amber-50 px-3 py-2 font-bold text-stone-900"
            >
              {token}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {bank.map(({ word, uid }) =>
          chosen.includes(uid) ? (
            <span
              key={uid}
              className="rounded-xl border-2 border-transparent bg-stone-100 px-3 py-2 font-bold text-transparent select-none"
              aria-hidden
            >
              {word}
            </span>
          ) : (
            <button
              key={uid}
              type="button"
              onClick={() => pick(uid)}
              className="rounded-xl border-2 border-stone-200 bg-white px-3 py-2 font-bold text-stone-900 transition hover:border-amber-400 hover:bg-amber-50"
            >
              {word}
            </button>
          ),
        )}
      </div>
      <button type="button" className={checkBtn} disabled={chosen.length === 0 || revealed} onClick={submit}>
        Check
      </button>
    </div>
  );
}

function MatchPairs({
  ex,
  revealed,
  onResult,
}: {
  ex: Extract<Exercise, { type: "match_pairs" }>;
  revealed: boolean;
  onResult: (o: ExerciseOutcome) => void;
}) {
  const esCol = useMemo(() => seededShuffle(ex.pairs, `${ex.id}-es`), [ex.id, ex.pairs]);
  const enCol = useMemo(() => seededShuffle(ex.pairs, `${ex.id}-en`), [ex.id, ex.pairs]);
  const [pickedEs, setPickedEs] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);
  const mismatches = useRef(0);

  const tapEn = (en: string) => {
    if (revealed || !pickedEs) return;
    const pair = ex.pairs.find((p) => p.es === pickedEs);
    if (pair && pair.en === en) {
      const next = [...matched, pickedEs];
      setMatched(next);
      setPickedEs(null);
      if (next.length === ex.pairs.length) {
        onResult({ correct: mismatches.current === 0, noHeartCost: true });
      }
    } else {
      mismatches.current += 1;
      setWrongFlash(en);
      setTimeout(() => setWrongFlash(null), 500);
    }
  };

  const esStyle = (es: string) => {
    if (matched.includes(es)) return "border-emerald-500 bg-emerald-50 text-emerald-700";
    if (pickedEs === es) return "border-amber-500 bg-amber-50";
    if (revealed) return "border-stone-200 opacity-60";
    return "border-stone-200 hover:border-amber-400 hover:bg-amber-50";
  };
  const matchedEn = matched.map((es) => ex.pairs.find((p) => p.es === es)!.en);
  const enStyle = (en: string) => {
    if (matchedEn.includes(en)) return "border-emerald-500 bg-emerald-50 text-emerald-700";
    if (wrongFlash === en) return "anim-shake border-red-500 bg-red-50";
    if (revealed) return "border-stone-200 opacity-60";
    return "border-stone-200 hover:border-amber-400 hover:bg-amber-50";
  };

  return (
    <div className="flex flex-col gap-4">
      <Instruction>{ex.instruction}</Instruction>
      <p className="text-sm font-semibold text-stone-500">
        Tap a Spanish word, then its meaning. Mistakes cost no hearts here.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          {esCol.map((p) => (
            <div key={p.es} className="flex items-center gap-1">
              <button
                type="button"
                disabled={matched.includes(p.es) || revealed}
                onClick={() => setPickedEs(p.es)}
                className={`${cardBtn} !p-3 ${esStyle(p.es)}`}
                aria-pressed={pickedEs === p.es}
              >
                <span className="text-lg">{p.es}</span>
              </button>
              <button
                type="button"
                onClick={() => speak(p.es)}
                className="shrink-0 rounded-full p-1 text-teal-600"
                aria-label={`Hear «${p.es}»`}
              >
                🔈
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {enCol.map((p) => (
            <button
              key={p.en}
              type="button"
              disabled={matchedEn.includes(p.en) || revealed}
              onClick={() => tapEn(p.en)}
              className={`${cardBtn} !p-3 ${enStyle(p.en)}`}
            >
              <span className="text-lg">{p.en}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FillBlank({
  ex,
  revealed,
  onResult,
}: {
  ex: Extract<Exercise, { type: "fill_blank" }>;
  revealed: boolean;
  onResult: (o: ExerciseOutcome) => void;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [before, after] = ex.sentence.split("___");
  const style = (choice: string) => {
    if (revealed) {
      if (choice === ex.answer) return "border-emerald-500 bg-emerald-50";
      if (choice === chosen) return "border-red-500 bg-red-50";
      return "border-stone-200 opacity-60";
    }
    if (choice === chosen) return "border-amber-500 bg-amber-50";
    return "border-stone-200 hover:border-amber-400 hover:bg-amber-50";
  };
  return (
    <div className="flex flex-col gap-4">
      <Instruction>{ex.instruction}</Instruction>
      <div className="flex items-start gap-3">
        <Speaker text={ex.sentence.replace("___", ex.answer)} className="mt-1 shrink-0" />
        <h2 className="text-2xl font-extrabold leading-relaxed text-stone-900">
          {before}
          <span
            className={`mx-1 inline-block min-w-24 rounded-lg border-b-4 px-2 text-center ${
              chosen ? "border-amber-500 text-amber-700" : "border-stone-300 text-stone-400"
            }`}
          >
            {chosen ?? "?"}
          </span>
          {after}
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {ex.choices.map((choice) => (
          <button
            key={choice}
            type="button"
            disabled={revealed}
            onClick={() => setChosen(choice)}
            className={`${cardBtn} text-center ${style(choice)}`}
          >
            <span className="text-xl">{choice}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className={checkBtn}
        disabled={chosen === null || revealed}
        onClick={() => chosen !== null && onResult({ correct: isCorrect(chosen, ex.answer) })}
      >
        Check
      </button>
    </div>
  );
}

function Speak({
  ex,
  revealed,
  onResult,
}: {
  ex: Extract<Exercise, { type: "speak" }>;
  revealed: boolean;
  onResult: (o: ExerciseOutcome) => void;
}) {
  const minScore = ex.minScore ?? 60;
  const [listening, setListening] = useState(false);
  const [attempt, setAttempt] = useState<{ score: number; transcript: string } | null>(null);
  const [micBroken, setMicBroken] = useState(!recognitionAvailable());
  const recRef = useRef<ReturnType<typeof createRecognizer>>(null);

  useEffect(() => {
    speak(ex.target);
    return () => {
      recRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex.id]);

  const pass = (score: number) => score >= minScore;

  const listen = () => {
    if (revealed || listening) return;
    const rec = createRecognizer();
    if (!rec) {
      setMicBroken(true);
      return;
    }
    recRef.current = rec;
    setListening(true);
    rec.onresult = (ev) => {
      const transcript = String(ev.results?.[0]?.[0]?.transcript ?? "");
      const score = scoreSpeech(ex.target, transcript);
      setAttempt({ score, transcript });
      if (pass(score)) onResult({ correct: true });
    };
    rec.onerror = () => {
      setMicBroken(true);
      setListening(false);
    };
    rec.onend = () => setListening(false);
    try {
      rec.start();
    } catch {
      setMicBroken(true);
      setListening(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <Instruction>{ex.instruction}</Instruction>
      <button
        type="button"
        onClick={() => speak(ex.target)}
        className="text-4xl font-extrabold text-stone-900 underline decoration-amber-400 decoration-wavy decoration-2 underline-offset-8"
      >
        {ex.target} 🔊
      </button>
      <p className="font-semibold text-stone-500">{ex.translation}</p>

      {!micBroken && (
        <button
          type="button"
          onClick={listen}
          disabled={revealed || listening}
          className={`inline-flex h-24 w-24 items-center justify-center rounded-full text-4xl text-white shadow-[0_5px_0_0_#0369a1] transition active:translate-y-[3px] active:shadow-[0_2px_0_0_#0369a1] ${
            listening ? "animate-pulse bg-sky-500" : "bg-sky-600 hover:bg-sky-500"
          }`}
          aria-label={listening ? "Listening — speak now" : "Tap and say it in Spanish"}
        >
          {listening ? "🎧" : "🎤"}
        </button>
      )}
      <p className="min-h-6 text-sm font-semibold text-stone-500">
        {listening
          ? "Listening… say it out loud!"
          : micBroken
            ? "Repeat after Palabra, then tap «I said it» below."
            : `Tap the mic and say it. Score ${minScore}+ to pass.`}
      </p>

      {attempt && (
        <div className="w-full max-w-sm rounded-2xl border-2 border-stone-200 bg-white p-4">
          <p className="text-sm font-semibold text-stone-500">I heard:</p>
          <p className="mb-2 text-lg font-bold text-stone-900">«{attempt.transcript}»</p>
          <div className="h-3 w-full overflow-hidden rounded-full bg-stone-200">
            <div
              className={`h-full rounded-full ${pass(attempt.score) ? "bg-emerald-500" : "bg-amber-500"}`}
              style={{ width: `${Math.max(4, attempt.score)}%` }}
            />
          </div>
          <p className="mt-1 text-sm font-bold text-stone-700">
            {attempt.score}% — {pass(attempt.score) ? "¡Muy bien!" : `need ${minScore}% — try again`}
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={revealed}
        onClick={() => onResult({ correct: true })}
        className="rounded-xl border-2 border-stone-300 bg-white px-6 py-3 font-bold text-stone-700 transition hover:border-amber-400 hover:bg-amber-50 disabled:opacity-40"
      >
        I said it ✔
      </button>
    </div>
  );
}
