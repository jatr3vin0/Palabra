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

  // The learner's immersion level (0–3), sent by the app at boot.
  context(data) {
    if (data && typeof data.englishLevel === 'number') {
      window.PALABRA_CTX.englishLevel = data.englishLevel;
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
    if (m && msg.won) {
      if (m.doneFlag && window.Flags) Flags.set(m.doneFlag);
      const gems = m.reward && m.reward.gems;
      const gs = window.GameScene && window.game && window.game.scene
        ? window.game.scene.getScene('Game')
        : null;
      if (gs && gems) {
        gs.give({ gems: gems });
        gs.banner({
          art: 'gem',
          name: '¡Misión cumplida!',
          desc: 'XP guardado en Palabra',
        });
        if (window.AUDIO) window.AUDIO.playJingle('fanfare');
        gs.autoSave();
      }
      if (window.UIScene && window.Palabra) {
        window.Palabra.speak('¡Misión cumplida! ¡Muy bien!', 'narrator');
      }
    }
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
    case 'palabra:duck':
      Palabra.duck(!!msg.on);
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
