/** Web Speech helpers: Spanish text-to-speech and speech recognition. */

export function ttsAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string, slow = false): void {
  if (!ttsAvailable()) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "es-ES";
    utter.rate = slow ? 0.55 : 0.92;
    const voices = window.speechSynthesis.getVoices();
    const es = voices.find((v) => v.lang?.toLowerCase().startsWith("es"));
    if (es) utter.voice = es;
    window.speechSynthesis.speak(utter);
  } catch {
    // speech is a bonus, never a blocker
  }
}

type Recognizer = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onend: (() => void) | null;
};

export function recognitionAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition);
}

export function createRecognizer(): Recognizer | null {
  if (!recognitionAvailable()) return null;
  const w = window as unknown as Record<string, unknown>;
  const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as new () => Recognizer;
  const rec = new Ctor();
  rec.lang = "es-ES";
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  return rec;
}

/**
 * Rough pronunciation score: share of the target's words the learner said,
 * with a small penalty for extra words. Good enough to coach A0 learners;
 * a real pronunciation model can replace this later.
 */
export function scoreSpeech(target: string, transcript: string): number {
  const clean = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-zñ ]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  const want = clean(target);
  const got = clean(transcript);
  if (want.length === 0) return 0;
  const said = new Set(got);
  const matched = want.filter((w) => said.has(w)).length;
  const extra = Math.max(0, got.length - matched);
  return Math.max(0, Math.min(100, Math.round((matched / want.length) * 100) - extra * 5));
}
