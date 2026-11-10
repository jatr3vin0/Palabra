/**
 * The kokoro voice worker: CDN module load, the one-time ~86 MB model download
 * and all WASM synthesis run in here, off the main thread, so a cold browser
 * (no cached model) never blocks the game UI. The page keeps playing with the
 * browser speechSynthesis voice until this worker reports ready.
 *
 * Protocol in:  { op: "init" } · { op: "speak", id, text } · { op: "stop", id }
 * Protocol out: { ev: "progress", progress } · { ev: "ready" } · { ev: "error" }
 *               { ev: "audio", id, audio: Float32Array, samplingRate }
 *               { ev: "speakError", id }
 *
 * kokoro-js v1.2.1 (Apache-2.0) ships a Spanish-capable pipeline, but its
 * bundled voice registry only lists English voices, so Spanish goes through
 * the public low-level path:
 *   phonemize(text, "es") → tokenizer → tts.generate_from_ids(ids, "ef_dora")
 * `ef_dora` is one of the model repo's real Spanish voices
 * (onnx-community/Kokoro-82M-v1.0-ONNX, voices/ef_dora.bin).
 */

const KOKORO_LIB = "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js";
const PHONEMIZER_LIB = "https://cdn.jsdelivr.net/npm/phonemizer@1.2.1/+esm";
const KOKORO_MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";
const KOKORO_VOICE = "ef_dora";
const KOKORO_SPEED = 0.9; // a touch slower for A0 ears

type ProgressCb = { status: string; file?: string; loaded?: number; total?: number };

type KokoroModule = {
  KokoroTTS: {
    from_pretrained(
      model: string,
      opts: { dtype?: string; device?: string; progress_callback?: (e: ProgressCb) => void },
    ): Promise<KokoroTts>;
  };
};
type PhonemizerModule = { phonemize(text: string, lang: string): Promise<string[]> };
type KokoroTts = {
  tokenizer: (text: string, opts?: { truncation?: boolean }) => { input_ids: { data: unknown[] } };
  generate_from_ids(
    ids: unknown,
    opts: { voice?: string; speed?: number },
  ): Promise<{ audio: Float32Array; sampling_rate: number }>;
};

type InMsg = { op: "init" } | { op: "speak"; id: number; text: string } | { op: "stop"; id: number };

type OutMsg =
  | { ev: "progress"; progress: number }
  | { ev: "ready" }
  | { ev: "error" }
  | { ev: "audio"; id: number; audio: Float32Array; samplingRate: number }
  | { ev: "speakError"; id: number };

const sw = self as unknown as {
  postMessage(msg: unknown, transfer?: Transferable[]): void;
  onmessage: ((e: MessageEvent<InMsg>) => void) | null;
};

function post(msg: OutMsg, transfer?: Transferable[]): void {
  sw.postMessage(msg, transfer ?? []);
}

let tts: KokoroTts | null = null;
let phonemize: ((text: string, lang: string) => Promise<string[]>) | null = null;
let started = false;
/** Serialized generation queue — the wasm model does one voice at a time. */
let chain: Promise<void> = Promise.resolve();
/** Requests with id <= cancelledBelow are dropped (page called stopSpeaking). */
let cancelledBelow = 0;

async function init(): Promise<void> {
  if (started) return;
  started = true;
  try {
    const fileBytes = new Map<string, { loaded: number; total: number }>();
    const onProgress = (e: ProgressCb) => {
      if (e.status === "progress" && e.file && typeof e.loaded === "number" && typeof e.total === "number") {
        fileBytes.set(e.file, { loaded: e.loaded, total: e.total || 1 });
        let loaded = 0;
        let total = 0;
        for (const v of fileBytes.values()) {
          loaded += v.loaded;
          total += v.total;
        }
        post({ ev: "progress", progress: total > 0 ? Math.min(0.99, loaded / total) : 0 });
      }
    };

    const [kokoroMod, phonemizerMod] = await Promise.all([
      import(/* @vite-ignore */ KOKORO_LIB) as Promise<KokoroModule>,
      import(/* @vite-ignore */ PHONEMIZER_LIB) as Promise<PhonemizerModule>,
    ]);
    phonemize = phonemizerMod.phonemize;
    tts = await kokoroMod.KokoroTTS.from_pretrained(KOKORO_MODEL, {
      dtype: "q8",
      device: "wasm",
      progress_callback: onProgress,
    });
    post({ ev: "ready" });
  } catch (err) {
    console.warn("[voice.worker] kokoro unavailable, browser voice stays", err);
    post({ ev: "error" });
  }
}

sw.onmessage = (e: MessageEvent<InMsg>) => {
  const msg = e.data;
  if (msg.op === "init") {
    void init();
    return;
  }
  if (msg.op === "stop") {
    cancelledBelow = Math.max(cancelledBelow, msg.id);
    return;
  }
  // speak — queued after any in-flight turn; stale turns are dropped.
  chain = chain.then(async () => {
    if (msg.id <= cancelledBelow || !tts || !phonemize) return;
    try {
      const pieces = await phonemize(msg.text, "es");
      if (msg.id <= cancelledBelow) return;
      const phonemes = pieces.join(" ").trim();
      const { input_ids } = tts.tokenizer(phonemes, { truncation: true });
      const out = await tts.generate_from_ids(input_ids, { voice: KOKORO_VOICE, speed: KOKORO_SPEED });
      if (msg.id <= cancelledBelow) return;
      post({ ev: "audio", id: msg.id, audio: out.audio, samplingRate: out.sampling_rate }, [out.audio.buffer]);
    } catch (err) {
      console.warn("[voice.worker] kokoro generation failed", err);
      post({ ev: "speakError", id: msg.id });
    }
  });
};
