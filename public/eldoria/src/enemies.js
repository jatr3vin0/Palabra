// Enemy behavior engine. ENEMY_TYPES (data) is filled by src/enemy_types.js,
// BOSSES (code) by src/bosses.js. GameScene spawns sprites and calls
// Enemies.update(scene, e, dt) each frame. The scene provides collision via
// scene.blockedAt(px, py, {flying}) and shooting via scene.enemyShoot().
window.ENEMY_TYPES = {};
window.BOSSES = {};

window.Enemies = {
  initSprite(scene, e) {
    const def = e.def;
    e.mem = { state: 'idle', t: 0, dirX: 0, dirY: 1, cd: 800 + Math.random() * 1200 };
    e.hp = def.hp || 1;
    e.knock = null;
    e.frameTick = 0;
    e.frameIdx = 0;
    e.hitFlashUntil = 0;
  },

  update(scene, e, dt) {
    const def = e.def;
    const m = e.mem;
    m.t += dt;

    // knockback overrides behavior briefly
    if (e.knock) {
      if (scene.time.now < e.knock.until) {
        this.move(scene, e, e.knock.vx * dt / 1000, e.knock.vy * dt / 1000);
        return;
      }
      e.knock = null;
    }

    const fn = this.behaviors[def.behavior] || this.behaviors.wander;
    fn.call(this, scene, e, dt);

    // 2-frame animation
    e.frameTick += dt;
    if (e.frameTick > 220) {
      e.frameTick = 0;
      e.frameIdx = (e.frameIdx + 1) % ART.frames(def.art);
      e.setTexture(ART.tex(def.art, e.frameIdx));
    }
    e.setTint(scene.time.now < e.hitFlashUntil ? 0xffffff * 0 + 0xff6666 : 0xffffff);
    if (scene.time.now >= e.hitFlashUntil) e.clearTint();
  },

  // collision-respecting move; returns {hitX, hitY}
  move(scene, e, dx, dy) {
    const half = e.bodyHalf || 6;
    const fly = !!(e.def.opts && e.def.opts.overPits) || e.def.behavior === 'flyer';
    const res = { hitX: false, hitY: false };
    if (dx) {
      const nx = e.x + dx;
      const edge = nx + (dx > 0 ? half : -half);
      if (!scene.blockedAt(edge, e.y - half + 2, { flying: fly, enemy: true }) &&
          !scene.blockedAt(edge, e.y + half - 2, { flying: fly, enemy: true })) e.x = nx;
      else res.hitX = true;
    }
    if (dy) {
      const ny = e.y + dy;
      const edge = ny + (dy > 0 ? half : -half);
      if (!scene.blockedAt(e.x - half + 2, edge, { flying: fly, enemy: true }) &&
          !scene.blockedAt(e.x + half - 2, edge, { flying: fly, enemy: true })) e.y = ny;
      else res.hitY = true;
    }
    return res;
  },

  toPlayer(scene, e) {
    const p = scene.playerPos();
    const dx = p.x - e.x, dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    return { dx, dy, d, nx: dx / d, ny: dy / d };
  },

  randDir(m) {
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]];
    const pick = dirs[Math.floor(Math.random() * dirs.length)];
    m.dirX = pick[0]; m.dirY = pick[1];
  },

  behaviors: {
    wander(scene, e, dt) {
      const m = e.mem, sp = (e.def.speed || 30) * 0.7;
      m.cd -= dt;
      if (m.cd <= 0) { this.randDir(m); m.cd = 700 + Math.random() * 1300; }
      const r = this.move(scene, e, m.dirX * sp * dt / 1000, m.dirY * sp * dt / 1000);
      if (r.hitX) m.dirX *= -1;
      if (r.hitY) m.dirY *= -1;
    },

    chase(scene, e, dt) {
      const m = e.mem, def = e.def;
      const aggro = (def.opts && def.opts.aggro) || 100;
      const t = this.toPlayer(scene, e);
      if (t.d < aggro) {
        const sp = def.speed || 40;
        this.move(scene, e, t.nx * sp * dt / 1000, t.ny * sp * dt / 1000);
      } else {
        this.behaviors.wander.call(this, scene, e, dt);
      }
    },

    hopper(scene, e, dt) {
      const m = e.mem, def = e.def;
      const hopMs = (def.opts && def.opts.hopMs) || 900;
      const pause = (def.opts && def.opts.pause) || 400;
      if (m.state !== 'hop') {
        m.cd -= dt;
        e.setScale(e.baseScale || 1, (e.baseScale || 1) * 0.92);
        if (m.cd <= 0) {
          m.state = 'hop'; m.cd = hopMs * 0.45;
          const t = this.toPlayer(scene, e);
          const jx = (Math.random() - 0.5) * 0.8;
          const jy = (Math.random() - 0.5) * 0.8;
          const d = Math.hypot(t.nx + jx, t.ny + jy) || 1;
          m.dirX = (t.nx + jx) / d; m.dirY = (t.ny + jy) / d;
        }
      } else {
        e.setScale(e.baseScale || 1, (e.baseScale || 1) * 1.06);
        const sp = (def.speed || 30) * 2.2;
        this.move(scene, e, m.dirX * sp * dt / 1000, m.dirY * sp * dt / 1000);
        m.cd -= dt;
        if (m.cd <= 0) { m.state = 'idle'; m.cd = pause + Math.random() * 400; }
      }
    },

    charge(scene, e, dt) {
      const m = e.mem, def = e.def;
      const dash = (def.opts && def.opts.dashSpeed) || 160;
      if (m.state === 'telegraph') {
        m.cd -= dt;
        e.setAlpha(Math.floor(scene.time.now / 60) % 2 ? 0.5 : 1);
        if (m.cd <= 0) { m.state = 'dash'; e.setAlpha(1); }
      } else if (m.state === 'dash') {
        const r = this.move(scene, e, m.dirX * dash * dt / 1000, m.dirY * dash * dt / 1000);
        if (r.hitX || r.hitY) { m.state = 'stunned'; m.cd = 800; scene.sfx('hit'); }
      } else if (m.state === 'stunned') {
        m.cd -= dt;
        e.setAlpha(0.7);
        if (m.cd <= 0) { m.state = 'idle'; m.cd = 400; e.setAlpha(1); }
      } else {
        this.behaviors.wander.call(this, scene, e, dt);
        const t = this.toPlayer(scene, e);
        if (t.d < 150 && (Math.abs(t.dx) < 12 || Math.abs(t.dy) < 12)) {
          m.state = 'telegraph'; m.cd = 420;
          if (Math.abs(t.dx) >= Math.abs(t.dy)) { m.dirX = Math.sign(t.dx) || 1; m.dirY = 0; }
          else { m.dirX = 0; m.dirY = Math.sign(t.dy) || 1; }
        }
      }
    },

    shooter(scene, e, dt) {
      const m = e.mem, def = e.def, o = def.opts || {};
      const range = o.range || 90;
      const t = this.toPlayer(scene, e);
      const sp = (def.speed || 25) * 0.8;
      if (t.d < range - 18) this.move(scene, e, -t.nx * sp * dt / 1000, -t.ny * sp * dt / 1000);
      else if (t.d > range + 30) this.move(scene, e, t.nx * sp * dt / 1000, t.ny * sp * dt / 1000);
      m.cd -= dt;
      if (m.cd <= 0 && t.d < 200) {
        m.cd = o.cooldown || 1500;
        scene.enemyShoot(e, { atPlayer: true, art: o.projectile || 'seed', speed: o.shotSpeed || 80, dmg: def.dmg || 0.5 });
      }
    },

    flyer(scene, e, dt) {
      const m = e.mem, def = e.def, o = def.opts || {};
      const t = this.toPlayer(scene, e);
      const sp = def.speed || 40;
      const wob = Math.sin(m.t / 180) * 0.7;
      if (t.d < (o.aggro || 140)) {
        this.move(scene, e, (t.nx + wob * t.ny) * sp * dt / 1000, (t.ny - wob * t.nx) * sp * dt / 1000);
      } else {
        this.behaviors.wander.call(this, scene, e, dt);
      }
      if (o.shoot) {
        m.cd -= dt;
        if (m.cd <= 0 && t.d < 160) {
          m.cd = o.cooldown || 1800;
          scene.enemyShoot(e, { atPlayer: true, art: o.projectile || 'iceShard', speed: o.shotSpeed || 85, dmg: def.dmg || 0.5 });
        }
      }
    },

    turret(scene, e, dt) {
      const m = e.mem, def = e.def, o = def.opts || {};
      const t = this.toPlayer(scene, e);
      m.cd -= dt;
      if (m.cd <= 0 && (Math.abs(t.dx) < 8 || Math.abs(t.dy) < 8) && t.d < 200) {
        m.cd = o.cooldown || 1600;
        let ang;
        if (Math.abs(t.dx) < 8) ang = t.dy > 0 ? Math.PI / 2 : -Math.PI / 2;
        else ang = t.dx > 0 ? 0 : Math.PI;
        // bolts hit like other shooters (def.dmg is TOUCH damage and may be 0)
        const dmg = o.shotDmg != null ? o.shotDmg : 0.5;
        scene.enemyShoot(e, { angle: ang, art: o.projectile || 'fireball', speed: o.shotSpeed || 100, dmg });
      }
    },

    teleporter(scene, e, dt) {
      const m = e.mem, def = e.def, o = def.opts || {};
      m.cd -= dt;
      if (m.state === 'fading') {
        e.alpha = Math.max(0, e.alpha - dt / 250);
        if (e.alpha <= 0) {
          const p = scene.playerPos();
          for (let tries = 0; tries < 12; tries++) {
            const ang = Math.random() * Math.PI * 2;
            const r = 45 + Math.random() * 45;
            const nx = p.x + Math.cos(ang) * r, ny = p.y + Math.sin(ang) * r;
            if (!scene.blockedAt(nx, ny, { enemy: true }) && scene.inRoom(nx, ny)) { e.x = nx; e.y = ny; break; }
          }
          m.state = 'appearing';
        }
      } else if (m.state === 'appearing') {
        e.alpha = Math.min(1, e.alpha + dt / 250);
        if (e.alpha >= 1) {
          m.state = 'idle';
          m.cd = o.blinkMs || 2200;
          scene.enemyShoot(e, { atPlayer: true, art: o.projectile || 'magicBolt', speed: o.shotSpeed || 95, dmg: def.dmg || 1 });
        }
      } else {
        const drift = Math.sin(m.t / 300) * 12;
        this.move(scene, e, Math.cos(m.t / 500) * 8 * dt / 1000, drift * dt / 1000);
        if (m.cd <= 0) m.state = 'fading';
      }
    },
  },
};
