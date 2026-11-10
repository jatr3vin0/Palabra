// Regression for the review fixes: victory death-race, pit damage,
// door-bypass clamp, eyeSentry zero-touch.
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8933;
const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: root, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('ERROR: ' + m.text()); });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(2200);
await page.keyboard.press('Enter');
await page.waitForTimeout(500);
for (let i = 0; i < 5; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(250); }
await page.waitForTimeout(1200);

// ---- 1. pit damage applies exactly once ----
const pit = await page.evaluate(async () => {
  const gs = window.game.scene.getScene('Game');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  gs.loadRoom('dungeon2', '1,1', 10, 6);   // any room; we'll teleport onto a pit via grid
  await wait(200);
  // paint a pit under the player artificially? use a real pit room instead:
  // dungeon2 has pit fields; find one
  let pitTile = null;
  outer: for (const [k, r] of Object.entries(WORLD.maps.dungeon2.rooms)) {
    for (let y = 0; y < 12; y++) {
      const x = (r.tiles[y] || '').indexOf('v');
      if (x >= 0) { pitTile = { room: k, x, y }; break outer; }
    }
  }
  if (!pitTile) return { ok: false, why: 'no pit found' };
  gs.loadRoom('dungeon2', pitTile.room, 10, 6);
  await wait(150);
  const before = GS.hearts;
  gs.player.setPosition(pitTile.x * 16 + 8, pitTile.y * 16 + 4);
  await wait(700);   // fall + respawn
  return { ok: true, before, after: GS.hearts, falling: gs._falling };
});
console.log('PIT:', JSON.stringify(pit));

// ---- 2. victory death-race: kill morgrath2 then immediately "die" ----
const race = await page.evaluate(async () => {
  const gs = window.game.scene.getScene('Game');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  gs.loadRoom('citadel', '1,0', 10, 9);
  await wait(400);
  let guard = 0;
  while (gs.boss && guard++ < 100) { gs.boss.invulnUntil = 0; gs.hitBoss('sword', 4); await wait(20); }
  await wait(1300);  // transform
  guard = 0;
  while (gs.boss && guard++ < 150) { gs.boss.invulnUntil = 0; gs.hitBoss('sword', 4); await wait(20); }
  // morgrath2 just died — now try to kill the player during the ceremony
  GS.hearts = 0;
  gs.onPlayerDeath();
  Player.damage(gs, gs.player, 5, 0, 0);
  await wait(3500);
  return {
    victoryPending: gs._victoryPending,
    scenes: window.game.scene.getScenes(true).map((s) => s.scene.key),
    gameComplete: !!GS.flags.game_complete,
  };
});
console.log('VICTORY RACE:', JSON.stringify(race));

console.log(`\n=== UNIQUE ERRORS (${[...new Set(errors)].length}) ===`);
for (const e of [...new Set(errors)].slice(0, 20)) console.log(e);
await browser.close();
server.kill();
