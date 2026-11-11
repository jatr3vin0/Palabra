// Readable⇒heard sweep — spy-check harness (untracked QA tool).
// Loads the real eldoria scene files in a node:vm sandbox with a minimal
// Phaser stub, spies on window.Palabra.speak, drives every newly-wired
// speech site, and asserts the EXACT spoken text.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../public/eldoria/src');
let failures = 0;
const check = (name, cond, extra) => {
  if (cond) console.log('  ok  ' + name);
  else { failures++; console.log('  FAIL ' + name + (extra ? '  → ' + extra : '')); }
};

// ── chainable Phaser-object stub ──────────────────────────────────────────
function makeEl() {
  const el = () => {};
  el.width = 10; el.height = 10;
  return new Proxy(el, {
    get(t, p) {
      if (p === 'width' || p === 'height') return t[p];
      if (p === Symbol.toPrimitive) return () => 10;
      if (p === 'then') return undefined; // stay non-thenable
      return () => proxy;
    },
    set(t, p, v) { t[p] = v; return true; },
    apply() { return proxy; },
  });
}
const proxy = makeEl();

class SceneStub {
  constructor(id) {
    this.sceneKey = id;
    this.timeEvents = [];
    this.handlers = {};
    this.tweens = { add: () => ({}) };
    this.time = { delayedCall: (_ms, cb) => { this.timeEvents.push(cb); return { remove: () => {} }; } };
    this.add = new Proxy({}, { get: () => () => makeEl() });
    this.input = {
      on: (ev, fn) => { (this.handlers[ev] = this.handlers[ev] || []).push(fn); },
      keyboard: { on: (ev, fn) => { (this.handlers[ev] = this.handlers[ev] || []).push(fn); }, addKeys: () => ({}) },
    };
    this.cameras = { main: { setBackgroundColor: () => {}, setViewport: () => {} } };
    this.game = { events: { on() {}, off() {}, emit() {} } };
    this.scene = {
      start() {}, stop() {}, resume() {}, launch() {}, isActive: () => true,
      get: () => GAME_SCENE_MIRROR,
    };
  }
  flushTime() { const evs = this.timeEvents; this.timeEvents = []; evs.forEach((cb) => cb()); }
  fire(ev) { (this.handlers[ev] || []).forEach((f) => f()); }
}
const GAME_SCENE_MIRROR = { mapId: 'overworld', autoSave: () => true, events: { emit() {} }, returnToEntrance() {} };

// ── sandbox ───────────────────────────────────────────────────────────────
const spoken = []; // [text, voice]
const sandbox = {
  console, Math, JSON, Array, Object, String, Number, Symbol, Proxy, Reflect,
  parseInt, parseFloat, isNaN, isFinite, setTimeout: (cb) => 0, clearTimeout: () => {},
  performance: { now: () => 0 },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  Phaser: { Scene: SceneStub },
  CONFIG: { FONT: 'x', ZOOM: 3, TILE: 16, SAVE_SLOTS: 3, START: { x: 1, y: 1 }, HUD_H: 16, ROOM_W: 20, ROOM_H: 15 },
  ART: { tex: () => 'tex', frames: () => 1 },
  AUDIO: {
    init() {}, playSong() {}, stopSong() {}, sfx() {}, playJingle() {},
    setVolumes() {}, musicMuted: false, musicVol: 0.8, sfxVol: 0.8, voiceVol: 1,
    setMusicMuted(m) { this.musicMuted = !!m; }, toggleMute() {},
  },
  SAVE: {
    slots: () => [{ exists: true, hearts: 3, shards: 2, playMs: 65000, done: false }, { exists: false }, { exists: false }],
    start() {}, load: () => ({}), write() {}, erase() {},
  },
  ITEMS: { sword: { name: 'Espada', art: 'sword' }, potion: { name: 'Poción', art: 'potion' } },
  EQUIPPABLES: ['sword', 'potion'],
  Flags: { get: () => false, all: () => false, none: () => true, set() {} },
  WORLD: { maps: {}, rooms: {} },
  GS: {
    slot: 0, hearts: 3, maxHearts: 3, acorns: 4, gems: 7, potions: 2, arrows: 0, bombs: 0,
    shards: [], items: { sword: true }, equipped: 'sword', keys: {}, musicVol: 0.8, sfxVol: 0.8,
    voiceVol: 1, musicMuted: false, playMs: 90000, checkpoint: { x: 1, y: 1 },
  },
  PALABRA_CTX: { englishLevel: 0 },
  PALABRA_VOICE_ON: true,
  Palabra: {
    speak: (text, voice) => { spoken.push([String(text), voice]); },
    post() {},
  },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
const ctx = vm.createContext(sandbox);
const load = (rel) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel });

const speaks = () => spoken.map((s) => s[0]);
const lastSpeak = () => spoken[spoken.length - 1];

// ── load shared deps + scenes under test ──────────────────────────────────
load('dialogue.js');
load('dialogue_content.js');
for (const f of ['scenes/VictoryScene.js', 'scenes/GameOverScene.js', 'scenes/TitleScene.js',
  'scenes/PauseScene.js', 'scenes/UIScene.js', 'scenes/GameScene.js']) load(f);

// ── 1. VictoryScene: the five victory lines speak as one passage ──────────
console.log('VictoryScene');
spoken.length = 0;
const victory = new sandbox.window.VictoryScene();
victory.create();
victory.flushTime();
check('victory lines speak', speaks().includes('¡A CASA! Apollyon huye. ¡El paso es libre! Cruzas el río. La puerta se abre. El rollo está sellado. ¡Pasa! ¡ERES PEREGRINO DE LA CIUDAD!'),
  JSON.stringify(speaks()));
check('victory voice = narrator', lastSpeak()[1] === 'narrator');

// ── 2. GameOverScene: title+encouragement on arrival, then highlighted opt ─
console.log('GameOverScene');
spoken.length = 0;
const over = new sandbox.window.GameOverScene();
over.create();
check('gameover title speaks', speaks().includes('FIN DEL JUEGO. ¡No te rindas, héroe!'), JSON.stringify(speaks()));
over.flushTime();
check('gameover highlighted option speaks on arrival', speaks().includes('Seguir desde el último guardado'), JSON.stringify(speaks()));
over.fire('keydown-UP');
check('gameover option speaks on move', speaks().includes('Volver al inicio'), JSON.stringify(speaks()));

// ── 3. TitleScene: welcome covers the brand; erase banner speaks ──────────
console.log('TitleScene');
spoken.length = 0;
const title = new sandbox.window.TitleScene();
title.create();
title.firstGesture();
check('title welcome speaks brand + subtitle', speaks().includes('Palabra, aprende español jugando. Elige una casilla para empezar tu aventura.'), JSON.stringify(speaks()));
title.fire('keydown-E');
check('title erase banner speaks', speaks().includes('¡Toca E otra vez para borrar!'), JSON.stringify(speaks()));

// ── 4. PauseScene: open announces itself; save/music/slider rows speak ────
console.log('PauseScene');
spoken.length = 0;
const pause = new sandbox.window.PauseScene();
pause.create();
check('pause title speaks on open', speaks().includes('PAUSA'), JSON.stringify(speaks()));
pause.flushTime();
check('pause equipped item speaks on open', speaks().includes('Espada'), JSON.stringify(speaks()));
pause.fire('keydown-S');
check('pause save result speaks', speaks().includes('¡Guardado!'), JSON.stringify(speaks()));
pause.fire('keydown-M');
check('pause music row speaks new state', speaks().includes('Música: NO'), JSON.stringify(speaks()));
pause.fire('keydown-TWO');
check('pause slider label speaks on select', speaks().includes('Voces'), JSON.stringify(speaks()));
pause.fire('keydown-UP');
check('pause menu voice survived (highlighted item)', speaks().includes('Espada'), JSON.stringify(speaks()));

// ── 5. UIScene.savedToast speaks ───────────────────────────────────────────
console.log('UIScene');
spoken.length = 0;
const ui = new sandbox.window.UIScene();
ui.savedToast();
check('saved toast speaks', speaks().includes('¡Guardado!'), JSON.stringify(speaks()));

// ── 6. GameScene.floatText: every floating word speaks, numbers/clanc stay ─
console.log('GameScene.floatText');
spoken.length = 0;
const game = new sandbox.window.GameScene();
game.floatText(10, 10, '¡Llave pequeña!', '#ffe97f');
check('llave speaks', speaks().includes('¡Llave pequeña!'), JSON.stringify(speaks()));
game.floatText(10, 10, '+3 flechas', '#d8c89a');
check('flechas speaks (plus stripped)', speaks().includes('3 flechas'), JSON.stringify(speaks()));
game.floatText(10, 10, '+2 bombas', '#9ad8aa');
check('bombas speaks (plus stripped)', speaks().includes('2 bombas'), JSON.stringify(speaks()));
game.floatText(10, 10, '¡Bellota dorada! (4/12)', '#ffd24a');
check('bellota speaks (N/12 → N de 12)', speaks().includes('¡Bellota dorada! 4 de 12'), JSON.stringify(speaks()));
game.floatText(10, 10, '¡Poción roja!', '#ff7f7f');
check('pocion speaks', speaks().includes('¡Poción roja!'), JSON.stringify(speaks()));
game.floatText(10, 10, '¡Cerrado!', '#ffaaaa');
check('cerrado speaks', speaks().includes('¡Cerrado!'), JSON.stringify(speaks()));
game.floatText(10, 10, '¡Falta la llave grande!', '#ffaaaa');
check('falta llave speaks', speaks().includes('¡Falta la llave grande!'), JSON.stringify(speaks()));
game.floatText(10, 10, '¡Secreto!', '#ffd24a');
check('secreto speaks', speaks().includes('¡Secreto!'), JSON.stringify(speaks()));
game.floatText(10, 10, '¡Sin flechas!', '#ffaaaa');
check('sin flechas speaks', speaks().includes('¡Sin flechas!'), JSON.stringify(speaks()));
game.floatText(10, 10, '¡Sin bombas!', '#ffaaaa');
check('sin bombas speaks', speaks().includes('¡Sin bombas!'), JSON.stringify(speaks()));
game.floatText(10, 10, '¡Corazones llenos!', '#aaffaa');
check('corazones speaks', speaks().includes('¡Corazones llenos!'), JSON.stringify(speaks()));
game.floatText(10, 10, '¡La barrera se rompe!', '#caa9ff');
check('barrera speaks', speaks().includes('¡La barrera se rompe!'), JSON.stringify(speaks()));
game.floatText(10, 10, '+3', '#7fe9ff');
check('pure number stays visual-only', !speaks().includes('+3') && !speaks().includes('3'));
game.floatText(10, 10, '¡clanc!', '#aaaaaa');
check('clanc stays visual-only (its own sfx)', !speaks().includes('¡clanc!'));

// ── 7. Signposts: pre-wired through Dialogue.sign → UIScene.speakPage. ─────
// Verify every sign id resolves to REAL content (never the blur fallback) so
// speakPage always has ES text to speak, and that the speak call exists.
console.log('Signposts (pre-wired verify)');
const SIGN_IDS = ['sign_swamp', 'sign_shrine', 'sign_mountain_pass', 'sign_forest_edge',
  'sign_desert_edge', 'sign_village_square', 'sign_village_shop', 'sign_oasis',
  'sign_lake', 'sign_farm', 'sign_d3_entrance', 'sign_d2_entrance', 'sign_d1_entrance',
  'sign_crossroads', 'sign_citadel', 'sign_barrier'];
for (const id of SIGN_IDS) {
  const d = sandbox.window.Dialogue.sign(id);
  const text = d.pages[0].join(' ');
  check(id + ' → ES page (spoken by speakPage)', text && text !== '(letras borrosas)', JSON.stringify(text));
}
check('UIScene.speakPage still wired', /window\.Palabra\.speak\(d\.pages\[d\.page\]\.join\(' '\), voice\)/.test(fs.readFileSync(path.join(ROOT, 'scenes/UIScene.js'), 'utf8')));

// ── 8. EN gloss stays visual-only (no gloss text ever reaches speak) ───────
console.log('Gloss visual-only');
const uiSrc = fs.readFileSync(path.join(ROOT, 'scenes/UIScene.js'), 'utf8');
check('speakPage speaks pages only (never gloss)', !/speak\([^)]*gloss/.test(uiSrc));
const introSrc = fs.readFileSync(path.join(ROOT, 'scenes/IntroScene.js'), 'utf8');
check('IntroScene speaks pages only (never gloss)', !/speak\([^)]*gloss/.test(introSrc));

console.log(failures === 0 ? '\nALL SPY-CHECKS PASS' : '\n' + failures + ' FAILURES');
process.exit(failures === 0 ? 0 : 1);
