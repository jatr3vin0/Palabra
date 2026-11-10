// src/bosses.js — The Shattered Crown — boss behavior code.
// Plain JS, classic script (no modules, no Phaser calls). Attaches ONLY to the
// documented BOSSES registry. Uses ONLY the documented helpers:
//   scene.bossShoot, scene.bossShootSpread, scene.spawnEnemy, scene.playerPos,
//   scene.moveToward, scene.tileAtPixel, scene.shake, scene.sfx,
//   scene.bossSetFrame, scene.time.now, boss.mem, boss.hp, boss.invulnUntil.
//
// Bosses: bramblehorn (D1), sandWyrm (D2), frostRevenant (D3),
//         morgrath (citadel phase 1), morgrath2 (citadel phase 2, 48x48).
(function () {
  'use strict';

  window.BOSSES = window.BOSSES || {};
  var BOSSES = window.BOSSES;

  var T = (window.CONFIG && window.CONFIG.TILE) || 16;
  var ROOM_PW = ((window.CONFIG && window.CONFIG.ROOM_W) || 20) * T;
  var ROOM_PH = ((window.CONFIG && window.CONFIG.ROOM_H) || 12) * T;

  // ---------------------------------------------------------------- helpers
  // Every helper is defensive: missing engine functions never throw.

  function now(scene) {
    return (scene && scene.time && typeof scene.time.now === 'number')
      ? scene.time.now : Date.now();
  }
  function sfx(scene, name) {
    if (scene && typeof scene.sfx === 'function') scene.sfx(name);
  }
  function shake(scene, ms, power) {
    if (scene && typeof scene.shake === 'function') scene.shake(ms, power);
  }
  function setFrame(scene, boss, i) {
    if (scene && typeof scene.bossSetFrame === 'function') scene.bossSetFrame(boss, i);
  }
  function playerPos(scene, boss) {
    if (scene && typeof scene.playerPos === 'function') {
      var p = scene.playerPos();
      if (p && typeof p.x === 'number' && typeof p.y === 'number') return p;
    }
    return { x: boss.x || 0, y: boss.y || 0 };
  }
  function shoot(scene, boss, opts) {
    if (scene && typeof scene.bossShoot === 'function') scene.bossShoot(boss, opts);
  }
  function shootSpread(scene, boss, opts) {
    if (scene && typeof scene.bossShootSpread === 'function') scene.bossShootSpread(boss, opts);
  }
  function moveToward(scene, boss, x, y, speed) {
    if (scene && typeof scene.moveToward === 'function') scene.moveToward(boss, x, y, speed);
  }
  function solidAtPixel(scene, x, y) {
    if (x < 0 || y < 0 || x >= ROOM_PW || y >= ROOM_PH) return true; // out of arena = wall
    if (!scene || typeof scene.tileAtPixel !== 'function') return false;
    var ch = scene.tileAtPixel(x, y);
    var TL = window.TILES;
    return !!(TL && typeof TL.isSolid === 'function' && TL.isSolid(ch));
  }
  function dist(ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    return Math.sqrt(dx * dx + dy * dy);
  }
  // Normalized direction with guarded division (never divides by ~zero).
  function norm(dx, dy) {
    var len = Math.sqrt(dx * dx + dy * dy);
    if (!(len > 0.0001)) return { x: 0, y: 1, len: 0 };
    return { x: dx / len, y: dy / len, len: len };
  }
  function cardinalToward(dx, dy) {
    if (Math.abs(dx) >= Math.abs(dy)) return { x: dx >= 0 ? 1 : -1, y: 0 };
    return { x: 0, y: dy >= 0 ? 1 : -1 };
  }
  // Clamp dt so lag spikes never tunnel a charging boss through a wall.
  function clampDt(dt) {
    return (typeof dt === 'number' && dt > 0) ? Math.min(dt, 100) : 16;
  }
  // One step of a straight dash. Returns true when a wall (or arena edge) stops it.
  function dashStep(scene, boss, dirX, dirY, speed, dt, halfBody) {
    var step = speed * (dt / 1000);
    if (!(step > 0)) return false;
    var probeX = boss.x + dirX * (step + halfBody);
    var probeY = boss.y + dirY * (step + halfBody);
    if (solidAtPixel(scene, probeX, probeY)) return true;
    boss.x += dirX * step;
    boss.y += dirY * step;
    return false;
  }
  // Pick a walkable pixel spot near (x,y), ring minR..maxR, inside the arena.
  function pickSpotNear(scene, x, y, minR, maxR) {
    for (var i = 0; i < 10; i++) {
      var ang = Math.random() * Math.PI * 2;
      var r = minR + Math.random() * Math.max(1, maxR - minR);
      var px = Math.max(T * 1.5, Math.min(ROOM_PW - T * 1.5, x + Math.cos(ang) * r));
      var py = Math.max(T * 1.5, Math.min(ROOM_PH - T * 1.5, y + Math.sin(ang) * r));
      if (!solidAtPixel(scene, px, py)) return { x: px, y: py };
    }
    return null;
  }
  // Spawn a capped minion on a walkable tile. Tracks spawn count in boss.mem.
  function spawnMinion(scene, boss, type, tx, ty, cap) {
    var m = boss.mem || (boss.mem = {});
    m.summons = m.summons || 0;
    if (m.summons >= cap) return false;
    if (!scene || typeof scene.spawnEnemy !== 'function') return false;
    tx = Math.max(1, Math.min(((window.CONFIG && window.CONFIG.ROOM_W) || 20) - 2, Math.round(tx)));
    ty = Math.max(1, Math.min(((window.CONFIG && window.CONFIG.ROOM_H) || 12) - 2, Math.round(ty)));
    if (solidAtPixel(scene, tx * T + T / 2, ty * T + T / 2)) return false;
    scene.spawnEnemy(type, tx, ty);
    m.summons++;
    return true;
  }
  function weaponDamage(source) {
    if (source === 'heroSword' || source === 'bomb') return 2;
    return 1; // sword, arrow, anything unexpected
  }
  // Gentle 2-frame walk animation.
  function walkAnim(scene, boss, dt, ms) {
    var m = boss.mem || (boss.mem = {});
    m.animT = (m.animT || 0) + dt;
    if (m.animT >= (ms || 280)) {
      m.animT = 0;
      m.animF = m.animF ? 0 : 1;
      setFrame(scene, boss, m.animF);
    }
  }
  // Fast 2-frame flicker used for telegraphs.
  function flicker(scene, boss, t, ms) {
    setFrame(scene, boss, Math.floor(t / (ms || 90)) % 2);
  }

  // ============================================================ BRAMBLEHORN
  // D1 boss, 14 hp giant beetle. Tracks the player, telegraphs loudly, then
  // charges in a straight cardinal line. Crashing into a wall stuns it for a
  // long, generous window — the ONLY time it can be hurt.
  BOSSES.bramblehorn = {
    art: 'bramblehorn', w: 32, h: 32, hp: 14, dmg: 1,

    create: function (scene, boss) {
      boss.mem = { state: 'track', t: 0, dirX: 0, dirY: 1, animT: 0, animF: 0 };
      sfx(scene, 'bossRoar');
    },

    update: function (scene, boss, dt) {
      dt = clampDt(dt);
      var m = boss.mem || (boss.mem = { state: 'track', t: 0, dirX: 0, dirY: 1 });
      m.t += dt;
      var p = playerPos(scene, boss);

      if (m.state === 'track') {
        // lumber toward the player, slow and readable
        walkAnim(scene, boss, dt, 300);
        moveToward(scene, boss, p.x, p.y, 35);
        if (m.t >= 1500) { m.state = 'aim'; m.t = 0; sfx(scene, 'blip'); }

      } else if (m.state === 'aim') {
        // big telegraph: stops dead and rattles before every charge
        flicker(scene, boss, m.t, 90);
        if (m.t >= 750) {
          var d = cardinalToward(p.x - boss.x, p.y - boss.y);
          m.dirX = d.x; m.dirY = d.y;
          m.state = 'charge'; m.t = 0;
          sfx(scene, 'bossRoar');
        }

      } else if (m.state === 'charge') {
        var hitWall = dashStep(scene, boss, m.dirX, m.dirY, 200, dt, 14);
        if (hitWall || m.t >= 2600) {
          // CRASH — horns stuck in the wall, totally helpless
          m.state = 'stunned'; m.t = 0;
          shake(scene, 280, 0.01);
          sfx(scene, 'hit');
        }

      } else if (m.state === 'stunned') {
        // generous vulnerability window: wobble in place, no movement
        flicker(scene, boss, m.t, 220);
        if (m.t >= 3200) { m.state = 'recover'; m.t = 0; }

      } else { // 'recover' or anything unexpected
        walkAnim(scene, boss, dt, 300);
        if (m.t >= 500) { m.state = 'track'; m.t = 0; }
      }
    },

    onHit: function (scene, boss, source) {
      var m = boss.mem || {};
      if (m.state === 'stunned') return weaponDamage(source);
      sfx(scene, 'denied'); // shell clank — wait for the wall crash!
      return 0;
    },
  };

  // =============================================================== SANDWYRM
  // D2 boss, 20 hp. Burrows beneath the arena (invulnerable mound), rumbles
  // up near the player with a clear telegraph, then surfaces for a long
  // vulnerable spell of spitting before diving again.
  BOSSES.sandWyrm = {
    art: 'sandWyrm', w: 32, h: 32, hp: 20, dmg: 1,

    create: function (scene, boss) {
      boss.mem = { state: 'submerged', t: 0, spot: null, shotT: 0, vol: 0 };
      setFrame(scene, boss, 1); // frame 1 = traveling sand mound
    },

    update: function (scene, boss, dt) {
      dt = clampDt(dt);
      var m = boss.mem || (boss.mem = { state: 'submerged', t: 0, spot: null, shotT: 0, vol: 0 });
      m.t += dt;
      var p = playerPos(scene, boss);

      if (m.state === 'submerged') {
        setFrame(scene, boss, 1);
        if (!m.spot) {
          m.spot = pickSpotNear(scene, p.x, p.y, T * 2, T * 4) || { x: boss.x, y: boss.y };
        }
        moveToward(scene, boss, m.spot.x, m.spot.y, 55);
        if (dist(boss.x, boss.y, m.spot.x, m.spot.y) < 6 || m.t >= 3000) {
          m.state = 'rising'; m.t = 0; m.spot = null;
          sfx(scene, 'blip');
          shake(scene, 350, 0.004); // ground rumbles right where it will pop up
        }

      } else if (m.state === 'rising') {
        flicker(scene, boss, m.t, 100);
        if (m.t >= 800) {
          m.state = 'surfaced'; m.t = 0; m.shotT = 600; m.vol = 0;
          setFrame(scene, boss, 0);
          sfx(scene, 'bossRoar');
          shake(scene, 200, 0.008);
        }

      } else if (m.state === 'surfaced') {
        // long, generous vulnerable window; spits in a slow, dodgeable rhythm
        setFrame(scene, boss, 0);
        m.shotT -= dt;
        if (m.shotT <= 0) {
          m.vol++;
          if (m.vol % 2 === 1) {
            shoot(scene, boss, { atPlayer: true, speed: 95, art: 'rockShot', dmg: 1 });
          } else {
            shootSpread(scene, boss, {
              count: 3, spread: Math.PI / 5, atPlayer: true,
              speed: 80, art: 'seed', dmg: 0.5,
            });
          }
          m.shotT = 1200;
        }
        if (m.t >= 5200) { m.state = 'diving'; m.t = 0; sfx(scene, 'fall'); }

      } else if (m.state === 'diving') {
        flicker(scene, boss, m.t, 100);
        if (m.t >= 500) { m.state = 'submerged'; m.t = 0; setFrame(scene, boss, 1); }

      } else { // unexpected state — fail safe underground
        m.state = 'submerged'; m.t = 0;
      }
    },

    onHit: function (scene, boss, source) {
      var m = boss.mem || {};
      if (m.state === 'surfaced') return weaponDamage(source);
      sfx(scene, 'denied'); // safe under the sand — wait for it to pop up!
      return 0;
    },
  };

  // ========================================================== FROSTREVENANT
  // D3 boss, 22 hp. Teleports around the arena firing ice barrages, with long
  // visible (vulnerable) windows between blinks. Summons 2 frostWisps at each
  // hp threshold (15 and 8) — capped at 4 minions total via boss.mem.summons.
  BOSSES.frostRevenant = {
    art: 'frostRevenant', w: 32, h: 32, hp: 22, dmg: 1,

    create: function (scene, boss) {
      boss.mem = {
        state: 'appear', t: 0, summons: 0, th1: false, th2: false,
        volleys: 0, shotT: 0,
      };
      sfx(scene, 'bossRoar');
    },

    update: function (scene, boss, dt) {
      dt = clampDt(dt);
      var m = boss.mem || (boss.mem = { state: 'appear', t: 0, summons: 0, th1: false, th2: false, volleys: 0, shotT: 0 });
      m.t += dt;
      var p = playerPos(scene, boss);

      // hp-threshold wisp summons (one threshold per pass; never re-fires)
      if (m.state !== 'summon') {
        var hp = (typeof boss.hp === 'number') ? boss.hp : 99;
        if ((!m.th1 && hp <= 15) || (!m.th2 && hp <= 8)) {
          if (!m.th1 && hp <= 15) m.th1 = true; else m.th2 = true;
          m.state = 'summon'; m.t = 0;
          sfx(scene, 'bossRoar');
        }
      }

      if (m.state === 'summon') {
        flicker(scene, boss, m.t, 90);
        if (m.t >= 900) {
          var bx = Math.floor(boss.x / T), by = Math.floor(boss.y / T);
          spawnMinion(scene, boss, 'frostWisp', bx - 2, by, 4);
          spawnMinion(scene, boss, 'frostWisp', bx + 2, by, 4);
          m.state = 'blink'; m.t = 0;
        }

      } else if (m.state === 'appear') {
        // visible + vulnerable; drifts slowly so it stays readable
        walkAnim(scene, boss, dt, 280);
        moveToward(scene, boss, p.x, p.y, 20);
        if (m.t >= 1400) { m.state = 'cast'; m.t = 0; m.volleys = 0; m.shotT = 0; sfx(scene, 'blip'); }

      } else if (m.state === 'cast') {
        flicker(scene, boss, m.t, 90); // shimmer = ice incoming
        if (m.t >= 650) { m.state = 'barrage'; m.t = 0; }

      } else if (m.state === 'barrage') {
        // still vulnerable while firing — brave kids get rewarded
        m.shotT -= dt;
        if (m.shotT <= 0 && m.volleys < 2) {
          shootSpread(scene, boss, {
            count: 4, spread: Math.PI / 4, atPlayer: true,
            speed: 100, art: 'iceShard', dmg: 1,
          });
          m.volleys++; m.shotT = 750;
          sfx(scene, 'blip');
        }
        if (m.volleys >= 2 && m.t >= 1800) { m.state = 'rest'; m.t = 0; setFrame(scene, boss, 0); }

      } else if (m.state === 'rest') {
        // wide-open strike window
        walkAnim(scene, boss, dt, 280);
        if (m.t >= 1500) { m.state = 'blink'; m.t = 0; }

      } else { // 'blink' (or anything unexpected): vanish and relocate
        boss.invulnUntil = now(scene) + 350;
        setFrame(scene, boss, 1);
        if (m.t >= 450) {
          var spot = pickSpotNear(scene, p.x, p.y, T * 2.5, T * 5);
          if (spot) { boss.x = spot.x; boss.y = spot.y; }
          sfx(scene, 'blip');
          m.state = 'appear'; m.t = 0;
          setFrame(scene, boss, 0);
        }
      }
    },

    onHit: function (scene, boss, source) {
      var m = boss.mem || {};
      if (m.state === 'blink') { sfx(scene, 'denied'); return 0; }
      return weaponDamage(source);
    },
  };

  // =============================================================== MORGRATH
  // Final boss phase 1, 18 hp — a proper wizard duel. Keeps his distance,
  // rotates three readable spells (bolt flurry → fire fan → bolt ring), rests
  // wide open, then blinks away. Vulnerable the whole time except mid-blink.
  // The ENGINE transforms him into BOSSES.morgrath2 when this hp reaches 0.
  BOSSES.morgrath = {
    art: 'morgrath', w: 32, h: 32, hp: 18, dmg: 1,

    create: function (scene, boss) {
      boss.mem = { state: 'taunt', t: 0, atk: 0, shots: 0, shotT: 0 };
      sfx(scene, 'bossRoar');
    },

    update: function (scene, boss, dt) {
      dt = clampDt(dt);
      var m = boss.mem || (boss.mem = { state: 'taunt', t: 0, atk: 0, shots: 0, shotT: 0 });
      m.t += dt;
      var p = playerPos(scene, boss);

      if (m.state === 'taunt') {
        // duelist footwork: keep a polite casting distance
        walkAnim(scene, boss, dt, 280);
        var d = norm(p.x - boss.x, p.y - boss.y);
        if (d.len > 88) {
          moveToward(scene, boss, p.x, p.y, 30);
        } else if (d.len > 0 && d.len < 56) {
          moveToward(scene, boss, boss.x - d.x * 40, boss.y - d.y * 40, 30);
        }
        if (m.t >= 1300) { m.state = 'cast'; m.t = 0; sfx(scene, 'blip'); }

      } else if (m.state === 'cast') {
        flicker(scene, boss, m.t, 90); // robe glow = spell coming
        if (m.t >= 550) { m.state = 'attack'; m.t = 0; m.shots = 0; m.shotT = 0; }

      } else if (m.state === 'attack') {
        var done = false;
        if (m.atk === 0) {
          // bolt flurry: three aimed magic bolts, paced for sidesteps
          m.shotT -= dt;
          if (m.shotT <= 0 && m.shots < 3) {
            shoot(scene, boss, { atPlayer: true, speed: 110, art: 'magicBolt', dmg: 1 });
            m.shots++; m.shotT = 420;
          }
          done = (m.shots >= 3 && m.t >= 1400);
        } else if (m.atk === 1) {
          // fire fan
          if (m.shots === 0) {
            shootSpread(scene, boss, {
              count: 5, spread: Math.PI / 3, atPlayer: true,
              speed: 90, art: 'fireball', dmg: 1,
            });
            m.shots = 1;
          }
          done = (m.t >= 900);
        } else {
          // full bolt ring — walk between the gaps
          if (m.shots === 0) {
            shootSpread(scene, boss, {
              count: 8, spread: Math.PI * 2, atPlayer: true,
              speed: 80, art: 'magicBolt', dmg: 1,
            });
            m.shots = 1;
          }
          done = (m.t >= 900);
        }
        if (done) { m.atk = (m.atk + 1) % 3; m.state = 'rest'; m.t = 0; setFrame(scene, boss, 0); }

      } else if (m.state === 'rest') {
        // generous punish window after every spell
        walkAnim(scene, boss, dt, 280);
        if (m.t >= 1400) { m.state = 'blink'; m.t = 0; }

      } else { // 'blink' (or anything unexpected)
        boss.invulnUntil = now(scene) + 350;
        setFrame(scene, boss, 1);
        if (m.t >= 450) {
          var spot = pickSpotNear(scene, p.x, p.y, T * 3, T * 5.5);
          if (spot) { boss.x = spot.x; boss.y = spot.y; }
          sfx(scene, 'blip');
          m.state = 'taunt'; m.t = 0;
          setFrame(scene, boss, 0);
        }
      }
    },

    onHit: function (scene, boss, source) {
      var m = boss.mem || {};
      if (m.state === 'blink') { sfx(scene, 'denied'); return 0; }
      return weaponDamage(source);
    },
  };

  // ============================================================== MORGRATH2
  // Final boss phase 2, 26 hp demon form (48x48 art). Big, slow, and always
  // vulnerable — the danger is dodging: wide fireball spreads, telegraphed
  // straight-line charges (wall crash = long stagger), and bat summons at hp
  // thresholds (18 and 9), capped at 4 minions via boss.mem.summons.
  BOSSES.morgrath2 = {
    art: 'morgrath2', w: 48, h: 48, hp: 26, dmg: 1,

    create: function (scene, boss) {
      boss.mem = {
        state: 'stalk', t: 0, atk: 0, summons: 0, th1: false, th2: false,
        dirX: 0, dirY: 1, shots: 0, shotT: 0,
      };
      sfx(scene, 'bossRoar');
      shake(scene, 400, 0.01);
    },

    update: function (scene, boss, dt) {
      dt = clampDt(dt);
      var m = boss.mem || (boss.mem = { state: 'stalk', t: 0, atk: 0, summons: 0, th1: false, th2: false, dirX: 0, dirY: 1, shots: 0, shotT: 0 });
      m.t += dt;
      var p = playerPos(scene, boss);

      // hp-threshold bat summons (never interrupts an active dash)
      if (m.state !== 'summon' && m.state !== 'dash') {
        var hp = (typeof boss.hp === 'number') ? boss.hp : 99;
        if ((!m.th1 && hp <= 18) || (!m.th2 && hp <= 9)) {
          if (!m.th1 && hp <= 18) m.th1 = true; else m.th2 = true;
          m.state = 'summon'; m.t = 0;
          sfx(scene, 'bossRoar');
        }
      }

      if (m.state === 'stalk') {
        walkAnim(scene, boss, dt, 320);
        moveToward(scene, boss, p.x, p.y, 45);
        if (m.t >= 1600) { m.state = 'windup'; m.t = 0; sfx(scene, 'blip'); }

      } else if (m.state === 'windup') {
        flicker(scene, boss, m.t, 90); // every attack gets a big wind-up
        if (m.t >= 700) {
          if (m.atk % 2 === 0) {
            m.state = 'spew'; m.t = 0; m.shots = 0; m.shotT = 0;
          } else {
            var d = norm(p.x - boss.x, p.y - boss.y);
            m.dirX = d.x; m.dirY = d.y;
            m.state = 'dash'; m.t = 0;
          }
          m.atk++;
          sfx(scene, 'bossRoar');
        }

      } else if (m.state === 'spew') {
        // two wide fireball fans with a dodge-sized gap between them
        m.shotT -= dt;
        if (m.shotT <= 0 && m.shots < 2) {
          shootSpread(scene, boss, {
            count: 6, spread: Math.PI / 2.2, atPlayer: true,
            speed: 90, art: 'fireball', dmg: 1,
          });
          m.shots++; m.shotT = 650;
          sfx(scene, 'blip');
        }
        if (m.shots >= 2 && m.t >= 1500) { m.state = 'stalk'; m.t = 0; }

      } else if (m.state === 'dash') {
        var hitWall = dashStep(scene, boss, m.dirX, m.dirY, 230, dt, 22);
        if (hitWall) {
          m.state = 'stagger'; m.t = 0;
          shake(scene, 300, 0.012);
          sfx(scene, 'hit');
        } else if (m.t >= 1600) {
          m.state = 'stalk'; m.t = 0;
        }

      } else if (m.state === 'stagger') {
        // crashed into the wall — long bonus punish window
        flicker(scene, boss, m.t, 250);
        if (m.t >= 1900) { m.state = 'stalk'; m.t = 0; }

      } else if (m.state === 'summon') {
        flicker(scene, boss, m.t, 90);
        if (m.t >= 900) {
          var bx = Math.floor(boss.x / T), by = Math.floor(boss.y / T);
          spawnMinion(scene, boss, 'bat', bx - 2, by - 1, 4);
          spawnMinion(scene, boss, 'bat', bx + 2, by - 1, 4);
          m.state = 'stalk'; m.t = 0;
        }

      } else { // anything unexpected — fail safe
        m.state = 'stalk'; m.t = 0;
      }
    },

    onHit: function (scene, boss, source) {
      // Phase 2 is about dodging, not waiting: always fair game.
      return weaponDamage(source);
    },
  };
})();
