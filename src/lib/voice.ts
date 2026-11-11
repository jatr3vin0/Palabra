/**
 * Palabra's natural Spanish voice: kokoro-js v1.2.1 (Apache-2.0), running in a
 * Web Worker so the WASM/model work never blocks the game thread, and cached
 * by the service worker — the ~86 MB model downloads once (visible progress
 * pill), lands in the cache, and every later visit is instant and offline.
 *
 * kokoro-js v1.2.1 ships its own Spanish-capable pipeline, but its bundled
 * voice registry only lists English voices, so Spanish goes through the public
 * low-level path the worker wires up:
 *   phonemize(text, "es")  → tokenizer → tts.generate_from_ids(ids, "ef_dora")
 * `ef_dora` is one of the model repo's real Spanish voices
 * (onnx-community/Kokoro-82M-v1.0-ONNX, voices/ef_dora.bin).
 *
 * The game NEVER waits for the model: while kokoro loads — or if the download
 * fails — speechSynthesis with a Spanish voice speaks instead, and kokoro
 * takes over the moment it is ready. See voice.worker.ts for the other half.
 */

import { useSyncExternalStore } from "react";

export type VoiceState = "idle" | "loading" | "ready" | "error";
export type VoiceStatus = {
  state: VoiceState;
  /** 0–1 share of the one-time model download. */
  progress: number;
  /** True while kokoro is unavailable and speechSynthesis is speaking. */
  fallback: boolean;
  /** True while a kokoro line is generating and nothing is audible yet. */
  generating: boolean;
  /** True while something is audibly speaking (kokoro clip or browser voice). */
  speaking: boolean;
};

type OutMsg =
  | { ev: "progress"; progress: number }
  | { ev: "ready" }
  | { ev: "warm" }
  | { ev: "error"; reason?: string }
  | { ev: "audio"; id: number; audio: Float32Array; samplingRate: number; playbackRate?: number }
  | { ev: "speakError"; id: number; reason?: string };

/** Per-character voice request (brief: voiceId in the worker protocol). */
export type SpeakOpts = {
  /** kokoro voice id, e.g. "ef_dora" / "em_alex" / "em_santa". */
  voice?: string;
  /** Cast-table shape (castParams() returns { voiceId, ... }) — normalized to
   * `voice` in speakSpanish so the table edit is what the engine actually uses. */
  voiceId?: string;
  /** Audible rate: 1.05 = a touch fast, 0.85 = slow. */
  speed?: number;
  /** Pitch shift in semitones (+2 = child-bright, -3 = villain-deep). */
  pitch?: number;
  /** Legacy boolean: browser-fallback slower rate. */
  slow?: boolean;
};

let status: VoiceStatus = { state: "idle", progress: 0, fallback: false, generating: false, speaking: false };
const listeners = new Set<() => void>();
let worker: Worker | null = null;
let workerStarted = false;
/** In-flight kokoro requests, dropped on stopSpeaking() like the queued turns. */
let speakId = 0;
let stopToken = 0;
/** Bumped on every stopSpeaking: fallback retry timers compare against it so
 * a cancelled line is never re-spoken. */
let voiceEpoch = 0;
/** True once kokoro has produced ANY clip (warm-up included): the natural
 * voice is hot and speakSpanish hands over from the browser voice to it.
 * Cold-start fix: until then every line speaks instantly via speechSynthesis. */
let warmed = false;
/** Lines already spoken by the browser voice while kokoro was un-warmed —
 * their late kokoro audio is dropped instead of double-speaking. */
const fallbackIds = new Set<number>();
/** Silent warm-up utterances (warmVoice) — never played. */
const warmIds = new Set<number>();
let ctx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
/** Resolved when the current utterance's audio finishes (music ducking, page
 * flows). Fired once per speakSpanish call that produced audio. */
type EndCb = () => void;
let speechEndCb: EndCb | null = null;
/** Watchdog timer for the in-flight kokoro turn (see speakSpanish). */
let speakWatchdog: number | null = null;
/** The current kokoro turn's line, kept so a generation failure (speakError)
 * can be rescued with the browser voice instead of leaving the player with a
 * silently dropped line (live-build defect, 2026-11-11). */
let inflight: { text: string; slow: boolean; opts?: SpeakOpts } | null = null;

function clearSpeakWatchdog(): void {
  if (speakWatchdog != null) {
    window.clearTimeout(speakWatchdog);
    speakWatchdog = null;
  }
}

/**
 * Fire the pending end callback exactly once and drop any watchdog.
 * Speech is a bonus, never a blocker: every path that could leave a flow
 * waiting (round transitions, dialogue pages) must end here.
 */
function fireSpeechEnd(): void {
  clearSpeakWatchdog();
  if (status.speaking || status.generating) setStatus({ speaking: false, generating: false });
  inflight = null;
  const cb = speechEndCb;
  speechEndCb = null;
  if (cb) cb();
}

function setStatus(next: Partial<VoiceStatus>) {
  status = { ...status, ...next };
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): VoiceStatus {
  return status;
}

/** React hook: live voice state for the download pill / fallback notice. */
export function useVoiceStatus(): VoiceStatus {
  return useSyncExternalStore(subscribe, getSnapshot, () => status);
}

/** True when kokoro audio is usable right now (vs. browser-fallback voice). */
export function kokoroReady(): boolean {
  return status.state === "ready";
}

export type VoicePhase = "generating" | "speaking" | "idle";

/** What the voice is doing RIGHT NOW, for the world's '🔊 …' bubble:
 * generating = a line was requested but nothing is audible yet. */
export function voicePhase(): VoicePhase {
  if (status.speaking) return "speaking";
  if (status.generating) return "generating";
  return "idle";
}

/** Subscribe to voice-phase ticks (compare before acting — every status
 * change, download progress included, fires listeners). */
export function onVoicePhase(cb: (phase: VoicePhase) => void): () => void {
  const wrapped = () => cb(voicePhase());
  listeners.add(wrapped);
  return () => {
    listeners.delete(wrapped);
  };
}

function handleWorkerMessage(msg: OutMsg) {
  switch (msg.ev) {
    case "progress":
      setStatus({ state: "loading", progress: msg.progress, fallback: status.state !== "ready" });
      break;
    case "ready":
      setStatus({ state: "ready", progress: 1, fallback: false });
      break;
    case "warm":
      // The worker's first post-load warm-up clip is done: kokoro speaks
      // naturally from here on, so the browser voice hands over.
      warmed = true;
      break;
    case "error":
      // kokoro is unusable (e.g. the phonemizer bundle has no Spanish voice
      // data): SAY SO on the console and let the browser voice take over —
      // silence with no explanation is what shipped broken to the owner.
      console.error(
        "[voice] kokoro unavailable — speechSynthesis voice takes over",
        msg.reason ?? "",
      );
      setStatus({ state: "error", progress: 0, fallback: true });
      break;
    case "audio": {
      // ANY clip means the natural pipe is hot: hand over from the browser voice.
      warmed = true;
      // Warm-up pings and lines the browser voice already spoke are dropped —
      // they own no callback (their flow was released when they spoke/warmed).
      const silent = warmIds.delete(msg.id) || fallbackIds.delete(msg.id);
      if (msg.id > stopToken && !silent) {
        clearSpeakWatchdog();
        playAudio(msg.audio, msg.samplingRate, msg.playbackRate ?? 1);
      }
      break;
    }
    case "speakError":
      // generation failed: never leave the current line as a silently dropped
      // 'generating' bubble — rescue it with the browser voice (live defect:
      // every kokoro line died here with phonemize broken and the fallback
      // gated off, so the owner heard nothing at all).
      console.error(
        "[voice] kokoro line failed — rescuing with the browser voice",
        msg.reason ?? "generation",
      );
      if (msg.id === speakId && inflight && !status.speaking) {
        const { text, slow, opts } = inflight;
        inflight = null;
        clearSpeakWatchdog();
        setStatus({ generating: false });
        const spoke = speakFallback(text, slow, opts);
        if (!spoke) fireSpeechEnd();
        return;
      }
      if (msg.id === speakId) fireSpeechEnd();
      break;
  }
}

/** Start the voice worker (called from the hub, so the download is underway
 * before a frame even mounts; the pill shows its progress everywhere). */
export function primeVoice(): void {
  if (typeof window === "undefined") return;
  if (workerStarted) return;
  workerStarted = true;
  // Browser voices load asynchronously on a cold device — remember when the
  // list lands so the next fallback line picks a real Spanish voice.
  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.addEventListener("voiceschanged", () => {
        esVoiceCache = null;
      });
    } catch {
      // older engines: esVoice() re-scans per line anyway
    }
  }
  try {
    worker = new Worker(new URL("./voice.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<OutMsg>) => handleWorkerMessage(e.data);
    worker.onerror = (e: ErrorEvent) => {
      // Worker never loaded / ran (bad URL, MIME, module error) — say why.
      console.error("[voice] voice worker failed to load or run", e.message || "unknown");
      setStatus({ state: "error", progress: 0, fallback: true });
    };
    setStatus({ state: "loading", progress: 0, fallback: true });
    worker.postMessage({ op: "init" });
  } catch (err) {
    console.warn("[voice] no worker support, browser speech only", err);
    setStatus({ state: "error", progress: 0, fallback: true });
  }
}

/**
 * TTS cold-start fix (owner play-test 2): the model fetch used to begin only
 * when a mission frame mounted, so a player walking straight into the world
 * heard text-only pages and the generic browser voice on menus. Called at
 * world boot: starts the worker (model fetch begins immediately) and queues a
 * silent warm-up utterance so the FIRST kokoro generation — voice .bin fetch
 * included — happens the instant the model lands. The warm clip is never
 * played; the first real line already speaks via the browser voice meanwhile.
 */
export function warmVoice(): void {
  primeVoice();
  if (!worker || status.state === "error" || warmed) return;
  const id = ++speakId;
  warmIds.add(id);
  try {
    worker.postMessage({ op: "speak", id, text: "sí", voice: "ef_dora", speed: 1, pitch: 0 });
  } catch {
    warmIds.delete(id); // worker gone — the next real line warms instead
  }
}

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      ctx = new AudioContext();
      // A suspended context starts playing the moment any user tap resumes it;
      // the frame pages are always reached by a tap on the hub.
      const resume = () => {
        if (ctx && ctx.state === "suspended") void ctx.resume();
      };
      window.addEventListener("pointerdown", resume, { passive: true });
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function playAudio(audio: Float32Array, samplingRate: number, playbackRate = 1): void {
  const ac = audioContext();
  if (!ac) {
    // No AudioContext: nothing audible to wait for — release the flow.
    fireSpeechEnd();
    return;
  }
  try {
    const buffer = ac.createBuffer(1, audio.length, samplingRate);
    buffer.getChannelData(0).set(audio);
    const source = ac.createBufferSource();
    source.buffer = buffer;
    // pitch-shift playback (+n semitones = 2^(n/12)); the worker generated at
    // speed/r so the duration stays what the caller asked for
    if (playbackRate !== 1) source.playbackRate.value = playbackRate;
    source.connect(ac.destination);
    currentSource = source;
    source.onended = () => {
      if (currentSource === source) currentSource = null;
      fireSpeechEnd();
    };
    // Watchdog: a suspended AudioContext (no output device) never ends — never block the game.
    window.setTimeout(() => {
      if (currentSource === source) {
        try { source.stop(); } catch { /* already stopped */ }
        currentSource = null;
      }
      fireSpeechEnd();
    }, 5000 + audio.length / samplingRate * 1000 + 2000);
    // Audible from here: the world's '🔊 …' bubble can come down.
    setStatus({ generating: false, speaking: true });
    source.start();
  } catch {
    // audio is a bonus, never a blocker
    fireSpeechEnd();
  }
}

/** The device's Spanish speechSynthesis voice (re-scanned until one exists —
 * the list loads asynchronously on a first visit). */
let esVoiceCache: SpeechSynthesisVoice | null = null;
function esVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  if (esVoiceCache) return esVoiceCache;
  const es = window.speechSynthesis.getVoices().filter((v) => (v.lang || "").toLowerCase().startsWith("es"));
  if (!es.length) return null;
  // Prefer an actual Spanish-locale voice, deterministic across lines.
  esVoiceCache =
    es.find((v) => /^es[-_](es|mx|us|419)$/i.test(v.lang || "")) ??
    es.find((v) => /spanish|espa/i.test(v.name)) ??
    es[0];
  return esVoiceCache;
}

/** Instant browser-voice line while kokoro is un-warmed (cold start). Cast
 * pitch/rate are approximated cheaply (rate/pitch sliders). Returns whether
 * anything was actually queued. */
function speakFallback(text: string, slow: boolean, opts?: SpeakOpts): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "es-ES";
    const es = esVoice();
    if (es) utter.voice = es;
    // the fallback stays single-voice (brief): speed/pitch approximate the cast
    if (opts?.speed != null) {
      utter.rate = Math.max(0.5, Math.min(1.5, opts.speed * 0.95));
    } else {
      utter.rate = slow ? 0.6 : 0.92;
    }
    if (opts?.pitch) utter.pitch = Math.max(0.4, Math.min(1.6, 1 + opts.pitch / 12));
    let started = false;
    utter.onstart = () => {
      started = true;
      setStatus({ generating: false, speaking: true });
    };
    // Watchdog: some browsers (and headless runners) never fire onend/onerror —
    // speech is a bonus, never a blocker, so fire the callback anyway.
    utter.onend = fireSpeechEnd;
    utter.onerror = fireSpeechEnd;
    window.setTimeout(fireSpeechEnd, 4000 + text.length * 120);
    // Chrome can silently drop an utterance queued right after cancel() — the
    // exact cold-start symptom (page 1 spoke, page 2 text-only). If the engine
    // never started it, queue it once more (unless the line was stopped since).
    const epoch = voiceEpoch;
    synth.speak(utter);
    window.setTimeout(() => {
      if (!started && !synth.speaking && !synth.pending && voiceEpoch === epoch) {
        try {
          synth.speak(utter);
        } catch {
          // nothing more to try — the flow watchdog already released it
        }
      }
    }, 350);
    return true;
  } catch (err) {
    // speech is a bonus, never a blocker — but never silently: say what broke
    console.warn("[voice] speechSynthesis fallback failed", err);
    return false;
  }
}

/** Stop whatever the voice is saying (browser voice + any in-flight kokoro turn). */
export function stopSpeaking(): void {
  stopToken = speakId;
  voiceEpoch++;
  // Bookkeeping prune: turns at or below the stop token are cancelled — their
  // late audio is dropped anyway (see handleWorkerMessage).
  for (const id of warmIds) if (id <= stopToken) warmIds.delete(id);
  for (const id of fallbackIds) if (id <= stopToken) fallbackIds.delete(id);
  // Tell the worker to drop the queued turn(s): kokoro generates serialized at
  // ~real-time per line, so without this a stale page's generation kept the
  // pipeline busy and every later dialogue page arrived late or never.
  if (worker) {
    try {
      worker.postMessage({ op: "stop", id: speakId });
    } catch {
      // worker gone — nothing queued to cancel
    }
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
  if (currentSource) {
    try {
      currentSource.stop();
    } catch {
      // already ended
    }
    currentSource = null;
  }
  fireSpeechEnd();
}

/**
 * Speak Spanish with a per-character voice (brief: `speak` seam carries
 * voiceId+speed+pitch). Cold-start guarantee (owner play-test 2): while kokoro
 * is un-warmed — model downloading or first generation still pending — the
 * browser's Spanish voice speaks the line IMMEDIATELY (cast pitch/rate
 * approximated), and kokoro takes over the moment its first clip lands. Calls
 * after a stopSpeaking() are dropped.
 *
 * `opts` may be `true` (legacy "slow") and `onEnd` fires when the utterance
 * finishes (or is cut) — used for music ducking and sequential lines.
 */
export function speakSpanish(
  text: string,
  opts?: SpeakOpts | boolean,
  onEnd?: () => void,
): void {
  const o: SpeakOpts = typeof opts === "object" && opts !== null ? opts : { slow: opts === true };
  // castParams() hands over { voiceId, speed, pitch } — accept that shape too
  if (!o.voice && o.voiceId) o.voice = o.voiceId;
  stopSpeaking();
  const id = ++speakId;
  speechEndCb = onEnd ?? null;
  const kokoroNow = status.state === "ready" && worker != null && warmed;
  if (worker && status.state !== "error") {
    // Queue the line for kokoro in every healthy state: while the model is
    // still loading the turns no-op, and once loaded the newest line generates
    // immediately (warming the pipe and landing in the clip cache). Audio for
    // a browser-voiced line is dropped on arrival — nothing double-speaks.
    try {
      worker.postMessage({
        op: "speak",
        id,
        text,
        voice: o.voice ?? "ef_dora",
        speed: o.speed ?? 0.9,
        pitch: o.pitch ?? 0,
      });
    } catch {
      // worker gone — the browser voice covers this line
    }
  }
  if (kokoroNow) {
    setStatus({ generating: true, speaking: false });
    inflight = { text, slow: o.slow ?? false, opts: o };
    // Watchdog: if the worker never replies (stalled/offline model), release
    // the flow — speech is a bonus, never a blocker. Generous window covers
    // generation plus playback of a normal line.
    clearSpeakWatchdog();
    speakWatchdog = window.setTimeout(fireSpeechEnd, 9000 + text.length * 160);
    return;
  }
  // Un-warmed: never wait for it — the browser Spanish voice speaks now and
  // every later utterance gets kokoro as soon as its first clip arrives.
  if (worker && status.state !== "error") fallbackIds.add(id);
  setStatus({ generating: true }); // nothing audible yet: show the 🔊 bubble
  const spoke = speakFallback(text, o.slow ?? false, o);
  if (!spoke) {
    fallbackIds.delete(id);
    setStatus({ generating: false });
    fireSpeechEnd(); // nothing audible exists: release the flow immediately
  }
}
