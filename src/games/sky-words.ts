/**
 * Capitán Rico: Sky Words — the Phaser 3.88.1 body of the plaza shooter frame.
 *
 * Ported from the audited `sausi-7/games → shooter/space-fighter` shape
 * (portrait, tap-to-shoot, config-driven tempo) and rebuilt as an original
 * template: every sprite is drawn here with Graphics — no external art, no
 * CDN, no webfont loader, no Phaser audio (all speech is React's kokoro voice
 * through the bridge).
 *
 * Scenes never touch storage or voice: they call the bridge only.
 */
import * as Phaser from "phaser";

import { attachScene, type SkyWordRound, type SkyWordsBridge, type SkyWordsHandle } from "./sky-words-types";

const W = 720;
const H = 960;
/** Enemy descent base tempo (px/s) multiplied by bridge.params.speed. */
const DESCENT = 95;
const BULLET_SPEED = 640;
const FIRE_COOLDOWN_MS = 260;

/** The capsule palette — same friendly tones as the village balloons. */
const FOE_COLORS = [0xf43f5e, 0x0ea5e9, 0x8b5cf6, 0xf97316, 0x10b981, 0xec4899];
const GOLD = 0xfbbf24;
const GRAY = 0x94a3b8;
const FONT = '"Nunito", "Trebuchet MS", "Segoe UI", system-ui, sans-serif';

type Enemy = Phaser.GameObjects.Container & {
  word: string;
  isTarget: boolean;
  baseX: number;
  amp: number;
  freq: number;
  phase: number;
  prop: Phaser.GameObjects.Image | null;
  dead: boolean;
  w: number;
  h: number;
};

type Bullet = Phaser.GameObjects.Image & { aimed?: boolean };

class SkyScene extends Phaser.Scene {
  private bridge!: SkyWordsBridge;
  private ctrl!: SkyWordsHandle;
  private jet!: Phaser.GameObjects.Image;
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private stars: Phaser.GameObjects.Image[] = [];
  private clouds: Phaser.GameObjects.Image[] = [];
  private locked = true;
  private lastShot = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private fireKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super("sky");
  }

  init(data: { bridge: SkyWordsBridge; ctrl: SkyWordsHandle }): void {
    this.bridge = data.bridge;
    this.ctrl = data.ctrl;
  }

  create(): void {
    this.buildSky();
    this.buildSprites();
    this.buildJet();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.fireKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard!.addCapture([Phaser.Input.Keyboard.KeyCodes.SPACE, Phaser.Input.Keyboard.KeyCodes.UP, Phaser.Input.Keyboard.KeyCodes.DOWN, Phaser.Input.Keyboard.KeyCodes.LEFT, Phaser.Input.Keyboard.KeyCodes.RIGHT]);
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.onTap(p));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off("pointerdown");
    });

    // The command post may already hold the first formation.
    attachScene(this.ctrl, this);
  }

  // ── original procedural art ────────────────────────────────────────────────

  private buildSky(): void {
    // Painted sky: a tall gradient canvas + drifting stars and clouds.
    const g = this.textures.createCanvas("sky-bg", 2, 256);
    if (g) {
      const ctx = g.getContext();
      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, "#0ea5e9");
      grad.addColorStop(0.55, "#7dd3fc");
      grad.addColorStop(1, "#e0f2fe");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 2, 256);
      g.refresh();
      this.add.image(0, 0, "sky-bg").setOrigin(0).setDisplaySize(W, H).setDepth(0);
    }
    for (let i = 0; i < 42; i++) {
      const s = this.add.image(Phaser.Math.Between(8, W - 8), Phaser.Math.Between(0, H), "spark")
        .setScale(Phaser.Math.FloatBetween(0.25, 0.7))
        .setAlpha(Phaser.Math.FloatBetween(0.25, 0.75))
        .setDepth(1);
      this.stars.push(s);
    }
    for (let i = 0; i < 4; i++) {
      const c = this.add.image(Phaser.Math.Between(60, W - 60), Phaser.Math.Between(60, H), "cloud")
        .setAlpha(0.34)
        .setScale(Phaser.Math.FloatBetween(0.9, 1.7))
        .setDepth(2);
      this.clouds.push(c);
    }
  }

  private buildSprites(): void {
    if (this.textures.exists("jet")) return;

    // ── the jet: white body, amber swept wings, red nose — Capitán Rico's ✈️ ──
    const j = this.add.graphics();
    j.fillStyle(0xf59e0b, 1); // wings
    j.fillTriangle(8, 58, 60, 30, 60, 66);
    j.fillTriangle(112, 58, 60, 30, 60, 66);
    j.fillStyle(0xf8fafc, 1); // fuselage
    j.fillRoundedRect(44, 22, 32, 96, 15);
    j.fillStyle(0xef4444, 1); // nose cone
    j.fillTriangle(44, 32, 76, 32, 60, 4);
    j.fillStyle(0xf59e0b, 1); // tail fin
    j.fillTriangle(44, 108, 60, 108, 44, 126);
    j.fillStyle(0x0ea5e9, 1); // cockpit
    j.fillEllipse(60, 48, 16, 22);
    j.fillStyle(0xfbbf24, 1); // racing stripe
    j.fillRect(58, 62, 4, 50);
    j.generateTexture("jet", 120, 130);
    j.destroy();

    // ── enemy capsules (one texture per palette colour) + spinning propeller ──
    for (let i = 0; i < FOE_COLORS.length; i++) {
      const g2 = this.add.graphics();
      const c = FOE_COLORS[i];
      g2.fillStyle(0x0f172a, 0.10); // soft under-shadow
      g2.fillEllipse(107, 96, 200, 10);
      g2.fillStyle(0xffffff, 1);
      g2.fillRoundedRect(0, 12, 214, 88, 44);
      g2.lineStyle(6, c, 1);
      g2.strokeRoundedRect(0, 12, 214, 88, 44);
      g2.fillStyle(0xffffff, 0.65); // bubble highlight
      g2.fillEllipse(46, 34, 34, 14);
      g2.fillStyle(0x94a3b8, 1); // propeller mast
      g2.fillRect(104, 0, 6, 14);
      g2.generateTexture(`foe${i}`, 214, 100);
      g2.destroy();
    }
    const prop = this.add.graphics();
    prop.fillStyle(0xf59e0b, 1);
    prop.fillRoundedRect(0, 0, 46, 10, 5);
    prop.generateTexture("prop", 46, 10);
    prop.destroy();

    // ── bullet: a golden bolt ──
    const b = this.add.graphics();
    b.fillStyle(0xfbbf24, 1);
    b.fillRoundedRect(2, 0, 10, 26, 5);
    b.fillStyle(0xfffbeb, 1);
    b.fillRoundedRect(4, 6, 6, 12, 3);
    b.generateTexture("bolt", 14, 26);
    b.destroy();

    // ── spark (stars + explosion particles) and a soft cloud ──
    const s = this.add.graphics();
    s.fillStyle(0xffffff, 1);
    s.fillCircle(6, 6, 6);
    s.generateTexture("spark", 12, 12);
    s.destroy();
    const cl = this.add.graphics();
    cl.fillStyle(0xffffff, 0.9);
    cl.fillEllipse(52, 40, 104, 46);
    cl.fillEllipse(110, 34, 110, 52);
    cl.fillEllipse(160, 44, 96, 40);
    cl.generateTexture("cloud", 220, 76);
    cl.destroy();
  }

  private buildJet(): void {
    this.jet = this.add.image(W / 2, H - 110, "jet").setDepth(8);
    this.tweens.add({ targets: this.jet, alpha: { from: 0, to: 1 }, duration: 400 });
  }

  // ── round lifecycle ────────────────────────────────────────────────────────

  playRound(round: SkyWordRound | null): void {
    this.clear();
    this.locked = round === null;
    if (!round) return;

    const n = Math.max(1, round.options.length);
    const margin = 120;
    const step = n > 1 ? (W - margin * 2) / (n - 1) : 0;
    const vy = DESCENT * Math.max(0.3, this.bridge.params.speed);
    round.options.forEach((word, i) => {
      const isTarget = word === round.word;
      const x = n > 1 ? margin + i * step : W / 2;
      const y = -110 - i * 150;
      const foe = this.makeFoe(word, isTarget, x, y, vy);
      this.enemies.push(foe);
    });
  }

  private makeFoe(word: string, isTarget: boolean, x: number, y: number, vy: number): Enemy {
    const tex = `foe${Phaser.Math.Between(0, FOE_COLORS.length - 1)}`;
    const capsule = this.add.image(0, 8, tex);
    const label = this.add
      .text(0, 62, word, {
        fontFamily: FONT,
        fontSize: `${word.length <= 4 ? 40 : word.length <= 8 ? 34 : word.length <= 12 ? 28 : 24}px`,
        color: "#0f172a",
        fontStyle: "bold",
        align: "center",
      })
      .setOrigin(0.5);
    const propImg = this.add.image(0, 0, "prop");
    const foe = this.add.container(x, y, [capsule, label, propImg]) as Enemy;
    foe.setDepth(5);
    foe.word = word;
    foe.isTarget = isTarget;
    foe.baseX = x;
    foe.amp = Phaser.Math.Between(14, 30);
    foe.freq = Phaser.Math.FloatBetween(0.8, 1.6);
    foe.phase = Math.random() * Math.PI * 2;
    foe.prop = propImg;
    foe.dead = false;
    foe.w = 214;
    foe.h = 100;
    foe.setData("vy", vy);
    foe.setScale(0.6);
    this.tweens.add({ targets: foe, scale: 1, duration: 320, ease: "Back.Out" });
    if (isTarget) {
      // The target gently glows so spoken + visual cues agree.
      this.tweens.add({ targets: capsule, alpha: { from: 1, to: 0.82 }, yoyo: true, repeat: -1, duration: 700 });
    }
    return foe;
  }

  showBanner(title: string, sub?: string): void {
    this.locked = true;
    this.dismissEnemies(250);
    const banner = this.add
      .text(W / 2, H / 2 - 60, title, {
        fontFamily: FONT,
        fontSize: "64px",
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#0369a1",
        strokeThickness: 10,
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setScale(0.4)
      .setAlpha(0);
    const parts: Phaser.GameObjects.Text[] = [banner];
    if (sub) {
      parts.push(
        this.add
          .text(W / 2, H / 2 + 22, sub, {
            fontFamily: FONT,
            fontSize: "30px",
            color: "#ffffff",
            fontStyle: "bold",
            stroke: "#0369a1",
            strokeThickness: 6,
            align: "center",
          })
          .setOrigin(0.5)
          .setDepth(10)
          .setAlpha(0),
      );
    }
    // A plain tween here, NOT tweens.chain: the chain builder mis-shards this
    // scale/alpha config in Phaser 3.88 and its setCurrentTween() reads a data
    // entry that does not exist (undefined.setActiveState) — the synchronous
    // throw killed the wave-complete flow before the wave break timer was set,
    // stranding every session at "ONDA 1/5" with a locked scene (gate defect).
    this.tweens.add({
      targets: banner,
      scale: 1,
      alpha: 1,
      duration: 320,
      ease: "Back.Out",
      onComplete: () => {
        this.time.delayedCall(1000, () => {
          this.tweens.add({
            targets: parts,
            alpha: 0,
            duration: 320,
            onComplete: () => parts.forEach((t) => t.destroy()),
          });
        });
      },
    });
    this.tweens.add({ targets: parts.slice(1), alpha: 1, duration: 400, delay: 120 });
  }

  clear(): void {
    this.dismissEnemies(0);
    for (const b of this.bullets) b.destroy();
    this.bullets = [];
    this.locked = true;
  }

  celebrate(): void {
    this.clear();
    this.tweens.add({ targets: this.jet, y: H - 240, duration: 700, ease: "Sine.InOut", yoyo: true, repeat: 1 });
    this.burst(this.jet.x, this.jet.y - 40, GOLD, 26);
  }

  private dismissEnemies(fadeMs: number): void {
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.dead = true;
      if (fadeMs > 0) {
        this.tweens.add({ targets: e, alpha: 0, duration: fadeMs, onComplete: () => e.destroy() });
      } else {
        e.destroy();
      }
    }
    this.enemies = [];
  }

  // ── input ──────────────────────────────────────────────────────────────────

  private onTap(p: Phaser.Input.Pointer): void {
    if (this.locked) return;
    const wx = p.worldX;
    const wy = p.worldY;
    const hitEnemy = this.topEnemyAt(wx, wy);
    if (hitEnemy && !hitEnemy.dead) {
      this.aimedShot(hitEnemy);
      return;
    }
    // Empty sky: fly toward the tap and fire.
    this.jet.x = Phaser.Math.Clamp(wx, 60, W - 60);
    this.fire();
  }

  private topEnemyAt(x: number, y: number): Enemy | null {
    let found: Enemy | null = null;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const halfW = e.w / 2 + 12; // a little forgiveness for small fingers
      const halfH = e.h / 2 + 10;
      if (Math.abs(x - e.x) <= halfW && Math.abs(y - e.y) <= halfH) found = e;
    }
    return found;
  }

  private fire(): void {
    const now = this.time.now;
    if (now - this.lastShot < FIRE_COOLDOWN_MS) return;
    this.lastShot = now;
    this.spawnBullet(this.jet.x, this.jet.y - 74, 0);
  }

  private aimedShot(enemy: Enemy): void {
    const now = this.time.now;
    if (now - this.lastShot < FIRE_COOLDOWN_MS) return;
    this.lastShot = now;
    const b = this.spawnBullet(this.jet.x, this.jet.y - 74, 0);
    if (!b) return;
    b.aimed = true;
    const dx = enemy.x - b.x;
    const dy = enemy.y - b.y;
    b.setRotation(Math.atan2(dy, dx) + Math.PI / 2);
    this.tweens.add({
      targets: b,
      x: enemy.x,
      y: enemy.y,
      duration: Math.max(60, (Math.hypot(dx, dy) / BULLET_SPEED) * 1000),
      onComplete: () => {
        this.bullets = this.bullets.filter((x) => x !== b);
        b.destroy();
        if (!enemy.dead && !this.locked) this.resolveEnemy(enemy);
      },
    });
  }

  private spawnBullet(x: number, y: number, _angle: number): Bullet | null {
    if (this.locked) return null;
    const b = this.add.image(x, y, "bolt").setDepth(6) as Bullet;
    this.bullets.push(b);
    return b;
  }

  // ── resolution: the only two doors back to React ───────────────────────────

  private resolveEnemy(e: Enemy): void {
    if (this.locked || e.dead) return;
    e.dead = true;
    if (e.isTarget) {
      this.locked = true;
      this.burst(e.x, e.y, GOLD, 22);
      this.flyOff(e);
      this.dismissEnemies(300);
      this.bridge.onHit(e.word);
    } else {
      this.burst(e.x, e.y, GRAY, 10);
      e.destroy();
      this.enemies = this.enemies.filter((x) => x !== e);
      this.bridge.onMiss(e.word);
    }
  }

  /** The target slipped past the jet — it got away. */
  private escape(e: Enemy): void {
    this.locked = true;
    this.tweens.add({ targets: this.jet, alpha: { from: 1, to: 0.35 }, yoyo: true, repeat: 2, duration: 160 });
    this.dismissEnemies(200);
    this.bridge.onMiss(e.word);
  }

  private flyOff(e: Enemy): void {
    this.tweens.add({ targets: e, scale: 1.25, alpha: 0, angle: 20, duration: 420, onComplete: () => e.destroy() });
  }

  private burst(x: number, y: number, tint: number, count: number): void {
    const p = this.add.particles(x, y, "spark", {
      speed: { min: 120, max: 330 },
      lifespan: 430,
      scale: { start: 2.1, end: 0 },
      tint,
      emitting: false,
    });
    p.setDepth(9);
    p.explode(count);
    this.time.delayedCall(900, () => p.destroy());
  }

  // ── frame loop ─────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const dt = delta / 1000;

    // sky dressing
    for (const s of this.stars) {
      s.y += 14 * dt * s.scale * 2;
      if (s.y > H + 6) s.y = -6;
    }
    for (const c of this.clouds) {
      c.y += 9 * dt * c.scale;
      if (c.y > H + 60) c.y = -60;
    }

    // jet: keyboard steers, a held pointer lures it, plus a gentle bob
    const left = this.cursors.left?.isDown ?? false;
    const right = this.cursors.right?.isDown ?? false;
    if (left) this.jet.x -= 430 * dt;
    if (right) this.jet.x += 430 * dt;
    if (!left && !right && this.input.activePointer.isDown) {
      this.jet.x += (Phaser.Math.Clamp(this.input.activePointer.worldX, 60, W - 60) - this.jet.x) * 0.16;
    }
    this.jet.x = Phaser.Math.Clamp(this.jet.x, 60, W - 60);
    this.jet.y = H - 110 + Math.sin(time / 280) * 7;

    // firing (held space = steady stream, kid-friendly)
    if (this.fireKey.isDown) this.fire();

    // bullets: straight shots fly; aimed ones ride their tween
    for (const b of [...this.bullets]) {
      if (b.aimed) continue;
      b.y -= BULLET_SPEED * dt;
      if (b.y < -30) {
        this.bullets = this.bullets.filter((x) => x !== b);
        b.destroy();
        continue;
      }
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (Math.abs(b.x - e.x) < e.w * 0.42 && Math.abs(b.y - e.y) < e.h * 0.46) {
          this.bullets = this.bullets.filter((x) => x !== b);
          b.destroy();
          this.resolveEnemy(e);
          break;
        }
      }
    }

    // enemies descend, sway, and spin their propellers
    for (const e of [...this.enemies]) {
      if (e.dead) continue;
      const vy = Number(e.getData("vy"));
      e.y += vy * dt;
      e.x = e.baseX + Math.sin(time / 1000 * e.freq * Math.PI * 2 + e.phase) * e.amp;
      if (e.prop) e.prop.rotation += 14 * dt;
      if (e.isTarget) {
        if (e.y > H - 150) {
          this.escape(e);
          continue;
        }
      } else if (e.y > H + 120) {
        e.destroy();
        this.enemies = this.enemies.filter((x) => x !== e);
      }
    }
  }
}

/** Boot the game inside a host element; returns the minimal handle React owns. */
export function createGame(
  parent: HTMLElement,
  bridge: SkyWordsBridge,
  ctrl: SkyWordsHandle,
): { destroy: (removeCanvas?: boolean) => void } {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W,
    height: H,
    backgroundColor: "#7dd3fc",
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    banner: false,
    render: { antialias: true },
    // The scene is added by hand so it boots with its deps (bridge + ctrl):
    scene: [],
  });
  game.scene.add("sky", SkyScene, true, { bridge, ctrl });
  // Test/QA hook: lets the click-through reach the live scene (no other use).
  (window as unknown as { __palabraSky?: Phaser.Game }).__palabraSky = game;
  return { destroy: (removeCanvas = true) => game.destroy(removeCanvas) };
}
