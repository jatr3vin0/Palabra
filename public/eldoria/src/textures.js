// Procedural texture engine. Art files call registerArt(key, {w,h,frames,draw});
// BootScene calls ART.generate(scene) which bakes every frame into a canvas
// texture named `${key}_${frame}`. Anything missing falls back to a magenta
// placeholder so a bad/missing art file can never crash the game.
window.ART = {
  defs: {},
  generated: new Set(),

  generate(scene) {
    // placeholder first
    const ph = document.createElement('canvas');
    ph.width = ph.height = 16;
    const pctx = ph.getContext('2d');
    pctx.fillStyle = '#f0f';
    pctx.fillRect(0, 0, 16, 16);
    pctx.fillStyle = '#000';
    pctx.fillRect(0, 0, 8, 8);
    pctx.fillRect(8, 8, 8, 8);
    scene.textures.addCanvas('missing_0', ph);

    for (const key of Object.keys(this.defs)) {
      const def = this.defs[key];
      const frames = Math.max(1, def.frames || 1);
      for (let f = 0; f < frames; f++) {
        const c = document.createElement('canvas');
        c.width = def.w || 16;
        c.height = def.h || 16;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        try {
          def.draw(ctx, f);
        } catch (e) {
          console.error('art draw failed: ' + key + ' frame ' + f, e);
          ctx.fillStyle = '#f0f';
          ctx.fillRect(0, 0, c.width, c.height);
        }
        const tkey = key + '_' + f;
        if (!scene.textures.exists(tkey)) scene.textures.addCanvas(tkey, c);
        this.generated.add(tkey);
      }
    }
  },

  frames(key) {
    const d = this.defs[key];
    return d ? Math.max(1, d.frames || 1) : 1;
  },

  // resolve an art key + frame to a texture key, with fallback
  tex(key, frame) {
    const f = frame || 0;
    let t = key + '_' + f;
    if (this.generated.has(t)) return t;
    t = key + '_0';
    if (this.generated.has(t)) return t;
    return 'missing_0';
  },
};

window.registerArt = function (key, def) {
  if (!def || typeof def.draw !== 'function') {
    console.error('bad registerArt: ' + key);
    return;
  }
  def.w = def.w || 16;
  def.h = def.h || 16;
  window.ART.defs[key] = def;
};
