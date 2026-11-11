/**
 * «Empuja la Palabra» curve declaration (§10.5 — template declares instances
 * + labels; the MATH lives in storage.ts, never here). Phaser-free: React
 * imports this module for the done screen; the scene never touches it.
 *
 * versiculo is NOT declared (scripture variant DEFERRED per PORT §3 — no
 * ScriptureRound shape exists for sokoban). Unknown ids fail the load.
 */
import { wordFor } from "~/content/packs/a0-u05-sokoban";

export type SokobanAchievement = { id: string; label: string; emoji: string };

export const curve = {
  /** Recognition-only achievements (ids match storage.recordGameWin). */
  achievements: [
    { id: "primer-nivel", label: "¡Primer nivel!", emoji: "⭐" },
    { id: "sin-fallos", label: "¡Sin fallos!", emoji: "🎯" },
    { id: "racha-3", label: "¡Tres seguidas!", emoji: "🔥" },
    { id: "repaso-limpio", label: "¡Repaso limpio!", emoji: "🧹" },
    { id: "maraton-5", label: "¡Maratón 5!", emoji: "🏃" },
    { id: "maraton-25", label: "¡Maratón 25!", emoji: "🏅" },
    { id: "adulto", label: "¡Nivel Adulto!", emoji: "🦅" },
    { id: "coleccionista", label: "¡Coleccionista!", emoji: "📚" },
  ] as SokobanAchievement[],
  /** Cosmetic unlock ladder (§10.5): display variants, they unlock nothing. */
  unlocks: [
    { id: "caja-madera", label: "Caja de madera", emoji: "📦" },
    { id: "caja-cedro", label: "Caja de cedro", emoji: "🧰" },
    { id: "caja-jade", label: "Caja de jade", emoji: "🟩" },
    { id: "corona", label: "Corona", emoji: "👑" },
  ] as SokobanAchievement[],
  /** Ramp (§2): grid +1 per 2 stored levels, capped at the Adulto anchor 9;
   * walls/decoys capped at Adulto density. Applied by the session. */
  ramp: { gridPer2Levels: 1, gridCap: 9 },
};

/** Achievement label lookup; an unknown id fails loudly (bad data, never a child). */
export function achievementLabel(id: string): SokobanAchievement {
  const hit = curve.achievements.find((a) => a.id === id);
  if (!hit) throw new Error(`sokoban-curve: unknown achievement id ${id}`);
  return hit;
}

/** The EN gloss for a named pair's caption (fades per englishLevel in React). */
export function pairEn(es: string): string {
  return wordFor(es).en;
}
