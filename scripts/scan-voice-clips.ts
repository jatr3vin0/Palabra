/**
 * Clip corpus integrity scan (verbatim-audio pass).
 * 1. round-trip: sha1(text + "\0" + voice) === file stem, file exists, size>0
 * 2. anomalies: duration (CBR 96kbps ⇒ size*8/96000 s) vs text length
 *    - truncated/static: dur < 0.40 * expected
 *    - doubled content:  dur > 2.00 * expected
 *    - garbage:          size < 1200 bytes (≈0.1 s)
 * 3. near-duplicate keys: two manifest texts that differ only by joiner/
 *    whitespace/punctuation-normalization (wrong-clip lookup risk)
 * Usage: bun scripts/scan-voice-clips.ts [--json]
 */
import { createHash } from "node:crypto";
import { stat, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "voice-clips");
const manifest = JSON.parse(await readFile(path.join(OUT_DIR, "manifest.json"), "utf8"));

const CHARS_PER_SEC = 13.0; // kokoro es @ speed 1.0, empirical midpoint
const expect = (t: string) => Math.max(0.7, t.length / CHARS_PER_SEC);
const norm = (t: string) =>
  t.toLowerCase().replace(/[¡!¿?.,;:…]/g, " ").replace(/\s+/g, " ").trim();

type Row = { voice: string; text: string; file: string; size: number; dur: number; exp: number; ratio: number };
const rows: Row[] = [];
const badRoundTrip: string[] = [];
const missing: string[] = [];

for (const [voice, bucket] of Object.entries(manifest.clips) as Array<[string, Record<string, string>]>) {
  for (const [text, file] of Object.entries(bucket)) {
    const stem = path.basename(file, ".mp3");
    const want = createHash("sha1").update(text + "\u0000" + voice).digest("hex");
    if (stem !== want) badRoundTrip.push(`${voice} | ${text.slice(0, 60)} → ${file} (want ${want.slice(0, 10)})`);
    const p = path.join(OUT_DIR, file);
    let size = 0;
    try {
      size = (await stat(p)).size;
    } catch {
      missing.push(`${voice} | ${text.slice(0, 60)} → ${file}`);
      continue;
    }
    const dur = (size * 8) / 96000;
    const exp = expect(text);
    rows.push({ voice, text, file, size, dur, exp, ratio: dur / exp });
  }
}

const truncated = rows.filter((r) => r.ratio < 0.40);
const doubled = rows.filter((r) => r.ratio > 2.0);
const tiny = rows.filter((r) => r.size < 1200);

// near-duplicate manifest keys: same normalized text, different raw text
const byNorm = new Map<string, string[]>();
for (const r of rows) {
  const k = `${r.voice}\u0000${norm(r.text)}`;
  (byNorm.get(k) ?? byNorm.set(k, []).get(k)!).push(r.text);
}
const nearDupes: string[][] = [];
for (const texts of byNorm.values()) {
  if (texts.length > 1) nearDupes.push(texts);
}

const out = {
  entries: rows.length,
  badRoundTrip,
  missing,
  truncated: truncated.map((r) => `${r.voice} ratio=${r.ratio.toFixed(2)} dur=${r.dur.toFixed(1)}s exp=${r.exp.toFixed(1)}s ${r.text.slice(0, 70)} → ${r.file}`),
  doubled: doubled.map((r) => `${r.voice} ratio=${r.ratio.toFixed(2)} dur=${r.dur.toFixed(1)}s exp=${r.exp.toFixed(1)}s ${r.text.slice(0, 70)} → ${r.file}`),
  tiny: tiny.map((r) => `${r.voice} ${r.size}B ${r.text.slice(0, 60)} → ${r.file}`),
  nearDupes: nearDupes.map((ts) => ts.map((t) => JSON.stringify(t.slice(0, 90)))),
};
console.log(JSON.stringify(out, null, 1));
const bad = out.badRoundTrip.length + out.missing.length + out.truncated.length + out.doubled.length + out.tiny.length;
console.error(`scan: ${out.entries} entries, roundtrip-bad=${out.badRoundTrip.length} missing=${out.missing.length} truncated=${out.truncated.length} doubled=${out.doubled.length} tiny=${out.tiny.length} nearDupes=${out.nearDupes.length} → ${bad === 0 ? "CLEAN" : "FIX NEEDED"}`);
if (process.argv.includes("--json")) await (await import("node:fs/promises")).writeFile("/tmp/clip-scan.json", JSON.stringify(out, null, 1));
