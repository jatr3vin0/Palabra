// ── Palabra ⇄ Eldoria bridge (iframe side) ───────────────────────────────────
// Eldoria runs inside the Palabra app inside an <iframe src="/eldoria/">.
// This file is the ONLY place that talks across that boundary:
//
//   Eldoria → app : 'palabra:openMission'  (launch a mini-game by game id)
//                   'palabra:speak'        (kokoro voice request, per character)
//                   'palabra:hello'        (boot handshake)
//   app → Eldoria : 'palabra:context'      (learner englishLevel at boot)
//                   'palabra:missionOpen'  (freeze + duck before the overlay)
//                   'palabra:missionResult'(flags, reward, unfreeze, refocus)
//                   'palabra:voiceState'   (generating | speaking | idle — the
//                                           dialogue box shows '🔊 …' while a
//                                           line is pending and not audible)
//
// Learning data never lands here: XP/mastery stay in the app's storage layer;
// the world only keeps Eldoria flags (mission_<id>_<step> convention) so the
// dialogue variants know which missions are done.

window.PALABRA_MISSION_OPEN = false; // GameScene.update freezes while true
window.PALABRA_VOICE_ON = true;      // speech exists -> suppress blip overlaps
window.PALABRA_CTX = { englishLevel: 0, attached: false };

window.Palabra = {
  get attached() {
    try {
      return !!(window.parent && window.parent !== window);
    } catch (e) {
      return false;
    }
  },

  post(msg) {
    if (!this.attached) return;
    try {
      window.parent.postMessage(Object.assign({ source: 'palabra-world' }, msg), '*');
    } catch (e) {
      /* the game never dies because the app is gone */
    }
  },

  // The learner's immersion level (0–3), sent by the app at boot. The boot
  // message also carries the profile's audio panel values (music/voices/sfx,
  // 0–1) so the world starts at the profile's settings.
  context(data) {
    if (data && typeof data.englishLevel === 'number') {
      window.PALABRA_CTX.englishLevel = data.englishLevel;
    }
    if (data && (data.music != null || data.sfx != null || data.voice != null)) {
      window.PALABRA_CTX.musicVol = data.music;
      window.PALABRA_CTX.sfxVol = data.sfx;
      window.PALABRA_CTX.voiceVol = data.voice;
      if (window.AUDIO && window.AUDIO.setVolumes) {
        window.AUDIO.setVolumes({ music: data.music, sfx: data.sfx, voice: data.voice });
      }
    }
    window.PALABRA_CTX.attached = true;
  },

  // Speak a line through the app's kokoro pipeline with a per-character voice.
  // `voiceKey` is a PALABRA_VOICES character key (hero, villagerF, narrator…);
  // the app resolves the concrete voiceId/speed/pitch from its cast table.
  speak(text, voiceKey) {
    if (!text) return;
    this.post({ type: 'palabra:speak', text: String(text), voice: voiceKey || 'narrator' });
  },

  // Launch a mini-game: freeze the world underneath and ask the app to open
  // the frame-engine route on top of this scene.
  openMission(mission) {
    if (!mission) return;
    this.freeze(true);
    this.post({ type: 'palabra:openMission', mission });
  },

  // Freeze = stop GameScene updates + duck the chiptune under the overlay.
  freeze(on) {
    window.PALABRA_MISSION_OPEN = !!on;
    if (window.AUDIO && window.AUDIO.duck) window.AUDIO.duck(on);
  },

  // Mission result from the frame engine.
  missionResult(msg) {
    const m = window.PALABRA_MISSIONS && window.PALABRA_MISSIONS[msg.missionId];
    this.freeze(false);
    const gs = window.GameScene && window.game && window.game.scene
      ? window.game.scene.getScene('Game')
      : null;
    // Session guard: a result can land with no live world save (title screen,
    // torn-down session) — the world side then stays a graceful no-op: no pay,
    // no banner, no crash. Legit in-session results always have GS live.
    if (m && msg.won && window.GS) {
      // Gem-farming gate: the world reward pays ONCE per mission — a replay
      // (win after the doneFlag is already set) earns XP/coins in Palabra but
      // no world gems, so the banner says so instead of paying again.
      const firstWin = !(m.doneFlag && window.Flags && Flags.get(m.doneFlag));
      if (m.doneFlag && window.Flags) Flags.set(m.doneFlag);
      const gems = firstWin ? (m.reward && m.reward.gems) : 0;
      if (gs && gems) {
        gs.give({ gems: gems });
        gs.banner({
          art: 'gem',
          name: '¡Misión cumplida!',
          desc: '+' + gems + ' gemas · XP en Palabra',
        });
        if (window.AUDIO) window.AUDIO.playJingle('fanfare');
        // NO redundant speak here (D1, owner play-test: double speech every
        // mission end) — showBanner speaks the sanitized banner text once.
      } else {
        gs.banner({
          art: 'gem',
          name: '¡Misión cumplida!',
          desc: firstWin ? 'XP guardado en Palabra' : 'Repaso: XP en Palabra, sin gemas',
        });
        // NO redundant speak here (D1) — the banner's speak is the mission-end
        // line; a second Palabra.speak only replaced/cut it (one voice at a time).
      }
    }
    // Returning to the world always writes the world save (save = world
    // state): autoSave uses the same slot + checkpoint semantics as boot,
    // so the live tile persists whether the mission was won or closed.
    if (gs) gs.autoSave();
    // keyboard focus returns to the world so the child keeps adventuring
    try {
      window.focus();
      if (window.game && window.game.canvas) window.game.canvas.focus();
    } catch (e) { /* ignore */ }
  },

  duck(on) {
    if (window.AUDIO && window.AUDIO.duck) window.AUDIO.duck(on);
  },
};

window.addEventListener('message', (e) => {
  const msg = e && e.data;
  if (!msg || msg.source !== 'palabra-app') return;
  switch (msg.type) {
    case 'palabra:context':
      Palabra.context(msg);
      break;
    case 'palabra:missionOpen':
      Palabra.freeze(true);
      break;
    case 'palabra:missionResult':
      Palabra.missionResult(msg);
      break;
    case 'palabra:music':
      // Parent music-only mute from the app header (voices stay).
      if (window.AUDIO && window.AUDIO.setMusicMuted) window.AUDIO.setMusicMuted(!!msg.muted);
      break;
    case 'palabra:audioVol':
      // Audio settings panel (app header): live music/voices/effects volumes.
      // Applied to the buses now; when a world save is live it mirrors the
      // values and persists them with the next write.
      if (window.AUDIO && window.AUDIO.setVolumes) {
        window.AUDIO.setVolumes({ music: msg.music, sfx: msg.sfx, voice: msg.voice });
        if (window.GS) SAVE.write();
      }
      break;
    case 'palabra:duck':
      Palabra.duck(!!msg.on);
      break;
    case 'palabra:voiceState':
      // TTS cold-start: the app reports what the voice pipe is doing with the
      // current line — 'generating' = requested but nothing audible yet.
      if (window.game && window.game.scene) {
        const ui = window.game.scene.getScene('UI');
        if (ui && ui.voiceState) ui.voiceState(msg.phase);
      }
      break;
    default:
      break;
  }
});

// Boot handshake: tell the app we exist and ask for learner context. Retried
// briefly — the app's message listener attaches right after hydration and the
// static iframe can beat it to the first post.
(function handshake() {
  if (!window.Palabra || !window.Palabra.attached) return;
  const tries = [0, 400, 1200, 2500];
  for (const ms of tries) {
    setTimeout(() => {
      if (window.PALABRA_CTX.attached) return;
      window.Palabra.post({ type: 'palabra:hello' });
    }, ms);
  }
})();

// D2 (owner play-test: silent first pages): the child's taps and keys land IN
// THIS IFRAME — the app's window-level gesture listeners never see them, so a
// clip the autoplay policy denied at boot was stashed and never replayed.
// Forward every gesture to the app: it re-runs the stash replay (and the
// post-gesture speech probe) exactly as if the tap had landed on the parent.
['pointerdown', 'keydown'].forEach((ev) => {
  window.addEventListener(ev, () => {
    if (window.Palabra) window.Palabra.post({ type: 'palabra:gesture' });
  }, { passive: true, capture: true });
});
