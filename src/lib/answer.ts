/**
 * Tolerant answer checking. Spanish answers count with or without accents,
 * uppercase/lowercase, or trailing punctuation, so a correct answer is never
 * marked wrong over spelling decoration.
 */

export function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¡¿.,!?;:"'«»()\-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isCorrect(
  input: string,
  answer: string,
  accepted: string[] = [],
): boolean {
  const attempt = normalize(input);
  if (!attempt) return false;
  const pool = [answer, ...accepted].map(normalize);
  return pool.includes(attempt);
}

/** Deterministic PRNG so SSR and client render the same shuffle. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededShuffle<T>(items: T[], seed: string): T[] {
  const rand = mulberry32(hashSeed(seed));
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
