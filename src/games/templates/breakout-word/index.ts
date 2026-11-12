/**
 * «Ladrillos del Alfabeto» — the Phaser 3.88.1 body of the breakout frame
 * (game #4; PORT-breakout-word.md).
 *
 * Rules engine ported from the pinned sausi-7/games `games/arcade/breakoid`
 * `mechanics.js` (SHA c97ef8be, MIT — GAME-source-pins.md #4): static-body
 * paddle moved via updateFromGameObject, relative-hit ±75° bounce control,
 * per-frame speed clamp [min,max] with the anti-stall nudge, open-bottom loss
 * zone, 1-second tick clock, pointer-drag paddle (keyboard retuned — the
 * source's 5 px/tick was unusable). The anonymous brick wall becomes the
 * label-aware spelling loop (plan §3, the ONE deep change):
 *   next-needed → breaks, its letter/syllable NAME is spoken, cursor++;
 *   needed-later → BOUNCES (never breaks — no softlock), one miss per graze;
 *   decoy       → breaks (board thins), one miss.
 * Ball loss and clock expiry are MECHANICAL (onMechanical — the knob'd
 * ladder) and never speak. Bricks are `add.rectangle` in the SOURCE itself —
 * only labels, role tints and textures are port-side; every sprite is
 * procedural (plan §5 strip: zero source bytes shipped).
 */
import * as Phaser from "phaser";

import { labelSay } from "~/content/packs/a0-u04-breakout";

import { attachScene, type BreakoutBoard, type BreakoutBridge, type BreakoutHandle } from "./types";

/** Source-native canvas (pinned numbers verbatim: brick 172.8×30 spacing 10
 * startY 150, clamp [600,1000] at R3 anchor). The island FIT-scales. */
const W = 1080;
const H = 1920;
/** Paddle bar height — the source stretched platform.png to 170 px tall
 * (a small image scaled by displayHeight = paddleHeight+150); the port draws
 * a clean procedural bar whose body follows the GameObject. */
const PADDLE_H = 36;
/** Ball diameter ≈ the source's scale-0.1 ball visual; the ballRadius knob
 * is dead in the source (read, never used — pins #4) and is not ported. */
const BALL_D = 26;
/** Keyboard paddle speed px/s (ADD-and-retune: source 5 px/frame unusable). */
const KEY_SPEED = 900;
/** Anti-stall: |vy| floor as a fraction of the current speed — the shallowest
 * legal paddle bounce is cos(75°) ≈ 0.259, so 0.25 never fights it. */
const MIN_VY_FRAC = 0.25;
/** One language miss per brick per graze window (plan §3). */
const MISS_COOLDOWN_MS = 250;
/** Launch watchdog: fires when the entry chant may still be speaking. */
const LAUNCH_WATCHDOG_MS = 3200;
const FONT = '"Nunito", "Trebuchet MS", "Segoe UI", system-ui, sans-serif';

const BRIGHT = 0xfbbf24; // next-needed brick (eye and ear agree)
const FUTURE = 0xd97706; // needed later — muted
const DECOY = 0x78716c; // decoy — dim stone
const SKY_TOP = 0x0b1026;
const SKY_BOTTOM = 0x1e1b4b;

type BrickMeta = {
  rect: Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.StaticBody };
  text: Phaser.GameObjects.Text;
  label: string;
  decoy: boolean;
  lastMissAt: number;
};

type Dir = -1 | 0 | 1;

class BreakoutScene extends Phaser.Scene {
  private bridge!: BreakoutBridge;
  private ctrl!: BreakoutHandle;
  private board: BreakoutBoard | null = null;
  private bricks: BrickMeta[] = [];
  private bricksGroup!: Phaser.Physics.Arcade.StaticGroup;
  private paddle!: Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.StaticBody };
  private ball!: Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };
  private cursor = 0;
  /** Remaining seq labels (a word may repeat a letter — agua — so the glow
   * keys on what is STILL needed, never an index). */
  private remaining: string[] = [];
  private launched = false;
  private boardDone = false;
  private dropFired = false;
  private timeExpiredFired = false;
  private timeLeft = 0;
  private targetX = W / 2;
  private keyDir: Dir = 0;
  private launchTimer: Phaser.Time.TimerEvent | null = null;
  private clockEvent: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super("ladrillos");
  }

  init(data: { bridge: BreakoutBridge; ctrl: BreakoutHandle }): void {
    this.bridge = data.bridge;
    this.ctrl = data.ctrl;
  }

  create(): void {
    this.physics.world.gravity.y = 0; // port sets 0 (bubble precedent; the
    // source's config gravity 1 is per-frame noise — pins #4)
    this.buildTextures();

    // Input registered exactly ONCE per scene lifetime (QA invariant).
    const kb = this.input.keyboard!;
    kb.addCapture(["LEFT", "RIGHT", "A", "D"]);
    kb.on("keydown-LEFT", () => (this.keyDir = -1));
    kb.on("keydown-RIGHT", () => (this.keyDir = 1));
    kb.on("keyup-LEFT", () => {
      if (this.keyDir === -1) this.keyDir = 0;
    });
    kb.on("keyup-RIGHT", () => {
      if (this.keyDir === 1) this.keyDir = 0;
    });
    kb.on("keydown-A", () => (this.keyDir = -1));
    kb.on("keydown-D", () => (this.keyDir = 1));
    kb.on("keyup-A", () => {
      if (this.keyDir === -1) this.keyDir = 0;
    });
    kb.on("keyup-D", () => {
      if (this.keyDir === 1) this.keyDir = 0;
    });
    // pointer = primary (source :257-259): drag anywhere aims the paddle.
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      this.targetX = p.x;
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb.removeAllListeners();
      this.input.removeAllListeners();
      this.launchTimer?.remove(false);
      this.launchTimer = null;
      this.clockEvent?.remove(false);
    });

    // The paddle + ball exist once; boards rebuild only the bricks.
    this.paddle = this.add.rectangle(W / 2, H - 100, W * 0.25, PADDLE_H, 0xf5f5f4) as Phaser.GameObjects.Rectangle & {
      body: Phaser.Physics.Arcade.StaticBody;
    };
    this.physics.add.existing(this.paddle, true); // static body (source :181)
    this.ball = this.add.rectangle(W / 2, H - 140, BALL_D, BALL_D, 0xffffff) as Phaser.GameObjects.Rectangle & {
      body: Phaser.Physics.Arcade.Body;
    };
    this.physics.add.existing(this.ball);
    this.ball.body.setCollideWorldBounds(true);
    this.ball.body.setBounce(1, 1);
    this.physics.world.setBoundsCollision(true, true, true, false); // open bottom = loss zone
    this.ball.setVisible(false);

    this.physics.add.collider(
      this.ball,
      this.paddle,
      (_ball, paddle) => {
        if (this.launched && !this.boardDone) this.hitPaddle(this.ball, paddle as typeof this.paddle);
      },
      undefined,
      this,
    );
    this.bricksGroup = this.physics.add.staticGroup();
    this.physics.add.collider(
      this.ball,
      this.bricksGroup,
      (_ball, brick) => {
        if (this.launched && !this.boardDone) this.hitBrick(brick as BrickMeta["rect"]);
      },
      undefined,
      this,
    );

    attachScene(this.ctrl, this);
  }

  // ── procedural art (no source bytes, plan §5) ─────────────────────────────

  private buildTextures(): void {
    if (this.textures.exists("br-bg")) return;
    const g = this.add.graphics();
    g.fillGradientStyle(SKY_TOP, SKY_TOP, SKY_BOTTOM, SKY_BOTTOM, 1);
    g.fillRect(0, 0, W, H);
    g.fillStyle(0xffffff, 0.8);
    for (let i = 0; i < 46; i++) {
      const x = (i * 173) % W;
      const y = (i * 397) % (H - 300);
      g.fillCircle(x, y, i % 5 === 0 ? 2.4 : 1.4);
    }
    g.generateTexture("br-bg", W, H);
    g.destroy();
    this.add.image(0, 0, "br-bg").setOrigin(0).setDepth(-1);
    const s = this.add.graphics();
    s.fillStyle(0xffffff, 1);
    s.fillCircle(6, 6, 6);
    s.generateTexture("br-spark", 12, 12);
    s.destroy();
  }

  // ── board lifecycle ────────────────────────────────────────────────────────

  playBoard(board: BreakoutBoard | null): void {
    this.clearBoard();
    if (!board) {
      this.board = null;
      return;
    }
    this.board = board;
    this.cursor = 0;
    this.remaining = [...board.seq];
    this.launched = false;
    this.boardDone = false;
    this.dropFired = false;
    this.timeExpiredFired = false;
    this.timeLeft = board.timeLimit;
    this.keyDir = 0;

    // Paddle geometry: the board's tier+ramp ratio (updateFromGameObject keeps
    // the static body honest — source :337-346).
    this.paddle.width = Math.max(120, W * board.paddleRatio);
    this.paddle.x = W / 2;
    this.paddle.body.updateFromGameObject();

    // The wall: grid math verbatim (source :204-233) — brickWidth (W/cols)×0.8,
    // spacing 10, startY 150; rows shrink to the brick count (partial rows).
    const labels = this.placement(board);
    const bw = (W / board.cols) * 0.8;
    const bh = 30;
    const gap = 10;
    const startX = (W - (board.cols * bw + (board.cols - 1) * gap)) / 2;
    const startY = 150;
    for (const [i, brick] of labels.entries()) {
      const col = i % board.cols;
      const row = Math.floor(i / board.cols);
      const x = startX + col * (bw + gap) + bw / 2;
      const y = startY + row * (bh + gap) + bh / 2;
      const decoy = board.decoys.includes(brick.label);
      const isNext = !decoy && brick.seqIdx === 0;
      const rect = this.add.rectangle(x, y, bw, bh, decoy ? DECOY : isNext ? BRIGHT : FUTURE) as BrickMeta["rect"];
      this.physics.add.existing(rect, true);
      this.bricksGroup.add(rect);
      const text = this.add
        .text(x, y, brick.label, {
          fontFamily: FONT,
          fontSize: "26px",
          color: decoy ? "#d6d3d1" : "#1c1917",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(3);
      this.bricks.push({ rect, text, label: brick.label, decoy, lastMissAt: 0 });
    }
    this.refreshNextGlow();

    // Ball waits at the spawn (hidden) until the chant finishes or the
    // watchdog fires — the child hears the word + spelling BEFORE play.
    this.ball.setPosition(W / 2, H - 140);
    this.ball.body.setVelocity(0, 0);
    this.ball.setVisible(false);
    this.launchTimer?.remove(false);
    this.launchTimer = this.time.delayedCall(LAUNCH_WATCHDOG_MS, () => {
      this.launchTimer = null;
      this.launch();
    });

    // The round clock (source tickTimer :264-269): mechanical expiry.
    this.clockEvent?.remove(false);
    this.clockEvent = this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tick() });
    this.bridge.onProgress?.(this.timeLeft, board.timeLimit);
  }

  /** Deterministic placement: seeded shuffle (mulberry32) of seq bricks +
   * decoys, row-major fill. Placement is cosmetic — the rules make every
   * arrangement winnable — but determinism keeps sessions reproducible. */
  private placement(board: BreakoutBoard): { label: string; seqIdx: number }[] {
    const items = board.seq.map((label, seqIdx) => ({ label, seqIdx }));
    for (const label of board.decoys) items.push({ label, seqIdx: -1 });
    let h = 2166136261;
    for (const c of `${board.word}-place`) {
      h ^= c.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
    const rand = (): number => {
      h = Math.imul(h ^ (h >>> 15), 2246822519);
      h = Math.imul(h ^ (h >>> 13), 3266489917);
      return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  /** The next-needed brick glows; everything else stays muted (sokoban's
   * named-pulse rule: eye and ear agree). */
  private refreshNextGlow(): void {
    for (const b of this.bricks) {
      if (b.decoy) continue;
      b.rect.fillColor = this.remaining[0] === b.label ? BRIGHT : FUTURE;
    }
  }

  /** React calls this when the entry chant ends (the watchdog is the bound). */
  launch(): void {
    if (!this.board || this.launched || this.boardDone) return;
    this.launched = true;
    this.ball.setVisible(true);
    this.resetBall();
  }

  /** Source resetBall :271-285 — spawn (W/2, H−140), ±45° launch. */
  private resetBall(): void {
    this.ball.setPosition(W / 2, H - 140);
    this.ball.body.setVelocity(0, 0);
    this.time.delayedCall(100, () => {
      const angle = Phaser.Math.Between(-45, 45);
      const speed = this.board?.ballMax ?? 1000;
      const rad = Phaser.Math.DegToRad(angle);
      this.ball.body.setVelocity(Math.sin(rad) * speed, -Math.cos(rad) * speed);
    });
  }

  /** Mechanical keep-progress respawn (Niño ladder rung): the ball returns,
   * bricks and cursor stay. React owns the ladder; the scene only obeys. */
  respawnBall(): void {
    if (!this.board || this.boardDone) return;
    this.dropFired = false;
    this.ball.setVisible(true);
    this.resetBall();
  }

  /** Source hitPaddle :287-305 — relative-hit ±75°, speed re-clamped. THE
   * aiming loop is the mechanic's soul: the child aims the bounce at the
   * next-needed brick. */
  private hitPaddle(ball: typeof this.ball, paddle: typeof this.paddle): void {
    const relativeHit = (ball.x - paddle.x) / (paddle.displayWidth / 2);
    const clamped = Phaser.Math.Clamp(relativeHit, -1, 1);
    const maxBounceAngle = 75;
    const angleRad = Phaser.Math.DegToRad(clamped * maxBounceAngle);
    const speed = Math.max(this.board?.ballMin ?? 600, Math.min(this.board?.ballMax ?? 1000, ball.body.speed || 1000));
    ball.body.setVelocity(Math.sin(angleRad) * speed, -Math.cos(angleRad) * speed);
  }

  /** THE CORE CHANGE (plan §3): the label-aware brick resolution. */
  private hitBrick(rect: BrickMeta["rect"]): void {
    const meta = this.bricks.find((b) => b.rect === rect);
    if (!meta || !this.board) return;
    const seq = this.board.seq;
    if (meta.label === seq[this.cursor]) {
      this.breakBrick(meta);
      const ri = this.remaining.indexOf(meta.label);
      if (ri >= 0) this.remaining.splice(ri, 1);
      this.cursor += 1;
      this.bridge.speak(labelSay(meta.label)); // «pe», «ene» — the binder's names
      if (this.remaining.length === 0) {
        // WORD COMPLETE — the ONE bridge onHit per board, the word's es id
        // (contract-critical: never a letter/syllable).
        this.boardDone = true;
        this.ball.body.setVelocity(0, 0);
        this.ball.setVisible(false);
        this.burst(meta.rect.x, meta.rect.y, BRIGHT, 18);
        this.bridge.onHit(this.board.word);
      } else {
        this.refreshNextGlow();
        this.burst(meta.rect.x, meta.rect.y, 0xffffff, 6);
      }
      return;
    }
    if (seq.includes(meta.label)) {
      // needed later — BOUNCE, never breaks (no softlock); one miss per graze
      const now = this.time.now;
      if (now - meta.lastMissAt >= MISS_COOLDOWN_MS) {
        meta.lastMissAt = now;
        this.bridge.onMiss(this.board.word);
      }
      return;
    }
    // decoy — breaks (board thins), one miss (destroyed bricks never re-fire)
    this.breakBrick(meta);
    this.burst(meta.rect.x, meta.rect.y, 0xef4444, 8);
    this.bridge.onMiss(this.board.word);
  }

  /** Brick-break juice (the source's particles on a texture that was never
   * loaded — pins #4; the port generates its own spark). */
  private burst(x: number, y: number, tint: number, count: number): void {
    const p = this.add.particles(x, y, "br-spark", {
      speed: { min: 90, max: 260 },
      lifespan: 430,
      scale: { start: 1.6, end: 0 },
      tint,
      emitting: false,
    });
    p.setDepth(9);
    p.explode(count);
    this.time.delayedCall(900, () => p.destroy());
  }

  private breakBrick(meta: BrickMeta): void {
    this.bricks = this.bricks.filter((b) => b !== meta);
    this.bricksGroup.remove(meta.rect, true, true);
    meta.rect.destroy();
    meta.text.destroy();
  }

  private tick(): void {
    if (!this.board || !this.launched || this.boardDone || this.dropFired || this.timeExpiredFired) return;
    this.timeLeft -= 1;
    this.bridge.onProgress?.(Math.max(0, this.timeLeft), this.board.timeLimit);
    if (this.timeLeft <= 0) {
      this.timeExpiredFired = true;
      this.ball.body.setVelocity(0, 0);
      this.bridge.onMechanical?.(); // mechanical — never speaks, never a miss
    }
  }

  showBanner(title: string, sub?: string): void {
    const banner = this.add
      .text(W / 2, H / 2 - 70, title, {
        fontFamily: FONT,
        fontSize: "64px",
        color: "#fefce8",
        fontStyle: "bold",
        stroke: "#92400e",
        strokeThickness: 12,
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
          .text(W / 2, H / 2 + 20, sub, {
            fontFamily: FONT,
            fontSize: "34px",
            color: "#fde68a",
            fontStyle: "bold",
            stroke: "#92400e",
            strokeThickness: 7,
            align: "center",
          })
          .setOrigin(0.5)
          .setDepth(40)
          .setAlpha(0),
      );
    }
    // plain tween, NOT tweens.chain (chain mis-shards configs in 3.88 — see
    // sky-words.ts showBanner / road-cross showBanner).
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
    this.clearBoard();
    this.board = null;
  }

  private clearBoard(): void {
    for (const b of this.bricks) {
      this.bricksGroup.remove(b.rect, true, true);
      b.rect.destroy();
      b.text.destroy();
    }
    this.bricks = [];
    this.cursor = 0;
    this.remaining = [];
    this.boardDone = false;
    this.launched = false;
    this.dropFired = false;
    this.timeExpiredFired = false;
    this.clockEvent?.remove(false);
    this.clockEvent = null;
    this.launchTimer?.remove(false);
    this.launchTimer = null;
    this.ball?.body.setVelocity(0, 0);
    this.ball?.setVisible(false);
  }

  celebrate(): void {
    for (let i = 0; i < 26; i++) {
      const s = this.add.rectangle(Phaser.Math.Between(80, W - 80), Phaser.Math.Between(120, H - 320), 14, 14, [BRIGHT, 0x22c55e, 0x38bdf8, 0xf472b6][i % 4]);
      this.tweens.add({
        targets: s,
        y: "+=240",
        angle: Phaser.Math.Between(-180, 180),
        alpha: 0,
        duration: Phaser.Math.Between(700, 1300),
        onComplete: () => s.destroy(),
      });
    }
  }

  // ── QA hook accessors ──────────────────────────────────────────────────────

  get boardData(): BreakoutBoard | null {
    return this.board;
  }

  get cursorPos(): number {
    return this.cursor;
  }

  get remainingSeq(): string[] {
    return [...this.remaining];
  }

  get clockLeft(): number {
    return this.timeLeft;
  }

  /** QA/driver: resolve a brick contact directly (label-aware, same path the
   * collider takes — the drive rig spells words through the REAL rules). */
  qaHit(label: string): boolean {
    const meta = this.bricks.find((b) => b.label === label);
    if (!meta) return false;
    this.hitBrick(meta.rect);
    return true;
  }

  /** QA/driver: force the bottom-drop path (the mechanical ladder's trigger). */
  qaDrop(): void {
    this.dropFired = false;
    this.ball.setPosition(W / 2, H + 60);
    this.bridge.onMechanical?.();
    this.dropFired = true;
    this.ball.body.setVelocity(0, 0);
    this.ball.setVisible(false);
  }

  qaPaddleTo(x: number): void {
    this.targetX = Phaser.Math.Clamp(x, this.paddle.displayWidth / 2, W - this.paddle.displayWidth / 2);
  }

  // ── the rules engine (ported) ──────────────────────────────────────────────

  update(time: number, delta: number): void {
    if (!this.board || !this.launched || this.boardDone) return;
    const dt = Math.min(delta, 50) / 1000;

    // keyboard retune (source :348-358 at ~900 px/s effective)
    if (this.keyDir !== 0) {
      this.targetX = Phaser.Math.Clamp(this.targetX + this.keyDir * KEY_SPEED * dt, this.paddle.displayWidth / 2, W - this.paddle.displayWidth / 2);
    }
    // paddle lerp 0.15 + clamp + body sync (source :337-346)
    this.paddle.x += (this.targetX - this.paddle.x) * 0.15;
    this.paddle.x = Phaser.Math.Clamp(this.paddle.x, this.paddle.displayWidth / 2, W - this.paddle.displayWidth / 2);
    this.paddle.body.updateFromGameObject();

    // per-frame speed clamp (source :360-369) + the anti-stall nudge: a
    // grazing brick edge can flatten the trajectory to horizontal — the nudge
    // guarantees |vy| ≥ 25% of speed so the ball can never stall mid-air.
    const v = this.ball.body.velocity;
    const speed = Math.sqrt(v.x * v.x + v.y * v.y);
    const min = this.board.ballMin;
    const max = this.board.ballMax;
    let vx = v.x;
    let vy = v.y;
    if (speed > 0) {
      if (speed < min) {
        vx *= min / speed;
        vy *= min / speed;
      } else if (speed > max) {
        vx *= max / speed;
        vy *= max / speed;
      }
      const s2 = Math.sqrt(vx * vx + vy * vy) || speed;
      const minVy = MIN_VY_FRAC * s2;
      if (Math.abs(vy) < minVy) {
        const sign = vy === 0 ? (vx >= 0 ? -1 : 1) : Math.sign(vy);
        vy = sign * minVy;
        vx = Math.sign(vx || 1) * Math.sqrt(Math.max(0, s2 * s2 - vy * vy));
      }
      this.ball.body.setVelocity(vx, vy);
    }

    // open-bottom loss zone (source :370-372) — mechanical, fires once
    if (!this.dropFired && this.ball.y > H + BALL_D) {
      this.dropFired = true;
      this.ball.body.setVelocity(0, 0);
      this.ball.setVisible(false);
      this.bridge.onMechanical?.();
    }

    void time;
  }
}

/** Boot the game inside a host element; returns the minimal handle React owns.
 * The island is the seam: bridge/ctrl arrive untyped and are narrowed here. */
export function createGame(
  parent: HTMLElement,
  bridgeDep: unknown,
  ctrlDep: unknown,
  optsDep?: unknown,
): { destroy: (removeCanvas?: boolean) => void } {
  const bridge = bridgeDep as BreakoutBridge;
  const ctrl = ctrlDep as BreakoutHandle;
  void optsDep;
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W,
    height: H,
    backgroundColor: "#0b1026",
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    banner: false,
    render: { antialias: true },
    physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 } } },
    scene: [],
  });
  game.scene.add("ladrillos", BreakoutScene, true, { bridge, ctrl });
  // Test/QA hook (mechanic-id naming per GAMES-2-4-bindings + PORT §9).
  (window as unknown as { __palabraGame_breakout?: unknown }).__palabraGame_breakout = {
    game,
    bridge,
    ctrl,
    get scene() {
      return game.scene.getScene("ladrillos");
    },
    get boardData() {
      const s = game.scene.getScene("ladrillos") as BreakoutScene | null;
      return s?.boardData ?? null;
    },
    get cursor() {
      const s = game.scene.getScene("ladrillos") as BreakoutScene | null;
      return s?.cursorPos ?? 0;
    },
    get remaining() {
      const s = game.scene.getScene("ladrillos") as BreakoutScene | null;
      return s?.remainingSeq ?? null;
    },
    get timeLeft() {
      const s = game.scene.getScene("ladrillos") as BreakoutScene | null;
      return s?.clockLeft ?? 0;
    },
    hit(label: string) {
      (game.scene.getScene("ladrillos") as BreakoutScene | null)?.qaHit(label);
    },
    drop() {
      (game.scene.getScene("ladrillos") as BreakoutScene | null)?.qaDrop();
    },
    paddleTo(x: number) {
      (game.scene.getScene("ladrillos") as BreakoutScene | null)?.qaPaddleTo(x);
    },
  };
  return { destroy: (removeCanvas = true) => game.destroy(removeCanvas) };
}
