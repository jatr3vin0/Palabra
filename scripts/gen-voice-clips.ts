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
/** NO trim: the manifest key must be the EXACT call-site bytes (the runtime
 * looks lines up by exact text — a trimmed key would miss a raw call-site
 * string with outer whitespace). Only empty strings are skipped. */
const add = (voice: string, text: string, src: string) => {
  const t = String(text);
  if (!t.trim()) return;
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

// ── 2) scenes — SINGLE SOURCE OF TRUTH: every string is EXTRACTED from the
//    scene file's bytes (the same bytes Phaser runs), never hand-copied. An
//    anchor that misses is a HARD ERROR — the corpus must never silently
//    drift from the call sites again (the owner's wrong-audio report). ────────
const readFile = (await import("node:fs/promises")).readFile;
const SC = path.join(ROOT, "public", "eldoria", "src");
/** Pull a literal from a world file and evaluate it — exact call-site bytes. */
async function literal(file: string, anchor: RegExp, what: string): Promise<unknown> {
  const src = await readFile(path.join(SC, file), "utf8");
  const m = src.match(anchor);
  if (!m) throw new Error(`gen-voice-clips: anchor for ${what} NOT FOUND in ${file} — corpus would drift`);
  return eval("(" + m[1] + ")");
}
/** Pull one single-quoted string literal that follows a fixed prefix. */
async function litStr(file: string, anchor: RegExp, what: string): Promise<string> {
  const src = await readFile(path.join(SC, file), "utf8");
  const m = src.match(anchor);
  if (!m) throw new Error(`gen-voice-clips: anchor for ${what} NOT FOUND in ${file} — corpus would drift`);
  return m[1];
}

// IntroScene.js — pages spoken as `this.pages[page].filter(Boolean).join(' ')`
const introPages = (await literal("scenes/IntroScene.js", /this\.pages = (\[[\s\S]*?\]);/, "intro pages")) as string[][];
for (const page of introPages) add("narrator", page.filter(Boolean).join(" "), "scene:IntroScene");
// VictoryScene.js — `lines.map(l => l[0]).join(' ')`
const victoryLines = (await literal("scenes/VictoryScene.js", /const lines = (\[[\s\S]*?\]);/, "victory lines")) as Array<[string, number, string, number]>;
add("narrator", victoryLines.map((l) => l[0]).join(" "), "scene:VictoryScene");
// GameOverScene.js — arrival line + `this.opts` menu options
add("narrator", await litStr("scenes/GameOverScene.js", /Palabra\.speak\('([^']+)', 'narrator'\)/, "gameover arrival"), "scene:GameOverScene");
const goOpts = (await literal("scenes/GameOverScene.js", /this\.opts = (\[[\s\S]*?\]);/, "gameover opts")) as string[];
for (const o of goOpts) add("narrator", o, "scene:GameOverScene");
// PauseScene.js — title, save-result ternary, slider labels, music toggle
add("narrator", await litStr("scenes/PauseScene.js", /Palabra\.speak\('(PAUSA)', 'narrator'\)/, "pause title"), "scene:PauseScene");
{
  const src = await readFile(path.join(SC, "scenes/PauseScene.js"), "utf8");
  const save = src.match(/speak\(ok \? '([^']+)' : '([^']+)'/);
  if (!save) throw new Error("gen-voice-clips: anchor for pause save-result NOT FOUND");
  add("narrator", save[1], "scene:PauseScene");
  add("narrator", save[2], "scene:PauseScene");
  const music = src.match(/speak\('Música: ' \+ \(AUDIO\.musicMuted \? '([^']+)' : '([^']+)'\)/);
  if (!music) throw new Error("gen-voice-clips: anchor for pause music toggle NOT FOUND");
  add("narrator", "Música: " + music[2], "scene:PauseScene"); // unmuted → SÍ branch
  add("narrator", "Música: " + music[1], "scene:PauseScene"); // muted → NO branch
  for (const k of ["music", "voice", "sfx"]) {
    const lbl = src.match(new RegExp(`key: '${k}', label: '([^']+)'`));
    if (!lbl) throw new Error(`gen-voice-clips: anchor for pause label ${k} NOT FOUND`);
    add("narrator", lbl[1], "scene:PauseScene");
  }
}
// TitleScene.js — welcome, per-slot menu lines, erase warning
add("narrator", await litStr("scenes/TitleScene.js", /Palabra\.speak\('([^']+)', 'narrator'\)/, "title welcome"), "scene:TitleScene");
{
  const src = await readFile(path.join(SC, "scenes/TitleScene.js"), "utf8");
  const menu = src.match(/'Casilla ' \+ \(this\.sel \+ 1\) \+ '\. ' \+ \(s && s\.exists \? '([^']+)' : '([^']+)'\)/);
  if (!menu) throw new Error("gen-voice-clips: anchor for title menu template NOT FOUND");
  const slots = src.match(/for \(let i = 0; i < (\d+); i\+\+\) \{[\s\S]*?Casilla/);
  const nSlots = slots ? Number(slots[1]) : 3;
  for (let n = 1; n <= nSlots; n++) {
    add("narrator", `Casilla ${n}. ${menu[1]}`, "scene:TitleScene");
    add("narrator", `Casilla ${n}. ${menu[2]}`, "scene:TitleScene");
  }
  add("narrator", await litStr("scenes/TitleScene.js", /Palabra\.speak\('(¡Toca E[^']+)'/, "title erase"), "scene:TitleScene");
}
// palabra.js — mission result lines (repeat win + first win per mission gems)
add("narrator", await litStr("palabra.js", /speak\('(¡Misión cumplida! Puntos[^']+)', 'narrator'\)/, "mission repeat"), "bridge:palabra.missionResult");
{
  const src = await readFile(path.join(SC, "palabra.js"), "utf8");
  const first = src.match(/speak\(\s*'(¡Misión cumplida! Ganaste )' \+ gems \+ '([^']+)'/);
  if (!first) throw new Error("gen-voice-clips: anchor for mission first-win NOT FOUND");
  for (const [mid, m] of Object.entries(MISSIONS)) {
    const gems = m.reward?.gems;
    if (gems) add("narrator", `${first[1]}${gems}${first[2]}`, `bridge:palabra.missionResult:${mid}`);
  }
}

// 3) item-get banners + boss names
// banner: byte-exact with UIScene `info.name + '. ' + (info.desc || '')`
for (const [id, it] of Object.entries(ITEMS)) {
  add("narrator", `${it.name}. ${it.desc || ""}`, `item:${id}`);
  // PauseScene menu voice speaks the BARE item name (nav + pause open)
  add("narrator", it.name, `item-name:${id}`);
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
// fixed session strings of the mini-game frames — EXTRACTED from the frame
// components' bytes (same single-source rule as the Phaser scenes: an anchor
// that misses is a hard error, never a silent drift)
{
  const fg = await readFile(path.join(ROOT, "src/components/FrameGame.tsx"), "utf8");
  const rc = await readFile(path.join(ROOT, "src/components/RoadCrossFrame.tsx"), "utf8");
  const bo = await readFile(path.join(ROOT, "src/components/BreakoutFrame.tsx"), "utf8");
  const pick = (src: string, re: RegExp, what: string): string => {
    const m = src.match(re);
    if (!m) throw new Error(`gen-voice-clips: anchor for ${what} NOT FOUND in frame component — corpus would drift`);
    return m[1];
  };
  add("villagerF", pick(fg, /say\("(¡Tablero listo!)"\)/, "sokoban wave-up"), "frame:sokoban");
  add("villagerM", pick(bo, /say\("(¡Ronda lista!)"\)/, "breakout round-up"), "frame:breakout");
  add("villagerM", pick(rc, /say\("(¡Cruce listo!)"\)/, "road-cross round-up"), "frame:road-cross");
  add("villagerM", pick(bo, /say\("(Sin corazones[^"]*)"\)/, "breakout out-of-hearts"), "frame:breakout+road-cross");
  const praises = [...fg.matchAll(/sayPraise\("([^"]+)"\)/g)].map((m) => m[1]);
  if (praises.length < 2) throw new Error("gen-voice-clips: casa praises NOT FOUND in FrameGame.tsx");
  for (const p of praises) add("villagerF", p, "frame:casa");
  const onda = fg.match(/say\(`(¡Onda superada! ¡Onda )\$\{next \+ 1\}(!)`\)/);
  if (!onda) throw new Error("gen-voice-clips: anchor for plaza wave-up NOT FOUND");
  for (let next = 1; next <= 4; next++) add("villagerM", `${onda[1]}${next + 1}${onda[2]}`, "frame:plaza");
}
// achievements — `¡Logro: <label without bangs>!`, narrator voice. FrameGame
// joins MULTIPLE achievements into ONE spoken line (`lines.join(" ")`), so the
// corpus carries every singleton AND every pair (a triple co-occurrence falls
// back to the device voice — a miss, never wrong audio).
const logro = (label: string) => `¡Logro: ${label.replace(/[¡!]/g, "")}!`;
const logroLines = (labels: string[]): string[] => labels.map(logro);
const joined = (ls: string[]) => ls.join(" ");
for (const [tag, curve] of [["sokoban", sokobanCurve], ["breakout", breakoutCurve]] as const) {
  const singles = logroLines(curve.achievements.map((a) => a.label));
  for (const s of singles) add("narrator", s, `achievement:${tag}`);
  for (let i = 0; i < singles.length; i++)
    for (let j = i + 1; j < singles.length; j++)
      add("narrator", joined([singles[i], singles[j]]), `achievement-pair:${tag}`);
}

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

// CLIPS_DRY=1: assemble + write the manifest only (no model, no audio) —
// used to diff the corpus against the shipped manifest before regenerating.
if (process.env.CLIPS_DRY) {
  const dry: { version: number; generatedAt: string; model: string; clips: Record<string, Record<string, string>> } = {
    version: 1,
    generatedAt: new Date().toISOString(),
    model: MODEL,
    clips: {},
  };
  for (const c of clips) (dry.clips[c.voice] ??= {})[c.text] = c.file;
  await writeFile(path.join(OUT_DIR, "manifest.json"), JSON.stringify(dry, null, 1));
  console.log(`DRY: ${clips.length} unique keys → manifest written, no audio touched`);
  process.exit(0);
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

// ── FINAL INTEGRITY ASSERTION (verbatim round-trip) ───────────────────────────
// Every manifest entry must hash back to its own file name, the file must
// exist with audio-worthy size, and no orphan may remain on disk (an orphan
// is a stale generation the resumable run kept — it can never be looked up,
// but leaving it invites drift). Failure exits 1 so CI/steps catch it.
import { readdir, unlink } from "node:fs/promises";
let rtBad = 0;
let rtMissing = 0;
const finalManifest = JSON.parse(await readFile(path.join(OUT_DIR, "manifest.json"), "utf8")) as {
  clips: Record<string, Record<string, string>>;
};
for (const [voice, bucket] of Object.entries(finalManifest.clips)) {
  for (const [text, file] of Object.entries(bucket)) {
    const want = createHash("sha1").update(text + "\u0000" + voice).digest("hex");
    if (!file.startsWith(voice + "/") || path.basename(file, ".mp3") !== want) {
      rtBad++;
      console.error(`  ROUND-TRIP FAIL: [${voice}] ${JSON.stringify(text.slice(0, 50))} → ${file}`);
      continue;
    }
    const sz = (await stat(path.join(OUT_DIR, file)).catch(() => null))?.size ?? 0;
    if (sz < 1200) {
      rtMissing++;
      console.error(`  FILE FAIL: ${file} (${sz}B) for ${JSON.stringify(text.slice(0, 50))}`);
    }
  }
}
// orphans: any mp3 on disk the manifest no longer references
const referenced = new Set<string>();
for (const bucket of Object.values(finalManifest.clips)) for (const f of Object.values(bucket)) referenced.add(f);
let orphaned = 0;
for (const voiceDir of await readdir(OUT_DIR, { withFileTypes: true })) {
  if (!voiceDir.isDirectory()) continue;
  for (const f of await readdir(path.join(OUT_DIR, voiceDir.name))) {
    if (!f.endsWith(".mp3")) continue;
    const rel = `${voiceDir.name}/${f}`;
    if (!referenced.has(rel)) {
      await unlink(path.join(OUT_DIR, rel));
      orphaned++;
    }
  }
}
console.log(`integrity: entries=${Object.values(finalManifest.clips).reduce((n, b) => n + Object.keys(b).length, 0)} roundTripBad=${rtBad} fileBad=${rtMissing} orphansRemoved=${orphaned}`);
if (rtBad > 0 || rtMissing > 0) process.exit(1);
