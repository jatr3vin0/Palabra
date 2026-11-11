/**
 * The kokoro voice worker: CDN module load, the one-time ~86 MB model download
 * and all WASM synthesis run in here, off the main thread, so a cold browser
 * (no cached model) never blocks the game UI. The page keeps playing with the
 * browser speechSynthesis voice until this worker reports ready.
 *
 * Protocol in:  { op: "init" }
 *               { op: "speak", id, text, voice?, speed?, pitch? }
 *               { op: "stop", id }
 * Protocol out: { ev: "progress", progress } · { ev: "ready" } · { ev: "warm" }
 *               { ev: "error" }
 *               { ev: "audio", id, audio: Float32Array, samplingRate, playbackRate }
 *               { ev: "speakError", id }
 *
 * kokoro-js v1.2.1 (Apache-2.0) ships a Spanish-capable pipeline, but its
 * bundled voice registry only lists English voices, so Spanish goes through
 * the public low-level path:
 *   phonemize(text, "es") → tokenizer → tts.generate_from_ids(ids, voice)
 * `ef_dora`, `em_alex` and `em_santa` are the model repo's real Spanish voices
 * (onnx-community/Kokoro-82M-v1.0-ONNX, voices/*.bin).
 */

const KOKORO_LIB = "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js";
const PHONEMIZER_LIB = "https://cdn.jsdelivr.net/npm/phonemizer@1.2.1/+esm";
const KOKORO_MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";
const DEFAULT_VOICE = "ef_dora";
const DEFAULT_SPEED = 0.9; // a touch slower for A0 ears

/** The model repo's three Spanish voices — preloaded at init so the first
 * per-character line never stalls on a voice download (brief directive). */
const SPANISH_VOICES = ["ef_dora", "em_alex", "em_santa"];

// ── Audio cache: synthesis is ~real-time, so repeated greetings/menus must
// not re-synthesise. Keyed by voice|speed|pitch|text, stored in IndexedDB.
const DB_NAME = "palabra-voice-cache";
const STORE = "clips";
let cacheDb: IDBDatabase | null = null;

function openCache(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (cacheDb) return resolve(cacheDb);
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => {
        cacheDb = req.result;
        resolve(cacheDb);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function cacheGet(key: string): Promise<Float32Array | null> {
  const db = await openCache();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as Float32Array) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function cachePut(key: string, audio: Float32Array): Promise<void> {
  const db = await openCache();
  if (!db) return;
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(audio, key);
  } catch {
    // private mode etc. — synthesize every time instead
  }
}

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

type InMsg =
  | { op: "init" }
  | { op: "speak"; id: number; text: string; voice?: string; speed?: number; pitch?: number }
  | { op: "stop"; id: number };

type OutMsg =
  | { ev: "progress"; progress: number }
  | { ev: "ready" }
  | { ev: "warm" }
  | { ev: "error"; reason?: string }
  | { ev: "audio"; id: number; audio: Float32Array; samplingRate: number; playbackRate?: number }
  | { ev: "speakError"; id: number; reason?: string };

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
    // Spanish phonemizer smoke test (live-build defect found 2026-11-11): the
    // phonemizer@1.2.1 espeak bundle ships ENGLISH-only voice data, so
    // phonemize(text, "es") threw "Invalid language identifier: es" on every
    // real line — the worker still reported ready+warmed (the warm-up
    // tokenizes raw text and bypasses phonemize), every dialogue line died as
    // speakError within milliseconds, and the speechSynthesis fallback stayed
    // permanently gated off. The owner heard ZERO voice with music playing.
    // Prove "es" works BEFORE declaring ready: if it does not, kokoro is
    // unusable for Spanish and the page must stay on the browser voice.
    try {
      await phonemize!("hola", "es");
    } catch (err) {
      console.warn(
        "[voice.worker] Spanish phonemizer unavailable in this build — browser voice takes over",
        err,
      );
      post({ ev: "error", reason: "phonemize-es" });
      return;
    }
    post({ ev: "ready" });
    // Preload every Spanish voice: kokoro fetches the .bin lazily on first
    // use, so a one-word warm-up per voice lands all three in cache now. The
    // FIRST success also posts {ev:"warm"} — the page hands over from the
    // browser voice to kokoro from that moment (cold-start handover).
    void (async () => {
      for (const v of SPANISH_VOICES) {
        try {
          const ids = tts!.tokenizer("sí", { truncation: true }).input_ids;
          await tts!.generate_from_ids(ids, { voice: v, speed: 1 });
          post({ ev: "warm" });
        } catch (err) {
          console.warn("[voice.worker] voice warm-up failed: " + v, err);
        }
      }
    })();
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
    if (msg.id <= cancelledBelow || !tts || !phonemize || msg.op !== "speak") return;
    const voice = msg.voice ?? DEFAULT_VOICE;
    const speed = msg.speed ?? DEFAULT_SPEED;
    const pitch = msg.pitch ?? 0;
    // pitch lift/depth via AudioBufferSourceNode.playbackRate = 2^(n/12);
    // kokoro generates at speed/r so the audible duration stays `speed`
    const r = pitch ? Math.pow(2, pitch / 12) : 1;
    const key = `${voice}|${speed.toFixed(2)}|${pitch}|${msg.text}`;
    try {
      const cached = await cacheGet(key);
      if (msg.id <= cancelledBelow) return;
      if (cached) {
        post({ ev: "audio", id: msg.id, audio: cached, samplingRate: 24000, playbackRate: r }, [
          cached.buffer,
        ]);
        return;
      }
      const pieces = await phonemize(msg.text, "es");
      if (msg.id <= cancelledBelow) return;
      const phonemes = pieces.join(" ").trim();
      const { input_ids } = tts.tokenizer(phonemes, { truncation: true });
      const out = await tts.generate_from_ids(input_ids, { voice, speed: speed / r });
      if (msg.id <= cancelledBelow) return;
      void cachePut(key, out.audio);
      post({ ev: "audio", id: msg.id, audio: out.audio, samplingRate: out.sampling_rate, playbackRate: r }, [
        out.audio.buffer,
      ]);
    } catch (err) {
      console.warn("[voice.worker] kokoro generation failed", err);
      post({
        ev: "speakError",
        id: msg.id,
        reason: String((err as Error)?.message ?? err).slice(0, 160),
      });
    }
  });
};
