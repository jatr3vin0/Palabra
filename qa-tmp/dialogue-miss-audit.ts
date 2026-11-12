// Audit: replay the generator's EXACT dialogue/sign lookups against the live
// manifest. A miss on a TTS-dead device = total silence for that line.
(globalThis as unknown as Record<string, unknown>).window = {};
(globalThis as unknown as Record<string, unknown>).DIALOGUE = {};
const W = (globalThis as unknown as Record<string, unknown>).window as Record<string, unknown>;
await import("../public/eldoria/src/palabra_npc_config.js");
await import("../public/eldoria/src/dialogue_content.js");

const manifest = JSON.parse(await Bun.file("public/voice-clips/manifest.json").text());
const clips = manifest.clips as Record<string, Record<string, string>>;
const PALABRA_NPCS = W.PALABRA_NPCS as Record<string, { name: string; voice: string }>;
const DIALOGUE = (globalThis as unknown as Record<string, unknown>).DIALOGUE as Record<string, Array<{ lines?: string[][] }>>;

let hits = 0;
const misses: string[] = [];
for (const [npcId, meta] of Object.entries(PALABRA_NPCS)) {
  const variants = DIALOGUE[npcId];
  if (!variants) continue;
  variants.forEach((v, vi) => {
    (v.lines ?? []).forEach((page, pi) => {
      const t = page.join(" ");
      if (!t.trim()) return;
      if (clips[meta.voice]?.[t]) { hits++; return; }
      const anyCast = Object.keys(clips).find((c) => clips[c][t]);
      misses.push(`${npcId} v${vi} p${pi} cast=${meta.voice}${anyCast ? ` (text under '${anyCast}'!)` : ""} | ${t.slice(0, 80)}`);
    });
  });
}
for (const [signId, pages] of Object.entries((DIALOGUE as unknown as Record<string, Record<string, string[]>>).signs ?? {})) {
  const t = pages.join(" ");
  if (clips.narrator?.[t]) { hits++; continue; }
  misses.push(`sign ${signId} | ${t.slice(0, 80)}`);
}
console.log(`dialogue/sign: hits=${hits} misses=${misses.length}`);
misses.slice(0, 30).forEach((m) => console.log("MISS", m));// ── scene pages + banners (D3 extension): Intro/Victory/GameOver + Pause +
// Title + item/boss/mission-banner compositions (the mission banner through
// the UIScene sanitizer bytes — D1's sanitized speech keys).
