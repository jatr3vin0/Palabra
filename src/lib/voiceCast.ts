/**
 * The Palabra voice cast — the ONE table that maps character types to voice
 * params. DEVICE-VOICE BUILD (owner P0 2026-11-12): live speech is the device's
 * Spanish voice only — `voiceId` (the kokoro-era voice id) is dormant table
 * shape; the cast `key` selects the character's assigned device voice (see
 * voice.ts), and speed+pitch map onto utterance rate/pitch so one-voice devices
 * still sound per-character (c1d84d2).
 *
 * The adventure (Eldoria iframe) references these by KEY only (its
 * palabra_npc_config.js stores character keys, never numbers), so re-casting a
 * character is a one-table edit here and can never drift from the app.
 */

export type VoiceKey =
  | "hero"
  | "heroine"
  | "child"
  | "elder"
  | "villagerM"
  | "villagerF"
  | "narrator"
  | "scripture"
  | "villain";

export type VoiceParams = {
  /** The cast row itself — what device-voice selection round-robins over. */
  key: VoiceKey;
  /** Dormant kokoro-era voice id (table shape for the future clip path). */
  voiceId: string;
  speed: number;
  /** Semitones: + = brighter (children), − = deeper (villains). */
  pitch: number;
};

export const VOICE_CAST: Record<VoiceKey, Omit<VoiceParams, "key">> = {
  // Pip (boy ~10): light, quick, exclamatory — gate casting row "hero"
  hero: { voiceId: "ef_dora", speed: 1.05, pitch: 2 },
  // girl ~10: matches the boy's warmth, not chipmunk-bright (owner recast)
  heroine: { voiceId: "ef_dora", speed: 1.05, pitch: 2 },
  // generic child role
  child: { voiceId: "ef_dora", speed: 1.08, pitch: 2 },
  // elder male: slow + low = aged
  elder: { voiceId: "em_alex", speed: 0.9, pitch: -2 },
  // neutral adult men (Tomás, Joss, Finn) — firm: steady pace, level pitch
  villagerM: { voiceId: "em_alex", speed: 1.0, pitch: 0 },
  // warm adult women (Ana, Mira, Zara) — brighter/faster than the narrator so
  // the two never blur on the single device voice (owner defect 2026-11-11)
  villagerF: { voiceId: "ef_dora", speed: 1.02, pitch: 1 },
  // warm storyteller — menus, signs, the narrator line (warmest Spanish voice);
  // lower/slower than the villagers for the same reason
  narrator: { voiceId: "em_santa", speed: 0.9, pitch: -1 },
  // scripture read reverently (Génesis 1:1 in the balloon frame)
  scripture: { voiceId: "em_alex", speed: 0.85, pitch: -1 },
  // deep, slow, menacing — Apollyon, Giant Despair, tempters (phase 2)
  villain: { voiceId: "em_santa", speed: 0.9, pitch: -3 },
};

/** Resolve a cast key to concrete params (safe fallback: narrator). */
export function castParams(key?: string | null): VoiceParams {
  const row = (key ?? "narrator") as VoiceKey;
  if (VOICE_CAST[row]) return { ...VOICE_CAST[row], key: row };
  return { ...VOICE_CAST.narrator, key: "narrator" };
}
