/**
 * a0-packs loader — the imported content-pack connection (build/
 * INTEGRATION-imported-pack.md §1). a0-packs.json is the CANONICAL pack file
 * (build/content-packs/a0-packs.json, curriculum author session f65248d1)
 * landed here byte-verbatim; this module is the mechanical layer around it:
 * typed JSON import (resolveJsonModule, same pattern as unit.ts), per-pack
 * word tables, getWord over the unit-01 ∪ a0-packs union (52+49 verified
 * unique), and the per-binding round resolvers the frame engine plays.
 *
 * An es string is NEVER re-typed/indexed/lowercased/trimmed: every es field
 * flows byte-identical from the pack into rounds, captions and verses. The
 * scripture block passes through untouched (Josué 24:15 RV1909, VERIFIED
 * field included in the source).
 *
 * Validators run at module init — a bad id fails the load, never a child.
 * This module imports nothing from src/games, src/lib, Phaser or the network
 * (unit.ts is a content sibling and carries type-only src/lib imports).
 */
import raw from "./a0-packs.json";
import { unit } from "../unit";

export type PackWord = {
  id: string;
  es: string;
  en: string;
  say: string;
  caption: string;
  options: string[];
  note?: string;
};

export type PackScripture = {
  reference: string;
  verse: string;
  captionSplit: string[];
  say: string;
  teaches: string;
  verify: string;
};

export type Pack = {
  packId: string;
  unitId: string;
  /** The pack's own lesson-level binding field (e.g. a0-u03-l1). */
  contentBinding: string;
  theme: string;
  storyThread: string;
  words: PackWord[];
  /** wave number → word ids; a string value is a note (wave 5 is runtime). */
  waves: Record<string, string[] | string>;
  scripture?: PackScripture;
  optional?: boolean;
};

type PackFile = {
  schema: string;
  cefr: string;
  voice: Record<string, string>;
  constraints: Record<string, string>;
  packs: Pack[];
  NOTES?: string;
};

const data = raw as unknown as PackFile;

/** The packs, in file order. a0-u03 is the first connection (pack1). */
export const packs: Pack[] = data.packs;

/**
 * Binding → pack. The REGISTRY-facing binding is the packId ("a0-u03" — what
 * the mission-registry rows carry); the pack's own lesson-level field
 * ("a0-u03-l1") resolves to the same pack. This resolver is where the two
 * spellings were reconciled (buildspec item 7) so registry data never has to
 * agree byte-for-byte with the pack file.
 */
export function packForBinding(binding: string | undefined | null): Pack | undefined {
  if (!binding) return undefined;
  return packs.find((p) => p.packId === binding || p.contentBinding === binding);
}

// ── word tables ─────────────────────────────────────────────────────────────

/** Word table per pack id — per-source scoping: a word resolves inside its
 * own source only, never across packs. */
const wordsByPack = new Map<string, Map<string, PackWord>>();

/** The unit-01 vocab ids (the other half of the 52+49 union). */
const unitIds = new Set(unit.vocab.map((v) => v.es));

for (const p of packs) {
  const m = new Map<string, PackWord>();
  for (const w of p.words) {
    if (m.has(w.id)) throw new Error(`a0-packs: duplicate word id ${w.id} in ${p.packId}`);
    if (unitIds.has(w.es)) throw new Error(`a0-packs: ${p.packId} re-teaches unit-01 id ${w.es} (noDuplicates)`);
    m.set(w.id, w);
  }
  wordsByPack.set(p.packId, m);
}

/** getWord over the union: a0-packs ids resolve per source pack; unit-01 ids
 * resolve as { id: es, es, en }. Throws on any id absent from BOTH sources. */
export function getWord(id: string): PackWord {
  for (const m of wordsByPack.values()) {
    const w = m.get(id);
    if (w) return w;
  }
  if (unitIds.has(id)) {
    const v = unit.vocab.find((x) => x.es === id)!;
    return { id, es: v.es, en: v.en, say: "", caption: "", options: [] };
  }
  throw new Error(`a0-packs: unknown word id ${id}`);
}

/** The pack's word pool as {es,en} pairs (the pool-union builders' input). */
export function packVocab(pack: Pack): { es: string; en: string }[] {
  return pack.words.map((w) => ({ es: w.es, en: w.en }));
}

// ── module-init validators: a bad id fails the load, never a child ─────────

const packIds = new Set<string>();
for (const p of packs) {
  if (packIds.has(p.packId)) throw new Error(`a0-packs: duplicate packId ${p.packId}`);
  packIds.add(p.packId);
  const es = new Set(p.words.map((w) => w.es));
  if (es.size !== p.words.length) throw new Error(`a0-packs: duplicate es in ${p.packId}`);
  // options must be within-pool decoys (DEFECTS #14-15)
  for (const w of p.words) {
    for (const o of w.options) {
      if (!es.has(o)) throw new Error(`a0-packs: ${p.packId}.${w.id} option ${o} outside the pack pool`);
    }
  }
  // numeric waves must cover every word (wave 5 is the runtime replay wave)
  const waved = new Set<string>();
  for (const [k, ids] of Object.entries(p.waves)) {
    if (!Array.isArray(ids)) continue;
    for (const id of ids) {
      if (!wordsByPack.get(p.packId)!.has(id)) throw new Error(`a0-packs: ${p.packId} wave ${k} cites unknown id ${id}`);
      waved.add(id);
    }
  }
  for (const w of p.words) {
    if (!waved.has(w.id)) throw new Error(`a0-packs: ${p.packId}.${w.id} is in no numeric wave`);
  }
  const s = p.scripture;
  if (s) {
    if (!es.has(s.teaches)) throw new Error(`a0-packs: ${p.packId} scripture teaches unknown word ${s.teaches}`);
    const gap = new RegExp(`\\b${s.teaches.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    if (!gap.test(s.verse)) throw new Error(`a0-packs: ${p.packId} verse does not contain ${s.teaches}`);
  }
}

// ── round resolvers (shapes mirror lib/frames structurally; the packs module
//    itself imports nothing from src/lib) ────────────────────────────────────

export type PackShooterRound = {
  word: string;
  en: string;
  say: string;
  caption: string;
  options: string[];
  wave: number;
};

export type PackScriptureRound = {
  word: string;
  en: string;
  verse: string;
  reference: string;
  say: string;
  balloons: string[];
};

/** The pack's shooter rounds: one ShooterRound per word, wave tags from the
 * pack's waves table (word=es, en=en, say=say, caption=caption,
 * options=options — the pack's roundMapping, byte-identical). */
export function bindingShooterRounds(pack: Pack): PackShooterRound[] {
  const waveOf = new Map<string, number>();
  for (const [k, ids] of Object.entries(pack.waves)) {
    if (!Array.isArray(ids)) continue;
    for (const id of ids) waveOf.set(id, Number(k));
  }
  return pack.words.map((w) => ({
    word: w.es,
    en: w.en,
    say: w.say,
    caption: w.caption,
    options: [...w.options],
    wave: waveOf.get(w.id) ?? 1,
  }));
}

/** The pack's scripture round: the verse (byte-identical) with a ___ gap at
 * the teaches word, and 5 balloons — the answer first, then within-pool
 * decoys (the word's own curated options first, then the pack's own words in
 * file order). */
export function bindingScriptureRound(pack: Pack): PackScriptureRound {
  const s = pack.scripture;
  if (!s) throw new Error(`a0-packs: ${pack.packId} has no scripture block`);
  const answer = wordsByPack.get(pack.packId)!.get(s.teaches)!;
  const gap = new RegExp(`\\b${s.teaches.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
  const verse = s.verse.replace(gap, "___");
  const decoys: string[] = [];
  for (const o of answer.options) {
    if (o !== answer.es && !decoys.includes(o)) decoys.push(o);
  }
  for (const w of pack.words) {
    if (decoys.length >= 4) break;
    if (w.es !== answer.es && !decoys.includes(w.es)) decoys.push(w.es);
  }
  return {
    word: answer.es,
    en: answer.en,
    verse,
    reference: s.reference,
    say: s.say,
    balloons: [answer.es, ...decoys.slice(0, 4)],
  };
}

// ── the verse, for the verse-driven UI (heard + read before any question) ──

/** Spanish number words for the spoken reference (chapters/verses 1-199). */
const ONES = [
  "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho",
  "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis",
  "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós",
  "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete",
  "veintiocho", "veintinueve",
];
const TENS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];

function numEs(n: number): string {
  if (n <= 29) return ONES[n];
  if (n < 100) {
    const u = n % 10;
    return TENS[Math.floor(n / 10)] + (u ? " y " + ONES[u] : "");
  }
  if (n < 200) return "ciento" + (n % 100 ? " " + numEs(n % 100) : "");
  throw new Error(`a0-packs: reference number ${n} out of range`);
}

/** Everything the verse-driven UI needs about a pack's scripture block. The
 * verse/say bytes come straight from the pack; the spoken reference is
 * derived from the pack's reference field. */
export function packVerse(pack: Pack) {
  const s = pack.scripture;
  if (!s) throw new Error(`a0-packs: ${pack.packId} has no scripture block`);
  const m = s.reference.match(/^([^(]+?)\s*(\d+):(\d+)/);
  if (!m) throw new Error(`a0-packs: ${pack.packId} reference unreadable: ${s.reference}`);
  const book = m[1].trim();
  const chapter = Number(m[2]);
  const verseNum = Number(m[3]);
  const refShort = s.reference.replace(/\s*\(RV1909\)\s*$/, "").trim();
  return {
    /** "Josué 24:15 (RV1909)" — byte-identical from the pack. */
    reference: s.reference,
    /** "Josué 24:15" — the footer line. */
    refShort,
    /** "Josué, capítulo veinticuatro, versículo quince." — spoken reference. */
    refSay: `${book}, capítulo ${numEs(chapter)}, versículo ${numEs(verseNum)}.`,
    /** The verse, byte-identical from the pack. */
    verse: s.verse,
    /** The spoken verse (say field — guillemets allowed here: spoken-only). */
    say: s.say,
    /** The word the verse teaches (the canon answer key). */
    teaches: s.teaches,
    /** The teaches word's EN gloss (the verse card's immersion gloss). */
    teachesEn: wordsByPack.get(pack.packId)!.get(s.teaches)!.en,
  };
}

export type PackVerseData = ReturnType<typeof packVerse>;

/**
 * EN reference clause per verse (the farewell gloss swap). PD KJV — the packs
 * carry no English for scripture, so the one clause a connected pack needs
 * lives here, documented, never rendered as Spanish content.
 */
const VERSE_EN: Record<string, string> = {
  "Josué 24:15": "but as for me and my house, we will serve the LORD.",
};

/** The EN clause of a pack verse ("" when none is on file). */
export function verseEn(pack: Pack): string {
  const s = pack.scripture;
  if (!s) return "";
  const refShort = s.reference.replace(/\s*\(RV1909\)\s*$/, "").trim();
  return VERSE_EN[refShort] ?? "";
}
