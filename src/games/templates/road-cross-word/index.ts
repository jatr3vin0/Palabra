/**
 * «¡Cruza la Calle!» — the Phaser 3.88.1 body of the road-crossing frame
 * (game #3; PORT-road-cross-word.md).
 *
 * Rules engine ported from the pinned sausi-7/games `games/arcade/road-cross`
 * `mechanics.js` (SHA c97ef8be, MIT): 5 car lanes at the pinned base speeds
 * [220,260,280,300,330] with ±20 jitter, alternating directions, wrap-around,
 * `2 + ⌊level/2⌋` cars per lane (folded into the difficulty knob), one-tile
 * 128-px hops, car overlap = mechanical death, countdown clock with a red
 * pulse — here the ONE deep change: anonymous lanes become the
 * spoken-command safe lane («¡Cruza por X!»). The goal is enterable ONLY from
 * the safe lane; decoy-lane entry is the only language event (onMiss); car
 * hits and the clock NEVER speak (mechanical, plan §2).
 *
 * Every sprite is drawn here with Graphics — no external art, no CDN, no
 * webfont loader, no Phaser audio (speech is React's voice through the
 * bridge; the death flash/shake/slow-mo and confetti are visual). Scenes
 * never touch storage or voice. Lane icons use the shared a0-u05 icon table
 * (R7-4) via the pack binder; the glyph drawings are this template's own
 * procedural art.
 */
import * as Phaser from "phaser";

import { words as u05Words } from "~/content/packs/a0-u05-sokoban";

import { attachScene, type RoadCrossBoard, type RoadCrossBridge, type RoadCrossHandle } from "./types";

const W = 768;
const H = 1024;
/** One-tile hop geometry — the pinned source tileSize (GAME-source-pins #3). */
const TILE = 128;
/** Hop tween base (ms), scaled by bridge.params.speed (tier ×0.6/1.0/1.4). */
const HOP_MS = 140;
/** D-pad hold-to-repeat interval. */
const DPAD_REPEAT_MS = 240;
/** D-pad button size — the pinned 150 px source button at 768-canvas scale (≈14%). */
const DPAD_SIZE = 108;
const FONT = '"Nunito", "Trebuchet MS", "Segoe UI", system-ui, sans-serif';

const ASPHALT = 0x3f3f46;
const SIDEWALK = 0xd6d3d1;
const GRASS = 0x4d7c0f;
const GOLD = 0xfbbf24;
const ROBE = 0xf5f5f4;
/** Car body tints (procedural traffic, one texture). */
const CAR_TINTS = [0xef4444, 0x3b82f6, 0xf97316, 0x0d9488, 0xa855f7];

type Dir = { dx: number; dy: number };
const DIRS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
} satisfies Record<string, Dir>;

/** Row centre y, by row index: 0 = goal, 1–5 = lanes bottom→top, 6 = sidewalk. */
const ROW_Y = [64, 704, 576, 448, 320, 192, 832];

type CarView = { img: Phaser.GameObjects.Image; speed: number; dir: 1 | -1 };
type LaneView = {
  es: string | null;
  safe: boolean;
  icon: Phaser.GameObjects.Image | null;
  gloss: Phaser.GameObjects.Text | null;
  tint: Phaser.GameObjects.Rectangle | null;
};

export type RoadCrossSceneOptions = {
  /** EN gloss visibility on lane icons, resolved React-side per immersion. */
  gloss: "full" | "faded" | "none";
};

class RoadCrossScene extends Phaser.Scene {
  private bridge!: RoadCrossBridge;
  private ctrl!: RoadCrossHandle;
  private opts: RoadCrossSceneOptions = { gloss: "full" };
  private board: RoadCrossBoard | null = null;
  private commandEs: string | null = null;
  private lanes: LaneView[] = [];
  private cars: CarView[] = [];
  private player!: Phaser.GameObjects.Container;
  /** Rows: 0 = goal, 1–5 = lanes (bottom→top), 6 = sidewalk start. */
  private col = 2;
  private row = 6;
  private tweening = false;
  private dead = false;
  private locked = true;
  private deathUntil = 0;
  /** Per-crossing miss arming: a decoy entry fires ONCE, re-arms on the safe lane. */
  private missArmed = true;
  private timeLeft = 0;
  private progressAt = 0;
  private timeExpiredFired = false;
  private halos: Phaser.GameObjects.GameObject[] = [];
  private timeBar: Phaser.GameObjects.Rectangle | null = null;
  private swipeStart: { x: number; y: number } | null = null;
  private swipeSkip = false;
  private dpadTimers: number[] = [];

  constructor() {
    super("calle");
  }

  init(data: { bridge: RoadCrossBridge; ctrl: RoadCrossHandle; opts?: RoadCrossSceneOptions }): void {
    this.bridge = data.bridge;
    this.ctrl = data.ctrl;
    if (data.opts) this.opts = data.opts;
  }

  create(): void {
    this.buildTextures();

    // Input registered exactly ONCE per scene lifetime (QA invariant).
    const kb = this.input.keyboard!;
    kb.addCapture(["UP", "DOWN", "LEFT", "RIGHT", "W", "A", "S", "D"]);
    kb.on("keydown-UP", () => this.tryMove(DIRS.up));
    kb.on("keydown-DOWN", () => this.tryMove(DIRS.down));
    kb.on("keydown-LEFT", () => this.tryMove(DIRS.left));
    kb.on("keydown-RIGHT", () => this.tryMove(DIRS.right));
    kb.on("keydown-W", () => this.tryMove(DIRS.up));
    kb.on("keydown-S", () => this.tryMove(DIRS.down));
    kb.on("keydown-A", () => this.tryMove(DIRS.left));
    kb.on("keydown-D", () => this.tryMove(DIRS.right));
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.swipeSkip) return;
      this.swipeStart = { x: p.worldX, y: p.worldY };
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      this.swipeSkip = false;
      const s = this.swipeStart;
      this.swipeStart = null;
      if (!s) return;
      const dx = p.worldX - s.x;
      const dy = p.worldY - s.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 10) return;
      if (Math.abs(dx) > Math.abs(dy)) this.tryMove(dx > 0 ? DIRS.right : DIRS.left);
      else this.tryMove(dy > 0 ? DIRS.down : DIRS.up);
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb.removeAllListeners();
      this.input.removeAllListeners();
      this.dpadTimers.forEach((t) => window.clearInterval(t));
    });

    // The command post may already hold the first crossing.
    attachScene(this.ctrl, this);
  }

  // ── procedural art ─────────────────────────────────────────────────────────

  private buildTextures(): void {
    if (this.textures.exists("rc-road")) return;
    const mk = (key: string, draw: (g: Phaser.GameObjects.Graphics) => void, w: number, h: number): void => {
      const g = this.add.graphics();
      draw(g);
      g.generateTexture(key, w, h);
      g.destroy();
    };

    mk("rc-road", (g) => {
      g.fillStyle(ASPHALT, 1);
      g.fillRect(0, 0, 128, 128);
      g.fillStyle(0x52525b, 1);
      g.fillRect(0, 0, 128, 6);
      g.fillStyle(0x292524, 1);
      g.fillRect(0, 122, 128, 6);
    }, 128, 128);
    mk("rc-sidewalk", (g) => {
      g.fillStyle(SIDEWALK, 1);
      g.fillRect(0, 0, 128, 128);
      g.lineStyle(2, 0xa8a29e, 1);
      g.strokeRect(0, 0, 128, 128);
    }, 128, 128);
    mk("rc-grass", (g) => {
      g.fillStyle(GRASS, 1);
      g.fillRect(0, 0, 128, 128);
      g.fillStyle(0x65a30d, 1);
      for (let i = 0; i < 14; i++) {
        const x = 8 + ((i * 37) % 112);
        const y = 10 + ((i * 53) % 108);
        g.fillTriangle(x, y + 8, x + 4, y - 4, x + 8, y + 8);
      }
    }, 128, 128);
    mk("rc-car", (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 8, 104, 60, 14);
      g.fillStyle(0xe0e7ff, 1);
      g.fillRoundedRect(22, 16, 26, 22, 5);
      g.fillRoundedRect(56, 16, 26, 22, 5);
      g.fillStyle(0x1f2937, 1);
      g.fillRoundedRect(6, 58, 16, 12, 4);
      g.fillRoundedRect(82, 58, 16, 12, 4);
    }, 104, 76);
    mk("rc-spark", (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(6, 6, 6);
    }, 12, 12);
    mk("rc-pilgrim", (g) => {
      g.fillStyle(ROBE, 1);
      g.fillTriangle(30, 16, 12, 56, 48, 56);
      g.fillStyle(0xb45309, 1);
      g.fillRect(19, 40, 22, 5);
      g.fillStyle(0xfcd9b8, 1);
      g.fillCircle(30, 14, 8);
      g.fillStyle(0x7c2d12, 1);
      g.fillEllipse(30, 8, 18, 10);
      g.fillStyle(GOLD, 1);
      g.fillRect(40, 34, 8, 12);
    }, 60, 60);

    // the shared a0-u05 icon glyphs — one texture per es (R7-4 table)
    const drawers: Record<string, (g: Phaser.GameObjects.Graphics) => void> = {
      field: (g) => {
        g.lineStyle(4, 0x16a34a, 1);
        for (const y of [18, 32, 46]) {
          g.beginPath();
          g.moveTo(10, y);
          g.lineTo(50, y);
          g.strokePath();
        }
      },
      sprout: (g) => {
        g.lineStyle(4, 0x16a34a, 1);
        g.beginPath();
        g.moveTo(30, 50);
        g.lineTo(30, 30);
        g.strokePath();
        g.fillStyle(0x22c55e, 1);
        g.fillEllipse(20, 26, 16, 10);
        g.fillEllipse(40, 26, 16, 10);
      },
      tree: (g) => {
        g.fillStyle(0x92400e, 1);
        g.fillRect(26, 36, 8, 18);
        g.fillStyle(0x15803d, 1);
        g.fillTriangle(30, 6, 12, 38, 48, 38);
      },
      river: (g) => {
        g.lineStyle(5, 0x0284c7, 1);
        for (const off of [0, 14]) {
          g.beginPath();
          g.moveTo(8, 20 + off);
          for (let x = 8; x <= 52; x += 8) g.lineTo(x, 20 + off + (x % 16 === 0 ? -5 : 5));
          g.strokePath();
        }
      },
      pebble: (g) => {
        g.fillStyle(0x94a3b8, 1);
        g.fillEllipse(30, 38, 26, 16);
        g.fillEllipse(20, 30, 12, 9);
      },
      rock: (g) => {
        g.fillStyle(0x57534e, 1);
        g.fillTriangle(30, 10, 10, 50, 50, 50);
        g.fillStyle(0x78716c, 1);
        g.fillTriangle(30, 10, 30, 50, 50, 50);
      },
      mud: (g) => {
        g.fillStyle(0x92400e, 1);
        g.fillEllipse(30, 40, 40, 18);
        g.fillStyle(0xa16207, 1);
        g.fillEllipse(30, 36, 26, 12);
      },
      ice: (g) => {
        g.lineStyle(4, 0x38bdf8, 1);
        for (const a of [0, 60, 120]) {
          const r = (a * Math.PI) / 180;
          g.beginPath();
          g.moveTo(30 - Math.cos(r) * 18, 30 - Math.sin(r) * 18);
          g.lineTo(30 + Math.cos(r) * 18, 30 + Math.sin(r) * 18);
          g.strokePath();
        }
      },
      snake: (g) => {
        g.lineStyle(6, 0x65a30d, 1);
        g.beginPath();
        g.moveTo(12, 46);
        g.lineTo(24, 46);
        g.lineTo(24, 30);
        g.lineTo(38, 30);
        g.lineTo(38, 14);
        g.lineTo(50, 14);
        g.strokePath();
        g.fillStyle(0x65a30d, 1);
        g.fillCircle(51, 14, 5);
      },
      path: (g) => {
        g.fillStyle(0xa16207, 1);
        for (const [x, y, s] of [
          [12, 46, 8],
          [24, 34, 7],
          [36, 22, 6],
          [46, 12, 5],
        ] as const) {
          g.fillCircle(x, y, s);
        }
      },
      north: (g) => arrow(g, 0, -1, 0x0f766e),
      south: (g) => arrow(g, 0, 1, 0xb45309),
      east: (g) => arrow(g, 1, 0, 0x1d4ed8),
      west: (g) => arrow(g, -1, 0, 0x86198f),
      castle: (g) => {
        g.fillStyle(0x57534e, 1);
        g.fillRect(10, 24, 40, 28);
        g.fillRect(8, 16, 8, 8);
        g.fillRect(20, 16, 8, 8);
        g.fillRect(32, 16, 8, 8);
        g.fillRect(44, 16, 8, 8);
        g.fillStyle(0xfef3c7, 1);
        g.fillRect(25, 34, 10, 18);
      },
    };
    for (const w of u05Words.values()) {
      const g = this.add.graphics();
      (drawers[w.icon] ?? drawers.pebble)(g);
      g.generateTexture(`rc-icon-${w.icon}`, 60, 60);
      g.destroy();
    }
  }

  private buildDpad(): void {
    const mk = (x: number, y: number, dir: Dir, glyph: string): void => {
      const zone = this.add.zone(x, y, DPAD_SIZE, DPAD_SIZE).setInteractive({ useHandCursor: true });
      const ring = this.add.circle(x, y, DPAD_SIZE / 2 - 4, 0xfef3c7, 0.85).setStrokeStyle(3, 0xd97706, 1).setDepth(30);
      const label = this.add
        .text(x, y, glyph, { fontFamily: FONT, fontSize: "30px", color: "#92400e", fontStyle: "bold" })
        .setOrigin(0.5)
        .setDepth(31);
      const act = (): void => {
        this.tweens.add({ targets: [ring, label], scale: 0.88, duration: 70, yoyo: true });
        this.tryMove(dir);
      };
      zone.on("pointerdown", () => {
        this.swipeSkip = true; // a d-pad press is never the start of a swipe
        act();
        const t = window.setInterval(act, DPAD_REPEAT_MS);
        this.dpadTimers.push(t);
        const stop = (): void => {
          window.clearInterval(t);
          this.dpadTimers = this.dpadTimers.filter((x2) => x2 !== t);
        };
        zone.once("pointerup", stop);
        zone.once("pointerout", stop);
      });
    };
    // the source's d-pad row, verbatim-in-spirit (pinned 150 px buttons at
    // 768-canvas scale), below the sidewalk so it never covers the pilgrim
    mk(96, 960, DIRS.left, "◀");
    mk(288, 960, DIRS.down, "▼");
    mk(480, 960, DIRS.up, "▲");
    mk(672, 960, DIRS.right, "▶");
  }

  // ── board lifecycle ────────────────────────────────────────────────────────

  /** Row centre y (ROW_Y: 0 = goal, 1–5 = lanes bottom→top, 6 = sidewalk). */
  private rowY(r: number): number {
    return ROW_Y[r] ?? 832;
  }

  private colX(c: number): number {
    return 64 + c * TILE;
  }

  playBoard(board: RoadCrossBoard | null, commandEs: string | null): void {
    this.clear();
    this.locked = board === null;
    this.commandEs = commandEs;
    this.missArmed = true;
    this.timeExpiredFired = false;
    this.dead = false;
    this.col = 2;
    this.row = 6;
    if (!board) return;
    this.board = board;
    this.timeLeft = board.timeLimit;

    // goal strip (top) + sidewalk (bottom); the 128-px geometry is the pinned
    // source tileSize — 5 lanes stay, crossing count is the knob, not tiles
    this.add.image(0, 0, "rc-grass").setOrigin(0).setDisplaySize(TILE, TILE).setDepth(0);
    for (let i = 0; i < 2; i++) {
      this.add.image(0, 6 * TILE + i * TILE, "rc-sidewalk").setOrigin(0).setDisplaySize(TILE, TILE).setDepth(0);
    }
    // the 5 lanes, bottom → top
    for (let l = 0; l < 5; l++) {
      const yTop = (5 - l) * TILE; // lane 1 sits just above the sidewalk
      for (let i = 0; i < 6; i++) {
        this.add.image(i * TILE, yTop, "rc-road").setOrigin(0).setDisplaySize(TILE, TILE).setDepth(0);
      }
    }

    // lane labels: PROCEDURAL ICON, never the Spanish word (TPR, no reading)
    const iconSize = 64;
    for (let l = 0; l < 5; l++) {
      const lane = board.lanes[l];
      const cy = this.rowY(l + 1);
      let icon: Phaser.GameObjects.Image | null = null;
      let gloss: Phaser.GameObjects.Text | null = null;
      let tint: Phaser.GameObjects.Rectangle | null = null;
      if (lane.es) {
        const w = u05Words.get(lane.es);
        icon = this.add.image(64, cy, `rc-icon-${w?.icon ?? "pebble"}`).setDepth(2);
        icon.setDisplaySize(iconSize, iconSize);
        if (this.opts.gloss === "full" && w) {
          gloss = this.add
            .text(64, cy + iconSize / 2 + 12, w.en.split(/[;(]/)[0].trim().slice(0, 16), {
              fontFamily: FONT,
              fontSize: "15px",
              color: "#e7e5e4",
              fontStyle: "bold",
              backgroundColor: "#1c191766",
              padding: { x: 3, y: 1 },
            })
            .setOrigin(0.5)
            .setDepth(3);
        }
        if (lane.safe) {
          // the safe lane glows: eye and ear agree (sokoban's named-pulse rule)
          tint = this.add.rectangle(W / 2, cy, W, TILE, GOLD, 0.14).setDepth(1);
        }
      }
      this.lanes.push({ es: lane.es, safe: lane.safe, icon, gloss, tint });
    }
    this.refreshSafePulse();

    // traffic: carCount per lane (source formula folded into the difficulty
    // knob), alternating directions, ±20 jitter on the pinned lane speeds
    for (let l = 0; l < 5; l++) {
      const dir: 1 | -1 = l % 2 === 0 ? 1 : -1;
      const base = board.carSpeeds[l];
      const gap = W / board.carCount;
      for (let j = 0; j < board.carCount; j++) {
        const img = this.add.image(0, this.rowY(l + 1), "rc-car").setDepth(5);
        img.setTint(CAR_TINTS[(l + j) % CAR_TINTS.length]);
        img.setScale(0.92);
        img.x = gap * j + gap / 2 + (dir === 1 ? -30 : 30) + Phaser.Math.Between(-24, 24);
        this.cars.push({ img, speed: Math.max(60, base + Phaser.Math.Between(-20, 20)), dir });
      }
    }

    // the clock bar (red pulse is juice; the HUD chip lives in React)
    this.timeBar = this.add.rectangle(W / 2, 10, W - 32, 8, GOLD, 0.9).setDepth(4);

    // the pilgrim, on the sidewalk
    this.player = this.add.container(this.colX(this.col), this.rowY(this.row)).setDepth(6);
    const body = this.add.image(0, 0, "rc-pilgrim");
    body.setDisplaySize(TILE - 44, TILE - 44);
    this.player.add(body);
    this.player.setAlpha(0);
    this.tweens.add({ targets: this.player, alpha: 1, duration: 300 });
    this.tweens.add({ targets: this.player, scale: { from: 0.6, to: 1 }, duration: 260, ease: "Back.Out" });

    this.buildDpad();
  }

  private refreshSafePulse(): void {
    for (const h of this.halos) {
      h.destroy();
      this.tweens.killTweensOf(h);
    }
    this.halos = [];
    const lane = this.lanes.find((l) => l.safe);
    if (!lane?.icon) return;
    const halo = this.add.image(lane.icon.x, lane.icon.y, "rc-spark").setDepth(2);
    halo.setDisplaySize(84, 84).setAlpha(0.55).setTint(GOLD);
    this.tweens.add({ targets: halo, scale: { from: 1, to: 1.2 }, alpha: { from: 0.55, to: 0.3 }, yoyo: true, repeat: -1, duration: 650 });
    if (lane.tint) {
      this.tweens.add({ targets: lane.tint, alpha: { from: 0.2, to: 0.09 }, yoyo: true, repeat: -1, duration: 650 });
      this.halos.push(lane.tint);
    }
    this.halos.push(halo);
  }

  showBanner(title: string, sub?: string): void {
    this.locked = true;
    const banner = this.add
      .text(W / 2, H / 2 - 70, title, {
        fontFamily: FONT,
        fontSize: "56px",
        color: "#fefce8",
        fontStyle: "bold",
        stroke: "#166534",
        strokeThickness: 10,
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(40)
      .setScale(0.4)
      .setAlpha(0);
    const parts: Phaser.GameObjects.Text[] = [banner];
    if (sub) {
      parts.push(
        this.add
          .text(W / 2, H / 2 + 10, sub, {
            fontFamily: FONT,
            fontSize: "28px",
            color: "#ecfccb",
            fontStyle: "bold",
            stroke: "#166534",
            strokeThickness: 6,
            align: "center",
          })
          .setOrigin(0.5)
          .setDepth(40)
          .setAlpha(0),
      );
    }
    // plain tween, NOT tweens.chain (chain mis-shards configs in 3.88 — the
    // same synchronous throw the shooter hit; see sky-words.ts showBanner).
    this.tweens.add({
      targets: banner,
      scale: 1,
      alpha: 1,
      duration: 320,
      ease: "Back.Out",
      onComplete: () => {
        this.time.delayedCall(900, () => {
          this.tweens.add({ targets: parts, alpha: 0, duration: 320, onComplete: () => parts.forEach((t) => t.destroy()) });
        });
      },
    });
    this.tweens.add({ targets: parts.slice(1), alpha: 1, duration: 400, delay: 120 });
  }

  clear(): void {
    this.lanes.forEach((l) => {
      l.icon?.destroy();
      l.gloss?.destroy();
      l.tint?.destroy();
    });
    this.lanes = [];
    this.cars.forEach((c) => c.img.destroy());
    this.cars = [];
    this.halos.forEach((h) => h.destroy());
    this.halos = [];
    this.timeBar?.destroy();
    this.timeBar = null;
    this.player?.destroy();
    this.board = null;
    this.commandEs = null;
    this.tweening = false;
    this.dead = false;
    this.locked = true;
    this.dpadTimers.forEach((t) => window.clearInterval(t));
    this.dpadTimers = [];
  }

  celebrate(): void {
    this.clear();
    this.locked = true;
    for (let i = 0; i < 24; i++) {
      const s = this.add.image(Phaser.Math.Between(60, W - 60), Phaser.Math.Between(80, H - 260), "rc-spark");
      s.setTint([GOLD, 0x22c55e, 0x38bdf8, 0xf472b6][i % 4]).setScale(Phaser.Math.FloatBetween(0.8, 2));
      this.tweens.add({
        targets: s,
        y: "+=180",
        angle: Phaser.Math.Between(-180, 180),
        alpha: 0,
        duration: Phaser.Math.Between(700, 1300),
        onComplete: () => s.destroy(),
      });
    }
  }

  /** QA hook accessors — the crossing data + clock the scene is playing. */
  get boardData(): RoadCrossBoard | null {
    return this.board;
  }

  get timeLeftSec(): number {
    return this.timeLeft;
  }

  get crossingsPosition(): { col: number; row: number } {
    return { col: this.col, row: this.row };
  }

  // ── the rules engine (ported) ──────────────────────────────────────────────

  private speedMul(): number {
    return Math.max(0.4, this.bridge.params.speed || 1);
  }

  private tryMove(dir: Dir): void {
    if (this.locked || !this.board || this.tweening || this.dead) return;
    const nc = this.col + dir.dx;
    const nr = this.row + dir.dy;
    if (nc < 0 || nc > 5 || nr < 0 || nr > 6) return; // grid bounds: mechanical
    if (nr === 0 && this.row === 1) {
      // the goal is enterable ONLY from the safe lane — the crossing is
      // judged by its word, never by a row index (invariant 2)
      const lane = this.board.lanes[0]; // row 1 = lanes[0]
      if (!lane?.safe) {
        this.nudge(dir);
        return;
      }
    }
    this.hop(nc, nr);
  }

  private nudge(dir: Dir): void {
    if (this.tweening) return;
    this.tweening = true;
    this.tweens.add({
      targets: this.player,
      x: this.colX(this.col) + dir.dx * TILE * 0.16,
      y: this.rowY(this.row) + dir.dy * TILE * 0.16,
      duration: 70,
      yoyo: true,
      onComplete: () => {
        this.tweening = false;
      },
    });
  }

  private hop(nc: number, nr: number): void {
    this.tweening = true;
    const fromRow = this.row;
    this.col = nc;
    this.row = nr;
    this.tweens.add({
      targets: this.player,
      x: this.colX(nc),
      y: this.rowY(nr),
      duration: Math.max(80, HOP_MS * this.speedMul()),
      ease: "Sine.InOut",
      onComplete: () => {
        this.tweening = false;
        // hop squash (source :544-551 juice)
        this.tweens.add({ targets: this.player, scaleY: { from: 0.82, to: 1 }, duration: 130 });
        this.onArrive(fromRow, nr);
      },
    });
  }

  private onArrive(fromRow: number, toRow: number): void {
    if (!this.board || this.dead) return; // a death mid-hop never completes a crossing
    if (toRow === 0) {
      // SAFE CROSSING: the goal was reached through the safe lane — the ONLY
      // language hit, and it carries the ROUND'S es id, never a lane index
      this.burst(this.player.x, this.player.y + 40, GOLD, 16);
      this.bridge.onHit(this.commandEs ?? "");
      this.respawn();
      return;
    }
    if (toRow >= 1 && toRow <= 5) {
      const lane = this.board.lanes[toRow - 1];
      if (lane?.safe) {
        this.missArmed = true; // (re-)armed on the safe lane
      } else if (lane?.es && this.missArmed && fromRow !== toRow) {
        // decoy-lane entry: the one language miss — fires ONCE per wrong
        // choice, re-arms on the safe lane or respawn (plan §2)
        this.missArmed = false;
        this.bridge.onMiss(this.commandEs ?? "");
      }
    }
  }

  private respawn(): void {
    this.tweening = true;
    this.tweens.add({
      targets: this.player,
      x: this.colX(2),
      y: this.rowY(6),
      duration: 260,
      delay: 340,
      ease: "Sine.InOut",
      onComplete: () => {
        this.tweening = false;
        this.missArmed = true;
      },
    });
    this.col = 2;
    this.row = 6;
  }

  private die(): void {
    if (this.dead) return;
    this.dead = true;
    this.tweening = false;
    // source juice :268-291 — flash + shake + slow-mo, all mechanical
    this.deathUntil = this.time.now + 520;
    this.cameras.main.shake(220, 0.005);
    this.cameras.main.flash(180, 255, 90, 70);
    this.tweens.add({ targets: this.player, alpha: { from: 1, to: 0.25 }, duration: 200, yoyo: true });
    this.time.delayedCall(520, () => {
      this.player.setPosition(this.colX(2), this.rowY(6));
      this.col = 2;
      this.row = 6;
      this.missArmed = true;
      this.dead = false;
      this.tweens.add({ targets: this.player, alpha: 1, duration: 200 });
    });
  }

  private burst(x: number, y: number, tint: number, count: number): void {
    const p = this.add.particles(x, y, "rc-spark", {
      speed: { min: 90, max: 260 },
      lifespan: 430,
      scale: { start: 1.8, end: 0 },
      tint,
      emitting: false,
    });
    p.setDepth(9);
    p.explode(count);
    this.time.delayedCall(900, () => p.destroy());
  }

  update(time: number, delta: number): void {
    if (!this.board || this.locked) return;
    const dt = Math.min(delta, 50) / 1000;
    // slow-mo juice right after a car hit
    const slow = time < this.deathUntil ? 0.35 : 1;

    // traffic: wrap-around at the pinned speeds (jitter baked per car)
    for (const c of this.cars) {
      c.img.x += c.speed * c.dir * dt * slow;
      if (c.dir === 1 && c.img.x > W + 70) c.img.x = -70;
      if (c.dir === -1 && c.img.x < -70) c.img.x = W + 70;
    }

    // car overlap = mechanical death (no language event; never on the goal strip)
    if (!this.dead && this.row !== 0 && this.player) {
      const px = this.player.x;
      const py = this.player.y;
      for (const c of this.cars) {
        if (Math.abs(c.img.y - py) < 62 && Math.abs(c.img.x - px) < 80) {
          this.die();
          break;
        }
      }
    }

    // the crossing clock (tier-inverse per ruling 2) — timeout is mechanical
    if (!this.dead && !this.timeExpiredFired) {
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      if (this.timeBar) {
        const frac = this.board ? this.timeLeft / Math.max(1, this.board.timeLimit) : 0;
        this.timeBar.width = (W - 32) * frac;
        const danger = this.board ? this.timeLeft <= 10 : false;
        this.timeBar.fillColor = danger ? 0xef4444 : GOLD;
        if (danger) this.timeBar.alpha = 0.6 + 0.4 * Math.sin(time / 120);
        else this.timeBar.alpha = 0.9;
      }
      if (time - this.progressAt > 250) {
        this.progressAt = time;
        this.bridge.onProgress?.(Math.ceil(this.timeLeft), this.board.timeLimit);
      }
      if (this.timeLeft <= 0) {
        this.timeExpiredFired = true;
        this.bridge.onTimeExpired?.();
      }
    }
  }
}

// small helpers ───────────────────────────────────────────────────────────────

function arrow(g: Phaser.GameObjects.Graphics, dx: number, dy: number, color: number): void {
  const cx = 30;
  const cy = 30;
  const tip = { x: cx + dx * 20, y: cy + dy * 20 };
  const back = { x: cx - dx * 14, y: cy - dy * 14 };
  const side = { x: dy * 12, y: dx * 12 };
  g.fillStyle(color, 1);
  g.fillTriangle(tip.x, tip.y, back.x + side.x, back.y + side.y, back.x - side.x, back.y - side.y);
  g.fillStyle(color, 0.85);
  g.fillRect(cx - dx * 6 - Math.abs(side.x) / 2 - 3, cy - dy * 6 - Math.abs(side.y) / 2 - 3, 6 + Math.abs(side.x), 6 + Math.abs(side.y));
}

/** Boot the game inside a host element; returns the minimal handle React owns.
 * The island is the seam: bridge/ctrl arrive untyped and are narrowed here. */
export function createGame(
  parent: HTMLElement,
  bridgeDep: unknown,
  ctrlDep: unknown,
  optsDep?: unknown,
): { destroy: (removeCanvas?: boolean) => void } {
  const bridge = bridgeDep as RoadCrossBridge;
  const ctrl = ctrlDep as RoadCrossHandle;
  const opts = (optsDep ?? {}) as RoadCrossSceneOptions;
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W,
    height: H,
    backgroundColor: "#4d7c0f",
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    banner: false,
    render: { antialias: true },
    scene: [],
  });
  game.scene.add("calle", RoadCrossScene, true, { bridge, ctrl, opts });
  // Test/QA hook: lets the click-through reach the live scene (mechanic-id
  // naming per GAMES-2-4-bindings; boardData asserts the lane/traffic knobs).
  (window as unknown as { __palabraGame_roadcross?: unknown }).__palabraGame_roadcross = {
    game,
    bridge,
    ctrl,
    get scene() {
      return game.scene.getScene("calle");
    },
    get boardData() {
      const s = game.scene.getScene("calle") as RoadCrossScene | null;
      return s?.boardData ?? null;
    },
    get timeLeft() {
      const s = game.scene.getScene("calle") as RoadCrossScene | null;
      return s?.timeLeftSec ?? 0;
    },
    get position() {
      const s = game.scene.getScene("calle") as RoadCrossScene | null;
      return s?.crossingsPosition ?? null;
    },
  };
  return { destroy: (removeCanvas = true) => game.destroy(removeCanvas) };
}
