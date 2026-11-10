import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";

import { StatsBar, useProgress } from "~/components/Chrome";
import { Mascot } from "~/components/Mascot";
import { CASA_FRAME_ID, PLAZA_FRAME_ID, frames } from "~/lib/frames";
import { missedWords } from "~/lib/storage";
import { primeVoice, useVoiceStatus } from "~/lib/voice";

export const Route = createFileRoute("/")({
  component: Village,
});

type Spot = {
  id: string;
  to?: string;
  who: string;
  emoji: string;
  place: string;
  es: string;
  open: boolean;
  /** % position inside the village scene */
  x: number;
  y: number;
};

function Village() {
  const [p] = useProgress();

  // Warm the voice on the hub itself: the one-time model download starts here,
  // before any frame mounts, so entering a game never waits for it.
  useEffect(() => {
    primeVoice();
  }, []);

  const missed = useMemo(() => (p ? new Set(missedWords(p)) : new Set<string>()), [p]);

  const spots: Spot[] = useMemo(() => {
    const plazaWords = new Set((frames[PLAZA_FRAME_ID].rounds as { word: string }[]).map((r) => r.word));
    const casaWords = new Set((frames[CASA_FRAME_ID].rounds as { word: string }[]).map((r) => r.word));
    const hits = (pool: Set<string>) => [...missed].filter((w) => pool.has(w)).length;
    return [
      {
        id: "rosa",
        to: `/game/${CASA_FRAME_ID}`,
        who: "Doña Rosa",
        emoji: "👵",
        place: "La casa de la familia",
        es: "Balones de la Palabra · Génesis 1:1",
        open: true,
        x: 20,
        y: 58,
      },
      {
        id: "rico",
        to: `/game/${PLAZA_FRAME_ID}`,
        who: "Capitán Rico",
        emoji: "🧑‍✈️",
        place: "La plaza",
        es: "El jet de palabras",
        open: true,
        x: 74,
        y: 55,
      },
      { id: "pozo", who: "El pozo", emoji: "", place: "El pozo", es: "Pronto…", open: false, x: 47, y: 38 },
      { id: "mercado", who: "El mercado", emoji: "", place: "El mercado", es: "Pronto…", open: false, x: 85, y: 33 },
    ].map((s) => ({
      ...s,
      es:
        s.open && s.id === "rico" && hits(plazaWords) > 0
          ? `${s.es} · 🔄 ${hits(plazaWords)}`
          : s.open && s.id === "rosa" && hits(casaWords) > 0
            ? `${s.es} · 🔄 ${hits(casaWords)}`
            : s.es,
    }));
  }, [missed]);

  const level = p?.englishLevel ?? 0;

  if (!p) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-orange-50">
        <Mascot size={80} className="anim-float" />
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-sky-50 pb-16">
      {/* header */}
      <header className="sticky top-0 z-20 border-b border-sky-100 bg-sky-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
          <span className="flex items-center gap-2">
            <Mascot size={36} />
            <span className="text-xl font-black tracking-tight text-stone-900">Palabra</span>
          </span>
          <StatsBar p={p} />
        </div>
        <div className="mx-auto flex max-w-xl items-center justify-between gap-2 px-4 pb-2">
          <p className="text-xs font-bold text-stone-400">
            Aldea Palabra — toca un vecino para jugar
          </p>
          <VoicePill />
          <span
            className="rounded-full bg-teal-600 px-2.5 py-1 text-xs font-black text-white"
            aria-label={`Nivel de inmersión ${level} de 3`}
          >
            🇪🇸 inmersión {level}/3
          </span>
        </div>
      </header>

      {/* the village */}
      <section className="mx-auto max-w-xl px-4 pt-4">
        <div className="relative h-[430px] overflow-hidden rounded-3xl border-2 border-sky-200 bg-gradient-to-b from-sky-300 via-sky-200 to-emerald-100 shadow-sm sm:h-[480px]">
          <VillageArt />

          {spots.map((s) =>
            s.open && s.to ? (
              <Link
                key={s.id}
                to={s.to}
                className="group absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
                aria-label={`Jugar con ${s.who} — ${s.place}`}
              >
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full border-b-4 border-amber-700 bg-amber-400 text-3xl shadow-md ring-4 ring-amber-200/60 transition group-hover:bg-amber-300 group-active:translate-y-[2px] sm:h-20 sm:w-20">
                  {s.emoji}
                  <span className="absolute -inset-1 -z-10 animate-ping rounded-full bg-amber-300/40" />
                  {s.es.includes("🔄") && (
                    <span className="absolute -right-1 -top-1 rounded-full bg-teal-600 px-1.5 text-[10px] font-black text-white">
                      🔄
                    </span>
                  )}
                </span>
                <span className="mt-1 block max-w-32 rounded-xl bg-white/85 px-2 py-1 text-center text-[11px] font-black leading-tight text-stone-700 shadow-sm">
                  {s.who}
                  <span className="block font-semibold text-stone-500">{s.es}</span>
                </span>
              </Link>
            ) : (
              <div
                key={s.id}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2 opacity-70"
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
                aria-label={`${s.place} — próximamente`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-stone-400 bg-stone-200/70 text-lg text-stone-500 sm:h-14 sm:w-14">
                  🔒
                </span>
                <span className="mt-1 block max-w-28 rounded-xl bg-white/70 px-2 py-1 text-center text-[11px] font-bold text-stone-500">
                  {s.place} · pronto
                </span>
              </div>
            ),
          )}

          {/* mascot strolls near the path */}
          <div className="pointer-events-none absolute bottom-3 left-6 anim-float">
            <Mascot size={64} />
          </div>
        </div>
      </section>

      <p className="mx-auto mt-4 max-w-xl px-4 text-center text-sm font-semibold text-stone-500">
        Escucha, toca y juega — todo en español. {level === 0 ? "Las pistas en inglés te ayudan hoy." : "Cada vez menos inglés…"}
      </p>

      <footer className="mx-auto mt-8 max-w-xl px-4 text-center text-xs font-semibold text-stone-400">
        Palabra · free Spanish for everyone · no ads, no subscriptions, ever
      </footer>
    </main>
  );
}

/** Voice download state on the hub — the pill the learner sees before any
 * frame mounts, while the one-time natural-voice download runs in a worker. */
function VoicePill() {
  const voice = useVoiceStatus();
  if (voice.state === "ready") {
    return (
      <span className="hidden text-xs font-bold text-teal-700 sm:inline">🔊 voz natural lista</span>
    );
  }
  if (voice.state === "loading") {
    return (
      <span className="hidden text-xs font-bold text-amber-700 sm:inline">
        🔊 bajando la voz natural… {Math.round(voice.progress * 100)}%
      </span>
    );
  }
  return <span className="hidden text-xs font-bold text-stone-400 sm:inline">🔊 voz del navegador</span>;
}

/** Pure-SVG village art: sky, hills, plaza, family home, well, market stall. */
function VillageArt() {
  return (
    <svg aria-hidden className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMax slice">
      {/* sun */}
      <circle cx="14" cy="12" r="6" fill="#FDE68A" />
      <circle cx="14" cy="12" r="9" fill="#FDE68A" opacity="0.35" />
      {/* clouds */}
      <g fill="#FFFFFF" opacity="0.85">
        <ellipse cx="60" cy="10" rx="9" ry="2.6" />
        <ellipse cx="80" cy="18" rx="7" ry="2.2" />
        <ellipse cx="30" cy="20" rx="6" ry="2" />
      </g>
      {/* distant hills */}
      <path d="M-5 46 Q 20 30 45 44 T 105 42 L 105 60 L -5 60 Z" fill="#86EFAC" />
      <path d="M-5 52 Q 30 40 60 52 T 105 50 L 105 100 L -5 100 Z" fill="#6EE7A0" />
      {/* ground */}
      <rect x="-5" y="58" width="110" height="45" fill="#86EFAC" />
      <rect x="-5" y="66" width="110" height="35" fill="#5BD08A" />
      {/* winding path */}
      <path d="M8 92 Q 30 84 48 76 T 92 70" stroke="#FDE9C8" strokeWidth="5.5" fill="none" strokeLinecap="round" />
      <path d="M8 92 Q 30 84 48 76 T 92 70" stroke="#F6D8A8" strokeWidth="5.5" fill="none" strokeLinecap="round" strokeDasharray="0.2 4" />

      {/* family home (left) */}
      <g>
        <rect x="12" y="52" width="17" height="12" fill="#FFF7ED" stroke="#E7C9A9" strokeWidth="0.5" />
        <path d="M10 52 L20.5 43 L31 52 Z" fill="#F87171" />
        <rect x="19" y="58" width="3.4" height="6" fill="#B45309" rx="0.4" />
        <rect x="14.5" y="55" width="3" height="3" fill="#7DD3FC" stroke="#E7C9A9" strokeWidth="0.3" />
        <circle cx="24.5" cy="48.5" r="0.7" fill="#FDE68A" />
        {/* flowers */}
        <g>
          <circle cx="31.5" cy="64.5" r="0.9" fill="#F472B6" />
          <circle cx="34" cy="66" r="0.9" fill="#FBBF24" />
          <circle cx="29.5" cy="66.8" r="0.9" fill="#F87171" />
        </g>
      </g>

      {/* well (center) */}
      <g>
        <ellipse cx="47" cy="47.5" rx="4" ry="1.6" fill="#94A3B8" />
        <rect x="44.4" y="44" width="5.2" height="3.4" rx="1" fill="#CBD5E1" />
        <rect x="44.8" y="39.5" width="0.7" height="5" fill="#7C2D12" />
        <rect x="48.5" y="39.5" width="0.7" height="5" fill="#7C2D12" />
        <path d="M43.6 40 L47 36.5 L50.4 40 Z" fill="#DC2626" />
      </g>

      {/* market stall (right) */}
      <g>
        <rect x="80" y="42.5" width="14" height="8.5" fill="#FFF7ED" stroke="#E7C9A9" strokeWidth="0.5" />
        <path d="M78.5 42.5 L87 37.5 L95.5 42.5 Z" fill="#14B8A6" />
        <g strokeWidth="0">
          <rect x="81" y="43.5" width="1.8" height="6" fill="#FDE68A" />
          <rect x="85" y="43.5" width="1.8" height="6" fill="#FDE68A" />
          <rect x="89" y="43.5" width="1.8" height="6" fill="#FDE68A" />
        </g>
        <circle cx="83" cy="41.6" r="1" fill="#F87171" />
        <circle cx="87" cy="41.4" r="1" fill="#FBBF24" />
        <circle cx="91" cy="41.6" r="1" fill="#86EFAC" />
      </g>

      {/* plaza (right, lower): fountain + paving */}
      <g>
        <ellipse cx="74" cy="72" rx="13" ry="7" fill="#E2E8F0" opacity="0.9" />
        <ellipse cx="74" cy="71" rx="10" ry="5" fill="#BAE6FD" />
        <ellipse cx="74" cy="71" rx="2.6" ry="1.3" fill="#7DD3FC" />
        <rect x="73.4" y="66.5" width="1.2" height="4.5" fill="#CBD5E1" />
        <circle cx="74" cy="66" r="1" fill="#7DD3FC" />
      </g>

      {/* trees */}
      <g>
        <rect x="61" y="56" width="1.6" height="5" fill="#92400E" />
        <circle cx="61.8" cy="53.5" r="3.6" fill="#34D399" />
        <rect x="5" y="70" width="1.6" height="5" fill="#92400E" />
        <circle cx="5.8" cy="67.5" r="3.4" fill="#34D399" />
        <rect x="56" y="84" width="1.8" height="5.5" fill="#92400E" />
        <circle cx="56.9" cy="81" r="4" fill="#2DD4A7" />
      </g>
    </svg>
  );
}
