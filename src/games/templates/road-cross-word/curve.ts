/**
 * «¡Cruza la Calle!» curve declaration (§10.5 — the template declares
 * instances + labels; the MATH lives in storage.ts, never here). Phaser-free:
 * React imports this module for the done screen; the scene never touches it.
 *
 * Unlock ids are the shared ladder ids storage.ts recordGameWin grants at
 * L3/L8/L12/L20 — road-cross only re-labels them (street-crossing theme);
 * the ids themselves are the store's contract. versiculo is NOT declared (the
 * a0-u05 binding carries no verse round). Unknown ids fail the load.
 */
import { wordFor } from "~/content/packs/a0-u05-sokoban";

export type RoadCrossAchievement = { id: string; label: string; emoji: string };

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
  ] as RoadCrossAchievement[],
  /** Cosmetic unlock ladder (§10.3 shared ids, street-crossing labels). */
  unlocks: [
    { id: "caja-madera", label: "Cono naranja", emoji: "🚧" },
    { id: "caja-cedro", label: "Semáforo amable", emoji: "🚦" },
    { id: "caja-jade", label: "Banda del peregrino", emoji: "🎽" },
    { id: "corona", label: "Corona", emoji: "👑" },
  ] as RoadCrossAchievement[],
  /** Ramp (§10.5): +1 car per lane every 8 stored levels, capped at +2
   * (traffic density only — never past the Adulto anchor). Applied by the session. */
  ramp: { carBoostPer8Levels: 1, carCap: 2 },
};

/** Achievement label lookup; an unknown id fails loudly (bad data, never a child). */
export function achievementLabel(id: string): RoadCrossAchievement {
  const hit = curve.achievements.find((a) => a.id === id);
  if (!hit) throw new Error(`roadcross-curve: unknown achievement id ${id}`);
  return hit;
}

/** The EN gloss for the command's caption (fades per englishLevel in React). */
export function commandEn(es: string): string {
  return wordFor(es).en;
}
