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
 * Boot speech self-test: a silent-level probe utterance at boot (never
 * claims — pre-gesture probes false-fail), re-probed on the FIRST user
 * gesture; only the post-gesture probe may show the visible "unavailable"
 * pill, and never once any utterance has started. The game stays fully
 * playable either way.
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

// ── Pre-generated clip cast (phase 1, owner directive 2026-11-12) ────────────
//
// The owner's device has NO usable Spanish speechSynthesis voice (device
// capability limit) but audio PLAYBACK works — so the fixed Spanish corpus is
// pre-generated server-side (scripts/gen-voice-clips.ts, kokoro per cast row)
// and shipped as public/voice-clips/<voiceKey>/<hash>.mp3 + manifest.json.
// Before any device speak, the manifest is consulted: a HIT plays the clip
// through one <audio> element INSTANTLY — no TTS, no wait; the caller's onEnd
// fires at clip end, so music ducking and page flows work unchanged. A MISS
// rides the device voice exactly as before (byte-for-byte the old path).
// One clip at a time: a new line replaces the old (the ONE cancel semantics —
// stopSpeaking or the next line are still the only things that cut a line).

const CLIP_MANIFEST_URL = "/voice-clips/manifest.json";
type ClipManifest = { clips?: Record<string, Record<string, string>> };
let clipManifest: ClipManifest | null = null;
let clipManifestState: "idle" | "loading" | "ready" | "failed" = "idle";
let clipEl: HTMLAudioElement | null = null;
/** Boot-time autoplay denial stashes the line here; the first user gesture
 * retries it (the world's intro speaks before any tap exists). */
let clipPending: { text: string; src: string; opts: SpeakOpts; seq: number; epoch: number } | null = null;
/** ONE CLIP = ONE CONTIGUOUS PLAYBACK (owner play-test: intro CHOPPY, Pip page
 * 1 garbled): a line that arrives while a clip is mid-play WAITS here instead
 * of chopping the playing line mid-sentence. Latest-wins slot (≤1): a newer
 * line replaces the queued one (the screen already moved on); the replaced
 * line's flow callback fires immediately so nothing hangs. stopSpeaking
 * flushes (an explicit stop cancels the wait). */
let clipQueued: { text: string; opts: SpeakOpts; onEnd?: () => void } | null = null;

/** QA counter — window.__palabraClips (live object, drive-readable). */
export const clipStats = { hits: 0, misses: 0, notReady: 0, fallbacks: 0, errors: 0 };

/** QA verbatim-audio log (only when a rig sets window.__palabraQA): every
 * speak() request with its resolved clip, every clip start/stop/drop — the
 * drive diffs requested text vs the manifest text of the played file. */
type QaSpeakEntry = { n: number; text: string; key?: string; clip: string | null; at: number };
type QaAudioEntry = { n: number; ev: string; file?: string; at: number };
function qaLog<T>(slot: "__palabraSpeak" | "__palabraAudio", entry: T): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as Record<string, unknown>;
  if (!w.__palabraQA) return;
  const arr = (w[slot] as T[]) ?? (w[slot] = []);
  arr.push(entry);
}
function qaSpeak(text: string, key: string | undefined, clip: string | null, n: number): void {
  qaLog<QaSpeakEntry>("__palabraSpeak", { n, text, key, clip, at: Date.now() % 1e7 });
}
function qaAudio(n: number, ev: string, file?: string): void {
  qaLog<QaAudioEntry>("__palabraAudio", { n, ev, file, at: Date.now() % 1e7 });
}

function loadClips(): void {
  if (typeof window === "undefined" || clipManifestState !== "idle") return;
  clipManifestState = "loading";
  window
    .fetch(CLIP_MANIFEST_URL)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then((m: ClipManifest) => {
      if (m && m.clips) {
        clipManifest = m;
        clipManifestState = "ready";
        listeners.forEach((l) => l());
        void integrityCheck(m); // async — never blocks the first clip
      } else {
        clipManifestState = "failed";
      }
    })
    .catch(() => {
      clipManifestState = "failed"; // no manifest → every line stays device-voice
    });
}

/** INIT ASSERTION (verbatim integrity): every manifest entry must round-trip —
 * the filename stem is exactly sha1(text + "\u0000" + voiceKey). A mismatched
 * entry would play a DIFFERENT line's audio, so a bad manifest fails loudly
 * here instead of silently misspeaking. Web Crypto, async, no fetches. */
async function integrityCheck(m: ClipManifest): Promise<void> {
  const stats = clipStats as typeof clipStats & { integrity?: { entries: number; bad: number; ok: boolean } };
  const enc = new TextEncoder();
  let entries = 0;
  let bad = 0;
  for (const [voice, bucket] of Object.entries(m.clips ?? {})) {
    for (const [text, file] of Object.entries(bucket)) {
      entries++;
      try {
        const digest = await crypto.subtle.digest("SHA-1", enc.encode(text + "\u0000" + voice));
        const want = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
        if (file !== `${voice}/${want}.mp3` || !text.trim()) {
          bad++;
          console.warn("[voice] manifest round-trip FAIL:", voice, JSON.stringify(text.slice(0, 60)), file);
        }
      } catch {
        bad++;
        console.warn("[voice] manifest round-trip unreachable (no WebCrypto):", voice, file);
        break;
      }
    }
  }
  stats.integrity = { entries, bad, ok: bad === 0 && entries > 0 };
  if (stats.integrity.ok) console.info(`[voice] clip manifest verified: ${entries} entries round-trip clean`);
}

/** The clip for this EXACT text under this cast key, or null (device voice). */
function clipFor(text: string, key?: string): string | null {
  const m = clipManifest;
  if (!m || !m.clips) {
    if (clipManifestState === "loading") clipStats.notReady++;
    else clipStats.misses++;
    return null;
  }
  const bucket = m.clips[key ?? "narrator"];
  const hit = bucket ? bucket[text] : undefined;
  if (hit) {
    clipStats.hits++;
    return "/voice-clips/" + hit;
  }
  clipStats.misses++;
  return null;
}

/** A clip is audibly mid-play RIGHT NOW (never counts a stashed/denied line). */
function clipBusy(): boolean {
  return !!(status.speaking && clipEl && !clipEl.paused && clipEl.src);
}

/** Deliver the queued line once the current clip has played start→end. */
function deliverQueued(): void {
  const q = clipQueued;
  if (!q) return;
  clipQueued = null;
  speakSpanish(q.text, q.opts, q.onEnd);
}

/** Play one pre-generated clip. Instant: the file starts as soon as the
 * browser hands it over; no synthesis, no substitution window.
 * SINGLE-FLIGHT: stop-before-play — any element reused here is paused and
 * stripped of handlers FIRST, so a stale end of the previous line can never
 * interleave with this one, and two clips can never overlap.
 * CONTIGUOUS (owner choppy fix): a started clip runs start→end — a blocked
 * element restarts FROM 0 (never resumes mid-buffer), a failing element
 * retries from 0 (bounded) and NEVER degrades to the device voice. */
function playClip(text: string, src: string, o: SpeakOpts): void {
  const seq = lineSeq;
  const epoch = voiceEpoch;
  qaAudio(seq, "start", src.slice(src.indexOf("voice-clips")));
  if (!clipEl) clipEl = new Audio();
  const el = clipEl;
  let retries = 0;
  // stop-before-play: the element may still carry the previous line (paused
  // or mid-flight) — silence it and detach its handlers before reusing.
  try {
    el.pause();
  } catch {
    // ignore
  }
  el.onended = null;
  el.onerror = null;
  el.onloadedmetadata = null;
  const finish = () => {
    window.clearTimeout(flowWatch);
    if (seq !== lineSeq || epoch !== voiceEpoch) return;
    qaAudio(seq, "end");
    fireSpeechEnd();
    deliverQueued();
  };
  let flowWatch = window.setTimeout(() => {
    if (seq === lineSeq && epoch === voiceEpoch) {
      qaAudio(seq, "watchdog");
      fireSpeechEnd();
    }
  }, 4000 + text.length * 120);
  // Once the file's real duration is known, the flow waits for the WHOLE clip
  // (bounded) — a long clip must not be cut mid-sentence by the next page.
  el.onloadedmetadata = () => {
    if (seq !== lineSeq || epoch !== voiceEpoch) return;
    const ms = Math.min(30000, Math.round((el.duration || 0) * 1300) + 800);
    if (ms > 4000 + text.length * 120) {
      window.clearTimeout(flowWatch);
      flowWatch = window.setTimeout(() => {
        if (seq === lineSeq && epoch === voiceEpoch) {
          qaAudio(seq, "watchdog");
          fireSpeechEnd();
        }
      }, ms);
    }
  };
  const rearmWatch = () => {
    window.clearTimeout(flowWatch);
    flowWatch = window.setTimeout(() => {
      if (seq === lineSeq && epoch === voiceEpoch) {
        qaAudio(seq, "watchdog");
        fireSpeechEnd();
      }
    }, 4000 + text.length * 120);
  };
  // A failing clip retries FROM 0 — the resolved corpus line never degrades
  // to a device voice (the owner's device has none; a garbage fallback would
  // be silence at best). Bounded: two retries, then the line ends silently.
  const retryFromZero = (why: string) => {
    window.clearTimeout(flowWatch);
    if (seq !== lineSeq || epoch !== voiceEpoch) return;
    clipStats.errors++;
    if (retries >= 2) {
      qaAudio(seq, "clip-end-silent");
      fireSpeechEnd();
      deliverQueued();
      return;
    }
    retries++;
    qaAudio(seq, "clip-retry:" + why);
    rearmWatch();
    try {
      el.currentTime = 0; // never resume mid-buffer
    } catch {
      // ignore
    }
    startPlay();
  };
  const startPlay = () => {
    el.play().catch((err: DOMException) => {
      if (seq !== lineSeq || epoch !== voiceEpoch) return;
      if (err && err.name === "NotAllowedError") {
        // Autoplay policy: no gesture yet. Stash and retry on the first one —
        // nothing waits on speech meanwhile (the flow watchdog released above).
        clipStats.errors++;
        clipPending = { text, src, opts: o, seq, epoch };
        qaAudio(seq, "stash");
        finish();
        return;
      }
      // AbortError & friends (our own pause raced the play promise, a load
      // hiccup): restart from 0, never mid-buffer, never the device voice.
      retryFromZero(err && err.name ? err.name : "play");
    });
  };
  el.onended = finish;
  el.onerror = () => retryFromZero("error");
  el.volume = voiceVol; // the "Voces" slider's stored purpose (clip gain)
  el.src = src; // replaces any in-flight clip — ONE clip at a time
  try {
    el.currentTime = 0; // a reused element restarts from 0, never mid-buffer
  } catch {
    // ignore
  }
  setStatus({ generating: false, speaking: true });
  markSpeechProven(); // recorded audio IS proven speech — a shown pill clears
  startPlay();
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
/** True once the user has produced any real gesture (tap or key). */
let gestureSeen = false;

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
 * the game fully playable. `mayClaim` gates WHO may show the pill: the boot
 * probe runs before any user gesture and engines may hold or queue-discard
 * silent probes there (the pre-gesture probe false-fails), so it may NOT
 * claim — the first user gesture re-probes, and only THAT re-probe claims.
 * Every claim path is also a no-op once any utterance has started. */
function runSpeechSelfTest(mayClaim: boolean): void {
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
    // voiceless device. And a pre-gesture probe never condemns: the first
    // user gesture re-probes. Only a silent POST-GESTURE probe gets the pill.
    if (speechProven || speechEndCb != null || synth.speaking || synth.pending) return;
    // With the pre-generated cast loaded the app HAS audio — a silent
    // speechSynthesis is no longer "voice unavailable" (the owner's device).
    if (clipManifest) return;
    if (!mayClaim) return;
    setStatus({ state: "unavailable" });
  }, 3000);
}

/** Voice priming — device-voice only: registers the voiceschanged listener
 * (voice list + per-character map rebuild) and runs the boot speech self-test.
 * NO worker is started; the model download is gone with the engine. */
export function primeVoice(): void {
  if (typeof window === "undefined") return;
  // The clip manifest loads FIRST and REGARDLESS of speechSynthesis — a
  // voiceless device still plays every corpus line from files.
  loadClips();
  (window as unknown as Record<string, unknown>).__palabraClips = clipStats;
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.addEventListener("voiceschanged", () => {
      esVoiceCache = null;
      voiceMap = null;
      if (!speechProven) runSpeechSelfTest(gestureSeen);
    });
  } catch {
    // older engines: esVoice()/buildVoiceMap() re-scan per line anyway
  }
  // After the first user gesture (tap OR key): re-probe once — some engines
  // only allow speech after a gesture, and the voice list lands
  // asynchronously. This is the ONE probe allowed to claim the pill, because
  // a silent engine AFTER a gesture is a truly voiceless device.
  // D2: the SAME replay runs for gestures forwarded from the world iframe
  // (notifyUserGesture) — the child's taps never reach this parent listener.
  if (!gestureProbeArmed) {
    gestureProbeArmed = true;
    window.addEventListener("pointerdown", notifyUserGesture, { passive: true });
    window.addEventListener("keydown", notifyUserGesture);
  }
  if (!selfTestArmed) {
    selfTestArmed = true;
    runSpeechSelfTest(false); // boot probe: pre-gesture, may never claim
  }
}

/**
 * A user gesture arrived — from the PARENT window, or forwarded from the
 * world iframe ('palabra:gesture', D2: the child's taps land inside the
 * iframe and the parent's listeners never fire). Replays a clip the autoplay
 * policy denied earlier (the stash) — the owner's device unlocks <audio>
 * with the first tap, so THIS is the moment the first line becomes audible
 * instead of sitting stashed until the next speak drops it — and runs the
 * post-gesture speech probe. SINGLE-FLIGHT: only the CURRENT line replays
 * (seq+epoch fresh); a stale stash is dropped, and the replay stops anything
 * first.
 */
export function notifyUserGesture(): void {
  if (typeof window === "undefined") return;
  gestureSeen = true;
  const p = clipPending;
  if (p) {
    clipPending = null;
    if (p.seq === lineSeq && p.epoch === voiceEpoch) {
      // A line is audibly mid-play: it OWNS the air — never restart anything
      // over it (the owner's fragment storm came from exactly this race).
      if (!clipBusy()) {
        lineSeq++; // re-arm the seq for the retry (nothing else took the slot)
        stopSpeaking();
        playClip(p.text, p.src, p.opts);
        return;
      }
      qaAudio(p.seq, "drop-busy");
      return;
    }
    qaAudio(p.seq, "drop-stale");
  }
  if (!speechProven) runSpeechSelfTest(true);
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
  qaAudio(lineSeq, "stop");
  // A stashed autoplay-denied line whose epoch just went stale is DROPPED —
  // a stop means the scene moved on; the old line must never replay on the
  // next gesture over new content (verbatim rule: heard = displayed).
  clipPending = null;
  // The queued line dies with the stop (the ONE cancel) — but its flow
  // callback must still release: nothing may hang on a line never heard.
  const q = clipQueued;
  clipQueued = null;
  if (q) {
    qaAudio(lineSeq, "queue-flush");
    const cb = q.onEnd;
    q.onEnd = null;
    if (cb) cb();
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
  // The cancelled utterance's onend goes stale (seq guard) — drop the handle.
  activeUtter = null;
  // An in-flight CLIP stops the same way — the next line replaces it.
  if (clipEl) {
    try {
      clipEl.pause();
    } catch {
      // ignore
    }
    clipEl.onended = null;
    clipEl.onerror = null;
    clipEl.removeAttribute("src");
    clipEl = null;
  }
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
  // ONE CLIP = ONE CONTIGUOUS PLAYBACK (owner play-test: the intro read as
  // choppy fragments, Pip page 1 as garbled pieces — every tap-driven line
  // chopped the playing clip mid-sentence). ANY line arriving while a clip is
  // audibly mid-play WAITS: it queues behind it (latest-wins, slot ≤ 1) and
  // plays the moment the current clip ends — nothing is ever cut into
  // fragments, and the replaced queued line's flow callback fires at once so
  // nothing hangs on a line never heard. Explicit stopSpeaking still flushes.
  if (clipBusy()) {
    const old = clipQueued;
    clipQueued = { text, opts: o, onEnd: onEnd ?? undefined };
    qaAudio(lineSeq, old ? "queue-replace" : "queue");
    if (old) {
      const cb = old.onEnd;
      old.onEnd = null;
      if (cb) cb();
    }
    return;
  }
  // Sequence FIRST: every handler/watchdog of the previous line goes stale the
  // moment this line begins — a late end can never fire the new chain's slot.
  lineSeq++;
  stopSpeaking();
  speechEndCb = onEnd ?? null;
  // PHASE-1 CLIP CAST: a manifest hit plays the pre-generated clip instantly
  // (no TTS at all); a miss rides the device voice unchanged below. The QA
  // speak entry logs exactly ONCE per line, at delivery.
  const clip = clipFor(text, o.key);
  if (clip) {
    qaSpeak(text, o.key, clip, lineSeq);
    playClip(text, clip, o);
    return;
  }
  // D2 (owner play-test: silent first pages): the manifest revalidates
  // NETWORK-FIRST on every publish — on the owner's device that fetch can
  // outlive the first dialogue of the session, and the "miss" would ride a
  // DEAD device voice (total silence) even though the clip exists. While the
  // manifest is still LOADING, hold the line briefly (🔊 generating state,
  // flow not released) and deliver it the moment the manifest lands. Bounded:
  // a failed/slow manifest releases to the device voice after 3 s. A next
  // line (lineSeq) or an explicit stop (epoch) cancels the wait stale.
  if (clipManifestState === "loading") {
    const seq = lineSeq;
    const epoch = voiceEpoch;
    const t0 = Date.now();
    setStatus({ generating: true, speaking: false });
    const poll = window.setInterval(() => {
      if (seq !== lineSeq || epoch !== voiceEpoch) {
        window.clearInterval(poll);
        return;
      }
      if (clipManifestState === "loading" && Date.now() - t0 < 3000) return;
      window.clearInterval(poll);
      const c = clipFor(text, o.key);
      qaSpeak(text, o.key, c, seq);
      if (c) {
        playClip(text, c, o);
        return;
      }
      const spoke = speakDevice(text, o.slow ?? false, o);
      if (!spoke) {
        setStatus({ generating: false });
        fireSpeechEnd();
      }
    }, 100);
    return;
  }
  // ONE path: the device Spanish voice speaks the line now. The flow watchdog
  // + utter.onend (both seq-guarded) own the release.
  qaSpeak(text, o.key, null, lineSeq);
  const spoke = speakDevice(text, o.slow ?? false, o);
  if (!spoke) {
    // No device speech is possible: release the flow immediately — the game
    // never waits on speech.
    setStatus({ generating: false });
    fireSpeechEnd();
  }
}
