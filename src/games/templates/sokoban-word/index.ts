/**
 * «Empuja la Palabra» — the Phaser 3.88.1 body of the warehouse sokoban frame
 * (game #7; PORT-sokoban-word.md).
 *
 * Rules engine ported from the pinned prateek121/90s-games `sokoban.html`
 * (SHA 98ca2ade, MIT): grid cells, one-crate push (push blocked by bounds /
 * walls / crates = mechanical no-move), crate-on-goal completion — here
 * crate-on-ITS-tile (R7-3). RESTART is the only recovery affordance
 * (source-true: no undo; R7-5). Push tween ~140 ms × tier.
 *
 * Swipe = PATTERN-ONLY re-implementation of noowxela's Phaser 2 pointer
 * gesture (R7-7, SHA 9f08ca75: pointerdown saves coords, pointerup compares
 * release coords → one push per gesture) — new API, zero copied code.
 *
 * Every sprite is drawn here with Graphics — no external art, no CDN, no
 * webfont loader, no Phaser audio (speech is React's kokoro voice through the
 * bridge; push juice is visual). Scenes never touch storage or voice.
 */
import * as Phaser from "phaser";

import { words as u05Words, wordFor } from "~/content/packs/a0-u05-sokoban";

import { attachScene, type SokobanBoard, type SokobanBridge, type SokobanHandle } from "./types";

const W = 720;
const H = 960;
/** Push tween base (ms), scaled by bridge.params.speed (tier ×0.6/1.0/1.4). */
const PUSH_MS = 140;
const BOUNCE_MS = 110;
/** Swipe threshold px + d-pad hold-to-repeat interval (noowxela pattern). */
const SWIPE_MIN_PX = 10;
const DPAD_REPEAT_MS = 240;
const FONT = '"Nunito", "Trebuchet MS", "Segoe UI", system-ui, sans-serif';

const WOOD = 0xa16207;
const WOOD_DARK = 0x713f12;
const DECOY = 0x64748b;
const PLANK = 0xd6a97c;
const PLANK_DARK = 0xb98a5b;
const STONE = 0x78716c;
const ROBE = 0xf5f5f4;
const GOLD = 0xfbbf24;

type Dir = { dx: number; dy: number };
const DIRS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
} satisfies Record<string, Dir>;

type CrateView = {
  es: string;
  isDecoy: boolean;
  x: number;
  y: number;
  img: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  container: Phaser.GameObjects.Container;
  done: boolean;
};

type TileView = {
  es: string;
  x: number;
  y: number;
  img: Phaser.GameObjects.Image;
  gloss: Phaser.GameObjects.Text | null;
  seal: Phaser.GameObjects.Container | null;
};

export type SokobanSceneOptions = {
  /** Tile EN gloss visibility, resolved React-side per immersion level. */
  gloss: "full" | "faded" | "none";
};

class SokobanScene extends Phaser.Scene {
  private bridge!: SokobanBridge;
  private ctrl!: SokobanHandle;
  private opts: SokobanSceneOptions = { gloss: "full" };
  private board: SokobanBoard | null = null;
  private cell = 60;
  private originX = 0;
  private originY = 0;
  private crates: CrateView[] = [];
  private tiles: TileView[] = [];
  private player!: Phaser.GameObjects.Container;
  private playerCell = { x: 0, y: 0 };
  private namedEs: string | null = null;
  private pulses: Phaser.GameObjects.Image[] = [];
  private movesUsed = 0;
  private budgetLeft: number | null = null;
  private tweening = false;
  private locked = true;
  // swipe gesture state (pattern-only; one push per gesture)
  private swipeStart: { x: number; y: number } | null = null;
  private swipeSkip = false;
  private dpadTimers: number[] = [];

  constructor() {
    super("almacen");
  }

  init(data: { bridge: SokobanBridge; ctrl: SokobanHandle; opts?: SokobanSceneOptions }): void {
    this.bridge = data.bridge;
    this.ctrl = data.ctrl;
    if (data.opts) this.opts = data.opts;
  }

  create(): void {
    this.buildFloor();
    this.buildSprites();
    this.buildPlayer();
    this.buildDpad();

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
    // swipe: one push per gesture (pointerdown saves, pointerup compares)
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
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN_PX) return;
      if (Math.abs(dx) > Math.abs(dy)) this.tryMove(dx > 0 ? DIRS.right : DIRS.left);
      else this.tryMove(dy > 0 ? DIRS.down : DIRS.up);
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb.removeAllListeners();
      this.input.removeAllListeners();
      this.dpadTimers.forEach((t) => window.clearInterval(t));
    });

    // The command post may already hold the first board.
    attachScene(this.ctrl, this);
  }

  // ── original procedural art ────────────────────────────────────────────────

  private buildFloor(): void {
    const g = this.textures.createCanvas("almacen-bg", 2, 256);
    if (g) {
      const ctx = g.getContext();
      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, "#8a5a2b");
      grad.addColorStop(1, "#6b4423");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 2, 256);
      g.refresh();
      this.add.image(0, 0, "almacen-bg").setOrigin(0).setDisplaySize(W, H).setDepth(0);
    }
  }

  private buildSprites(): void {
    if (this.textures.exists("plank")) return;

    // floor plank tile
    const p = this.add.graphics();
    p.fillStyle(PLANK, 1);
    p.fillRoundedRect(1, 1, 58, 58, 6);
    p.lineStyle(2, PLANK_DARK, 1);
    p.strokeRoundedRect(1, 1, 58, 58, 6);
    p.lineStyle(1, PLANK_DARK, 0.6);
    p.beginPath();
    p.moveTo(6, 20);
    p.lineTo(54, 20);
    p.moveTo(6, 40);
    p.lineTo(54, 40);
    p.strokePath();
    p.generateTexture("plank", 60, 60);
    p.destroy();

    // stone wall block
    const w = this.add.graphics();
    w.fillStyle(STONE, 1);
    w.fillRoundedRect(0, 0, 60, 60, 8);
    w.fillStyle(0x57534e, 1);
    w.fillRoundedRect(6, 8, 20, 12, 3);
    w.fillRoundedRect(32, 8, 22, 12, 3);
    w.fillRoundedRect(6, 26, 22, 12, 3);
    w.fillRoundedRect(34, 26, 20, 12, 3);
    w.fillRoundedRect(6, 44, 20, 10, 3);
    w.fillRoundedRect(32, 44, 22, 10, 3);
    w.generateTexture("stone", 60, 60);
    w.destroy();

    // target crate: wooden, banded
    const c = this.add.graphics();
    c.fillStyle(WOOD, 1);
    c.fillRoundedRect(0, 0, 60, 60, 7);
    c.lineStyle(4, WOOD_DARK, 1);
    c.strokeRoundedRect(0, 0, 60, 60, 7);
    c.lineStyle(3, WOOD_DARK, 0.9);
    c.beginPath();
    c.moveTo(4, 4);
    c.lineTo(56, 56);
    c.moveTo(56, 4);
    c.lineTo(4, 56);
    c.strokePath();
    c.generateTexture("crate", 60, 60);
    c.destroy();

    // decoy crate: gray slate
    const d = this.add.graphics();
    d.fillStyle(DECOY, 1);
    d.fillRoundedRect(0, 0, 60, 60, 7);
    d.lineStyle(4, 0x334155, 1);
    d.strokeRoundedRect(0, 0, 60, 60, 7);
    d.lineStyle(3, 0x334155, 0.9);
    d.beginPath();
    d.moveTo(4, 30);
    d.lineTo(56, 30);
    d.strokePath();
    d.generateTexture("decoy", 60, 60);
    d.destroy();

    // meaning plate: pale floor plate (the icon sits on top)
    const t = this.add.graphics();
    t.fillStyle(0xfef3c7, 1);
    t.fillRoundedRect(2, 2, 56, 56, 10);
    t.lineStyle(3, 0xd97706, 1);
    t.strokeRoundedRect(2, 2, 56, 56, 10);
    t.generateTexture("plate", 60, 60);
    t.destroy();

    // spark for juice
    const s = this.add.graphics();
    s.fillStyle(0xffffff, 1);
    s.fillCircle(6, 6, 6);
    s.generateTexture("spark", 12, 12);
    s.destroy();

    // the 15 procedural icon glyphs (a0-u05 icon table, R7-4)
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
    // the a0-u05 icon glyphs — one texture per es, straight from the binder
    for (const w of u05Words.values()) {
      const g = this.add.graphics();
      (drawers[w.icon] ?? drawers.pebble)(g);
      g.generateTexture(`icon-${w.es}`, 60, 60);
      g.destroy();
    }
  }

  private buildPlayer(): void {
    if (this.textures.exists("pilgrim")) return;
    const g = this.add.graphics();
    // robe
    g.fillStyle(ROBE, 1);
    g.fillTriangle(30, 16, 12, 56, 48, 56);
    // belt
    g.fillStyle(0xb45309, 1);
    g.fillRect(19, 40, 22, 5);
    // head + hood
    g.fillStyle(0xfcd9b8, 1);
    g.fillCircle(30, 14, 8);
    g.fillStyle(0x7c2d12, 1);
    g.fillEllipse(30, 8, 18, 10);
    // scroll in hand
    g.fillStyle(GOLD, 1);
    g.fillRect(40, 34, 8, 12);
    g.generateTexture("pilgrim", 60, 60);
    g.destroy();
  }

  private buildDpad(): void {
    const mk = (x: number, y: number, dir: Dir, glyph: string): void => {
      const zone = this.add.zone(x, y, 110, 110).setCircle(55).setInteractive({ useHandCursor: true });
      const ring = this.add.circle(x, y, 44, 0xfef3c7, 0.85).setStrokeStyle(3, 0xd97706, 1).setDepth(30);
      const label = this.add
        .text(x, y, glyph, { fontFamily: FONT, fontSize: "30px", color: "#92400e", fontStyle: "bold" })
        .setOrigin(0.5)
        .setDepth(31);
      const act = (): void => {
        this.tweens.add({ targets: [ring, label], scale: 0.88, duration: 70, yoyo: true });
        this.tryMove(dir);
      };
      zone.on("pointerdown", () => {
        this.swipeSkip = true;
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
    // corners, clear of the board (board tops out around y≈120)
    mk(80, H - 90, DIRS.left, "◀");
    mk(190, H - 90, DIRS.down, "▼");
    mk(530, H - 90, DIRS.up, "▲");
    mk(640, H - 90, DIRS.right, "▶");
  }

  // ── board lifecycle ────────────────────────────────────────────────────────

  playBoard(board: SokobanBoard | null, namedEs: string | null): void {
    this.clear();
    this.locked = board === null;
    this.namedEs = namedEs;
    this.movesUsed = 0;
    this.budgetLeft = board && board.moveBudget > 0 ? board.moveBudget : null;
    if (!board) return;
    this.board = board;
    this.cell = Math.floor(Math.min(560, H - 420) / board.size);
    this.originX = Math.round(W / 2 - (board.size * this.cell) / 2 + this.cell / 2);
    this.originY = Math.round(150 + this.cell / 2);

    // floor + walls
    for (let y = 0; y < board.size; y++) {
      for (let x = 0; x < board.size; x++) {
        const img = this.add.image(this.px(x), this.py(y), board.walls[y][x] ? "stone" : "plank");
        img.setDepth(1).setDisplaySize(this.cell, this.cell);
      }
    }
    // meaning tiles (icon ALWAYS present; en gloss fades per englishLevel)
    for (const t of board.tiles) {
      const img = this.add.image(this.px(t.x), this.py(t.y), "plate").setDepth(2);
      img.setDisplaySize(this.cell - 6, this.cell - 6);
      const icon = this.add.image(this.px(t.x), this.py(t.y) - (this.opts.gloss === "full" ? 6 : 0), `icon-${t.es}`).setDepth(3);
      icon.setDisplaySize(this.cell - 18, this.cell - 18);
      let gloss: Phaser.GameObjects.Text | null = null;
      if (this.opts.gloss === "full") {
        const en = wordFor(t.es).en.split(/[;(]/)[0].trim();
        gloss = this.add
          .text(this.px(t.x), this.py(t.y) + this.cell * 0.28, en.slice(0, 22), {
            fontFamily: FONT,
            fontSize: `${Math.max(9, Math.round(this.cell * 0.16))}px`,
            color: "#78716c",
            fontStyle: "bold",
          })
          .setOrigin(0.5)
          .setDepth(3);
      }
      this.tiles.push({ es: t.es, x: t.x, y: t.y, img, gloss, seal: null });
    }
    // crates
    const mkCrate = (c: { es: string; x: number; y: number }, isDecoy: boolean): void => {
      const container = this.add.container(this.px(c.x), this.py(c.y)).setDepth(5);
      const img = this.add.image(0, 0, isDecoy ? "decoy" : "crate");
      img.setDisplaySize(this.cell - 4, this.cell - 4);
      // label sized to stay INSIDE the crate — never blocking the sprite
      const len = c.es.length;
      const label = this.add.text(0, 0, c.es, {
        fontFamily: FONT,
        fontSize: `${Math.max(11, Math.round(Math.min(this.cell * 0.3, (this.cell * 1.8) / len)))}px`,
        color: isDecoy ? "#e2e8f0" : "#fefce8",
        fontStyle: "bold",
      });
      label.setOrigin(0.5);
      container.add([img, label]);
      const view: CrateView = { es: c.es, isDecoy, x: c.x, y: c.y, img, label, container, done: false };
      this.crates.push(view);
    };
    for (const t of board.targets) mkCrate(t, false);
    for (const d of board.decoys) mkCrate(d, true);

    // player
    this.playerCell = { x: board.player.x, y: board.player.y };
    this.player = this.add.container(this.px(this.playerCell.x), this.py(this.playerCell.y)).setDepth(6);
    const body = this.add.image(0, 0, "pilgrim");
    body.setDisplaySize(this.cell - 10, this.cell - 10);
    this.player.add(body);
    this.player.setAlpha(0);
    this.tweens.add({ targets: this.player, alpha: 1, duration: 300 });

    this.refreshNamedPulse();
    this.tweens.add({ targets: this.player, scale: { from: 0.6, to: 1 }, duration: 260, ease: "Back.Out" });
  }

  namePair(namedEs: string | null): void {
    this.namedEs = namedEs;
    this.refreshNamedPulse();
  }

  private refreshNamedPulse(): void {
    for (const p of this.pulses) {
      p.destroy();
      this.tweens.killTweensOf(p);
    }
    this.pulses = [];
    if (!this.namedEs) return;
    const crate = this.crates.find((c) => c.es === this.namedEs && !c.done);
    const tile = this.tiles.find((t) => t.es === this.namedEs);
    for (const target of [crate?.container, tile?.img]) {
      if (!target) continue;
      this.tweens.add({ targets: target, alpha: { from: 1, to: 0.75 }, yoyo: true, repeat: -1, duration: 650 });
    }
    // a soft halo on the named tile so eye and ear agree
    if (tile) {
      const halo = this.add.image(this.px(tile.x), this.py(tile.y), "spark").setDepth(2);
      halo.setDisplaySize(this.cell + 10, this.cell + 10).setAlpha(0.5).setTint(GOLD);
      this.tweens.add({ targets: halo, scale: { from: 1, to: 1.15 }, yoyo: true, repeat: -1, duration: 650 });
      this.pulses.push(halo);
    }
  }

  showBanner(title: string, sub?: string): void {
    this.locked = true;
    const banner = this.add
      .text(W / 2, H / 2 - 70, title, {
        fontFamily: FONT,
        fontSize: "58px",
        color: "#fefce8",
        fontStyle: "bold",
        stroke: "#7c2d12",
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
            color: "#fef3c7",
            fontStyle: "bold",
            stroke: "#7c2d12",
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
    this.crates.forEach((c) => c.container.destroy());
    this.crates = [];
    this.tiles.forEach((t) => {
      t.img.destroy();
      t.gloss?.destroy();
      t.seal?.destroy(true);
    });
    this.tiles = [];
    this.pulses.forEach((p) => p.destroy());
    this.pulses = [];
    this.player?.destroy();
    this.board = null;
    this.tweening = false;
    this.locked = true;
  }

  celebrate(): void {
    this.clear();
    this.locked = true;
    for (let i = 0; i < 24; i++) {
      const s = this.add.image(Phaser.Math.Between(60, W - 60), Phaser.Math.Between(80, H - 200), "spark");
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

  /** QA hook accessor — the board data the scene is playing. */
  get boardData(): SokobanBoard | null {
    return this.board;
  }

  /** Pushes used this board (budget HUD). */
  get moves(): number {
    return this.movesUsed;
  }

  // ── the rules engine (ported) ──────────────────────────────────────────────

  private px(x: number): number {
    return this.originX + x * this.cell;
  }

  private py(y: number): number {
    return this.originY + y * this.cell;
  }

  private crateAt(x: number, y: number): CrateView | undefined {
    return this.crates.find((c) => !c.done && c.x === x && c.y === y);
  }

  private isBlocked(x: number, y: number): boolean {
    const b = this.board;
    if (!b) return true;
    return x < 0 || y < 0 || x >= b.size || y >= b.size || b.walls[y][x];
  }

  private tryMove(dir: Dir): void {
    if (this.locked || !this.board || this.tweening) return;
    const nx = this.playerCell.x + dir.dx;
    const ny = this.playerCell.y + dir.dy;
    const crate = this.crateAt(nx, ny);
    if (!crate) {
      if (this.isBlocked(nx, ny)) {
        // bounds / wall: source-true mechanical bump (Sfx.bump → visual nudge)
        this.nudge(dir);
        return;
      }
      this.stepPlayer(nx, ny);
      return;
    }
    // crate push: the cell beyond must be free (source push rules)
    const bx = nx + dir.dx;
    const by = ny + dir.dy;
    if (this.isBlocked(bx, by) || this.crateAt(bx, by)) {
      this.nudge(dir);
      return;
    }
    this.push(crate, nx, ny, bx, by);
  }

  private nudge(dir: Dir): void {
    if (this.tweening) return;
    this.tweening = true;
    this.tweens.add({
      targets: this.player,
      x: this.px(this.playerCell.x) + dir.dx * this.cell * 0.18,
      y: this.py(this.playerCell.y) + dir.dy * this.cell * 0.18,
      duration: 70,
      yoyo: true,
      onComplete: () => {
        this.tweening = false;
      },
    });
  }

  private stepPlayer(nx: number, ny: number): void {
    this.tweening = true;
    this.playerCell = { x: nx, y: ny };
    this.tweens.add({
      targets: this.player,
      x: this.px(nx),
      y: this.py(ny),
      duration: Math.max(70, PUSH_MS * this.speedMul()),
      onComplete: () => {
        this.tweening = false;
      },
    });
  }

  private speedMul(): number {
    return Math.max(0.4, this.bridge.params.speed || 1);
  }

  private push(crate: CrateView, cx: number, cy: number, bx: number, by: number): void {
    this.tweening = true;
    const prePlayer = { x: this.playerCell.x, y: this.playerCell.y };
    const pushMs = Math.max(70, PUSH_MS * this.speedMul());
    this.playerCell = { x: cx, y: cy };
    crate.x = bx;
    crate.y = by;
    this.movesUsed += 1;
    if (this.budgetLeft !== null) this.budgetLeft = Math.max(0, this.budgetLeft - 1);

    this.tweens.add({ targets: this.player, x: this.px(cx), y: this.py(cy), duration: pushMs });
    this.tweens.add({
      targets: crate.container,
      x: this.px(bx),
      y: this.py(by),
      duration: pushMs,
      onComplete: () => {
        this.tweening = false;
        this.bridge.onProgress?.(this.movesUsed, this.budgetLeft);
        if (this.budgetLeft === 0) {
          // budget expiry = mechanical board restart, NO language event (R7-5)
          this.bridge.onBudgetExpired?.();
          return;
        }
        const tile = this.tiles.find((t) => t.x === bx && t.y === by);
        if (tile && !crate.isDecoy && tile.es === crate.es) {
          this.sealPair(crate, tile);
          this.bridge.onHit(crate.es); // R7-3: the COMPLETED PAIR's es
          return;
        }
        if (tile) {
          // wrong tile: crate bounces back to its pre-push cell (R7-5 — the
          // whole push undoes; kills the tile-blocking softlock class)
          this.bounceBack(crate, cx, cy, prePlayer);
        }
      },
    });
  }

  private bounceBack(crate: CrateView, cx: number, cy: number, prePlayer: { x: number; y: number }): void {
    this.tweening = true;
    crate.x = cx;
    crate.y = cy;
    this.playerCell = { x: prePlayer.x, y: prePlayer.y };
    this.tweens.add({ targets: crate.container, x: this.px(cx), y: this.py(cy), duration: BOUNCE_MS, ease: "Sine.Out" });
    this.tweens.add({
      targets: this.player,
      x: this.px(prePlayer.x),
      y: this.py(prePlayer.y),
      duration: BOUNCE_MS,
      ease: "Sine.Out",
      onComplete: () => {
        this.tweening = false;
        this.shake(crate.container);
        this.bridge.onMiss(this.namedEs ?? crate.es); // R7-3: ALWAYS the named pair's es
      },
    });
  }

  private shake(target: Phaser.GameObjects.Container): void {
    this.tweens.add({ targets: target, x: "+=5", duration: 45, yoyo: true, repeat: 2 });
  }

  private sealPair(crate: CrateView, tile: TileView): void {
    crate.done = true;
    // the crate merges into its tile: wood fades, the icon seals with sparkle
    this.tweens.killTweensOf(crate.container); // pulse tweens must not outlive it
    this.tweens.add({
      targets: crate.container,
      alpha: 0,
      scale: 0.7,
      duration: 260,
      onComplete: () => crate.container.destroy(),
    });
    this.crates = this.crates.filter((c) => c !== crate);
    const seal = this.add.container(this.px(tile.x), this.py(tile.y)).setDepth(4);
    const ring = this.add.circle(0, 0, this.cell * 0.42).setStrokeStyle(5, GOLD, 1).setAlpha(0);
    seal.add(ring);
    tile.seal = seal;
    this.tweens.add({ targets: ring, alpha: 1, scale: { from: 1.6, to: 1 }, duration: 340, ease: "Back.Out" });
    this.tweens.add({ targets: tile.img, scale: { from: 1, to: 1.18 }, duration: 200, yoyo: true });
    this.burst(this.px(tile.x), this.py(tile.y), GOLD, 14);
    if (this.namedEs === crate.es) this.refreshNamedPulse();
  }

  private burst(x: number, y: number, tint: number, count: number): void {
    const p = this.add.particles(x, y, "spark", {
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

/** Boot the game inside a host element; returns the minimal handle React owns. */
export function createGame(
  parent: HTMLElement,
  bridge: SokobanBridge,
  ctrl: SokobanHandle,
  opts?: SokobanSceneOptions,
): { destroy: (removeCanvas?: boolean) => void } {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W,
    height: H,
    backgroundColor: "#8a5a2b",
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    banner: false,
    render: { antialias: true },
    scene: [],
  });
  game.scene.add("almacen", SokobanScene, true, { bridge, ctrl, opts });
  // Test/QA hook: lets the click-through reach the live scene (mechanic-id
  // naming, breakout ruling 1; boardData asserts generator/validator live).
  (window as unknown as { __palabraGame_sokoban?: unknown }).__palabraGame_sokoban = {
    game,
    bridge,
    ctrl,
    get scene() {
      return game.scene.getScene("almacen");
    },
    get boardData() {
      const s = game.scene.getScene("almacen") as SokobanScene | null;
      return s?.boardData ?? null;
    },
    get moves() {
      const s = game.scene.getScene("almacen") as SokobanScene | null;
      return s?.moves ?? 0;
    },
  };
  return { destroy: (removeCanvas = true) => game.destroy(removeCanvas) };
}
