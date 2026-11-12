/**
 * a0-u04 binder for «Ladrillos del Alfabeto» — the breakout template's content
 * layer (game #4, build/PORT-breakout-word.md §2–§3; pool = the a0-u04 12
 * words + the a0-u01-l4 cut madre/padre, per GAMES-2-4-bindings #4).
 *
 * TWO sources, each scoped to itself (§10 invariant 1, per-source scoping):
 *   - a0-u04 ids resolve ONLY inside the a0-u04 pack (a0-packs.json bytes).
 *   - madre/padre exist ONLY in unit-01.json (bindings ⚠ DEFECTS #16) and
 *     resolve through the a0-packs getWord union — never re-typed here.
 *
 * Every es flows byte-identical from its source. The LETTER/SYLLABLE
 * spellings and the letter NAMES are this binder's data — the spelling loop
 * is the mechanic, not pack content. The composed chant is composed at
 * SESSION time, never stored, ≤38 chars (asserted at module init — bad data
 * fails the build, never a child). Phaser-free, storage-free, voice-free.
 */
import { getWord, packForBinding } from "./a0-packs";
import { seededShuffle } from "~/lib/answer";

const PACK_ID = "a0-u04";

/** The pack, resolved once; a missing pack fails the load (never a child). */
const pack = packForBinding(PACK_ID);
if (!pack) throw new Error(`a0-u04-breakout: pack ${PACK_ID} missing from a0-packs.json`);

/** The l4 cut — unit-01-only ids (bindings #4); en comes from the union row. */
const L4_CUT = ["madre", "padre"] as const;

/** The bound pool: 12 pack es + the l4 cut, byte-identical. */
export const BOUND_POOL: string[] = [...pack.words.map((w) => w.es), ...L4_CUT];

/** es → {es, en} for glosses (madre/padre come back from the union). */
const rows: Map<string, { es: string; en: string }> = new Map(
  BOUND_POOL.map((es) => [es, { es, en: getWord(es).en }]),
);

/** Word row lookup (throws on an id outside the bound pool — scoping). */
export function wordRow(es: string): { es: string; en: string } {
  const row = rows.get(es);
  if (!row) throw new Error(`a0-u04-breakout: ${es} is not a bound word`);
  return row;
}

/** Per-source scoping: only bound-pool misses serve this game's replay. */
export function boundSafe(es: string): boolean {
  return rows.has(es);
}

// ── spellings (the mechanic's data) ─────────────────────────────────────────

/** LETTER spellings R1–R3 (spoken order). Diphthongs stay whole is a
 * syllable rule; letters are always single graphemes — í keeps its accent. */
const LETTERS: Record<string, string[]> = {
  pan: ["p", "a", "n"],
  sal: ["s", "a", "l"],
  uva: ["u", "v", "a"],
  miel: ["m", "i", "e", "l"],
  agua: ["a", "g", "u", "a"],
  madre: ["m", "a", "d", "r", "e"],
  padre: ["p", "a", "d", "r", "e"],
  "maíz": ["m", "a", "í", "z"],
};

/** SYLLABLE spellings R4–R5 — diphthongs stay whole (hue, gua, ie-bindings). */
const SYLLABLES: Record<string, string[]> = {
  leche: ["le", "che"],
  queso: ["que", "so"],
  huevo: ["hue", "vo"],
  plato: ["pla", "to"],
  fruta: ["fru", "ta"],
  trigo: ["tri", "go"],
  madre: ["ma", "dre"],
  padre: ["pa", "dre"],
  agua: ["a", "gua"],
  uva: ["u", "va"],
  "maíz": ["ma", "íz"],
};

/** 1-syllable defensive branch (bubble paz precedent): no 1-syllable a0-u04
 * word ever gets an empty syllable split — the whole word is one brick. */
const WHOLE = new Set(["pan", "sal", "miel"]);

/** Spanish letter names — the scene speaks these as a letter brick breaks. */
export const LETTER_NAMES: Record<string, string> = {
  a: "a", e: "e", i: "i", "í": "i", o: "o", u: "u",
  m: "eme", p: "pe", n: "ene", s: "ese", l: "ele", d: "de",
  r: "erre", g: "ge", c: "ce", h: "hache", q: "cu", t: "te",
  f: "efe", v: "uve", z: "zeta",
};

export type SpellMode = "letters" | "syllables" | "whole";

/** The spelling for one word in one mode (whole = the word itself). */
export function spellingFor(es: string, mode: SpellMode): string[] {
  if (mode === "whole") return [es];
  const table = mode === "letters" ? LETTERS : SYLLABLES;
  const seq = table[es];
  if (!seq) throw new Error(`a0-u04-breakout: no ${mode} spelling for ${es}`);
  return [...seq];
}

/** A word's R5 (replay) spelling: syllables, or the whole-word branch. */
export function spellingForReplay(es: string): { seq: string[]; mode: SpellMode } {
  if (SYLLABLES[es]) return { seq: [...SYLLABLES[es]], mode: "syllables" };
  if (WHOLE.has(es)) return { seq: [es], mode: "whole" };
  throw new Error(`a0-u04-breakout: ${es} has no replay spelling`);
}

/** What a brick label SPEAKS when it breaks (letters say their NAME). */
export function labelSay(label: string): string {
  return LETTER_NAMES[label] ?? label;
}

/** The unique label inventory a word set's spellings supply. */
export function inventoryFor(words: string[], mode: SpellMode): string[] {
  const out: string[] = [];
  for (const w of words) {
    for (const label of spellingFor(w, mode)) {
      if (!out.includes(label)) out.push(label);
    }
  }
  return out;
}

/** The bound pool's R5 inventories, per mode (syllables vs whole words). */
export function replayInventories(): { syllables: string[]; whole: string[] } {
  const syllables: string[] = [];
  const whole: string[] = [];
  for (const es of BOUND_POOL) {
    const { seq, mode } = spellingForReplay(es);
    const into = mode === "whole" ? whole : syllables;
    for (const label of seq) if (!into.includes(label)) into.push(label);
  }
  return { syllables, whole };
}

/** Seeded UNIQUE decoy labels: never a seq label (no ambiguous brick), within
 * inventory, up to cap. A partial board is legal — the scene shrinks rows. */
export function decoysFor(seq: string[], inventory: string[], cap: number, seed: string): string[] {
  const out: string[] = [];
  const pool = seededShuffle(
    inventory.filter((l) => !seq.includes(l)),
    `${seed}-decoys`,
  );
  for (const label of pool) {
    if (out.length >= Math.max(0, cap)) break;
    out.push(label);
  }
  return out;
}

/** The composed spelling chant (≤38 chars): «pan: pe… a… ene. ¡pan!». */
export function composedSpellSay(es: string, seq: string[]): string {
  const names = seq.map((l) => labelSay(l)).join("… ");
  return seq.length === 1 && seq[0] === es ? `${es}: ¡${es}!` : `${es}: ${names}. ¡${es}!`;
}

// ── module-init validators ──────────────────────────────────────────────────

for (const es of BOUND_POOL) {
  const word = rows.get(es)!;
  if (!word.en) throw new Error(`a0-u04-breakout: ${es} has no en gloss`);
  if (LETTERS[es]) {
    const say = composedSpellSay(es, LETTERS[es]);
    if (say.length > 38) throw new Error(`a0-u04-breakout: chant too long (${say.length}) for ${es}: ${say}`);
  }
  const { seq } = spellingForReplay(es);
  const say = composedSpellSay(es, seq);
  if (say.length > 38) throw new Error(`a0-u04-breakout: chant too long (${say.length}) for ${es}: ${say}`);
  for (const l of seq) {
    if (l.length > 1 && labelSay(l) !== l) throw new Error(`a0-u04-breakout: ${l} is not a letter`);
  }
}

/** Round word pools (PORT §2 R1–R4): the bound set the round's boards,
 * decoys and inventory draw from — serve counts are the thresholds. */
export const ROUND_POOLS: { words: string[]; serve: number; mode: SpellMode }[] = [
  { words: ["pan", "sal", "uva"], serve: 2, mode: "letters" },
  { words: ["miel", "agua"], serve: 2, mode: "letters" },
  { words: ["madre", "padre", "maíz"], serve: 3, mode: "letters" },
  { words: ["leche", "queso", "huevo", "plato", "fruta", "trigo"], serve: 3, mode: "syllables" },
];
