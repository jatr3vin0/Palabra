// Audit: simulate every world speech lookup (dialogue pages, signs) against the
// live manifest — exactly the joins the scenes speak. Print every MISS (a miss
// on a TTS-dead device = total silence for that line).
import { readFileSync } from 'node:fs';

const D = await import('../public/eldoria/src/dialogue_content.js');
const DIALOGUE = D.DIALOGUE ?? D.default?.DIALOGUE ?? D;
const manifest = JSON.parse(readFileSync('../public/voice-clips/manifest.json', 'utf8'));
const clips = manifest.clips;

let misses = 0, hits = 0;
const missRows = [];
const castOf = (meta) => meta?.voice ?? meta?.cast ?? 'villagerM';

// NPC conversations: every variant, every page, joined like UIScene.speakPage
for (const [npcId, meta of] of []) {} // placeholder (not used)

for (const [npcId, meta] of Object.entries(DIALOGUE.npcs ?? DIALOGUE.conversations ?? {})) {
  const cast = castOf(meta);
  const variants = meta.variants ?? meta.lines ? meta.variants ?? [meta] : [];
  const list = meta.variants ?? [meta];
  for (let vi = 0; vi < list.length; vi++) {
    const v = list[vi];
    const pages = v.lines ?? v.pages ?? [];
    for (let pi = 0; pi < pages.length; pi++) {
      const t = (pages[pi] ?? []).join(' ');
      if (!t) continue;
      if (clips[cast] && clips[cast][t]) { hits++; continue; }
      // fallback probe: text under ANY cast?
      const anyCast = Object.keys(clips).find((c) => clips[c][t]);
      misses++;
      missRows.push(`MISS npc=${npcId} v${vi} p${pi} cast=${cast}${anyCast ? ` (text exists under '${anyCast}'!)` : ''} | ${t.slice(0, 90)}`);
    }
  }
}
// signs: joined array, narrator
for (const [signId, pages] of Object.entries(DIALOGUE.signs ?? {})) {
  const t = pages.join(' ');
  if (clips.narrator && clips.narrator[t]) { hits++; continue; }
  misses++;
  missRows.push(`MISS sign=${signId} | ${t.slice(0, 90)}`);
}
console.log(`dialogue/sign lookups: hits=${hits} misses=${misses}`);
for (const r of missRows.slice(0, 40)) console.log(r);
if (missRows.length > 40) console.log(`...and ${missRows.length - 40} more`);
