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
 *
 * INSTANT-FIRST (owner P0, 2026-11-11): EVERY line is spoken by the device's
 * Spanish voice immediately — kokoro never gates audibility. kokoro only
 * SUBSTITUTES a clip that is already cached (the worker probes IndexedDB
 * before its generation queue) or one that completes inside a bounded window
 * (SUBSTITUTE_WINDOW_MS); after the window the device voice owns the line and
 * a late clip is dropped, never double-spoken. No UI waits on speech end:
 * every onEnd chain runs under watchdogs, and end callbacks are sequence-
 * guarded so a stale end from a replaced line can never cut the current one.
 * See voice.worker.ts for the other half.
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
/** Monotonic line sequence, bumped at the TOP of every speakSpanish. Every
 * watchdog, utterance handler and audio-source handler captures the seq it
 * belongs to and compares before firing — a stale end from a replaced line
 * can never fire the CURRENT line's callback (or cut a chain mid-flight). */
let lineSeq = 0;
/** Instant-first substitution window (owner P0): a kokoro clip replaces the
 * speaking device voice only if it is already cached or lands within this
 * bound; after it, the device voice owns the line and the late clip is
 * dropped. 2.5 s: shorter than the ~real-time synthesis of any sentence,
 * long enough to catch word-length lines and cache hits. */
const SUBSTITUTE_WINDOW_MS = 2500;
/** Ids whose kokoro clip may still substitute the (already speaking) device
 * voice. Expiry moves the id to fallbackIds. */
const substIds = new Set<number>();
/** The utterance the device voice is speaking right now. Substitution detaches
 * its end handlers BEFORE cancelling — synth.cancel() would otherwise fire
 * onend and cut the onEnd chain before the natural clip even starts. */
let activeUtter: SpeechSynthesisUtterance | null = null;
/** True once the current line handed over to kokoro (device voice cancelled). */
let substDone = false;
/** True once the device voice accepted the current line — kokoro failures then
 * never re-speak it (no double voice); the flow watchdog owns the release. */
let deviceSpeaking = false;
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
/** Voices meter through their own gain node (audio settings panel "Voces").
 * Every kokoro clip routes voiceGain -> destination; the browser-fallback
 * utterances set utter.volume from the same value. 0–1, default 1. */
let voiceGain: GainNode | null = null;
let voiceVol = 1;
let currentSource: AudioBufferSourceNode | null = null;
/** Resolved when the current utterance's audio finishes (music ducking, page
 * flows). Fired once per speakSpanish call that produced audio. */
type EndCb = () => void;
let speechEndCb: EndCb | null = null;
/** Watchdog for the voiceless-device path (kokoro is the line's only voice). */
let speakWatchdog: number | null = null;
/** Flow watchdog for browser-fallback lines (speakFallback) — re-armed with
 * every auto-rescue attempt so the flow waits for audio to actually start. */
let flowWatchdog: number | null = null;
/** Substitution-window timer: flips the id from substIds to fallbackIds. */
let substTimer: number | null = null;

function clearSpeakWatchdog(): void {
  if (speakWatchdog != null) {
    window.clearTimeout(speakWatchdog);
    speakWatchdog = null;
  }
  if (flowWatchdog != null) {
    window.clearTimeout(flowWatchdog);
    flowWatchdog = null;
  }
  if (substTimer != null) {
    window.clearTimeout(substTimer);
    substTimer = null;
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
  activeUtter = null;
  substDone = false;
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
        if (substIds.delete(msg.id)) {
          // Instant-first substitution: the clip was cached or landed inside
          // the bounded window — the natural voice takes the line over from
          // the (already speaking) device voice.
          substituteClip(msg.audio, msg.samplingRate, msg.playbackRate ?? 1);
        } else {
          playAudio(msg.audio, msg.samplingRate, msg.playbackRate ?? 1);
        }
      }
      break;
    }
    case "speakError":
      // generation failed: instant-first means the device voice already
      // carries (or already carried) the line — never re-speak it. Only the
      // voiceless-device lines (kokoro was their only voice) are released
      // here; everything else is held by its own flow watchdog.
      console.error(
        "[voice] kokoro line failed — the device voice carries the line",
        msg.reason ?? "generation",
      );
      substIds.delete(msg.id);
      fallbackIds.add(msg.id);
      if (msg.id === speakId && !deviceSpeaking) {
        clearSpeakWatchdog();
        fireSpeechEnd(); // nothing audible exists or is coming: release the flow
      }
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
      // Voices get their own gain path (audio settings panel — "Voces").
      voiceGain = ctx.createGain();
      voiceGain.gain.value = voiceVol;
      voiceGain.connect(ctx.destination);
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
  const seq = lineSeq;
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
    source.connect(voiceGain ?? ac.destination);
    currentSource = source;
    source.onended = () => {
      if (currentSource === source) currentSource = null;
      // seq guard: a stale source end (line already replaced) must never fire
      // the CURRENT line's callback.
      if (seq === lineSeq) fireSpeechEnd();
    };
    // Watchdog: a suspended AudioContext (no output device) never ends — never block the game.
    window.setTimeout(() => {
      if (currentSource === source) {
        try { source.stop(); } catch { /* already stopped */ }
        currentSource = null;
      }
      if (seq === lineSeq) fireSpeechEnd();
    }, 5000 + audio.length / samplingRate * 1000 + 2000);
    // Audible from here: the world's '🔊 …' bubble can come down.
    setStatus({ generating: false, speaking: true });
    source.start();
  } catch {
    // audio is a bonus, never a blocker
    fireSpeechEnd();
  }
}

/**
 * Instant-first substitution (owner P0): the kokoro clip — cached, or
 * generated within SUBSTITUTE_WINDOW_MS — replaces the device voice mid-line.
 * The utterance's end handlers are detached BEFORE the cancel so synth.cancel()
 * can never fire onend and cut the onEnd chain ahead of the clip.
 */
function substituteClip(audio: Float32Array, samplingRate: number, playbackRate: number): void {
  const u = activeUtter;
  if (u) {
    u.onend = null;
    u.onerror = null;
  }
  activeUtter = null;
  substDone = true;
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
  playAudio(audio, samplingRate, playbackRate);
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
 * speed/pitch are mapped onto rate/pitch (widened, clamped) so one device
 * voice still sounds per-character. Returns whether anything was actually
 * queued.
 *
 * NO DROPPED LINES (owner play-test 4): Chrome can silently drop an utterance
 * queued right after cancel(), and the very first lines of a session race the
 * async voice-list load — the owner heard a silent first attempt and only the
 * 🔊 re-speak rescued it. So the queue arms AUTO-RESCUES: while nothing has
 * become audible and the engine has nothing queued, the line is re-queued
 * (fresh utterance, voice list re-scanned) at 350 ms / 1.5 s / 3.5 s — the same
 * call the 🔊 button makes. The flow watchdog re-arms with every attempt so
 * the page waits for AUDIO START, but speech stays a bonus: if the engine
 * truly cannot speak, the watchdog still releases the game. */
function speakFallback(text: string, slow: boolean, opts?: SpeakOpts): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const epoch = voiceEpoch;
    const seq = lineSeq;
    let started = false;
    // (Re)queue the line: a FRESH utterance each time — engines sometimes
    // refuse a re-used one after cancel(). `speaking`/`pending` guards stop a
    // rescue from stacking on top of an attempt that did start.
    const queue = () => {
      if (seq !== lineSeq) return; // this line was already replaced
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "es-ES";
      const es = esVoice();
      if (es) utter.voice = es;
      // The fallback voice rides the same "Voces" slider as kokoro clips.
      utter.volume = voiceVol;
      // ONE device voice, so per-character distinction rides entirely on the
      // cast table's speed/pitch (owner defect 2026-11-11: every character
      // sounded identical). WIDENED around 1.0 so the semitone/pace deltas are
      // audible, then clamped to learner-intelligible ranges (rate 0.5–1.4,
      // pitch 0.5–1.5; the Web Speech spec allows far more).
      if (opts?.speed != null) {
        utter.rate = Math.max(0.5, Math.min(1.4, 1 + (opts.speed - 1) * 2));
      } else {
        utter.rate = slow ? 0.6 : 0.92;
      }
      if (opts?.pitch != null) {
        utter.pitch = Math.max(0.5, Math.min(1.5, 1 + opts.pitch * 0.12));
      }
      utter.onstart = () => {
        if (seq !== lineSeq) return;
        started = true;
        setStatus({ generating: false, speaking: true });
      };
      const utterEnd = () => {
        // seq guard: a stale end (line replaced / cancelled) never fires the
        // current line's callback — that is what froze the owner's screens.
        if (seq !== lineSeq) return;
        if (activeUtter === utter) activeUtter = null;
        fireSpeechEnd();
      };
      // Watchdog: some browsers (and headless runners) never fire onend/onerror —
      // speech is a bonus, never a blocker, so fire the callback anyway.
      utter.onend = utterEnd;
      utter.onerror = utterEnd;
      activeUtter = utter;
      try {
        synth.speak(utter);
      } catch {
        // nothing more to try — the flow watchdog already releases it
      }
    };
    const armFlowWatchdog = () => {
      if (flowWatchdog != null) window.clearTimeout(flowWatchdog);
      flowWatchdog = window.setTimeout(() => {
        if (seq === lineSeq) fireSpeechEnd();
      }, 4000 + text.length * 120);
    };
    const rescue = () => {
      if (seq !== lineSeq || substDone || started || voiceEpoch !== epoch) return;
      if (synth.speaking || synth.pending) return;
      queue(); // auto-rescue: exactly what the 🔊 re-speak button does
      armFlowWatchdog();
    };
    queue();
    armFlowWatchdog();
    window.setTimeout(rescue, 350);
    window.setTimeout(rescue, 1500);
    window.setTimeout(rescue, 3500);
    return true;
  } catch (err) {
    // speech is a bonus, never a blocker — but never silently: say what broke
    console.warn("[voice] speechSynthesis fallback failed", err);
    return false;
  }
}

/** Audio settings panel ("Voces"): set the voice gain (0–1). Meters BOTH the
 * kokoro clip path (voiceGain) and the browser-fallback utterances. */
export function setVoiceVolume(v: number): void {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(v) ? v : 1));
  voiceVol = clamped;
  if (voiceGain && ctx) {
    voiceGain.gain.value = clamped;
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
  for (const id of substIds) if (id <= stopToken) substIds.delete(id);
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
  // The cancelled utterance's onend goes stale (seq guard) — drop the handle.
  activeUtter = null;
  substDone = false;
  fireSpeechEnd();
}

/**
 * Speak Spanish with a per-character voice (brief: `speak` seam carries
 * voiceId+speed+pitch). INSTANT-FIRST (owner P0, 2026-11-11): the device's
 * Spanish voice speaks EVERY line immediately — kokoro never gates audibility
 * and no UI ever waits on speech end (every onEnd runs under a watchdog, and
 * end callbacks are sequence-guarded so a replaced line's late end cannot cut
 * the current chain). kokoro's natural voice only SUBSTITUTES the speaking
 * device voice when its clip is already cached (the worker probes IndexedDB
 * before the generation queue) or completes within SUBSTITUTE_WINDOW_MS; after
 * the window the clip is dropped, never double-spoken. Calls after a
 * stopSpeaking() are dropped.
 *
 * `opts` may be `true` (legacy "slow") and `onEnd` fires when the line finishes
 * (or is cut) — used for music ducking and sequential lines.
 */
export function speakSpanish(
  text: string,
  opts?: SpeakOpts | boolean,
  onEnd?: () => void,
): void {
  const o: SpeakOpts = typeof opts === "object" && opts !== null ? opts : { slow: opts === true };
  // castParams() hands over { voiceId, speed, pitch } — accept that shape too
  if (!o.voice && o.voiceId) o.voice = o.voiceId;
  // Sequence FIRST: every handler/watchdog of the previous line goes stale the
  // moment this line begins — a late end can never fire the new chain's slot.
  lineSeq++;
  const seq = lineSeq;
  stopSpeaking();
  substDone = false;
  deviceSpeaking = false;
  const id = ++speakId;
  speechEndCb = onEnd ?? null;
  // 1) INSTANT: the device Spanish voice speaks the line now. Watchdogs
  // (flowWatchdog + utter.onend, both seq-guarded) own the release.
  const spoke = speakFallback(text, o.slow ?? false, o);
  deviceSpeaking = spoke;
  if (!spoke) {
    // No device voice exists: kokoro audio (when the worker is healthy) is
    // this line's ONLY voice — queue it and bound the wait with a watchdog.
    if (worker && status.state !== "error") {
      setStatus({ generating: true }); // nothing audible yet: show the 🔊 bubble
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
        setStatus({ generating: false });
        fireSpeechEnd(); // worker gone, no device voice: release immediately
        return;
      }
      clearSpeakWatchdog();
      speakWatchdog = window.setTimeout(() => {
        if (seq === lineSeq) fireSpeechEnd();
      }, 9000 + text.length * 160);
      return;
    }
    setStatus({ generating: false });
    fireSpeechEnd(); // nothing audible exists: release the flow immediately
    return;
  }
  // 2) kokoro SUBSTITUTION — never a wait: only a clip already cached (the
  // worker probes the cache before its generation queue) or one that completes
  // within the bounded window replaces the speaking device voice. After the
  // window the id flips to fallbackIds and any late clip is dropped.
  if (worker && status.state !== "error") {
    substIds.add(id);
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
      substIds.delete(id); // worker gone — the device voice already spoke it
    }
    clearSpeakWatchdog();
    substTimer = window.setTimeout(() => {
      if (seq !== lineSeq) return;
      if (substIds.delete(id)) fallbackIds.add(id);
    }, SUBSTITUTE_WINDOW_MS);
  }
}
