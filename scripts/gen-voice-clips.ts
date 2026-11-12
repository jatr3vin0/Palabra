/**
 * Pre-generated voice cast — PHASE 1 (owner directive 2026-11-12).
 *
 * The owner's device has NO usable Spanish speechSynthesis voice (device
 * capability limit — the boot pill fired correctly). But the owner HAS heard
 * kokoro-generated clips, so audio playback through the app works. This script
 * therefore generates the FIXED Spanish corpus server-side, once, and ships it
 * as mp3 files + a manifest the client plays through plain <audio> — no live
 * TTS, no device voice needed.
 *
 * Corpus = everything the game speaks through speakSpanish() with a cast key:
 *   - public/eldoria/src/dialogue_content.js — every NPC variant page + the
 *     signposts (voice per palabra_npc_config.js; signs read by the narrator)
 *   - scenes: IntroScene pages, VictoryScene lines, GameOverScene arrival +
 *     menu options, PauseScene strings, TitleScene lines
 *   - item-get banners (name + desc per items.js row), boss names
 *   - mission first-win gem lines (per PALABRA_MISSIONS reward)
 *   - the frame engine: every frame's greeting / howto / howtoSpoken / praise /
 *     gentle / farewell, round.say lines, the REWARD explanation, the
 *     scripture moment (incl. pack verse + spoken reference), achievement
 *     ¡Logro: …! lines, and the fixed session strings of the four mini-games
 *     (wave/tablero/ronda/cruce progress, heart-out line, pack word echoes,
 *     spelling chants, TPR cross commands + gentle miss lines)
 *
 * Clip naming: sha1(text + "\u0000" + voiceKey) → public/voice-clips/<voiceKey>/<hash>.mp3
 * Manifest  : public/voice-clips/manifest.json — { clips: { <voiceKey>: { <text>: "<voiceKey>/<hash>.mp3" } } }
 * (The client looks lines up by EXACT text under the cast key — no client-side
 * hashing, no drift room: a line the corpus does not carry is a device-voice
 * fallback, byte-for-byte the old path.)
 *
 * Voice: kokoro-js 1.2.1 (Apache-2.0) on onnx-community/Kokoro-82M-v1.0-ONNX
 * (q8), one .bin per cast row's voiceId (ef_dora / em_alex / em_santa), speed =
 * the cast row's speed. Spanish G2P = espeak-ng WASM (GPL-3; the phonemizer
 * bundle is English-only — the kokoro-es repair, efe1498). MP3 via
 * @breezystack/lamejs (24 kHz mono, 96 kbps).
 *
 * Run: bun scripts/gen-voice-clips.ts   (resumable — existing files are kept)
 */

import { createHash } from "node:crypto";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
// @ts-ignore — espeak-ng ships no types (scripts/espeak-ng.d.ts covers it)
import espeakFactory from "espeak-ng";
import { KokoroTTS } from "kokoro-js";
import lamejs from "@breezystack/lamejs";

// ── repo paths ───────────────────────────────────────────────────────────────
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "voice-clips");
const MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";

// ── the cast (src/lib/voiceCast.ts is the ONE table) ────────────────────────
type VoiceKey = keyof typeof VOICE_CAST;
import { VOICE_CAST } from "../src/lib/voiceCast";
import { frames, GENESIS_1_1 } from "../src/lib/frames";
import { curve as sokobanCurve } from "../src/games/templates/sokoban-word/curve";
import { curve as breakoutCurve } from "../src/games/templates/breakout-word/curve";
import { composedCrossSay, gentleMissSay } from "../src/games/templates/road-cross-word/rounds";
import { BOUND_POOL, spellingFor, spellingForReplay, composedSpellSay } from "../src/content/packs/a0-u04-breakout";
import { poolEs as u05Words } from "../src/content/packs/a0-u05-sokoban";

// ── the eldoria world data (plain scripts that assign window globals) ───────
(globalThis as Record<string, unknown>).window = {};
(globalThis as Record<string, unknown>).DIALOGUE = {};
const W = (globalThis as Record<string, unknown>).window as Record<string, unknown>;
// @ts-ignore — eldoria world scripts are plain browser globals, not TS modules
await import("../public/eldoria/src/palabra_npc_config.js");
// @ts-ignore — eldoria world scripts are plain browser globals, not TS modules
await import("../public/eldoria/src/dialogue_content.js");
// @ts-ignore — eldoria world scripts are plain browser globals, not TS modules
await import("../public/eldoria/src/items.js");
try {
  // @ts-ignore — eldoria world scripts are plain browser globals, not TS modules
  await import("../public/eldoria/src/bosses.js");
} catch (err) {
  console.warn("bosses.js not importable (missing globals) — boss names skipped:", String((err as Error)?.message ?? err).slice(0, 100));
}
const PALABRA_NPCS = W.PALABRA_NPCS as Record<string, { name: string; voice: string }>;
const DIALOGUE = (globalThis as Record<string, unknown>).DIALOGUE as Record<string, Array<{ lines?: string[][] }>>;
const ITEMS = W.ITEMS as Record<string, { name: string; desc: string }>;
const MISSIONS = (W.PALABRA_MISSIONS ?? {}) as Record<string, { reward?: { gems?: number } }>;
const BOSSES = (W.BOSSES ?? {}) as Record<string, { name?: string; voice?: string }>;

// ── corpus assembly ──────────────────────────────────────────────────────────
type Line = { voice: VoiceKey; text: string; src: string };
const corpus: Line[] = [];
const add = (voice: string, text: string, src: string) => {
  const t = text.trim();
  if (!t) return;
  if (!(voice in VOICE_CAST)) throw new Error(`gen-voice-clips: unknown cast key "${voice}" for ${src}`);
  corpus.push({ voice: voice as VoiceKey, text: t, src });
};

// 1) world dialogue — every NPC variant page, joined exactly like
//    UIScene.speakPage() speaks it: d.pages[d.page].join(' ')
for (const [npcId, meta] of Object.entries(PALABRA_NPCS)) {
  const variants = DIALOGUE[npcId];
  if (!variants) continue;
  variants.forEach((v, vi) => {
    for (const page of v.lines ?? []) add(meta.voice, page.join(" "), `dialogue:${npcId}#${vi}`);
  });
}
// signposts — the whole sign array is ONE page (dialogue.js wraps it), read by
// the narrator (PALABRA_SIGN_VOICE)
for (const [signId, pages] of Object.entries(DIALOGUE.signs as unknown as Record<string, string[]>)) {
  add("narrator", pages.join(" "), `sign:${signId}`);
}

// 2) scenes — fixed strings, hardcoded here with provenance (the Phaser scene
//    files cannot be imported; the bytes mirror the source exactly).
// IntroScene.js pages (pages[page].filter(Boolean).join(' '))
const INTRO_PAGES = [
  ["Este cuento es un sueño.", "Veo a un peregrino.", "Lleva un peso en la espalda."],
  ["El peso es su culpa.", "Pesa mucho. Nadie lo quita.", "Solo la cruz lo puede quitar."],
  ["Un hombre le habla: Evangelista.", "Deja esta ciudad hoy.", "Hay una puerta angosta. Pasa."],
  ["El Rey da un rollo sellado.", "Tres sellos tiene el rollo.", "Los enemigos los roban."],
  ["Busca los tres sellos.", "Cruza el río. La Ciudad Celestial", "te espera. ¡Ve, peregrino!"],
];
for (const page of INTRO_PAGES) add("narrator", page.filter(Boolean).join(" "), "scene:IntroScene");
// VictoryScene.js — lines.map(l => l[0]).join(' ')
add(
  "narrator",
  "¡A CASA! Apollyon huye. ¡El paso es libre! Cruzas el río. La puerta se abre. El rollo está sellado. ¡Pasa! ¡ERES PEREGRINO DE LA CIUDAD!",
  "scene:VictoryScene",
);
// GameOverScene.js — arrival line + the two menu options
add("narrator", "FIN DEL JUEGO. ¡No te rindas, héroe!", "scene:GameOverScene");
add("narrator", "Seguir desde el último guardado", "scene:GameOverScene");
add("narrator", "Volver al inicio", "scene:GameOverScene");
// PauseScene.js — title, save result, slider labels, music toggle
add("narrator", "PAUSA", "scene:PauseScene");
add("narrator", "¡Guardado!", "scene:PauseScene");
add("narrator", "¡No se pudo guardar!", "scene:PauseScene");
add("narrator", "Música", "scene:PauseScene");
add("narrator", "Voces", "scene:PauseScene");
add("narrator", "Efectos", "scene:PauseScene");
add("narrator", "Música: SÍ", "scene:PauseScene");
add("narrator", "Música: NO", "scene:PauseScene");
// TitleScene.js
add("narrator", "Palabra, aprende español jugando. Elige una casilla para empezar tu aventura.", "scene:TitleScene");
for (let n = 1; n <= 3; n++) {
  add("narrator", `Casilla ${n}. Aventura guardada.`, "scene:TitleScene");
  add("narrator", `Casilla ${n}. Nueva aventura.`, "scene:TitleScene");
}
add("narrator", "¡Toca E otra vez para borrar!", "scene:TitleScene");
// palabra.js — mission result lines (repeat win + first win per mission gems)
add("narrator", "¡Misión cumplida! Puntos de experiencia guardados en Palabra.", "bridge:palabra.missionResult");
for (const [mid, m] of Object.entries(MISSIONS)) {
  const gems = m.reward?.gems;
  if (gems) add("narrator", `¡Misión cumplida! Ganaste ${gems} gemas para el mundo y puntos de experiencia en Palabra.`, `bridge:palabra.missionResult:${mid}`);
}

// 3) item-get banners + boss names
for (const [id, it] of Object.entries(ITEMS)) {
  add("narrator", `${it.name}. ${it.desc ?? ""}`.trim(), `item:${id}`);
}
for (const [id, def] of Object.entries(BOSSES)) {
  const rows = Array.isArray(def) ? def : [def];
  for (const r of rows) if (r?.name && r?.voice) add(r.voice, r.name, `boss:${id}`);
}

// 4) the frame engine — five frames
// REWARD_COPY.spoken.join(" ") (FrameGame.tsx) — the narrator reward line
add("narrator", "¡Muy bien! Puntos, gemas y monedas. Puntos de aprender. Gemas del mundo. Monedas de Palabra. Todo guardado.", "frame:REWARD_COPY");
// SCRIPTURE_MOMENT (FrameGame.tsx) — scripture voice
add("scripture", "Escucha la Palabra de Dios.", "frame:SCRIPTURE_MOMENT");
add("scripture", "Génesis, capítulo uno, versículo uno.", "frame:SCRIPTURE_MOMENT");
add("scripture", GENESIS_1_1, "frame:SCRIPTURE_MOMENT");
add("scripture", "Ahora tú. ¿Qué palabra falta?", "frame:SCRIPTURE_MOMENT");
add("scripture", "Escucha otra vez.", "frame:SCRIPTURE_MOMENT");
add("scripture", "Palabra de Dios. Amén.", "frame:SCRIPTURE_MOMENT");
// pack verses — the verse-driven moment when a pack binding is active
import { packs as A0_PACKS, packVerse } from "../src/content/packs/a0-packs";
for (const p of A0_PACKS) {
  if (!p.scripture) continue;
  const v = packVerse(p);
  add("scripture", v.refSay, `pack:${p.packId}`);
  add("scripture", v.verse, `pack:${p.packId}`);
  add("scripture", v.say, `pack:${p.packId}`);
}
// fixed session strings of the mini-game frames
add("villagerF", "¡Tablero listo!", "frame:sokoban");            // sokoban wave-up
add("villagerM", "¡Ronda lista!", "frame:breakout");             // breakout round-up
add("villagerM", "¡Cruce listo!", "frame:road-cross");           // road-cross round-up
add("villagerM", "Sin corazones. Respira, escucha y otra vez.", "frame:breakout+road-cross");
add("villagerF", "Sin corazones. Respira, escucha y otra vez.", "frame:sokoban");
add("villagerF", "¡Esa es la palabra que falta! Escucha el versículo otra vez.", "frame:casa");
add("villagerF", "¡Tres seguidas! ¡Muy bien!", "frame:casa");
for (let next = 1; next <= 4; next++) add("villagerM", `¡Onda superada! ¡Onda ${next + 1}!`, "frame:plaza");
// achievements — `¡Logro: <label without bangs>!`, narrator voice
const logro = (label: string) => `¡Logro: ${label.replace(/[¡!]/g, "")}!`;
for (const a of sokobanCurve.achievements) add("narrator", logro(a.label), "achievement:sokoban");
for (const a of breakoutCurve.achievements) add("narrator", logro(a.label), "achievement:breakout");

for (const f of Object.values(frames)) {
  const v = f.voice ?? "narrator";
  add(v, f.greeting.es, `frame:${f.id}`);
  add(v, f.howto.es.join(" "), `frame:${f.id}`);
  if (f.howtoSpoken) add(v, f.howtoSpoken, `frame:${f.id}`);
  for (const p of f.praise) add(v, p, `frame:${f.id}`);
  for (const g of f.gentle) add(v, g, `frame:${f.id}`);
  add(v, f.farewell.es, `frame:${f.id}`);
  const rv = f.roundVoice ?? v;
  for (const r of f.rounds as Array<{ say?: string; word?: string }>) {
    if (r.say) add(rv, r.say, `frame:${f.id}:round`);
    if (r.word) add(v, r.word, `frame:${f.id}:word`);
  }
}

// 5) pack word echoes + composed chants/commands
// breakout (villagerM): the word echo plus the spelling chants the session
// actually speaks — letters (R1–R3) and syllables (R4) exist only for their
// own round words, and the replay chant rides spellingForReplay (R5)
const trySpell = (es: string, mode: "letters" | "syllables"): string | null => {
  try {
    return composedSpellSay(es, spellingFor(es, mode));
  } catch {
    return null; // the word never plays this mode in a real session
  }
};
for (const es of BOUND_POOL) {
  add("villagerM", `¡${es}!`, "pack:a0-u04");
  for (const chant of [trySpell(es, "letters"), trySpell(es, "syllables")]) {
    if (chant) add("villagerM", chant, "pack:a0-u04");
  }
  add("villagerM", composedSpellSay(es, spellingForReplay(es).seq), "pack:a0-u04");
}
// sokoban (villagerF): the bare pair word spoken on every board entry
for (const es of u05Words) add("villagerF", es, "pack:a0-u05");
// road-cross (villagerM): the TPR command for every lane word, and the gentle
// miss naming BOTH lanes (wrong × target over the pack's words, plus the
// unlabeled-lane row)
for (const es of u05Words) {
  add("villagerM", composedCrossSay(es), "pack:a0-u05");
  add("villagerM", gentleMissSay(null, es), "pack:a0-u05");
  for (const wrong of u05Words) add("villagerM", gentleMissSay(wrong, es), "pack:a0-u05");
}

// ── dedupe (voiceKey, text) — the manifest key ───────────────────────────────
type Clip = { voice: VoiceKey; text: string; hash: string; file: string; srcs: string[] };
const byKey = new Map<string, Clip>();
for (const l of corpus) {
  const hash = createHash("sha1").update(l.text + "\u0000" + l.voice).digest("hex");
  const key = `${l.voice}\u0000${l.text}`;
  const hit = byKey.get(key);
  if (hit) {
    if (!hit.srcs.includes(l.src)) hit.srcs.push(l.src);
    continue;
  }
  byKey.set(key, { voice: l.voice, text: l.text, hash, file: `${l.voice}/${hash}.mp3`, srcs: [l.src] });
}
const clips = [...byKey.values()];
console.log(`corpus: ${corpus.length} spoken lines → ${clips.length} unique clips`);
const perVoice = new Map<string, number>();
for (const c of clips) perVoice.set(c.voice, (perVoice.get(c.voice) ?? 0) + 1);
for (const [v, n] of [...perVoice.entries()].sort()) console.log(`  ${v}: ${n} clips`);

// ── generation ───────────────────────────────────────────────────────────────
/** espeak-ng G2P (the kokoro-es repair): one CLI-style instance per line. */
async function phonemizeEs(text: string): Promise<string> {
  const espeak = await espeakFactory({
    arguments: ["--phonout", "out", '--sep=""', "-q", "-b=1", "--ipa=3", "-v", "es", text],
  });
  const raw = espeak.FS.readFile("out", { encoding: "utf8" });
  return raw.split("\n").filter((l: string) => l.length > 0).join(" ").trim();
}

function encodeMp3(audio: Float32Array, sampleRate: number): Uint8Array {
  const i16 = new Int16Array(audio.length);
  for (let i = 0; i < audio.length; i++) i16[i] = Math.max(-1, Math.min(1, audio[i])) * 32767;
  const enc = new lamejs.Mp3Encoder(1, sampleRate, 96);
  const chunks: Buffer[] = [];
  const SZ = 1152;
  for (let i = 0; i < i16.length; i += SZ) {
    const part = enc.encodeBuffer(i16.subarray(i, i + SZ));
    if (part.length) chunks.push(Buffer.from(part));
  }
  const tail = enc.flush();
  if (tail.length) chunks.push(Buffer.from(tail));
  return new Uint8Array(Buffer.concat(chunks));
}

console.log("loading kokoro model…");
const tts = await KokoroTTS.from_pretrained(MODEL, { dtype: "q8", device: "cpu" });
console.log("model ready");

await mkdir(OUT_DIR, { recursive: true });
let generated = 0;
let skipped = 0;
let failed = 0;
const failedClips: Clip[] = [];
const t0 = Date.now();
for (let i = 0; i < clips.length; i++) {
  const c = clips[i];
  const outPath = path.join(OUT_DIR, c.file);
  try {
    const st = await stat(outPath);
    if (st.size > 0) {
      skipped++;
      continue;
    }
  } catch {
    // not generated yet
  }
  try {
    const phonemes = await phonemizeEs(c.text);
    if (!phonemes) throw new Error("espeak produced no phonemes");
    const { input_ids } = tts.tokenizer(phonemes, { truncation: true });
    const out = await tts.generate_from_ids(input_ids, {
      voice: VOICE_CAST[c.voice].voiceId,
      speed: VOICE_CAST[c.voice].speed,
    } as unknown as never);
    if (!out.audio.length) throw new Error("kokoro produced no audio");
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, encodeMp3(out.audio, out.sampling_rate));
    generated++;
  } catch (err) {
    failed++;
    failedClips.push(c);
    console.warn(`  FAIL [${c.voice}] "${c.text.slice(0, 60)}": ${String((err as Error)?.message ?? err).slice(0, 120)}`);
  }
  if ((generated + failed) % 25 === 0) {
    const mins = ((Date.now() - t0) / 60000).toFixed(1);
    console.log(`  …${generated + failed}/${clips.length} done in ${mins} min`);
  }
}

// ── manifest ─────────────────────────────────────────────────────────────────
const manifest: {
  version: number;
  generatedAt: string;
  model: string;
  clips: Record<string, Record<string, string>>;
} = { version: 1, generatedAt: new Date().toISOString(), model: MODEL, clips: {} };
for (const c of clips) {
  const bucket = (manifest.clips[c.voice] ??= {});
  bucket[c.text] = c.file;
}
await writeFile(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 1));

console.log(`done: ${generated} generated, ${skipped} already on disk, ${failed} failed`);
for (const c of failedClips) console.warn(`  missing: [${c.voice}] ${c.text.slice(0, 70)}`);
console.log(`manifest: ${clips.length - failed} entries → public/voice-clips/manifest.json`);
if (failed > 0) process.exit(1);
