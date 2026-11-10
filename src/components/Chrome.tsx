import { useEffect, useState } from "react";

import {
  HEART_MAX,
  heartTimerMs,
  levelFor,
  loadProgress,
  saveProgress,
  type Progress,
} from "~/lib/storage";

/**
 * Client-side progress state shared by every screen. Starts null on the server
 * and before mount (no hydration mismatch), then loads from the storage module.
 */
export function useProgress(): [Progress | null, (p: Progress) => void] {
  const [progress, setProgress] = useState<Progress | null>(null);
  useEffect(() => {
    setProgress(loadProgress());
  }, []);
  const update = (p: Progress) => {
    saveProgress(p);
    setProgress(p);
  };
  return [progress, update];
}

export function StatChip({
  icon,
  value,
  tone,
  label,
}: {
  icon: string;
  value: string | number;
  tone: string;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold tabular-nums ${tone}`}
      aria-label={label}
    >
      <span aria-hidden>{icon}</span>
      {value}
    </span>
  );
}

/** Top bar with the game's live counters: streak, coins, hearts, level. */
export function StatsBar({ p }: { p: Progress }) {
  const [, force] = useState(0);
  useEffect(() => {
    if (heartTimerMs(p) === 0) return;
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.hearts, p.heartsAt]);

  return (
    <div className="flex items-center gap-2">
      <StatChip
        icon="🔥"
        value={p.streak}
        tone="bg-orange-100 text-orange-700"
        label={`Daily streak: ${p.streak} days`}
      />
      <StatChip
        icon="🪙"
        value={p.coins}
        tone="bg-yellow-100 text-yellow-700"
        label={`Coins: ${p.coins}`}
      />
      <StatChip
        icon={p.hearts > 0 ? "❤️" : "💔"}
        value={p.hearts < HEART_MAX ? `${p.hearts}/${HEART_MAX}` : p.hearts}
        tone="bg-rose-100 text-rose-700"
        label={`Hearts: ${p.hearts} of ${HEART_MAX}`}
      />
      <StatChip
        icon="⭐"
        value={`Lv ${levelFor(p.xp)}`}
        tone="bg-teal-100 text-teal-700"
        label={`Level ${levelFor(p.xp)}`}
      />
    </div>
  );
}
