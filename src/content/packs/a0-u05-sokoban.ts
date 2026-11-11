/**
 * a0-u05 binder for «Empuja la Palabra» — the sokoban template's content
 * layer (PORT-sokoban-word.md §3; R7-2 CONFIRMED: pool = a0-u05, the only
 * pool where every id is a concrete noun or compass direction with a
 * pairable meaning).
 *
 * Source of record: a0-packs.json (packId a0-u05) — never unit-01.json
 * (per-source scoping). Every es flows byte-identical from the pack; nothing
 * here re-types or re-writes pack bytes. Composed round speech
 * («¡Empuja el ÁRBOL!… árbol.») is composed at SESSION time, never stored.
 *
 * The a0-u05 icon table (R7-4) lives here so every u05-bound template
 * consumes ONE table (road-cross joins this loop at its own landing; until
 * then this is the table's single consumer). Icon keys map to procedural
 * glyph drawing in the scene — no emoji, no fetched art (zero-fetch rule).
 */
import { getWord, packForBinding, type PackWord } from "./a0-packs";

const PACK_ID = "a0-u05";

/** The pack, resolved once; a missing pack fails the load (never a child). */
const pack = packForBinding(PACK_ID);
if (!pack) throw new Error(`a0-u05-sokoban: pack ${PACK_ID} missing from a0-packs.json`);

/** Procedural icon key per es id (R7-4: icon ALWAYS present; the en gloss
 * subtitle fades per englishLevel — never the only signifier). */
const ICONS: Record<string, string> = {
  campo: "field",
  planta: "sprout",
  árbol: "tree",
  río: "river",
  piedra: "pebble",
  roca: "rock",
  barro: "mud",
  hielo: "ice",
  serpiente: "snake",
  camino: "path",
  norte: "north",
  sur: "south",
  este: "east",
  oeste: "west",
  castillo: "castle",
};

export type SokobanWord = PackWord & { icon: string };

/** The pack's word table with icon keys — id-keyed, byte-identical es. */
export const words: Map<string, SokobanWord> = new Map(
  pack.words.map((w) => {
    const icon = ICONS[w.es];
    if (!icon) throw new Error(`a0-u05-sokoban: no icon for pack word ${w.es}`);
    return [w.es, { ...w, icon }];
  }),
);

/** The wave id lists, byte-identical from the pack's waves table. */
export function waveIds(wave: number): string[] {
  const ids = pack.waves[String(wave)];
  if (!Array.isArray(ids)) throw new Error(`a0-u05-sokoban: wave ${wave} is not a word list`);
  return ids;
}

/** es → word row (throws on an id outside the pack — per-source scoping). */
export function wordFor(es: string): SokobanWord {
  const w = words.get(es);
  if (!w) throw new Error(`a0-u05-sokoban: ${es} is not an a0-u05 word`);
  return w;
}

/** The whole pool as es strings (the decoy picker's universe). */
export const poolEs: string[] = [...words.keys()];

/**
 * Near-form decoys for a pair set (plan §3): the pack's own curated options
 * first (piedra←roca, barro←hielo/río, campo←planta…), then wave-adjacent
 * pool words. Never a pair id, never a duplicate.
 */
export function nearFormDecoys(pairs: string[], count: number, seedShuffle: <T>(items: T[], seed: string) => T[], seed: string): string[] {
  const out: string[] = [];
  const add = (es: string): void => {
    if (out.length < count && !out.includes(es) && !pairs.includes(es)) out.push(es);
  };
  for (const p of pairs) {
    for (const o of getWord(p).options) add(o);
  }
  for (const w of seedShuffle(poolEs, `${seed}-decoys`)) add(w);
  if (out.length < count) throw new Error(`a0-u05-sokoban: only ${out.length} decoys for pairs ${pairs.join(",")}`);
  return out;
}
