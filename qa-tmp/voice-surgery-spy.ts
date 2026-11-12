// VOICE SURGERY SPY (protocol item 1) — bun, against the REAL src/lib/voice.ts.
// Asserts: ZERO worker starts / zero worker messages; every line = exactly ONE
// speechSynthesis.speak with the cast rate/pitch + selected voice; NO cancel()
// except explicit stop (line-start replacement counts, clip-arrival is
// impossible — no engine exists); narrator vs Ana vs Giant Despair pairwise
// distinct in one session; single-voice device keeps rate/pitch differentiation.

let workerStarts = 0;
let audioCtxStarts = 0;

class FakeUtterance {
  text = "";
  lang = "";
  voice: any = null;
  volume = 1;
  rate = 1;
  pitch = 1;
  onstart: any = null;
  onend: any = null;
  onerror: any = null;
  constructor(text: string) {
    this.text = text;
  }
}

function makeSynth(voices: any[]) {
  const calls: any[] = [];
  const cancels: any[] = [];
  const vcListeners: any[] = [];
  let speaking = false;
  let pending = false;
  const synth = {
    getVoices: () => voices,
    speaking,
    pending,
    speak(u: any) {
      calls.push(u);
      speaking = true;
      // real engines fire onstart async; 5ms is enough
      setTimeout(() => {
        if (u.onstart) u.onstart();
        setTimeout(() => {
          speaking = false;
          if (u.onend) u.onend();
        }, 40);
      }, 5);
    },
    cancel() {
      cancels.push({ whileSpeaking: speaking });
      speaking = false;
      pending = false;
    },
    addEventListener(_ev: string, cb: any) {
      vcListeners.push(cb);
    },
    removeEventListener() {},
    fireVoicesChanged() {
      vcListeners.forEach((cb) => cb());
    },
  };
  return { synth, calls, cancels };
}

function makeWindow(synth: any) {
  return {
    speechSynthesis: synth,
    setTimeout: (f: any, ms: number) => setTimeout(f, ms) as any,
    clearTimeout: (id: any) => clearTimeout(id),
    addEventListener() {},
    removeEventListener() {},
  };
}

(globalThis as any).SpeechSynthesisUtterance = FakeUtterance;
(globalThis as any).Worker = class {
  constructor() {
    workerStarts++;
  }
  postMessage() {}
};
(globalThis as any).AudioContext = class {
  constructor() {
    audioCtxStarts++;
  }
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fail: string[] = [];
const ok = (cond: boolean, name: string) => {
  console.log((cond ? "PASS " : "FAIL ") + name);
  if (!cond) fail.push(name);
};

async function main() {
  // ── Scenario A: 3 es voices (narrator first, round-robin) ────────────────
  const voicesA = [
    { name: "Zed Spanish", lang: "es-US" },
    { name: "Ana Español", lang: "es-ES" },
    { name: "Mono Castellano", lang: "es-ES" },
    { name: "Alex English", lang: "en-US" },
  ].map((v, i) => ({ ...v, name: v.name + " #" + i }));
  const A = makeSynth(voicesA);
  (globalThis as any).window = makeWindow(A.synth);
  const V = await import("../src/lib/voice.ts");
  const C = await import("../src/lib/voiceCast.ts");

  ok(workerStarts === 0, "A0 zero worker starts after import+prime");
  V.primeVoice();
  V.warmVoice();
  await sleep(120);
  ok(workerStarts === 0, "A0 zero worker starts after prime+warmVoice");
  ok(audioCtxStarts === 0, "A0 zero AudioContext starts");
  const probe = A.calls[0];
  ok(probe && probe.text === " " && probe.volume === 0, "A0 boot self-test = ONE silent-level probe");
  ok(A.calls.length === 1, "A0 warmVoice queues NO engine line (only the probe)");

  const before = A.calls.length;
  const cBefore = A.cancels.length;
  V.speakSpanish("Érase un pueblo llamado Eldoria.", C.castParams("narrator"));
  await sleep(150);
  ok(A.calls.length === before + 1, "A1 line = exactly ONE speak");
  const line = A.calls[A.calls.length - 1];
  ok(Math.abs(line.rate - 0.8) < 1e-9 && Math.abs(line.pitch - 0.88) < 1e-9, "A1 narrator rate/pitch = widened mapping (0.8/0.88)");
  const sortedA = voicesA.filter((v) => (v.lang || "").toLowerCase().startsWith("es")).sort((a, b) => a.name.localeCompare(b.name));
  ok(line.voice && line.voice.name === sortedA[0].name, "A1 narrator = first es voice (stable sort by name: " + sortedA[0].name + ")");
  ok(A.cancels.length === cBefore + 1, "A1 line-start stop = ONE cancel (explicit)");
  ok(A.cancels[A.cancels.length - 1].whileSpeaking === false, "A1 line-start cancel fired while nothing was speaking");
  await sleep(3500); // let rescues + natural end pass
  ok(A.calls.length === before + 1, "A1 rescues did NOT duplicate the line");
  ok(A.cancels.length === cBefore + 1, "A1 no cancel after natural end");

  // ── No cancel-on-clip-arrival: speak a NEW line while the old one is
  // "speaking" — the ONLY cancel is the line-start replacement; nothing else
  // ever interrupts a started utterance (there is no clip to arrive).
  const cMid = A.cancels.length;
  V.speakSpanish("Ana sonríe.", C.castParams("villagerF"));
  await sleep(150);
  ok(A.calls.length === before + 2, "A2 second line = exactly ONE speak");
  ok(A.cancels.length === cMid + 1, "A2 replacement = ONE explicit cancel, no clip cancel");
  const ana = A.calls[A.calls.length - 1];
  ok(Math.abs(ana.rate - 1.04) < 1e-9 && Math.abs(ana.pitch - 1.12) < 1e-9, "A2 Ana rate/pitch = 1.04/1.12");
  const giant = await (async () => {
    const c0 = A.cancels.length;
    V.speakSpanish("¡Nunca saldrás de aquí!", C.castParams("villain"));
    await sleep(150);
    ok(A.cancels.length === c0 + 1, "A3 replacement = ONE explicit cancel");
    return A.calls[A.calls.length - 1];
  })();
  ok(Math.abs(giant.rate - 0.8) < 1e-9 && Math.abs(giant.pitch - 0.64) < 1e-9, "A3 Giant Despair rate/pitch = 0.8/0.64");
  ok(
    (line.voice.name !== giant.voice.name || line.rate !== giant.rate || line.pitch !== giant.pitch) &&
      (ana.rate !== line.rate || ana.pitch !== line.pitch) &&
      (giant.pitch !== ana.pitch),
    "A3 narrator vs Ana vs Giant Despair pairwise distinct (params; voice names: " +
      line.voice?.name + " / " + ana.voice?.name + " / " + giant.voice?.name + ")",
  );
  ok(new Set([line.voice?.name, ana.voice?.name, giant.voice?.name]).size >= 2, "A3 ≥2 distinct voices across the three");

  // ── Scenario B: ONE es voice — rate/pitch mapping keeps characters apart ──
  // Same module (one page session): the device's voice list CHANGES (A→B), so
  // voiceschanged must invalidate the session caches before B speaks.
  const voicesB = [{ name: "Solo Español", lang: "es-MX" }];
  const B = makeSynth(voicesB);
  A.synth.fireVoicesChanged();
  (globalThis as any).window = makeWindow(B.synth);
  const V2 = V;
  V2.primeVoice();
  await sleep(120);
  const pre = B.calls.length;
  V2.speakSpanish("Uno.", C.castParams("narrator"));
  V2.speakSpanish("Dos.", C.castParams("villain"));
  await sleep(200);
  const [l1, l2] = B.calls.slice(pre);
  ok(l1 && l2 && B.calls.length === pre + 2, "B1 one speak per line on single-voice device");
  ok(l1.voice?.name === voicesB[0].name && l2.voice?.name === voicesB[0].name, "B1 both lines ride the single es voice");
  ok(l1.rate !== l2.rate || l1.pitch !== l2.pitch, "B1 narrator vs Giant Despair still distinct (rate/pitch)");

  // ── Scenario C: explicit stop is the only other cancel ───────────────────
  const c0 = B.cancels.length;
  V2.stopSpeaking();
  ok(B.cancels.length === c0 + 1, "C1 explicit stopSpeaking = exactly ONE cancel");
  await sleep(400);
  ok(B.cancels.length === c0 + 1, "C1 nothing cancels afterwards");

  // ── Scenario D: no palabr:speak-style engine messages exist to send ──────
  ok(workerStarts === 0 && audioCtxStarts === 0, "D1 session totals: 0 workers, 0 AudioContexts");

  console.log(fail.length === 0 ? "\nSPY PASS" : "\nSPY FAIL: " + fail.join(" | "));
  process.exit(fail.length === 0 ? 0 : 1);
}

main();
