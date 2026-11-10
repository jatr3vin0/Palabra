/**
 * The Palabra voice cast — the ONE table that maps character types to kokoro
 * voices (voiceId + speed + pitch, per the casting verified against the
 * Kokoro-82M-v1.0-ONNX voice list). Kokoro ships exactly three Spanish voices
 * (ef_dora F, em_alex M, em_santa M); child/elder/villain casting is via
 * speed + pitch (playbackRate lift 2^(n/12), generated at speed/r so duration
 * is unchanged — see voice.worker.ts).
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
  voiceId: string;
  speed: number;
  /** Semitones: + = brighter (children), − = deeper (villains). */
  pitch: number;
};

export const VOICE_CAST: Record<VoiceKey, VoiceParams> = {
  // Pip (boy ~10): light, quick, exclamatory — gate casting row "hero"
  hero: { voiceId: "ef_dora", speed: 1.05, pitch: 2 },
  // girl ~10: brighter than the boy (reserved for Christiana/Mercy cast)
  heroine: { voiceId: "ef_dora", speed: 1.12, pitch: 2 },
  // generic child role
  child: { voiceId: "ef_dora", speed: 1.08, pitch: 2 },
  // elder male: slow + low = aged
  elder: { voiceId: "em_alex", speed: 0.85, pitch: -2 },
  // neutral adult men (Capitán Rico, guards, farmers)
  villagerM: { voiceId: "em_alex", speed: 0.95, pitch: 0 },
  // warm adult women (Ana) — unhurried, smiling
  villagerF: { voiceId: "ef_dora", speed: 0.92, pitch: 0 },
  // warm storyteller — menus, signs, the narrator line (most reliable voice)
  narrator: { voiceId: "ef_dora", speed: 0.88, pitch: 0 },
  // scripture read reverently (Génesis 1:1 in the balloon frame)
  scripture: { voiceId: "em_santa", speed: 0.85, pitch: 0 },
  // deep, slow, menacing — Apollyon, Giant Despair, tempters (phase 2)
  villain: { voiceId: "em_santa", speed: 0.9, pitch: -3 },
};

/** Resolve a cast key to concrete kokoro params (safe fallback: narrator). */
export function castParams(key?: string | null): VoiceParams {
  return VOICE_CAST[(key ?? "narrator") as VoiceKey] ?? VOICE_CAST.narrator;
}
