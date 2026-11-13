// Verdict analyzer for the denied-autoplay capture.
// Usage: bun /tmp/analyze.mjs /tmp/capture-before.json
import { readFileSync } from "node:fs";
const c = JSON.parse(readFileSync(process.argv[2], "utf8"));
const A = c.parent || []; // DOM audio event timeline (parent doc)
const Q = c.qaAudio || []; // voice.ts speak/clip log
const S = c.qaSpeak || [];

// 1. Group A by element id, per (id, src) playback segments
const byEl = new Map();
for (const e of A) {
  if (!e.id) continue;
  if (!byEl.has(e.id)) byEl.set(e.id, []);
  byEl.get(e.id).push(e);
}
const segments = [];
for (const [id, evs] of byEl) {
  let cur = null;
  for (const e of evs) {
    if (e.ev === "constructed") { cur = { id, src: null, evs: [e] }; continue; }
    if (!cur) continue;
    cur.evs.push(e);
    if (e.ev === "playing" && !cur.played) { cur.played = e; cur.src = e.src; }
    if (e.ev === "ended") { cur.ended = e; segments.push(cur); cur = null; }
  }
  if (cur && cur.played) segments.push(cur); // cut/replaced segment
}
// per-src segment counts + overlap detection + mid-buffer resumes
const bySrc = new Map();
let overlaps = 0, resumes = 0, restarts = 0;
let playing = new Set();
const tline = [];
for (const e of A) {
  if (e.ev === "playing") { playing.add(e.id); tline.push([e.t, "+", e.id, e.src]); if (e.ct > 0.06) { resumes++; console.log("MID-BUFFER RESUME: t=" + e.t, "ct=" + e.ct, e.src); } }
  if (e.ev === "pause" || e.ev === "ended" || e.ev === "emptied") { if (playing.has(e.id)) tline.push([e.t, "-", e.id, e.src]); if (e.ev !== "emptied") playing.delete(e.id); }
}
// overlap: sort +/- by time, count concurrent
let cur = 0, maxConc = 0;
for (const [, s] of tline.sort((a, b) => a[0] - b[0])) { cur += s === "+" ? 1 : -1; maxConc = Math.max(maxConc, cur); }
for (const [id, evs] of byEl) {
  const srcs = new Set(evs.filter((e) => e.ev === "playing").map((e) => e.src));
  for (const src of srcs) {
    const n = evs.filter((e) => e.ev === "playing" && e.src === src).length;
    if (n > 1) { restarts += n - 1; console.log("RESTART: src", src, "started", n, "x (el", id + ")"); }
  }
}
console.log("── segment summary ──");
for (const s of segments) {
  const first = s.evs[0].t, last = s.evs[s.evs.length - 1].t;
  const cut = !s.ended;
  console.log(`el${s.id} ${s.src?.slice(0, 44)} played@${s.played?.t} ct0=${s.played?.ct} ${s.ended ? "ENDED@" + s.ended.t + " ct=" + s.ended.ct : "CUT@" + last + (cut ? " (replaced/stop)" : "")} dur=${(last - first)}ms`);
}
console.log("── voice.ts log ──");
for (const e of Q) console.log(`n=${e.n} ${e.ev}${e.file ? " " + e.file.slice(0, 30) : ""}`);
console.log("── speaks ──");
for (const e of S) console.log(`n=${e.n} [${e.key}] ${(e.text || "").slice(0, 52)} ${e.clip ? "CLIP" : "device"}`);
console.log(`── METRICS: maxConcurrent=${maxConc} resumes=${resumes} restarts=${restarts} ttsCalls=${c.tts} fallbacks=${(c.clips || {}).fallbacks} errors=${(c.clips || {}).errors} hits=${(c.clips || {}).hits} misses=${(c.clips || {}).misses}`);
