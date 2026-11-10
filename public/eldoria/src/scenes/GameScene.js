// The core play scene: renders one 20x12 room at a time, runs the player,
// enemies, bosses, projectiles, puzzles (blocks/plates/torches/switches/doors),
// warps, shops, dialogue triggers, pickups and saving.
window.GameScene = class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    const T = CONFIG.TILE;
    this.cameras.main.setViewport(0, CONFIG.HUD_H / CONFIG.ZOOM, CONFIG.ROOM_W * T, CONFIG.ROOM_H * T);
    this.cameras.main.setBackgroundColor('#0a0a12');

    // held-state keys are polled; one-shot actions are EVENT-driven because
    // Phaser clears a Key's justDown flag on keyup (a press shorter than one
    // frame would be missed by polling)
    this.keys = this.input.keyboard.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT',
      w: 'W', a: 'A', s: 'S', d: 'D',
    });
    // Palabra mobile controls: the virtual joystick ORs its direction into the
    // same key state the keyboard feeds, so Player.update needs no changes.
    const realKeys = this.keys;
    const touchDir = () => (window.PALABRA_TOUCH ? window.PALABRA_TOUCH.dir : null);
    const heldKey = (name, dir) => ({
      get isDown() {
        const t = touchDir();
        return realKeys[name].isDown || !!(t && t[dir]);
      },
    });
    this.keys = {
      up: heldKey('up', 'up'), down: heldKey('down', 'down'),
      left: heldKey('left', 'left'), right: heldKey('right', 'right'),
      w: realKeys.w, a: realKeys.a, s: realKeys.s, d: realKeys.d,
    };
    this.pending = {};
    const kb = this.input.keyboard;
    const press = (name) => (e) => { if (!e || !e.repeat) this.pending[name] = true; };
    kb.on('keydown-SPACE', press('action'));
    kb.on('keydown-Z', press('action'));
    kb.on('keydown-X', press('item'));
    kb.on('keydown-C', press('cycle'));
    kb.on('keydown-TAB', press('cycle'));
    kb.on('keydown-ENTER', press('pause'));
    kb.on('keydown-ESC', press('pause'));
    kb.on('keydown-P', press('pause'));
    kb.on('keydown-M', () => AUDIO.toggleMute());
    kb.addCapture('SPACE,Z,X,C,TAB,ENTER,UP,DOWN,LEFT,RIGHT,W,A,S,D');

    // entity arrays (rebuilt every room)
    this.tileImgs = []; this.animTiles = [];
    this.enemies = []; this.shots = []; this.bombsLive = []; this.pickupsLive = [];
    this.chestsLive = []; this.doorsLive = []; this.blocksLive = []; this.platesLive = [];
    this.torchesLive = []; this.switchesLive = []; this.npcsLive = []; this.signsLive = [];
    this.shopLive = []; this.barrierLive = []; this.portalLive = [];
    this.boss = null;

    this.dialogOpen = false;
    this.bannerUntil = 0;
    this.transitioning = false;
    this._dying = false;          // must reset across scene restarts
    this._falling = false;
    this._victoryPending = false;
    this.warpCooldown = 0;
    this.unlockCooldown = 0;
    this.pushMs = 0;
    this.swingHits = null;
    this.lanternFlareUntil = 0;

    this.player = Player.create(this, 0, 0);
    this.mapEntry = Object.assign({}, GS.checkpoint);

    // darkness overlay
    this.darkRT = this.add.renderTexture(0, 0, CONFIG.ROOM_W * T, CONFIG.ROOM_H * T)
      .setOrigin(0, 0).setDepth(90).setVisible(false);
    this.lightBrush = this.makeLightBrush();

    this.scene.launch('UI');
    this.game.events.on('dialogue:done', this.onDialogueDone, this);
    this.events.on('resume', () => { this.pauseGuard = this.time.now + 250; });
    this.events.on('shutdown', () => {
      this.game.events.off('dialogue:done', this.onDialogueDone, this);
    });

    const cp = GS.checkpoint;
    this.loadRoom(cp.map, cp.room, cp.x, cp.y);
  }

  // ============================== helpers ==============================
  sfx(k) { AUDIO.sfx(k); }
  shake(ms, power) { this.cameras.main.shake(ms || 120, power || 0.004); }
  playerPos() { return { x: this.player.x, y: this.player.y }; }
  inRoom(px, py) {
    return px >= 0 && py >= 0 && px < CONFIG.ROOM_W * CONFIG.TILE && py < CONFIG.ROOM_H * CONFIG.TILE;
  }
  tileAt(tx, ty) {
    if (ty < 0 || ty >= CONFIG.ROOM_H || tx < 0 || tx >= CONFIG.ROOM_W) return '#';
    return this.grid[ty][tx];
  }
  setTile(tx, ty, ch) {
    if (ty < 0 || ty >= CONFIG.ROOM_H || tx < 0 || tx >= CONFIG.ROOM_W) return;
    this.grid[ty][tx] = ch;
    this.redrawTile(tx, ty);
  }
  tileAtPixel(px, py) { return this.tileAt(Math.floor(px / CONFIG.TILE), Math.floor(py / CONFIG.TILE)); }
  frozen() {
    return this.dialogOpen || this.transitioning || this._dying || this._falling ||
      this._victoryPending || this.time.now < this.bannerUntil;
  }

  blockedAt(px, py, opts) {
    const T = CONFIG.TILE;
    const tx = Math.floor(px / T), ty = Math.floor(py / T);
    // outside the room: the player may exit through open edges, enemies never
    if (tx < 0 || ty < 0 || tx >= CONFIG.ROOM_W || ty >= CONFIG.ROOM_H) {
      if (opts && opts.enemy) return true;
      if (this.room && this.room.isolated) return true;
      const [c, r] = this.gridKey();
      if (c == null) return true;
      const nk = (tx < 0) ? `${c - 1},${r}` : (tx >= CONFIG.ROOM_W) ? `${c + 1},${r}`
        : (ty < 0) ? `${c},${r - 1}` : `${c},${r + 1}`;
      return !WORLD.room(this.mapId, nk);
    }
    // doors override tiles entirely
    for (const d of this.doorsLive) {
      if (d.tx === tx && d.ty === ty) return !d.isOpen;
    }
    for (const b of this.barrierLive) if (b.tx === tx && b.ty === ty) return true;
    const td = TILES.get(this.grid[ty][tx]);
    if (td.solid) return true;
    if (opts && opts.enemy && !(opts.flying) && (td.pit || td.hazard)) return true;
    // solid entities
    for (const b of this.blocksLive) if (b.tx === tx && b.ty === ty) return true;
    for (const ch of this.chestsLive) if (ch.tx === tx && ch.ty === ty) return true;
    for (const n of this.npcsLive) if (n.tx === tx && n.ty === ty) return true;
    for (const s of this.signsLive) if (s.tx === tx && s.ty === ty) return true;
    for (const s of this.shopLive) if (s.tx === tx && s.ty === ty) return true;
    for (const s of this.switchesLive) if (s.tx === tx && s.ty === ty) return true;
    for (const t of this.torchesLive) if (t.tx === tx && t.ty === ty) return true;
    return false;
  }

  gridKey() {
    const m = /^(-?\d+),(-?\d+)$/.exec(this.roomKey || '');
    return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : [null, null];
  }

  nudgeToWalkable(sprite) {
    const T = CONFIG.TILE;
    if (!this.blockedAt(sprite.x, sprite.y, {})) return;
    for (let radius = 1; radius <= 3; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = sprite.x + dx * T, ny = sprite.y + dy * T;
          if (this.inRoom(nx, ny) && !this.blockedAt(nx, ny, {})) {
            sprite.x = nx; sprite.y = ny;
            return;
          }
        }
      }
    }
  }

  makeLightBrush() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    if (!this.textures.exists('lightbrush')) this.textures.addCanvas('lightbrush', c);
    const img = new Phaser.GameObjects.Image(this, 0, 0, 'lightbrush');
    img.setOrigin(0.5);
    return img;
  }

  // ============================== room loading ==============================
  clearRoomEntities() {
    const all = [this.tileImgs, this.enemies, this.shots, this.bombsLive, this.pickupsLive,
      this.chestsLive, this.doorsLive, this.blocksLive, this.platesLive, this.torchesLive,
      this.switchesLive, this.npcsLive, this.signsLive, this.shopLive, this.barrierLive,
      this.portalLive];
    for (const arr of all) {
      for (const e of arr) {
        if (e.priceText) e.priceText.destroy();
        if (e.destroy) e.destroy();
        else if (e.sprite) e.sprite.destroy();
      }
      arr.length = 0;
    }
    if (this.boss) { this.boss.destroy(); this.boss = null; }
    this.animTiles.length = 0;
  }

  loadRoom(mapId, roomKey, tx, ty) {
    const T = CONFIG.TILE;
    const prevMap = this.mapId;
    this.clearRoomEntities();
    // a pit-fall tween must not follow the player into the next room
    this._falling = false;
    this.tweens.killTweensOf(this.player);
    this.player.setScale(1);
    this.player.angle = 0;

    let room = WORLD.room(mapId, roomKey);
    if (!room) {
      console.error('missing room ' + mapId + ' ' + roomKey);
      mapId = CONFIG.START.map; roomKey = CONFIG.START.room;
      tx = CONFIG.START.x; ty = CONFIG.START.y;
      room = WORLD.room(mapId, roomKey);
      if (!room) return;
    }
    this.mapId = mapId; this.roomKey = roomKey; this.room = room;

    // --- build mutable grid, normalized to 12x20 ---
    this.grid = [];
    for (let y = 0; y < CONFIG.ROOM_H; y++) {
      const src = (room.tiles && room.tiles[y]) || '';
      const row = [];
      for (let x = 0; x < CONFIG.ROOM_W; x++) row.push(TILES.known(src[x]) ? src[x] : '.');
      this.grid.push(row);
    }
    for (const p of room.pots || []) if (this.tileAt(p.x, p.y) !== '#') this.grid[p.y][p.x] = 'O';
    // persistent destruction + revealed secrets (a flagged tile hiding a warp
    // becomes stairs, not its normal `becomes` char — e.g. cut bushes)
    for (let y = 0; y < CONFIG.ROOM_H; y++) {
      for (let x = 0; x < CONFIG.ROOM_W; x++) {
        const td = TILES.get(this.grid[y][x]);
        if ((td.bomb || td.cut) && Flags.get(`tile_${mapId}_${roomKey}_${x}_${y}`)) {
          const hidden = (room.warps || []).some((w) => w.x === x && w.y === y && w.hidden);
          this.grid[y][x] = hidden ? 'S' : this.groundedBecomes(td.becomes);
        }
      }
    }
    // permanently opened doors show a real floor pathway, not bare wall
    for (const d of room.doors || []) {
      if (Flags.get(`door_${mapId}_${roomKey}_${d.id}`) &&
          d.y >= 0 && d.y < CONFIG.ROOM_H && d.x >= 0 && d.x < CONFIG.ROOM_W) {
        this.grid[d.y][d.x] = WORLD.groundFor(mapId, room);
      }
    }

    // --- draw tiles ---
    this.tileRefs = [];
    const ground = WORLD.groundFor(mapId, room);
    for (let y = 0; y < CONFIG.ROOM_H; y++) {
      for (let x = 0; x < CONFIG.ROOM_W; x++) {
        this.drawTileAt(x, y, ground);
      }
    }

    // --- entities ---
    const rk = `${mapId}_${roomKey}`;

    for (const d of room.doors || []) {
      const persisted = Flags.get(`door_${rk}_${d.id}`);
      const spr = this.add.image(d.x * T + 8, d.y * T + 8,
        ART.tex(d.kind === 'boss' ? 'doorBoss' : d.kind === 'locked' ? 'doorLocked' : 'doorSealed', 0))
        .setDepth(12);
      const door = { def: d, tx: d.x, ty: d.y, sprite: spr, isOpen: persisted, destroy: () => spr.destroy() };
      if (persisted) spr.setVisible(false);
      this.doorsLive.push(door);
    }

    if (room.barrier && !Flags.get('barrier_down')) {
      for (const b of room.barrier) {
        const spr = this.add.sprite(b.x * T + 8, b.y * T + 8, ART.tex('barrierTile', 0)).setDepth(12);
        this.barrierLive.push({ tx: b.x, ty: b.y, sprite: spr, destroy: () => spr.destroy() });
      }
    }

    for (const c of room.chests || []) {
      const opened = Flags.get(`chest_${c.id}`);
      const art = c.big ? (opened ? 'bigChestOpen' : 'bigChestClosed') : (opened ? 'chestOpen' : 'chestClosed');
      const spr = this.add.image(c.x * T + 8, c.y * T + 8, ART.tex(art, 0)).setDepth(11);
      this.chestsLive.push({ def: c, tx: c.x, ty: c.y, opened, sprite: spr, destroy: () => spr.destroy() });
    }

    for (const b of room.blocks || []) {
      const spr = this.add.image(b.x * T + 8, b.y * T + 8, ART.tex('block', 0)).setDepth(11);
      this.blocksLive.push({ tx: b.x, ty: b.y, sprite: spr, moving: false, destroy: () => spr.destroy() });
    }

    for (const p of room.plates || []) {
      const spr = this.add.image(p.x * T + 8, p.y * T + 8, ART.tex('plate', 0)).setDepth(2);
      this.platesLive.push({ def: p, tx: p.x, ty: p.y, pressed: false, sprite: spr, destroy: () => spr.destroy() });
    }

    for (const t of room.torches || []) {
      const lit = !!t.lit || Flags.get(`torch_${rk}_${t.id}`);
      const spr = this.add.sprite(t.x * T + 8, t.y * T + 8, ART.tex(lit ? 'torchLit' : 'torchUnlit', 0)).setDepth(11);
      this.torchesLive.push({ def: t, tx: t.x, ty: t.y, lit, sprite: spr, destroy: () => spr.destroy() });
    }

    for (const s of room.switches || []) {
      const on = Flags.get(`switch_${rk}_${s.id}`);
      const art = s.kind === 'eye' ? (on ? 'switchEyeHit' : 'switchEye') : (on ? 'switchCrystalHit' : 'switchCrystal');
      const spr = this.add.image(s.x * T + 8, s.y * T + 8, ART.tex(art, 0)).setDepth(11);
      this.switchesLive.push({ def: s, tx: s.x, ty: s.y, on, sprite: spr, destroy: () => spr.destroy() });
    }

    for (const n of room.npcs || []) {
      const spr = this.add.sprite(n.x * T + 8, n.y * T + 8, ART.tex(n.art || 'villager', 0)).setDepth(20);
      this.npcsLive.push({ def: n, tx: n.x, ty: n.y, sprite: spr, tick: Math.random() * 500, frame: 0, destroy: () => spr.destroy() });
    }

    for (const s of room.signs || []) {
      const spr = this.add.image(s.x * T + 8, s.y * T + 8, ART.tex('sign', 0)).setDepth(11);
      this.signsLive.push({ def: s, tx: s.x, ty: s.y, sprite: spr, destroy: () => spr.destroy() });
    }

    for (const s of room.shopItems || []) {
      const shopArt = s.item === 'arrows' ? 'arrowPickup' : s.item === 'bombs' ? 'bombPickup'
        : ITEMS[s.item] ? ITEMS[s.item].art : s.item;
      const spr = this.add.image(s.x * T + 8, s.y * T + 4, ART.tex(shopArt, 0)).setDepth(11);
      const txt = this.add.text(s.x * T + 8, s.y * T + 14, String(s.price), {
        fontFamily: CONFIG.FONT, fontSize: '8px', color: '#ffe97f',
      }).setShadow(1, 1, '#000000', 0).setOrigin(0.5, 0.5).setResolution(CONFIG.ZOOM * 2).setDepth(11);
      this.shopLive.push({ def: s, tx: s.x, ty: s.y, sprite: spr, priceText: txt, destroy: () => spr.destroy() });
    }

    for (const p of room.pickups || []) {
      if (p.id && Flags.get(`pickup_${p.id}`)) continue;
      this.spawnPickup(p.x * T + 8, p.y * T + 8, { item: p.item }, { persistentId: p.id });
    }

    // enemies (not in safe rooms; not right on top of the player spawn)
    const sx = tx * T + 8, sy = ty * T + 8;
    if (!room.safe) {
      for (const e of room.enemies || []) {
        if (Math.hypot(e.x * T + 8 - sx, e.y * T + 8 - sy) < 40) continue;
        this.spawnEnemy(e.type, e.x, e.y);
      }
    }
    if (room.miniboss && !Flags.get(`mini_${rk}`)) {
      const mb = this.spawnEnemy(room.miniboss.type, room.miniboss.x, room.miniboss.y);
      if (mb) { mb.isMiniboss = true; AUDIO.sfx('bossRoar'); }
    }
    if (room.boss && !Flags.get(`boss_${mapId}`)) this.spawnBoss(room.boss);
    else if (room.boss && Flags.get(`boss_${mapId}`) && mapId !== 'citadel') {
      // boss already beaten: re-offer any uncollected rewards + the portal home
      const taken = new Set();
      const bx = room.boss.x * T + 8, by = room.boss.y * T + 8;
      const shard = DUNGEON_SHARDS[mapId];
      if (shard && !Flags.get('pickup_shard_' + mapId) && GS.shards.indexOf(shard) < 0) {
        this.spawnPickup(bx, by, { item: shard }, { persistentId: 'shard_' + mapId, taken });
      }
      if (!Flags.get('pickup_hc_' + mapId)) {
        this.spawnPickup(bx + 20, by, { item: 'heartContainer' }, { persistentId: 'hc_' + mapId, taken });
      }
      this.spawnPortal(bx - 24, by, taken);
    }

    // player placement
    this.player.setPosition(sx, sy);
    this.player.vel.x = this.player.vel.y = 0;
    this.nudgeToWalkable(this.player);
    this.entryPos = { x: this.player.x, y: this.player.y };
    this.player.setDepth(50);

    // bookkeeping
    this.roomClearFired = false;
    this.healedThisVisit = false;
    this.warpsArmed = false;   // arm once the player steps off any warp tile
    this.talkGuard = null;
    this.openedThisVisit = {};
    if (prevMap !== mapId) {
      this.mapEntry = { map: mapId, room: roomKey, x: Math.floor(this.player.x / T), y: Math.floor(this.player.y / T) };
      this.autoSave();
    }

    // darkness
    this.darkRT.setVisible(!!room.dark);

    // music
    const music = this.boss ? (mapId === 'citadel' ? 'finalboss' : 'boss') : WORLD.musicFor(mapId, room);
    AUDIO.playSong(music);

    this.events.emit('hud');
  }

  drawTileAt(x, y, ground) {
    const T = CONFIG.TILE;
    ground = ground || WORLD.groundFor(this.mapId, this.room);
    const ch = this.grid[y][x];
    // destroy anything previously drawn for this cell: a stale depth-1
    // overlay would keep rendering above a depth-0 replacement (broken pots
    // looked intact in dungeons because the new floor drew UNDER the old pot)
    if (!this.tileRefs[y]) this.tileRefs[y] = [];
    const old = this.tileRefs[y][x];
    if (old) {
      this.animTiles = this.animTiles.filter((a) => !old.includes(a.img));
      for (const img of old) img.destroy();
    }
    const imgs = [];
    const base = this.add.image(x * T + 8, y * T + 8, ART.tex(TILES.get(ground).name, 0)).setDepth(0);
    imgs.push(base);
    if (ch !== ground) {
      const name = TILES.get(ch).name;
      const img = this.add.image(x * T + 8, y * T + 8, ART.tex(name, 0)).setDepth(1);
      imgs.push(img);
      if (ART.frames(name) > 1) this.animTiles.push({ img, name, frame: 0 });
    }
    this.tileRefs[y][x] = imgs;
    this.tileImgs.push(...imgs);
    return imgs;
  }

  redrawTile(tx, ty) {
    this.drawTileAt(tx, ty);
  }

  // generic floor results swap to the room's natural ground — a village pot
  // leaves grass behind, not a slab of dungeon floor
  groundedBecomes(becomes) {
    const b = becomes || '.';
    return (b === '.' || b === 'd' || b === 'e') ? WORLD.groundFor(this.mapId, this.room) : b;
  }

  // ============================== spawning ==============================
  spawnEnemy(type, tx, ty) {
    const def = ENEMY_TYPES[type];
    if (!def) { console.error('unknown enemy ' + type); return null; }
    if (this.enemies.length > 24) return null;
    const T = CONFIG.TILE;
    const e = this.add.sprite(tx * T + 8, ty * T + 8 - (def.big ? 8 : 0), ART.tex(def.art, 0)).setDepth(30);
    e.def = def; e.etype = type;
    e.bodyHalf = def.big ? 12 : 6;
    e.baseScale = 1;
    Enemies.initSprite(this, e);
    this.enemies.push(e);
    return e;
  }

  spawnBoss(spec) {
    const def = BOSSES[spec.type];
    if (!def) { console.error('unknown boss ' + spec.type); return; }
    const T = CONFIG.TILE;
    const b = this.add.sprite(spec.x * T + 8, spec.y * T + 8, ART.tex(def.art, 0)).setDepth(35);
    b.bossType = spec.type;
    b.def = def;
    b.hp = def.hp || 15;
    b.maxHp = b.hp;
    b.mem = {};
    b.invulnUntil = 0;
    b.bodyHalf = (def.w || 32) / 2 - 4;
    this.boss = b;
    try { if (def.create) def.create(this, b); } catch (err) { console.error('boss create', err); }
    AUDIO.sfx('bossRoar');
    this.shake(300, 0.006);
    this.events.emit('hud');
  }

  bossSetFrame(boss, i) {
    boss.setTexture(ART.tex(boss.def.art, i));
  }

  moveToward(boss, x, y, speed) {
    const dt = this.game.loop.delta;
    const dx = x - boss.x, dy = y - boss.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) return;
    const step = Math.min(speed * dt / 1000, d);
    const nx = boss.x + dx / d * step, ny = boss.y + dy / d * step;
    if (!this.blockedAt(nx, ny - 4, { enemy: true }) || boss.mem.ignoreWalls) { boss.x = nx; boss.y = ny; }
    else { // slide along axes
      if (!this.blockedAt(nx, boss.y, { enemy: true })) boss.x = nx;
      else if (!this.blockedAt(boss.x, ny, { enemy: true })) boss.y = ny;
    }
  }

  bossShoot(boss, opts) {
    opts = opts || {};
    let ang = opts.angle;
    if (opts.atPlayer || ang == null) {
      ang = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
    }
    this.spawnShot(boss.x, boss.y, ang, opts.speed || 90, opts.art || 'fireball', opts.dmg != null ? opts.dmg : 1, true);
  }

  bossShootSpread(boss, opts) {
    opts = opts || {};
    const count = Math.min(opts.count || 5, 12);
    const spread = opts.spread != null ? opts.spread : Math.PI / 3;
    let center = opts.angle;
    if (opts.atPlayer || center == null) {
      center = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
    }
    for (let i = 0; i < count; i++) {
      const a = count === 1 ? center : center - spread / 2 + spread * (i / (count - 1));
      this.spawnShot(boss.x, boss.y, a, opts.speed || 90, opts.art || 'fireball', opts.dmg != null ? opts.dmg : 1, true);
    }
  }

  enemyShoot(e, opts) {
    let ang = opts.angle;
    if (opts.atPlayer || ang == null) ang = Math.atan2(this.player.y - e.y, this.player.x - e.x);
    this.spawnShot(e.x, e.y, ang, opts.speed || 85, opts.art || 'seed', opts.dmg || 0.5, true);
  }

  spawnShot(x, y, angle, speed, art, dmg, fromEnemy) {
    if (this.shots.length > 40) return;
    const s = this.add.sprite(x, y, ART.tex(art, 0)).setDepth(55);
    s.rotation = angle;   // projectile art points right/east at rotation 0
    s.vx = Math.cos(angle) * speed; s.vy = Math.sin(angle) * speed;
    s.dmg = dmg; s.fromEnemy = fromEnemy; s.artKey = art; s.frameTick = 0; s.frameIdx = 0;
    this.shots.push(s);
    return s;
  }

  // Nearest tile center where a drop/portal can sit: walkable, not a pit,
  // hazard or warp tile, and not already used this placement round (`taken`).
  // Bosses die pressed against walls (bramblehorn charges them!), so anything
  // spawned relative to a death position MUST be snapped through this.
  safeDropPoint(px, py, taken) {
    const T = CONFIG.TILE;
    const cx = Phaser.Math.Clamp(Math.floor(px / T), 0, CONFIG.ROOM_W - 1);
    const cy = Phaser.Math.Clamp(Math.floor(py / T), 0, CONFIG.ROOM_H - 1);
    const ok = (tx, ty) => {
      if (tx < 0 || ty < 0 || tx >= CONFIG.ROOM_W || ty >= CONFIG.ROOM_H) return false;
      if (taken && taken.has(tx + ',' + ty)) return false;
      const td = TILES.get(this.tileAt(tx, ty));
      if (td.pit || td.hazard || td.warpTile) return false;
      return !this.blockedAt(tx * T + 8, ty * T + 8, {});
    };
    for (let r = 0; r <= 6; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const tx = cx + dx, ty = cy + dy;
          if (ok(tx, ty)) {
            if (taken) taken.add(tx + ',' + ty);
            return { x: tx * T + 8, y: ty * T + 8 };
          }
        }
      }
    }
    return this.entryPos ? { x: this.entryPos.x, y: this.entryPos.y } : { x: cx * T + 8, y: cy * T + 8 };
  }

  spawnPickup(px, py, spec, opts) {
    opts = opts || {};
    const pt = this.safeDropPoint(px, py, opts.taken);
    px = pt.x; py = pt.y;
    let art = 'gem';
    if (spec.item) art = ITEMS[spec.item] ? ITEMS[spec.item].art : spec.item;
    else if (spec.gems) art = spec.gems >= 5 ? 'gemBlue' : 'gem';
    else if (spec.arrows) art = 'arrowPickup';
    else if (spec.bombs) art = 'bombPickup';
    else if (spec.hearts) art = 'heart';
    const s = this.add.sprite(px, py, ART.tex(art, 0)).setDepth(15);
    s.spec = spec;
    s.persistentId = opts.persistentId || null;
    s.expiresAt = opts.persistentId ? 0 : this.time.now + 9000;
    s.bobBase = py;
    this.pickupsLive.push(s);
    return s;
  }

  spawnPortal(px, py, taken) {
    const pt = this.safeDropPoint(px, py, taken);
    const spr = this.add.sprite(pt.x, pt.y, ART.tex('portal', 0)).setDepth(14);
    this.portalLive.push({
      sprite: spr, tx: Math.floor(pt.x / CONFIG.TILE), ty: Math.floor(pt.y / CONFIG.TILE),
      destroy: () => spr.destroy(),
    });
    this.spawnEffect('sparkle', pt.x, pt.y, 100);
  }

  spawnEffect(art, x, y, msPerFrame) {
    const frames = ART.frames(art);
    const s = this.add.sprite(x, y, ART.tex(art, 0)).setDepth(60);
    let f = 0;
    const tick = () => {
      f++;
      if (f >= frames) { s.destroy(); return; }
      s.setTexture(ART.tex(art, f));
      this.time.delayedCall(msPerFrame || 90, tick);
    };
    this.time.delayedCall(msPerFrame || 90, tick);
    this.time.delayedCall(((frames) * (msPerFrame || 90)) + 400, () => { if (s.active) s.destroy(); });
    return s;
  }

  floatText(x, y, str, color) {
    const t = this.add.text(x, y - 8, str, {
      fontFamily: CONFIG.FONT, fontSize: '8px', color: color || '#ffffff',
    }).setShadow(1, 1, '#000000', 0).setOrigin(0.5).setDepth(70).setResolution(CONFIG.ZOOM * 2);
    this.tweens.add({ targets: t, y: y - 26, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  // ============================== giving ==============================
  give(spec, opts) {
    opts = opts || {};
    const p = this.player;
    if (!spec) return;
    if (spec.gems) {
      GS.gems = Math.min(CONFIG.CAPS.gems, GS.gems + spec.gems);
      this.sfx('gem'); this.floatText(p.x, p.y, '+' + spec.gems, '#7fe9ff');
    }
    if (spec.arrows) {
      GS.arrows = Math.min(CONFIG.CAPS.arrows, GS.arrows + spec.arrows);
      this.sfx('pickup'); this.floatText(p.x, p.y, `+${spec.arrows} arrows`, '#d8c89a');
    }
    if (spec.bombs) {
      GS.bombs = Math.min(CONFIG.CAPS.bombs, GS.bombs + spec.bombs);
      this.sfx('pickup'); this.floatText(p.x, p.y, `+${spec.bombs} bombs`, '#9ad8aa');
    }
    if (spec.hearts) {
      GS.hearts = Math.min(GS.maxHearts, GS.hearts + spec.hearts);
      this.sfx('heart');
    }
    if (spec.item) this.giveItem(spec.item, opts);
    this.events.emit('hud');
  }

  giveItem(key, opts) {
    const p = this.player;
    const meta = ITEMS[key] || { name: key, art: key, kind: 'special', desc: '' };
    if (key === 'smallKey') {
      GS.keys[this.mapId] = (GS.keys[this.mapId] || 0) + 1;
      this.sfx('key'); this.floatText(p.x, p.y, 'Small Key!', '#ffe97f');
      return;
    }
    if (key === 'bossKey') {
      Flags.set('bosskey_' + this.mapId);
      this.sfx('key'); this.banner(meta);
      return;
    }
    if (key === 'heartContainer') {
      GS.maxHearts = Math.min(CONFIG.PLAYER.MAX_HEARTS, GS.maxHearts + 1);
      GS.hearts = GS.maxHearts;
      this.banner(meta); AUDIO.playJingle('fanfare');
      this.autoSave();
      return;
    }
    if (key === 'acorn') {
      GS.acorns += 1;
      this.sfx('secret'); this.floatText(p.x, p.y, `Golden Acorn! (${GS.acorns}/12)`, '#ffd24a');
      return;
    }
    if (key === 'potion') {
      if (GS.potions >= CONFIG.CAPS.potions) { this.give({ gems: 20 }); return; }
      GS.potions += 1;
      this.sfx('pickup'); this.floatText(p.x, p.y, 'Red Potion!', '#ff7f7f');
      return;
    }
    if (key.indexOf('shard') === 0) {
      if (GS.shards.indexOf(key) < 0) GS.shards.push(key);
      this.banner(meta); AUDIO.playJingle('secret');
      if (GS.shards.length >= 3) Flags.set('all_shards');
      this.autoSave();
      return;
    }
    // equip/passive items
    if (GS.items[key]) { this.give({ gems: 20 }); return; }   // duplicate
    GS.items[key] = true;
    if (meta.flag) Flags.set(meta.flag);
    if (meta.kind === 'equip' && !GS.equipped) GS.equipped = key;
    // launchers come loaded — the banner says "press X!" and it must be true
    if (key === 'bow') GS.arrows = Math.min(CONFIG.CAPS.arrows, GS.arrows + 10);
    if (key === 'bombBag') GS.bombs = Math.min(CONFIG.CAPS.bombs, GS.bombs + 5);
    this.banner(meta); AUDIO.playJingle('fanfare');
    this.autoSave();
  }

  banner(meta) {
    this.bannerUntil = this.time.now + 2100;
    this.game.events.emit('ui:banner', { art: meta.art, name: meta.name, desc: meta.desc });
  }

  autoSave() {
    if (this._dying) return false;   // never snapshot a dead/falling player
    const T = CONFIG.TILE;
    if (this.mapId === 'overworld') {
      GS.checkpoint = {
        map: 'overworld', room: this.roomKey,
        x: Math.floor(this.player.x / T), y: Math.floor(this.player.y / T),
      };
    } else {
      GS.checkpoint = Object.assign({}, this.mapEntry);
    }
    const ok = SAVE.write();
    if (ok) this.game.events.emit('ui:saved');
    return ok;
  }

  // ============================== dialogue ==============================
  openDialogue(payload, onDone) {
    this.dialogOpen = true;
    this._dialogueDone = onDone || null;
    this.game.events.emit('ui:dialogue', payload);
  }

  onDialogueDone() {
    this.dialogOpen = false;
    const cb = this._dialogueDone;
    this._dialogueDone = null;
    // mashing the talk button must not instantly reopen the dialogue: ignore
    // interaction until the player moves away or pauses for a moment
    this.talkGuard = { x: this.player.x, y: this.player.y, until: this.time.now + 1500 };
    if (cb) cb();
  }

  // ============================== interaction ==============================
  tryInteract() {
    const p = this.player;
    if (this.talkGuard) {
      const g = this.talkGuard;
      const moved = Math.hypot(p.x - g.x, p.y - g.y) > 6;
      if (!moved && this.time.now < g.until) return true;  // swallow the press (no re-talk, no sword)
      this.talkGuard = null;
    }
    const f = Player.frontTile(p);

    for (const n of this.npcsLive) {
      if (n.tx === f.tx && n.ty === f.ty) { this.talkTo(n); return true; }
    }
    for (const s of this.signsLive) {
      if (s.tx === f.tx && s.ty === f.ty) {
        this.sfx('blip');
        this.openDialogue(Dialogue.sign(s.def.id));
        return true;
      }
    }
    for (const c of this.chestsLive) {
      if (c.tx === f.tx && c.ty === f.ty && !c.opened) { this.openChest(c); return true; }
    }
    for (const s of this.shopLive) {
      if (s.tx === f.tx && s.ty === f.ty) { this.tryBuy(s); return true; }
    }
    for (const d of this.doorsLive) {
      if (d.tx === f.tx && d.ty === f.ty && !d.isOpen) { this.tryUnlock(d); return true; }
    }
    return false;
  }

  talkTo(npc) {
    const id = npc.def.id;
    npc.sprite.setTexture(ART.tex(npc.def.art || 'villager', 0));
    // Nutwick's acorn rewards are engine-driven
    if (id === 'nutwick') {
      const tiers = [
        { need: 4, flag: 'nutwick_r1', give: { gems: 100 }, text: ['One hundred gems! Spend wisely.'] },
        { need: 8, flag: 'nutwick_r2', give: { item: 'heartContainer' }, text: ['A treasure of the great oak!'] },
        { need: 12, flag: 'nutwick_r3', give: { item: 'oakCharm' }, text: ['The Oak Charm! My finest gift.', 'You take half damage now!'] },
      ];
      for (const t of tiers) {
        if (GS.acorns >= t.need && !Flags.get(t.flag)) {
          Flags.set(t.flag);
          this.openDialogue({ pages: [['CHIT-CHIT! ' + GS.acorns + ' acorns!'], t.text] }, () => {
            this.give(t.give);
          });
          return;
        }
      }
    }
    const d = Dialogue.pick(id);
    Flags.set('npc_' + id + '_met');
    // Palabra: the payload carries WHO speaks (per-character voice) and the
    // English caption gloss (shown only at immersion level 0).
    const npcCfg = window.PALABRA_NPCS && window.PALABRA_NPCS[id];
    const payload = {
      pages: d.pages,
      gloss: d.gloss,
      speaker: npcCfg ? { name: npcCfg.name, voice: npcCfg.voice } : null,
    };
    this.openDialogue(payload, () => {
      if (d.set && d.set.flag) Flags.set(d.set.flag);
      if (d.give) {
        const g = Object.assign({}, d.give);
        if (g.once) {
          if (!Flags.get(g.once)) { Flags.set(g.once); delete g.once; this.give(g); }
        } else this.give(g);
      }
      // Dialogue-written missions launch the moment the talk ends: the
      // handoff variant (greeted, game not yet won) offers the mini-game.
      if (d.mission && window.PALABRA_MISSIONS && window.Palabra) {
        window.Palabra.openMission(window.PALABRA_MISSIONS[d.mission]);
      }
    });
  }

  openChest(c) {
    c.opened = true;
    Flags.set(`chest_${c.def.id}`);
    c.sprite.setTexture(ART.tex(c.def.big ? 'bigChestOpen' : 'chestOpen', 0));
    this.sfx('chest');
    // give synchronously: a save/quit during a delayed give would flag the
    // chest opened but never deliver its contents (incl. keys!)
    this.give(c.def.contents || { gems: 5 }, { big: c.def.big });
  }

  tryBuy(s) {
    const def = s.def;
    const price = def.price || 10;
    if (GS.gems < price) {
      this.sfx('denied');
      this.openDialogue({ pages: [[`That's ${price} gems.`, "You don't have enough!"]] });
      return;
    }
    // already own a unique item / full on potions?
    const unique = ITEMS[def.item] && (ITEMS[def.item].kind === 'equip' || ITEMS[def.item].kind === 'passive');
    if (unique && GS.items[def.item]) {
      this.openDialogue({ pages: [['You already have one of those!']] });
      return;
    }
    if (def.item === 'potion' && GS.potions >= CONFIG.CAPS.potions) {
      this.openDialogue({ pages: [["You can't carry more potions!"]] });
      return;
    }
    if (def.item === 'arrows' && !GS.items.bow) {
      this.openDialogue({ pages: [['You need a bow for those, dear!', 'I hear one waits in the forest temple.']] });
      return;
    }
    if (def.item === 'bombs' && !GS.items.bombBag) {
      this.openDialogue({ pages: [['You need a Bomb Bag to carry those!', 'Treasure hunters mention the desert ruins.']] });
      return;
    }
    if (def.item === 'arrows' && GS.arrows >= CONFIG.CAPS.arrows) {
      this.openDialogue({ pages: [['Your quiver is already full!']] });
      return;
    }
    if (def.item === 'bombs' && GS.bombs >= CONFIG.CAPS.bombs) {
      this.openDialogue({ pages: [['Your bomb bag is already full!']] });
      return;
    }
    GS.gems -= price;
    this.sfx('menuSelect');
    const spec = def.item === 'arrows' ? { arrows: 10 } : def.item === 'bombs' ? { bombs: 5 } : { item: def.item };
    this.give(spec);
    this.events.emit('hud');
  }

  tryUnlock(d) {
    if (this.time.now < this.unlockCooldown) return;
    this.unlockCooldown = this.time.now + 600;
    const kind = d.def.kind;
    if (kind === 'locked') {
      if ((GS.keys[this.mapId] || 0) > 0) {
        GS.keys[this.mapId] -= 1;
        this.openDoor(d, true);
        this.sfx('unlock');
      } else { this.sfx('denied'); this.floatText(d.sprite.x, d.sprite.y, 'Locked!', '#ffaaaa'); }
    } else if (kind === 'boss') {
      if (Flags.get('bosskey_' + this.mapId)) {
        this.openDoor(d, true);
        this.sfx('unlock');
      } else { this.sfx('denied'); this.floatText(d.sprite.x, d.sprite.y, 'Needs the Big Key!', '#ffaaaa'); }
    } else {
      this.sfx('denied');
    }
    this.events.emit('hud');
  }

  openDoor(d, persist) {
    if (d.isOpen) return;
    d.isOpen = true;
    d.sprite.setVisible(false);
    // carve a visible pathway — hiding only the door sprite left the solid
    // wall tile showing, so unlocked doors looked like plain wall
    this.setTile(d.tx, d.ty, WORLD.groundFor(this.mapId, this.room));
    this.spawnEffect('sparkle', d.tx * CONFIG.TILE + 8, d.ty * CONFIG.TILE + 8, 90);
    this.sfx('doorOpen');
    if (persist || (d.def.opens && d.def.opens.persist)) {
      Flags.set(`door_${this.mapId}_${this.roomKey}_${d.def.id}`);
    }
  }

  // ============================== combat ==============================
  startSwing() {
    const now = this.time.now;
    if (now < this.player.swingUntil) return;
    this.player.swingUntil = now + CONFIG.PLAYER.SWORD_MS;
    this.swingHits = new Set();
    this.sfx('sword');
    // slash visual
    const f = Player.frontTile(this.player);
    const sx = this.player.x + f.dx * 12, sy = this.player.y + f.dy * 12 + 2;
    const slash = this.add.image(sx, sy, ART.tex('slashArc', 0)).setDepth(56);
    slash.rotation = { down: Math.PI / 2, up: -Math.PI / 2, left: Math.PI, right: 0 }[this.player.facing] || 0;
    this.time.delayedCall(CONFIG.PLAYER.SWORD_MS * 0.8, () => slash.destroy());
  }

  swordDamage() { return GS.items.heroSword ? 2 : 1; }

  swingRect() {
    const f = Player.frontTile(this.player);
    const cx = this.player.x + f.dx * 13, cy = this.player.y + 2 + f.dy * 13;
    return new Phaser.Geom.Rectangle(cx - 11, cy - 11, 22, 22);
  }

  updateSwing() {
    if (this.time.now >= this.player.swingUntil || !this.swingHits) return;
    const rect = this.swingRect();
    const dmg = this.swordDamage();

    // enemies
    for (const e of this.enemies) {
      if (this.swingHits.has(e)) continue;
      if (Math.abs(e.x - rect.centerX) < rect.width / 2 + e.bodyHalf &&
          Math.abs(e.y - rect.centerY) < rect.height / 2 + e.bodyHalf) {
        this.swingHits.add(e);
        this.damageEnemy(e, dmg, 'sword');
      }
    }
    // boss
    if (this.boss && !this.swingHits.has(this.boss)) {
      const b = this.boss;
      if (Math.abs(b.x - rect.centerX) < rect.width / 2 + b.bodyHalf &&
          Math.abs(b.y - rect.centerY) < rect.height / 2 + b.bodyHalf) {
        this.swingHits.add(b);
        this.hitBoss(GS.items.heroSword ? 'heroSword' : 'sword', dmg);
      }
    }
    // cuttable tiles (check the 4 tiles the rect can overlap)
    const T = CONFIG.TILE;
    for (const [ox, oy] of [[rect.left, rect.top], [rect.right, rect.top], [rect.left, rect.bottom], [rect.right, rect.bottom], [rect.centerX, rect.centerY]]) {
      const tx = Math.floor(ox / T), ty = Math.floor(oy / T);
      const key = 'tile' + tx + ',' + ty;
      if (this.swingHits.has(key)) continue;
      const ch = this.tileAt(tx, ty);
      const td = TILES.get(ch);
      if (td.cut) {
        this.swingHits.add(key);
        this.destroyTile(tx, ty, 'cut');
      }
    }
    // crystal switches
    for (const s of this.switchesLive) {
      if (s.on || s.def.kind === 'eye' || this.swingHits.has(s)) continue;
      if (Math.abs(s.sprite.x - rect.centerX) < 16 && Math.abs(s.sprite.y - rect.centerY) < 16) {
        this.swingHits.add(s);
        this.triggerSwitch(s);
      }
    }
  }

  destroyTile(tx, ty, how) {
    const ch = this.tileAt(tx, ty);
    const td = TILES.get(ch);
    if (!(how === 'cut' ? td.cut : td.bomb)) return;
    this.setTile(tx, ty, this.groundedBecomes(td.becomes));
    this.spawnEffect('dust', tx * CONFIG.TILE + 8, ty * CONFIG.TILE + 8, 80);
    if (how === 'cut') this.sfx('hit');

    // persist real destruction (cracked walls / boulders); bushes+grass regrow
    if (td.bomb) Flags.set(`tile_${this.mapId}_${this.roomKey}_${tx}_${ty}`);

    // hidden warp reveal?
    const w = (this.room.warps || []).find((w) => w.x === tx && w.y === ty && w.hidden);
    if (w) {
      Flags.set(`tile_${this.mapId}_${this.roomKey}_${tx}_${ty}`);   // persist even for cut
      this.setTile(tx, ty, 'S');
      AUDIO.playJingle('secret');
      this.floatText(tx * CONFIG.TILE + 8, ty * CONFIG.TILE, 'Secret!', '#ffd24a');
    } else if (how === 'cut' && (ch === ',' || ch === 'B' || ch === 'O') && Math.random() < 0.22) {
      // grass/bush/pot drops
      const roll = Math.random();
      const spec = roll < 0.5 ? { hearts: 0.5 } : roll < 0.85 ? { gems: 1 } : { arrows: 3 };
      this.spawnPickup(tx * CONFIG.TILE + 8, ty * CONFIG.TILE + 8, spec, {});
    }
  }

  triggerSwitch(s) {
    s.on = true;
    Flags.set(`switch_${this.mapId}_${this.roomKey}_${s.def.id}`);
    s.sprite.setTexture(ART.tex(s.def.kind === 'eye' ? 'switchEyeHit' : 'switchCrystalHit', 0));
    this.sfx('switch');
    this.spawnEffect('sparkle', s.sprite.x, s.sprite.y, 90);
  }

  damageEnemy(e, dmg, source) {
    if (e.def.immune && e.def.immune.indexOf(source === 'heroSword' ? 'sword' : source) >= 0) {
      this.sfx('denied');
      this.floatText(e.x, e.y, 'clank!', '#aaaaaa');
      return;
    }
    e.hp -= dmg;
    e.hitFlashUntil = this.time.now + 150;
    this.sfx('hit');
    const dx = e.x - this.player.x, dy = e.y - this.player.y;
    const d = Math.hypot(dx, dy) || 1;
    e.knock = { vx: dx / d * 150, vy: dy / d * 150, until: this.time.now + 130 };
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e) {
    this.sfx('enemyDie');
    this.spawnEffect('explosion', e.x, e.y, 80);
    if (e.isMiniboss) {
      Flags.set(`mini_${this.mapId}_${this.roomKey}`);
      AUDIO.playJingle('secret');
      this.spawnPickup(e.x, e.y, { hearts: 2 }, {});
    } else {
      const drops = e.def.drops || {};
      const roll = Math.random();
      let acc = 0;
      for (const [what, p] of Object.entries(drops)) {
        acc += p;
        if (roll < acc) {
          const spec = what === 'heart' ? { hearts: 1 } : what === 'gems' ? { gems: Math.random() < 0.25 ? 5 : 1 }
            : what === 'arrows' ? { arrows: 3 } : what === 'bombs' ? { bombs: 2 } : null;
          if (spec) this.spawnPickup(e.x, e.y, spec, {});
          break;
        }
      }
    }
    const i = this.enemies.indexOf(e);
    if (i >= 0) this.enemies.splice(i, 1);
    e.destroy();
  }

  hitBoss(source, dmg) {
    const b = this.boss;
    if (!b) return;
    const now = this.time.now;
    if (now < b.invulnUntil) { this.sfx('denied'); return; }
    let applied = dmg;
    try {
      if (b.def.onHit) applied = b.def.onHit(this, b, source) || 0;
    } catch (err) { console.error('boss onHit', err); }
    if (applied <= 0) {
      this.sfx('denied');
      this.floatText(b.x, b.y - 14, 'clank!', '#aaaaaa');
      return;
    }
    b.hp -= applied;
    b.invulnUntil = Math.max(b.invulnUntil, now + 350);
    b.setTintFill(0xffffff);
    this.time.delayedCall(90, () => { if (b.active) b.clearTint(); });
    this.sfx('hit');
    this.events.emit('hud');
    if (b.hp <= 0) this.bossDefeated();
  }

  bossDefeated() {
    const b = this.boss;
    const type = b.bossType;
    const deathMap = this.mapId, deathRoom = this.roomKey;
    const sameRoom = () => this.mapId === deathMap && this.roomKey === deathRoom;

    // Morgrath phase 2 transform
    if (type === 'morgrath' && BOSSES.morgrath2) {
      this.shake(500, 0.01);
      this.sfx('bossRoar');
      this.spawnEffect('explosion', b.x, b.y, 100);
      const x = b.x, y = b.y;
      b.destroy();
      this.boss = null;
      this.time.delayedCall(900, () => {
        // only transform if the player stayed for it; otherwise re-entry
        // simply restarts phase 1 (boss flag is still unset)
        if (sameRoom() && !this.boss) {
          this.spawnBoss({ type: 'morgrath2', x: Math.floor(x / 16), y: Math.floor(y / 16) });
        }
      });
      return;
    }

    // real death — the kill counts immediately, no matter what happens next
    Flags.set('boss_' + deathMap);
    Flags.set(deathMap + '_complete');
    if (deathMap === 'citadel') {
      // VICTORY ceremony: nothing may hurt the player anymore
      Flags.set('game_complete');
      this._victoryPending = true;
      for (const e of this.enemies) e.destroy();
      this.enemies.length = 0;
      for (const s of this.shots) s.destroy();
      this.shots.length = 0;
      this.player.invulnUntil = this.time.now + 60000;
    }

    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 130, () => {
        if (b.active) this.spawnEffect('explosion', b.x + (Math.random() - 0.5) * 30, b.y + (Math.random() - 0.5) * 30, 70);
      });
    }
    this.shake(600, 0.012);
    this.sfx('bossRoar');
    const bx = b.x, by = b.y;
    this.time.delayedCall(800, () => {
      if (b.active) b.destroy();

      if (deathMap === 'citadel') {   // VICTORY!
        this.autoSave();
        this.time.delayedCall(1200, () => {
          AUDIO.stopSong();
          this.scene.stop('UI');
          this.scene.start('Victory');
        });
        return;
      }

      AUDIO.playJingle('fanfare');
      // rewards only land if the player is still here; loadRoom re-offers
      // anything uncollected on the next visit to the boss room
      if (sameRoom()) {
        const taken = new Set();
        const shard = DUNGEON_SHARDS[deathMap];
        if (shard && GS.shards.indexOf(shard) < 0 && !Flags.get('pickup_shard_' + deathMap)) {
          this.spawnPickup(bx, by, { item: shard }, { persistentId: 'shard_' + deathMap, taken });
        }
        if (!Flags.get('pickup_hc_' + deathMap)) {
          this.spawnPickup(bx + 20, by, { item: 'heartContainer' }, { persistentId: 'hc_' + deathMap, taken });
        }
        this.spawnPortal(bx - 24, by, taken);
        AUDIO.playSong(WORLD.musicFor(this.mapId, this.room));
      }
      this.autoSave();
      this.events.emit('hud');
    });
    this.boss = null;
  }

  // ============================== items use ==============================
  useEquipped() {
    const eq = GS.equipped;
    const now = this.time.now;
    if (!eq || !GS.items[eq]) {
      if (eq === 'potion' && GS.potions > 0) {} else { this.sfx('denied'); return; }
    }
    if (eq === 'bow') {
      if (GS.arrows <= 0) { this.sfx('denied'); this.floatText(this.player.x, this.player.y, 'No arrows!', '#ffaaaa'); return; }
      GS.arrows -= 1;
      const ang = { down: Math.PI / 2, up: -Math.PI / 2, left: Math.PI, right: 0 }[this.player.facing];
      const s = this.spawnShot(this.player.x, this.player.y, ang, 200, 'arrow', this.swordDamage(), false);
      if (s) s.isArrow = true;
      this.sfx('arrow');
      this.player.raiseUntil = now + 130;
    } else if (eq === 'bombBag') {
      if (GS.bombs <= 0) { this.sfx('denied'); this.floatText(this.player.x, this.player.y, 'No bombs!', '#ffaaaa'); return; }
      const f = Player.frontTile(this.player);
      let bx = f.tx, by = f.ty;
      if (this.blockedAt(bx * 16 + 8, by * 16 + 8, {})) { bx = Math.floor(this.player.x / 16); by = Math.floor(this.player.y / 16); }
      GS.bombs -= 1;
      const spr = this.add.sprite(bx * 16 + 8, by * 16 + 8, ART.tex('bombPickup', 0)).setDepth(20);
      this.bombsLive.push({ sprite: spr, explodeAt: now + 1400, tx: bx, ty: by, destroy: () => spr.destroy() });
      this.sfx('bombPlace');
    } else if (eq === 'lantern') {
      const f = Player.frontTile(this.player);
      const torch = this.torchesLive.find((t) => !t.lit && Math.abs(t.tx - f.tx) <= 1 && Math.abs(t.ty - f.ty) <= 1);
      if (torch) {
        torch.lit = true;
        Flags.set(`torch_${this.mapId}_${this.roomKey}_${torch.def.id}`);
        torch.sprite.setTexture(ART.tex('torchLit', 0));
        this.sfx('torch');
        this.spawnEffect('sparkle', torch.sprite.x, torch.sprite.y, 90);
      } else {
        this.lanternFlareUntil = now + 1600;
        this.sfx('torch');
      }
      this.player.raiseUntil = now + 160;
    } else if (eq === 'potion') {
      if (GS.potions <= 0) { this.sfx('denied'); return; }
      if (GS.hearts >= GS.maxHearts) { this.floatText(this.player.x, this.player.y, 'Hearts are full!', '#aaffaa'); return; }
      GS.potions -= 1;
      GS.hearts = GS.maxHearts;
      this.sfx('potion');
      this.spawnEffect('sparkle', this.player.x, this.player.y - 8, 100);
      this.player.raiseUntil = now + 250;
    }
    this.events.emit('hud');
  }

  cycleEquip() {
    const owned = EQUIPPABLES.filter((k) => GS.items[k] || (k === 'potion' && GS.potions > 0));
    if (!owned.length) { this.sfx('denied'); return; }
    const i = owned.indexOf(GS.equipped);
    GS.equipped = owned[(i + 1) % owned.length];
    this.sfx('menuMove');
    this.events.emit('hud');
  }

  // ============================== death / bombs / hazards ==============================
  onPlayerDeath() {
    if (this._dying || this._victoryPending) return;
    this._dying = true;
    AUDIO.stopSong();
    this.sfx('fall');
    this.cameras.main.fadeOut(900, 10, 0, 0);
    this.time.delayedCall(1000, () => {
      this._dying = false;
      this.scene.stop('UI');
      this.scene.start('GameOver');
    });
  }

  explodeBomb(b) {
    const T = CONFIG.TILE;
    this.sfx('explosion');
    this.shake(200, 0.008);
    this.spawnEffect('explosion', b.sprite.x, b.sprite.y, 90);
    // destroy bombable tiles 3x3
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = b.tx + dx, ty = b.ty + dy;
        if (TILES.get(this.tileAt(tx, ty)).bomb) this.destroyTile(tx, ty, 'bomb');
      }
    }
    // damage
    const bx = b.sprite.x, by = b.sprite.y;
    for (const e of this.enemies.slice()) {
      if (Math.hypot(e.x - bx, e.y - by) < 30) this.damageEnemy(e, 2, 'bomb');
    }
    if (this.boss && Math.hypot(this.boss.x - bx, this.boss.y - by) < 38) this.hitBoss('bomb', 2);
    if (Math.hypot(this.player.x - bx, this.player.y - by) < 22) {
      Player.damage(this, this.player, 0.5, bx, by);
    }
    b.destroy();
    const i = this.bombsLive.indexOf(b);
    if (i >= 0) this.bombsLive.splice(i, 1);
  }

  fallInPit() {
    if (this._falling) return;
    this._falling = true;
    const p = this.player;
    this.sfx('fall');
    // apply the half-heart directly: Player.damage would be swallowed by the
    // i-frames we grant for the respawn
    GS.hearts = Math.max(0, GS.hearts - 0.5);
    this.events.emit('hud');
    this.tweens.add({
      targets: p, scaleX: 0.1, scaleY: 0.1, angle: 270, duration: 350,
      onComplete: () => {
        this._falling = false;
        p.setScale(1); p.angle = 0;
        p.setPosition(this.entryPos.x, this.entryPos.y);
        this.nudgeToWalkable(p);
        p.invulnUntil = this.time.now + 1200;
        if (GS.hearts <= 0) this.onPlayerDeath();
      },
    });
  }

  // ============================== transitions / warps ==============================
  transitionTo(mapId, roomKey, tx, ty, useFade) {
    if (this.transitioning) return;
    this.transitioning = true;
    const cam = this.cameras.main;
    cam.fadeOut(useFade ? 220 : 120, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => {
      this.loadRoom(mapId, roomKey, tx, ty);
      cam.fadeIn(useFade ? 220 : 120, 0, 0, 0);
      this.time.delayedCall(60, () => { this.transitioning = false; });
    });
  }

  checkEdgeTransition() {
    if (this.room.isolated || this.transitioning) return;
    const T = CONFIG.TILE, W = CONFIG.ROOM_W * T, H = CONFIG.ROOM_H * T;
    const p = this.player;
    const [c, r] = this.gridKey();
    if (c == null) return;
    let dir = null;
    if (p.x < 3) dir = [-1, 0];
    else if (p.x > W - 3) dir = [1, 0];
    else if (p.y < 3) dir = [0, -1];
    else if (p.y > H - 3) dir = [0, 1];
    if (!dir) return;
    const nk = `${c + dir[0]},${r + dir[1]}`;
    const dest = WORLD.room(this.mapId, nk);
    if (!dest) {
      p.x = Phaser.Math.Clamp(p.x, 4, W - 4);
      p.y = Phaser.Math.Clamp(p.y, 4, H - 4);
      return;
    }
    let ntx, nty;
    if (dir[0] === -1) { ntx = CONFIG.ROOM_W - 1; nty = Math.floor(p.y / T); }
    else if (dir[0] === 1) { ntx = 0; nty = Math.floor(p.y / T); }
    else if (dir[1] === -1) { ntx = Math.floor(p.x / T); nty = CONFIG.ROOM_H - 1; }
    else { ntx = Math.floor(p.x / T); nty = 0; }
    // never land ON a closed door in the destination room — that would let
    // the player be nudged past a lock they never opened
    const closedDoor = (dest.doors || []).some((d) =>
      d.x === ntx && d.y === nty && !Flags.get(`door_${this.mapId}_${nk}_${d.id}`));
    if (closedDoor) {
      p.x = Phaser.Math.Clamp(p.x, 4, W - 4);
      p.y = Phaser.Math.Clamp(p.y, 4, H - 4);
      return;
    }
    this.transitionTo(this.mapId, nk, ntx, nty, false);
  }

  checkWarps() {
    if (this.time.now < this.warpCooldown || this.transitioning) return;
    const T = CONFIG.TILE;
    const tx = Math.floor(this.player.x / T), ty = Math.floor((this.player.y + 3) / T);
    // don't re-trigger a warp until the player has stepped off warp tiles once
    // (covers content that lands arrivals directly on the return warp)
    const onWarpTile = TILES.get(this.tileAt(tx, ty)).warpTile ||
      (this.room.warps || []).some((w) => w.x === tx && w.y === ty) ||
      this.portalLive.some((p) => p.tx === tx && p.ty === ty);
    if (!this.warpsArmed) {
      if (!onWarpTile) this.warpsArmed = true;
      return;
    }
    // boss portal
    for (const pt of this.portalLive) {
      if (pt.tx === tx && pt.ty === ty) {
        const dEntry = this.dungeonEntry();
        this.warpCooldown = this.time.now + 800;
        this.sfx('stairs');
        this.transitionTo(dEntry.map, dEntry.room, dEntry.x, dEntry.y, true);
        return;
      }
    }
    const w = (this.room.warps || []).find((w) => w.x === tx && w.y === ty);
    if (!w || !w.to) return;
    if (w.hidden && !Flags.get(`tile_${this.mapId}_${this.roomKey}_${w.x}_${w.y}`)) return;
    this.warpCooldown = this.time.now + 800;
    this.sfx('stairs');
    this.transitionTo(w.to.map, w.to.room, w.to.x != null ? w.to.x : 10, w.to.y != null ? w.to.y : 8, true);
  }

  dungeonEntry() {
    // warp back to where we entered this map from (the overworld side)
    const cp = this.mapEntry;
    if (cp && cp.map === this.mapId) {
      return { map: this.mapId, room: cp.room, x: cp.x, y: cp.y };
    }
    return Object.assign({}, CONFIG.START);
  }

  // Pause-menu safety net: warp back to this map's entrance room (where the
  // player arrived). Frees anyone wedged in a room whose exits have re-sealed,
  // without forcing a death. No-op in the overworld (there is no entrance).
  returnToEntrance() {
    if (this.transitioning || this.mapId === 'overworld') return;
    const e = this.dungeonEntry();
    this.sfx('stairs');
    this.transitionTo(e.map, e.room, e.x, e.y, true);
  }

  // ============================== per-frame ==============================
  update(t, dtRaw) {
    if (!GS || !this.room) return;
    // A Palabra mini-game is open on top of the world: hold everything exactly
    // where it is (pending presses included) until the mission returns.
    if (window.PALABRA_MISSION_OPEN) {
      this.pending = {};
      return;
    }
    const dt = Math.min(dtRaw, 50);
    const now = this.time.now;

    // tile animations + idle visuals tick even while frozen
    this.tickVisuals(dt);

    // consume pending one-shot presses EVERY frame, so a press made while a
    // dialogue/banner was open doesn't fire the instant it closes
    const pPause = !!this.pending.pause;
    const pCycle = !!this.pending.cycle;
    const pAction = !!this.pending.action;
    const pItem = !!this.pending.item;
    this.pending = {};

    if (this.frozen()) return;
    GS.playMs += dt;

    // ---- input one-shots ----
    if (pPause && now > (this.pauseGuard || 0)) {
      this.scene.launch('Pause');
      this.scene.pause();
      return;
    }
    if (pCycle) this.cycleEquip();
    if (pAction) {
      if (!this.tryInteract()) this.startSwing();
    }
    if (pItem) this.useEquipped();

    // ---- player ----
    Player.update(this, this.player, dt);
    this.updateSwing();
    this.updatePushing(dt);

    // ---- enemies ----
    for (const e of this.enemies.slice()) {
      Enemies.update(this, e, dt);
      // touch damage (dmg:0 is a real value — turrets don't hurt on contact)
      const touchDmg = e.def.dmg != null ? e.def.dmg : 0.5;
      const reach = e.bodyHalf + 4;
      if (touchDmg > 0 && Math.abs(e.x - this.player.x) < reach && Math.abs(e.y - this.player.y) < reach) {
        Player.damage(this, this.player, touchDmg, e.x, e.y);
      }
    }

    // ---- boss ----
    if (this.boss) {
      try { if (this.boss.def.update) this.boss.def.update(this, this.boss, dt); }
      catch (err) { console.error('boss update', err); }
      const b = this.boss;
      if (b && Math.abs(b.x - this.player.x) < b.bodyHalf + 5 && Math.abs(b.y - this.player.y) < b.bodyHalf + 5) {
        Player.damage(this, this.player, b.def.dmg || 1, b.x, b.y);
      }
    }

    // ---- shots ----
    for (const s of this.shots.slice()) {
      s.x += s.vx * dt / 1000;
      s.y += s.vy * dt / 1000;
      s.frameTick += dt;
      if (s.frameTick > 120) { s.frameTick = 0; s.frameIdx = (s.frameIdx + 1) % ART.frames(s.artKey); s.setTexture(ART.tex(s.artKey, s.frameIdx)); }
      let dead = false;
      if (!this.inRoom(s.x, s.y)) dead = true;
      else {
        const ch = this.tileAtPixel(s.x, s.y);
        if (TILES.isSolid(ch) && TILES.get(ch).name !== 'water') dead = true;
        for (const d of this.doorsLive) if (!d.isOpen && d.tx === Math.floor(s.x / 16) && d.ty === Math.floor(s.y / 16)) dead = true;
      }
      if (s.fromEnemy) {
        if (Math.abs(s.x - this.player.x) < 7 && Math.abs(s.y - this.player.y) < 8) {
          Player.damage(this, this.player, s.dmg, s.x - s.vx * 0.01, s.y - s.vy * 0.01);
          dead = true;
        }
      } else {
        for (const e of this.enemies) {
          if (Math.abs(s.x - e.x) < e.bodyHalf + 3 && Math.abs(s.y - e.y) < e.bodyHalf + 3) {
            this.damageEnemy(e, s.dmg, s.isArrow ? 'arrow' : 'shot');
            dead = true; break;
          }
        }
        if (!dead && this.boss) {
          const b = this.boss;
          if (Math.abs(s.x - b.x) < b.bodyHalf + 3 && Math.abs(s.y - b.y) < b.bodyHalf + 3) {
            this.hitBoss('arrow', s.dmg);
            dead = true;
          }
        }
        // eye + crystal switches
        for (const sw of this.switchesLive) {
          if (!sw.on && Math.abs(s.x - sw.sprite.x) < 9 && Math.abs(s.y - sw.sprite.y) < 9) {
            this.triggerSwitch(sw);
            dead = true;
          }
        }
      }
      if (dead) {
        const i = this.shots.indexOf(s);
        if (i >= 0) this.shots.splice(i, 1);
        s.destroy();
      }
    }

    // ---- bombs ----
    for (const b of this.bombsLive.slice()) {
      b.sprite.setAlpha(Math.floor(now / 120) % 2 ? 1 : 0.75);
      if (now >= b.explodeAt) this.explodeBomb(b);
    }

    // ---- pickups ----
    for (const pk of this.pickupsLive.slice()) {
      pk.y = pk.bobBase + Math.sin(now / 250 + pk.bobBase) * 1.5;
      if (pk.expiresAt && now > pk.expiresAt) {
        const i = this.pickupsLive.indexOf(pk);
        if (i >= 0) this.pickupsLive.splice(i, 1);
        pk.destroy();
        continue;
      }
      if (pk.expiresAt && pk.expiresAt - now < 2500) pk.setAlpha(Math.floor(now / 110) % 2 ? 1 : 0.4);
      if (Math.abs(pk.x - this.player.x) < 10 && Math.abs(pk.y - this.player.y) < 11) {
        if (pk.persistentId) Flags.set('pickup_' + pk.persistentId);
        const i = this.pickupsLive.indexOf(pk);
        if (i >= 0) this.pickupsLive.splice(i, 1);
        const spec = pk.spec;
        pk.destroy();
        if (spec.hearts && !spec.item) this.sfx('heart');
        this.give(spec);
      }
    }

    // ---- plates / doors / clear ----
    this.updatePlates();
    this.updateDoors();
    this.checkRoomClear();

    // ---- hazards under the player ----
    const ptx = Math.floor(this.player.x / 16), pty = Math.floor((this.player.y + 4) / 16);
    const ptd = TILES.get(this.tileAt(ptx, pty));
    if (ptd.pit) this.fallInPit();
    else if (ptd.hazard) Player.damage(this, this.player, 0.5, this.player.x, this.player.y + 6);
    else {
      // solid hazards (lava walls, cactus) burn when pressed flush against
      const f = Player.frontTile(this.player);
      const ftd = TILES.get(this.tileAt(f.tx, f.ty));
      if (ftd.solid && ftd.hazard &&
          Math.abs(this.player.x - (f.tx * 16 + 8)) < 14 &&
          Math.abs(this.player.y + 4 - (f.ty * 16 + 8)) < 14) {
        Player.damage(this, this.player, 0.5, f.tx * 16 + 8, f.ty * 16 + 8);
      }
    }

    // ---- fairy pond heal ----
    if (this.room.heal && !this.healedThisVisit && GS.hearts < GS.maxHearts) {
      const cx = CONFIG.ROOM_W * 8, cy = CONFIG.ROOM_H * 8;
      if (Math.hypot(this.player.x - cx, this.player.y - cy) < 40) {
        this.healedThisVisit = true;
        GS.hearts = GS.maxHearts;
        this.sfx('heart');
        AUDIO.playJingle('secret');
        for (let i = 0; i < 4; i++) {
          this.time.delayedCall(i * 150, () => this.spawnEffect('sparkle', this.player.x + (Math.random() - 0.5) * 24, this.player.y + (Math.random() - 0.5) * 24, 110));
        }
        this.events.emit('hud');
      }
    }

    // ---- barrier ----
    if (this.barrierLive.length && GS.shards.length >= 3 && !Flags.get('barrier_down')) {
      Flags.set('barrier_down');
      this.sfx('barrier');
      AUDIO.playJingle('secret');
      for (const b of this.barrierLive) {
        this.spawnEffect('sparkle', b.sprite.x, b.sprite.y, 110);
        b.destroy();
      }
      this.barrierLive.length = 0;
      this.floatText(this.player.x, this.player.y - 12, 'The barrier dissolves!', '#caa9ff');
      this.autoSave();
    }

    // ---- movement-based world checks ----
    this.checkWarps();
    this.checkEdgeTransition();
    this.updateDarkness();
  }

  tickVisuals(dt) {
    this._animAcc = (this._animAcc || 0) + dt;
    if (this._animAcc > 400) {
      this._animAcc = 0;
      for (const at of this.animTiles) {
        at.frame = (at.frame + 1) % ART.frames(at.name);
        at.img.setTexture(ART.tex(at.name, at.frame));
      }
      for (const t of this.torchesLive) {
        if (t.lit) t.sprite.setTexture(ART.tex('torchLit', Math.floor(Math.random() * ART.frames('torchLit'))));
      }
      for (const b of this.barrierLive) b.sprite.setTexture(ART.tex('barrierTile', Math.floor(this.time.now / 400) % ART.frames('barrierTile')));
      for (const pt of this.portalLive) pt.sprite.setTexture(ART.tex('portal', Math.floor(this.time.now / 400) % ART.frames('portal')));
    }
    for (const n of this.npcsLive) {
      n.tick += dt;
      if (n.tick > 500) {
        n.tick = 0;
        n.frame = 1 - n.frame;
        n.sprite.setTexture(ART.tex(n.def.art || 'villager', n.frame));
      }
    }
  }

  updatePushing(dt) {
    const k = this.keys;
    const moving = k.left.isDown || k.right.isDown || k.up.isDown || k.down.isDown ||
      k.a.isDown || k.d.isDown || k.w.isDown || k.s.isDown;
    if (!moving) { this.pushMs = 0; return; }
    const f = Player.frontTile(this.player);
    const block = this.blocksLive.find((b) => !b.moving && b.tx === f.tx && b.ty === f.ty);
    if (!block) { this.pushMs = 0; return; }
    // only count push time when actually walking into it
    const dirOk =
      (f.dx === 1 && (k.right.isDown || k.d.isDown)) || (f.dx === -1 && (k.left.isDown || k.a.isDown)) ||
      (f.dy === 1 && (k.down.isDown || k.s.isDown)) || (f.dy === -1 && (k.up.isDown || k.w.isDown));
    if (!dirOk) { this.pushMs = 0; return; }
    this.pushMs += dt;
    if (this.pushMs < 190) return;
    this.pushMs = 0;

    // slide: on ice keep going until obstacle, else 1 tile
    let nx = block.tx, ny = block.ty, steps = 0;
    do {
      const tx2 = nx + f.dx, ty2 = ny + f.dy;
      const ch = this.tileAt(tx2, ty2);
      const td = TILES.get(ch);
      if (td.solid || td.pit || TILES.get(ch).warpTile) break;
      if (this.doorsLive.some((d) => !d.isOpen && d.tx === tx2 && d.ty === ty2)) break;
      if (this.blocksLive.some((b) => b !== block && b.tx === tx2 && b.ty === ty2)) break;
      if (this.chestsLive.some((c) => c.tx === tx2 && c.ty === ty2)) break;
      if (this.switchesLive.some((s) => s.tx === tx2 && s.ty === ty2)) break;
      if (this.torchesLive.some((t2) => t2.tx === tx2 && t2.ty === ty2)) break;
      nx = tx2; ny = ty2; steps++;
      if (!TILES.get(this.tileAt(nx, ny)).slide) break;   // keep sliding only on ice
    } while (steps < 20);
    if (!steps) return;

    block.moving = true;
    block.tx = nx; block.ty = ny;
    this.sfx('push');
    this.tweens.add({
      targets: block.sprite, x: nx * 16 + 8, y: ny * 16 + 8,
      duration: 110 * Math.max(steps, 1),
      onComplete: () => { block.moving = false; },
    });
  }

  updatePlates() {
    const ptx = Math.floor(this.player.x / 16), pty = Math.floor((this.player.y + 4) / 16);
    for (const pl of this.platesLive) {
      const pressed = (pl.tx === ptx && pl.ty === pty) ||
        this.blocksLive.some((b) => b.tx === pl.tx && b.ty === pl.ty);
      if (pressed && !pl.pressed) this.sfx('plate');
      pl.pressed = pressed;
      pl.sprite.setTexture(ART.tex(pressed ? 'platePressed' : 'plate', 0));
    }
  }

  roomEnemiesAlive() { return this.enemies.length; }

  updateDoors() {
    for (const d of this.doorsLive) {
      if (d.isOpen || d.def.kind !== 'sealed') continue;
      const o = d.def.opens || {};
      let ok = true;
      if (o.plates) ok = ok && o.plates.every((id) => this.platesLive.some((p) => p.def.id === id && p.pressed));
      if (o.torches) ok = ok && o.torches.every((id) => this.torchesLive.some((t) => t.def.id === id && t.lit));
      if (o.switches) ok = ok && o.switches.every((id) => this.switchesLive.some((s) => s.def.id === id && s.on));
      if (o.clear) ok = ok && this.roomEnemiesAlive() === 0 && !this.boss;
      if (!o.plates && !o.torches && !o.switches && !o.clear) ok = false;  // needs onClear to open it
      if (ok) this.openDoor(d, !!o.persist);
    }
  }

  checkRoomClear() {
    if (this.roomClearFired) return;
    const hadCombat = (this.room.enemies && this.room.enemies.length) || this.room.miniboss;
    if (!hadCombat) return;
    if (this.roomEnemiesAlive() > 0 || this.boss) return;
    this.roomClearFired = true;
    const oc = this.room.onClear;
    if (!oc) return;
    let changed = false;
    if (oc.flag && !Flags.get(oc.flag)) { Flags.set(oc.flag); changed = true; }
    if (oc.openDoors) {
      for (const id of oc.openDoors) {
        const d = this.doorsLive.find((dd) => dd.def.id === id);
        if (d && !d.isOpen) { this.openDoor(d, true); changed = true; }
      }
    }
    if (changed) this.sfx('secret');
    if (oc.chest && !this.chestsLive.some((c) => c.def.id === oc.chest.id)) {
      const c = oc.chest;
      const opened = Flags.get(`chest_${c.id}`);
      const spr = this.add.image(c.x * 16 + 8, c.y * 16 + 8,
        ART.tex(opened ? (c.big ? 'bigChestOpen' : 'chestOpen') : (c.big ? 'bigChestClosed' : 'chestClosed'), 0)).setDepth(11);
      this.chestsLive.push({ def: c, tx: c.x, ty: c.y, opened, sprite: spr, destroy: () => spr.destroy() });
      this.spawnEffect('sparkle', c.x * 16 + 8, c.y * 16 + 8, 90);
    }
  }

  updateDarkness() {
    if (!this.room.dark) return;
    const rt = this.darkRT;
    rt.clear();
    rt.fill(0x000008, 0.93);
    const radius = (GS.items.lantern ? 1.5 : 1) * (this.time.now < this.lanternFlareUntil ? 1.6 : 1);
    this.lightBrush.setScale(radius);
    rt.erase(this.lightBrush, this.player.x, this.player.y);
    this.lightBrush.setScale(0.8);
    for (const t of this.torchesLive) {
      if (t.lit) rt.erase(this.lightBrush, t.sprite.x, t.sprite.y);
    }
  }
};
