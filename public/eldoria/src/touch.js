// ── Palabra mobile controls (DOM overlay feeding the game input) ────────────
// Eldoria is keyboard-only by design; the gate requires touch. The joystick
// ORs its direction into the same key state Player.update polls (GameScene
// wraps its keys with PALABRA_TOUCH-aware getters), and the buttons push the
// same one-shot `pending` presses the keyboard event handlers push.
//
// Controls are created in index.html (#palabra-touch) and shown only on
// coarse pointers / narrow screens via CSS.
window.PALABRA_TOUCH = {
  dir: { up: false, down: false, left: false, right: false },
  press(name) {
    const s = window.game && window.game.scene ? window.game.scene.getScene('Game') : null;
    if (s) s.pending[name] = true;
    // menu scenes (title/pause/intro) advance on their own pointer handlers;
    // AUDIO gesture unlock happens on first touch anywhere (index.html)
  },
};

(function () {
  'use strict';

  const DEAD = 0.32; // dead-zone as a share of pad radius

  function setupJoystick(pad, thumb) {
    let activeId = null;
    const radius = () => pad.clientWidth / 2;

    function move(t) {
      const rect = pad.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = (t.clientX - cx) / radius();
      let dy = (t.clientY - cy) / radius();
      const len = Math.hypot(dx, dy) || 0.0001;
      if (len > 1) { dx /= len; dy /= len; }
      // thumb follows the finger, clamped to the pad
      thumb.style.transform = 'translate(' + (dx * radius() * 0.55) + 'px,' + (dy * radius() * 0.55) + 'px)';
      const d = window.PALABRA_TOUCH.dir;
      d.left = dx < -DEAD;
      d.right = dx > DEAD;
      d.up = dy < -DEAD;
      d.down = dy > DEAD;
    }

    function end() {
      activeId = null;
      thumb.style.transform = 'translate(0,0)';
      const d = window.PALABRA_TOUCH.dir;
      d.left = d.right = d.up = d.down = false;
    }

    pad.addEventListener('touchstart', (e) => {
      e.preventDefault();
      activeId = e.changedTouches[0].identifier;
      move(e.changedTouches[0]);
    }, { passive: false });
    pad.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === activeId) move(t);
      }
    }, { passive: false });
    pad.addEventListener('touchend', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === activeId) end();
      }
    }, { passive: false });
    pad.addEventListener('touchcancel', end, { passive: false });
  }

  function setup() {
    const pad = document.getElementById('pj-pad');
    const thumb = document.getElementById('pj-thumb');
    if (pad && thumb) setupJoystick(pad, thumb);

    const buttons = [
      ['pb-action', 'action'],   // espada / hablar / abrir (SPACE)
      ['pb-item', 'item'],       // usar objeto (X)
      ['pb-cycle', 'cycle'],     // cambiar objeto (C)
      ['pb-pause', 'pause'],     // pausa / inventario (ENTER)
    ];
    for (const [id, name] of buttons) {
      const el = document.getElementById(id);
      if (!el) continue;
      const press = (e) => {
        e.preventDefault();
        window.PALABRA_TOUCH.press(name);
        el.classList.add('pressed');
      };
      const release = (e) => { e.preventDefault(); el.classList.remove('pressed'); };
      el.addEventListener('touchstart', press, { passive: false });
      el.addEventListener('touchend', release, { passive: false });
      el.addEventListener('touchcancel', release, { passive: false });
      // desktop testing aid
      el.addEventListener('mousedown', press);
      el.addEventListener('mouseup', release);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
