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
};

type OutMsg =
  | { ev: "progress"; progress: number }
  | { ev: "ready" }
  | { ev: "error" }
  | { ev: "audio"; id: number; audio: Float32Array; samplingRate: number; playbackRate?: number }
  | { ev: "speakError"; id: number };

/** Per-character voice request (brief: voiceId in the worker protocol). */
export type SpeakOpts = {
  /** kokoro voice id, e.g. "ef_dora" / "em_alex" / "em_santa". */
  voice?: string;
  /** Audible rate: 1.05 = a touch fast, 0.85 = slow. */
  speed?: number;
  /** Pitch shift in semitones (+2 = child-bright, -3 = villain-deep). */
  pitch?: number;
  /** Legacy boolean: browser-fallback slower rate. */
  slow?: boolean;
};

let status: VoiceStatus = { state: "idle", progress: 0, fallback: false };
const listeners = new Set<() => void>();
let worker: Worker | null = null;
let workerStarted = false;
/** In-flight kokoro requests, dropped on stopSpeaking() like the queued turns. */
let speakId = 0;
let stopToken = 0;
let ctx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
/** Resolved when the current utterance's audio finishes (music ducking, page
 * flows). Fired once per speakSpanish call that produced audio. */
type EndCb = () => void;
let speechEndCb: EndCb | null = null;
/** Watchdog timer for the in-flight kokoro turn (see speakSpanish). */
let speakWatchdog: number | null = null;

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

function handleWorkerMessage(msg: OutMsg) {
  switch (msg.ev) {
    case "progress":
      setStatus({ state: "loading", progress: msg.progress, fallback: status.state !== "ready" });
      break;
    case "ready":
      setStatus({ state: "ready", progress: 1, fallback: false });
      break;
    case "error":
      setStatus({ state: "error", progress: 0, fallback: true });
      break;
    case "audio":
      // Audio arrived: the playback path now owns the end callback.
      if (msg.id > stopToken) {
        clearSpeakWatchdog();
        playAudio(msg.audio, msg.samplingRate, msg.playbackRate ?? 1);
      } else {
        fireSpeechEnd(); // dropped turn — nothing waits on it
      }
      break;
    case "speakError":
      // generation failed: nothing to wait for — release the flow (the browser
      // voice already spoke this turn while the model was loading, and if
      // kokoro was ready the worker retries on the next utterance)
      fireSpeechEnd();
      break;
  }
}

/** Start the voice worker (called from the hub, so the download is underway
 * before a frame even mounts; the pill shows its progress everywhere). */
export function primeVoice(): void {
  if (typeof window === "undefined") return;
  if (workerStarted) return;
  workerStarted = true;
  try {
    worker = new Worker(new URL("./voice.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<OutMsg>) => handleWorkerMessage(e.data);
    worker.onerror = () => setStatus({ state: "error", progress: 0, fallback: true });
    setStatus({ state: "loading", progress: 0, fallback: true });
    worker.postMessage({ op: "init" });
  } catch (err) {
    console.warn("[voice] no worker support, browser speech only", err);
    setStatus({ state: "error", progress: 0, fallback: true });
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
    source.start();
  } catch {
    // audio is a bonus, never a blocker
    fireSpeechEnd();
  }
}

function speakFallback(text: string, slow: boolean, opts?: SpeakOpts): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "es-ES";
    // the fallback stays single-voice (brief): speed/pitch approximate the cast
    if (opts?.speed != null) {
      utter.rate = Math.max(0.5, Math.min(1.5, opts.speed * 0.95));
    } else {
      utter.rate = slow ? 0.6 : 0.92;
    }
    if (opts?.pitch) utter.pitch = Math.max(0.4, Math.min(1.6, 1 + opts.pitch / 12));
    // Watchdog: some browsers (and headless runners) never fire onend/onerror —
    // speech is a bonus, never a blocker, so fire the callback anyway.
    utter.onend = fireSpeechEnd;
    utter.onerror = fireSpeechEnd;
    window.setTimeout(fireSpeechEnd, 4000 + text.length * 120);
    const es = window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith("es"));
    if (es) utter.voice = es;
    window.speechSynthesis.speak(utter);
  } catch {
    // speech is a bonus, never a blocker
  }
}

/** Stop whatever the voice is saying (browser voice + any in-flight kokoro turn). */
export function stopSpeaking(): void {
  stopToken = speakId;
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
 * voiceId+speed+pitch). kokoro (natural cast voice) once loaded;
 * speechSynthesis (es-ES, speed/pitch approximated) while the model is
 * downloading or if it failed. Calls after a stopSpeaking() are dropped.
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
  stopSpeaking();
  const id = ++speakId;
  speechEndCb = onEnd ?? null;
  if (status.state === "ready" && worker) {
    worker.postMessage({
      op: "speak",
      id,
      text,
      voice: o.voice ?? "ef_dora",
      speed: o.speed ?? 0.9,
      pitch: o.pitch ?? 0,
    });
    // Watchdog: if the worker never replies (stalled/offline model), release
    // the flow — speech is a bonus, never a blocker. Generous window covers
    // generation plus playback of a normal line.
    clearSpeakWatchdog();
    speakWatchdog = window.setTimeout(fireSpeechEnd, 9000 + text.length * 160);
    return;
  }
  // Not ready yet: never wait for it — the browser voice speaks now and the
  // next utterances get kokoro as soon as the worker reports ready.
  speakFallback(text, o.slow ?? false, o);
}
