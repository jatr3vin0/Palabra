/**
 * Speech-call spy: the instant-first device path must sound per-character.
 * speakFallback is the pipe every line rides (d9e32a4), so the cast table's
 * speed/pitch must land on utterance.rate/pitch, DISTINCT per character and
 * clamped to sane ranges. Narrator vs Ana (villagerF) vs Giant Despair
 * (villain) were the owner's "all identical" trio.
 *
 * Run: bun qa-tmp/voice-cast-spy.ts
 */
import { speakSpanish } from "../src/lib/voice";
import { castParams, VOICE_CAST } from "../src/lib/voiceCast";

type UtterRec = { text: string; rate: number; pitch: number; volume: number };
const spoken: UtterRec[] = [];

class Utter {
  text: string;
  lang = "";
  voice: unknown = null;
  volume = 1;
  rate = 1;
  pitch = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

const synth = {
  speaking: false,
  pending: false,
  cancel() {},
  speak(u: Utter) {
    spoken.push({ text: u.text, rate: u.rate, pitch: u.pitch, volume: u.volume });
  },
  getVoices() {
    return [{ lang: "es-ES", name: "Test Spanish" }];
  },
  addEventListener() {},
};

// Minimal window: timers are stubbed so the auto-rescue chain can never fire —
// each speakSpanish call must queue exactly ONE utterance, synchronously.
(globalThis as any).window = {
  speechSynthesis: synth,
  setTimeout: () => 0,
  clearTimeout: () => {},
};
(globalThis as any).SpeechSynthesisUtterance = Utter;
(globalThis as any).SpeechSynthesisVoice = class {};

let fails = 0;
const expect = (name: string, got: number, want: number, eps = 1e-9) => {
  const ok = Math.abs(got - want) < eps;
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: got ${got}, want ${want}`);
};

// --- the owner trio: narrator vs Ana vs Giant Despair ---
speakSpanish("El camino es largo.", castParams("narrator"));
speakSpanish("¡Hola! ¿Quieres jugar?", castParams("villagerF"));
speakSpanish("No hay salida.", castParams("villain"));
if (spoken.length !== 3) {
  fails++;
  console.log(`FAIL expected 3 utterances, got ${spoken.length}`);
}
const [narr, ana, giant] = spoken;
console.log("narrator ", JSON.stringify(narr));
console.log("ana      ", JSON.stringify(ana));
console.log("giant    ", JSON.stringify(giant));

expect("narrator rate (speed .9 → 1+(−.1)*2)", narr.rate, 0.8);
expect("narrator pitch (−1 st → 1−0.12)", narr.pitch, 0.88);
expect("Ana rate (speed 1.02)", ana.rate, 1.04);
expect("Ana pitch (+1 st)", ana.pitch, 1.12);
expect("Giant Despair rate (speed .9)", giant.rate, 0.8);
expect("Giant Despair pitch (−3 st)", giant.pitch, 0.64);

const distinct = (a: UtterRec, b: UtterRec) => a.rate !== b.rate || a.pitch !== b.pitch;
if (!distinct(narr, ana)) { fails++; console.log("FAIL narrator vs Ana identical"); }
if (!distinct(narr, giant)) { fails++; console.log("FAIL narrator vs Giant Despair identical"); }
if (!distinct(ana, giant)) { fails++; console.log("FAIL Ana vs Giant Despair identical"); }
console.log("PASS  narrator/Ana/GiantDespair pairwise distinct (rate,pitch)");

// --- every cast row lands on a defined, sane, distinct-enough pair ---
const rows = (Object.keys(VOICE_CAST) as (keyof typeof VOICE_CAST)[]).map((k) => {
  speakSpanish(`line ${k}`, castParams(k));
  return { k, u: spoken[spoken.length - 1] };
});
for (const { k, u } of rows) {
  const sane = u.rate >= 0.5 && u.rate <= 1.4 && u.pitch >= 0.5 && u.pitch <= 1.5;
  if (!sane) { fails++; console.log(`FAIL ${k} outside clamp: ${u.rate}/${u.pitch}`); }
}
const pairs = new Set(rows.map(({ u }) => `${u.rate}|${u.pitch}`));
console.log(`rows=${rows.length} distinctPairs=${pairs.size}`);
console.log(rows.map(({ k, u }) => `${k.padEnd(10)} rate=${u.rate.toFixed(2)} pitch=${u.pitch.toFixed(2)}`).join("\n"));

// --- clamping: extremes must not escape the sane ranges ---
speakSpanish("alto", { speed: 3, pitch: 12 });
const hi = spoken[spoken.length - 1];
expect("clamp hi rate", hi.rate, 1.4);
expect("clamp hi pitch", hi.pitch, 1.5);
speakSpanish("bajo", { speed: 0.1, pitch: -12 });
const lo = spoken[spoken.length - 1];
expect("clamp lo rate", lo.rate, 0.5);
expect("clamp lo pitch", lo.pitch, 0.5);

// --- legacy shapes unchanged: boolean slow and no-opts defaults ---
speakSpanish("lento", true);
expect("legacy slow rate", spoken[spoken.length - 1].rate, 0.6);
speakSpanish("normal");
expect("no-opts rate", spoken[spoken.length - 1].rate, 0.92);
expect("no-opts pitch default", spoken[spoken.length - 1].pitch, 1);

// --- volume slider still rides every utterance ---
speakSpanish("volumen", { speed: 1, pitch: 0 });
if (spoken[spoken.length - 1].volume !== 1) { fails++; console.log("FAIL volume not applied"); }
else console.log("PASS  volume rides the utterance");

console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
