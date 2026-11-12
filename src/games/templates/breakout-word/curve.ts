/**
 * «Ladrillos del Alfabeto» curve declaration (§10.5 — the template declares
 * instances + labels; the MATH lives in storage.ts, never here). Phaser-free:
 * React imports this module for the done screen; the scene never touches it.
 *
 * Unlock ids are the shared ladder ids storage.ts recordGameWin grants at
 * L3/L8/L12/L20 — breakout only re-labels them (brick-wall theme); the ids
 * themselves are the store's contract. versiculo is NOT declared (the
 * a0-u04 binding carries no verse round — PORT §6). Unknown ids fail the load.
 */
import { wordRow } from "~/content/packs/a0-u04-breakout";

export type BreakoutAchievement = { id: string; label: string; emoji: string };

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
  ] as BreakoutAchievement[],
  /** Cosmetic unlock ladder (§10.3 shared ids, brick-wall labels — PORT §6). */
  unlocks: [
    { id: "caja-madera", label: "Ladrillo de madera", emoji: "🧱" },
    { id: "caja-cedro", label: "Ladrillo de piedra", emoji: "🪨" },
    { id: "caja-jade", label: "Ladrillo de mármol", emoji: "◻️" },
    { id: "corona", label: "Corona", emoji: "👑" },
  ] as BreakoutAchievement[],
  /** Ramp (§10.5): +4% ball max per stored level, capped at the Adulto
   * anchor; paddle −0.5%/level floored 0.16 — applied by the session's
   * board builder, never past the anchor. */
  ramp: { ballMaxPerLevelPct: 4, ballMaxAnchor: 1400, paddleShrinkPer8Levels: 4 },
};

/** Achievement label lookup; an unknown id fails loudly (bad data, never a child). */
export function achievementLabel(id: string): BreakoutAchievement {
  const hit = curve.achievements.find((a) => a.id === id);
  if (!hit) throw new Error(`breakout-curve: unknown achievement id ${id}`);
  return hit;
}

/** The EN gloss for the word's caption (fades per englishLevel in React). */
export function wordEn(es: string): string {
  return wordRow(es).en;
}
