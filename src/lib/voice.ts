/**
 * Palabra's live speech: the DEVICE's Spanish voice (speechSynthesis), only.
 *
 * DEVICE-ONLY RULING (owner P0, 2026-11-12): the kokoro worker is not started
 * at all in this build — no engine, no substitution, no warm fetch, no engine
 * wait, no 86 MB model download. Evidence: three owner sessions had silent
 * dialogue on the PUBLISHED site while every rig (which blocked the kokoro
 * CDNs) was audible — the substitution path cancelled the audible device line
 * when a clip landed and the replacement never sounded. Every line is now
 * exactly ONE speechSynthesis.speak, instant. When the Chatterbox pre-generated
 * cast lands, it returns as plain cached <audio> clips — a separate, simple
 * path — never as live synthesis.
 *
 * Per-character voice SELECTION (owner defect 820bc93: every character sounded
 * identical): on voiceschanged (and at first speak) the device's es* voices are
 * enumerated and assigned to the cast rows deterministically — stable sort by
 * voice name, narrator gets the first, then round-robin — remembered for the
 * session. With ≥2 Spanish voices the cast speaks in distinct voices; with one
 * es voice the landed rate/pitch mapping (c1d84d2) keeps the characters apart.
 *
 * NO DROPPED LINES (owner play-test 4): Chrome can silently drop an utterance
 * queued right after cancel(), and the first lines race the async voice-list
 * load — the queue arms AUTO-RESCUES at 350 ms / 1.5 s / 3.5 s while nothing
 * has become audible (the same call the 🔊 re-speak button makes). A STARTED
 * utterance always runs to its end: NOTHING replaces or cancels a line because
 * a clip arrived (there is no clip path); only an explicit stop — stopSpeaking
 * from the user/scene, or the next line replacing this one — cancels speech.
 *
 * Boot speech self-test: a silent-level probe utterance after boot / first
 * user gesture; if onstart never fires within 3 s, a visible status pill says
 * the voice is unavailable, and the game stays fully playable.
 */

import { useSyncExternalStore } from "react";
import type { VoiceKey } from "./voiceCast";

export type VoiceState = "idle" | "loading" | "ready" | "error" | "unavailable";
export type VoiceStatus = {
  state: VoiceState;
  /** Always 0 — the one-time model download is gone with the engine. */
  progress: number;
  /** True while the device voice is the only speech (always, in this build). */
  fallback: boolean;
  /** True while a line was requested and nothing is audible yet. */
  generating: boolean;
  /** True while something is audibly speaking. */
  speaking: boolean;
};

/** Per-character voice request (brief: `speak` seam carries key+speed+pitch). */
export type SpeakOpts = {
  /** Cast key (voiceCast.ts row) — selects the device voice assigned to the
   * character when the device offers ≥2 es voices. */
  key?: string;
  /** Legacy kokoro voice id — dormant: accepted, never used in this build. */
  voice?: string;
  /** Cast-table shape (castParams() returns { voiceId, ... }). */
  voiceId?: string;
  /** Audible rate: 1.05 = a touch fast, 0.85 = slow. */
  speed?: number;
  /** Pitch shift in semitones (+2 = child-bright, -3 = villain-deep). */
  pitch?: number;
  /** Legacy boolean: slower rate. */
  slow?: boolean;
};

let status: VoiceStatus = { state: "idle", progress: 0, fallback: false, generating: false, speaking: false };
const listeners = new Set<() => void>();
/** Bumped on every stopSpeaking: rescue timers compare against it so a
 * cancelled line is never re-spoken. */
let voiceEpoch = 0;
/** Monotonic line sequence, bumped at the TOP of every speakSpanish. Every
 * handler captures the seq it belongs to and compares before firing — a stale
 * end from a replaced line can never fire the CURRENT line's callback. */
let lineSeq = 0;
/** The utterance the device voice is speaking right now. */
let activeUtter: SpeechSynthesisUtterance | null = null;
let voiceVol = 1;
/** Resolved when the current utterance's audio finishes (music ducking, page
 * flows). Fired once per speakSpanish call. */
type EndCb = () => void;
let speechEndCb: EndCb | null = null;
/** Flow watchdog for device-voice lines — re-armed with every auto-rescue
 * attempt so the flow waits for audio to actually start. */
let flowWatchdog: number | null = null;

function clearFlowWatchdog(): void {
  if (flowWatchdog != null) {
    window.clearTimeout(flowWatchdog);
    flowWatchdog = null;
  }
}

/**
 * Fire the pending end callback exactly once and drop any watchdog.
 * Speech is a bonus, never a blocker: every path that could leave a flow
 * waiting (round transitions, dialogue pages) must end here.
 */
function fireSpeechEnd(): void {
  clearFlowWatchdog();
  if (status.speaking || status.generating) setStatus({ speaking: false, generating: false });
  activeUtter = null;
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

/** React hook: live voice state for the status pill. */
export function useVoiceStatus(): VoiceStatus {
  return useSyncExternalStore(subscribe, getSnapshot, () => status);
}

export type VoicePhase = "generating" | "speaking" | "idle";

/** What the voice is doing RIGHT NOW, for the world's '🔊 …' bubble. */
export function voicePhase(): VoicePhase {
  if (status.speaking) return "speaking";
  if (status.generating) return "generating";
  return "idle";
}

/** Subscribe to voice-phase ticks (compare before acting). */
export function onVoicePhase(cb: (phase: VoicePhase) => void): () => void {
  const wrapped = () => cb(voicePhase());
  listeners.add(wrapped);
  return () => {
    listeners.delete(wrapped);
  };
}

// ── Per-character device-voice selection ─────────────────────────────────────

/** Cast order for voice assignment: narrator first (the storyteller anchor),
 * then round-robin the rest. hero/heroine intentionally share cast params but
 * MAY land different voices — the boy/girl pilgrim split. */
const CAST_ORDER: VoiceKey[] = [
  "narrator",
  "hero",
  "heroine",
  "child",
  "elder",
  "villagerM",
  "villagerF",
  "scripture",
  "villain",
];

/** Session voice map: cast key → device es voice. Deterministic (stable sort
 * by voice name, narrator first, then round-robin). Null when the device
 * offers fewer than 2 es voices — the rate/pitch mapping alone differentiates. */
let voiceMap: Partial<Record<VoiceKey, SpeechSynthesisVoice>> | null = null;

function buildVoiceMap(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    voiceMap = null;
    return;
  }
  const es = window.speechSynthesis
    .getVoices()
    .filter((v) => (v.lang || "").toLowerCase().startsWith("es"));
  if (es.length < 2) {
    voiceMap = null;
    return;
  }
  const sorted = [...es].sort((a, b) => a.name.localeCompare(b.name));
  const map: Partial<Record<VoiceKey, SpeechSynthesisVoice>> = {};
  CAST_ORDER.forEach((key, i) => {
    map[key] = sorted[i % sorted.length];
  });
  voiceMap = map;
}

/** The device's base Spanish voice (re-scanned until one exists — the list
 * loads asynchronously on a first visit). Used for un-keyed lines and when the
 * device has a single es voice. */
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

// ── Boot speech self-test ────────────────────────────────────────────────────

let selfTestArmed = false;
/** True once ANY utterance started (probe or real line) — the device can speak. */
let speechProven = false;
let selfTestTimer: number | null = null;
let gestureProbeArmed = false;

function markSpeechProven(): void {
  speechProven = true;
  if (selfTestTimer != null) {
    window.clearTimeout(selfTestTimer);
    selfTestTimer = null;
  }
  if (status.state === "unavailable") setStatus({ state: "idle" });
}

/** Silent-level probe utterance: if onstart never fires within 3 s the device
 * cannot (or is not allowed to) speak — show the visible status pill and keep
 * the game fully playable. */
function runSpeechSelfTest(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  try {
    const probe = new SpeechSynthesisUtterance(" ");
    probe.lang = "es-ES";
    const es = esVoice();
    if (es) probe.voice = es;
    probe.volume = 0; // silent-level: the probe is never heard
    probe.onstart = () => markSpeechProven();
    synth.speak(probe);
  } catch {
    // the timer below decides from the engine's own state
  }
  if (selfTestTimer != null) window.clearTimeout(selfTestTimer);
  selfTestTimer = window.setTimeout(() => {
    selfTestTimer = null;
    // A line already proved speech, a real line is in flight (its onstart will
    // prove it), or the engine still holds audio — none of these is a
    // voiceless device. Only a truly silent engine gets the pill.
    if (speechProven || speechEndCb != null || synth.speaking || synth.pending) return;
    setStatus({ state: "unavailable" });
  }, 3000);
}

/** Voice priming — device-voice only: registers the voiceschanged listener
 * (voice list + per-character map rebuild) and runs the boot speech self-test.
 * NO worker is started; the model download is gone with the engine. */
export function primeVoice(): void {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.addEventListener("voiceschanged", () => {
      esVoiceCache = null;
      voiceMap = null;
      if (!speechProven) runSpeechSelfTest();
    });
  } catch {
    // older engines: esVoice()/buildVoiceMap() re-scan per line anyway
  }
  // After first user gesture (or boot): re-probe once — some engines only
  // allow speech after a gesture, and the voice list lands asynchronously.
  if (!gestureProbeArmed) {
    gestureProbeArmed = true;
    const onGesture = () => {
      window.removeEventListener("pointerdown", onGesture);
      if (!speechProven) runSpeechSelfTest();
    };
    window.addEventListener("pointerdown", onGesture, { passive: true, once: true });
  }
  if (!selfTestArmed) {
    selfTestArmed = true;
    runSpeechSelfTest();
  }
}

/**
 * Legacy warm-up call — device-voice only: the engine warm-up is GONE (the
 * worker never starts, nothing is fetched). Kept for the world-boot call site:
 * it arms the voice list listener and the boot self-test instead.
 */
export function warmVoice(): void {
  primeVoice();
}

// ── Speaking ─────────────────────────────────────────────────────────────────

/** Device-voice line: EVERY line in this build. Cast speed/pitch are mapped
 * onto rate/pitch (widened, clamped — c1d84d2) and the cast key picks the
 * character's assigned device voice when the map exists. Returns whether
 * anything was actually queued. */
function speakDevice(text: string, slow: boolean, opts?: SpeakOpts): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  try {
    const synth = window.speechSynthesis;
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
      // Per-character voice SELECTION: the cast key picks the assigned device
      // voice; un-keyed lines (and single-voice devices) ride the base voice.
      if (!voiceMap) buildVoiceMap();
      const mapped = (voiceMap && opts?.key ? voiceMap[opts.key as VoiceKey] : undefined) ?? esVoice();
      if (mapped) utter.voice = mapped;
      // Device volume governs — the "Voces" slider stores its value for the
      // future clip path and scales the device voice NOT at all (ruling).
      // ONE device voice per cast row's fallback, so per-character distinction
      // rides on the cast table's speed/pitch (owner defect 2026-11-11).
      // WIDENED around 1.0 so the semitone/pace deltas are audible, then
      // clamped to learner-intelligible ranges (rate 0.5–1.4, pitch 0.5–1.5).
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
        markSpeechProven();
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
      if (seq !== lineSeq || started || voiceEpoch !== epoch) return;
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
    console.warn("[voice] speechSynthesis line failed", err);
    return false;
  }
}

/** Audio settings panel ("Voces"): store the voice gain (0–1). In this build
 * it scales NOTHING live (device volume governs the device voice); the value
 * is stored so the future pre-generated clip path inherits it. */
export function setVoiceVolume(v: number): void {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(v) ? v : 1));
  voiceVol = clamped;
}

/** Read back the stored voices slider value (the future clip path's gain). */
export function getVoiceVolume(): number {
  return voiceVol;
}

/** Stop whatever the voice is saying — the ONE cancel: explicit user/scene
 * stop, or the next line replacing this one. A started utterance otherwise
 * always runs to its end; no clip can ever replace it (there is no engine). */
export function stopSpeaking(): void {
  voiceEpoch++;
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
  // The cancelled utterance's onend goes stale (seq guard) — drop the handle.
  activeUtter = null;
  fireSpeechEnd();
}

/**
 * Speak Spanish with a per-character voice. DEVICE-VOICE ONLY (owner P0,
 * 2026-11-12): every line is exactly ONE speechSynthesis.speak, instant — no
 * worker start, no substitution window, no cache probe, nothing can cancel a
 * started line but an explicit stop. The device's Spanish voice speaks every
 * line immediately and no UI ever waits on speech end (every onEnd runs under
 * the flow watchdog, and end callbacks are sequence-guarded so a replaced
 * line's late end cannot cut the current chain). Calls after a stopSpeaking()
 * are dropped by the rescue guards.
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
  // Sequence FIRST: every handler/watchdog of the previous line goes stale the
  // moment this line begins — a late end can never fire the new chain's slot.
  lineSeq++;
  stopSpeaking();
  speechEndCb = onEnd ?? null;
  // ONE path: the device Spanish voice speaks the line now. The flow watchdog
  // + utter.onend (both seq-guarded) own the release.
  const spoke = speakDevice(text, o.slow ?? false, o);
  if (!spoke) {
    // No device speech is possible: release the flow immediately — the game
    // never waits on speech.
    setStatus({ generating: false });
    fireSpeechEnd();
  }
}
