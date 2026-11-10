// Player controller: movement (ice slide / swamp slow / Power Boots), facing,
// sword swings, damage + i-frames, and the documented animation frame layout:
// 0-1 down, 2-3 up, 4-5 left, 6-7 right, 8-11 swing d/u/l/r, 12 item-raise.
window.Player = {
  create(scene, px, py) {
    const p = scene.add.sprite(px, py, ART.tex('player', 0));
    p.setDepth(50);
    p.facing = 'down';
    p.swingUntil = 0;
    p.raiseUntil = 0;
    p.invulnUntil = 0;
    p.knock = null;
    p.vel = { x: 0, y: 0 };       // carried velocity (ice)
    p.animTick = 0;
    p.animFlip = 0;
    p.bodyHalf = 5;
    return p;
  },

  speed() {
    return GS.items.boots ? CONFIG.PLAYER.BOOTS_SPEED : CONFIG.PLAYER.SPEED;
  },

  facingFrameBase(f) {
    return { down: 0, up: 2, left: 4, right: 6 }[f] || 0;
  },

  swingFrame(f) {
    return { down: 8, up: 9, left: 10, right: 11 }[f] || 8;
  },

  // the tile directly in front of the player (for interact / lantern / push)
  frontTile(p) {
    const d = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[p.facing];
    const tx = Math.floor(p.x / CONFIG.TILE) + d[0];
    const ty = Math.floor((p.y + 4) / CONFIG.TILE) + d[1];
    return { tx, ty, dx: d[0], dy: d[1] };
  },

  update(scene, p, dt) {
    const now = scene.time.now;
    const k = scene.keys;
    const swinging = now < p.swingUntil;
    const raising = now < p.raiseUntil;

    // knockback
    if (p.knock) {
      if (now < p.knock.until) {
        this.tryMove(scene, p, p.knock.vx * dt / 1000, p.knock.vy * dt / 1000);
      } else p.knock = null;
    }

    // input vector
    let ix = 0, iy = 0;
    if (!swinging && !raising && !p.knock) {
      if (k.left.isDown || k.a.isDown) ix -= 1;
      if (k.right.isDown || k.d.isDown) ix += 1;
      if (k.up.isDown || k.w.isDown) iy -= 1;
      if (k.down.isDown || k.s.isDown) iy += 1;
      if (ix && iy) { ix *= 0.7071; iy *= 0.7071; }
    }

    // facing follows dominant input
    if (ix || iy) {
      if (Math.abs(ix) >= Math.abs(iy)) p.facing = ix > 0 ? 'right' : 'left';
      else p.facing = iy > 0 ? 'down' : 'up';
    }

    // terrain
    const ch = scene.tileAt(Math.floor(p.x / CONFIG.TILE), Math.floor((p.y + 4) / CONFIG.TILE));
    const td = TILES.get(ch);
    let sp = this.speed();
    if (td.slow) sp *= 0.55;

    const onIce = td.slide && !GS.items.boots;
    if (onIce) {
      // keep momentum, weak control
      const blend = 1 - Math.pow(0.0018, dt / 1000);   // ~weak steering
      p.vel.x += (ix * sp - p.vel.x) * blend;
      p.vel.y += (iy * sp - p.vel.y) * blend;
    } else {
      p.vel.x = ix * sp;
      p.vel.y = iy * sp;
    }

    if (!p.knock) this.tryMove(scene, p, p.vel.x * dt / 1000, p.vel.y * dt / 1000);

    // animation
    if (swinging) {
      p.setTexture(ART.tex('player', this.swingFrame(p.facing)));
    } else if (raising) {
      p.setTexture(ART.tex('player', 12));
    } else if (ix || iy) {
      p.animTick += dt;
      if (p.animTick > 140) { p.animTick = 0; p.animFlip = 1 - p.animFlip; }
      p.setTexture(ART.tex('player', this.facingFrameBase(p.facing) + p.animFlip));
    } else {
      p.setTexture(ART.tex('player', this.facingFrameBase(p.facing)));
    }

    // i-frame blink
    p.setAlpha(now < p.invulnUntil ? (Math.floor(now / 70) % 2 ? 0.4 : 0.9) : 1);
  },

  tryMove(scene, p, dx, dy) {
    const half = p.bodyHalf;
    // feet-box collision (head can overlap walls slightly, looks right top-down)
    const top = 1, bot = 7;
    if (dx) {
      const nx = p.x + dx;
      const edge = nx + (dx > 0 ? half : -half);
      if (!scene.blockedAt(edge, p.y + top, {}) && !scene.blockedAt(edge, p.y + bot, {})) p.x = nx;
      else { p.vel.x = 0; }
    }
    if (dy) {
      const ny = p.y + dy;
      const edge = ny + (dy > 0 ? bot : top);
      if (!scene.blockedAt(p.x - half, edge, {}) && !scene.blockedAt(p.x + half, edge, {})) p.y = ny;
      else { p.vel.y = 0; }
    }
  },

  damage(scene, p, amount, srcX, srcY) {
    const now = scene.time.now;
    if (now < p.invulnUntil) return false;
    let dmg = amount;
    if (GS.items.oakCharm) dmg = Math.max(0.5, dmg / 2);
    GS.hearts = Math.max(0, GS.hearts - dmg);
    p.invulnUntil = now + CONFIG.PLAYER.INVULN_MS;
    // knock away from the source
    const dx = p.x - (srcX != null ? srcX : p.x), dy = p.y - (srcY != null ? srcY : p.y - 1);
    const d = Math.hypot(dx, dy) || 1;
    p.knock = { vx: (dx / d) * 160, vy: (dy / d) * 160, until: now + 140 };
    scene.sfx('hurt');
    scene.shake(120, 0.004);
    scene.events.emit('hud');
    if (GS.hearts <= 0) scene.onPlayerDeath();
    return true;
  },
};
