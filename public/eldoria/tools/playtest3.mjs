// Boss-mechanics verification: natural bramblehorn stun cycle, forced-state
// kills for bramblehorn + sandWyrm, dialogue close-away-from-npc check.
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8929;
const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: root, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('ERROR: ' + m.text()); });

const key = async (k, times = 1, delay = 150) => {
  for (let i = 0; i < times; i++) { await page.keyboard.press(k); await page.waitForTimeout(delay); }
};

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(2200);
await key('Enter');
await page.waitForTimeout(500);
await key('Enter', 5, 250);
await page.waitForTimeout(1200);

// ---- dialogue closes when not re-talking ----
const dlgTest = await page.evaluate(async () => {
  const gs = window.game.scene.getScene('Game');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const npc = gs.npcsLive[0];
  gs.player.setPosition(npc.sprite.x, npc.sprite.y + 18);
  gs.player.facing = 'up';
  gs.tryInteract();
  await wait(300);
  const opened = gs.dialogOpen;
  // advance via the UI scene's real path
  const ui = window.game.scene.getScene('UI');
  for (let i = 0; i < 12 && gs.dialogOpen; i++) {
    ui.advancePressed = true;
    await wait(250);
  }
  return { opened, closedEventually: !gs.dialogOpen };
});
console.log('DIALOGUE:', JSON.stringify(dlgTest));

// ---- bramblehorn: does it reach `stunned` naturally? then kill it ----
const bb = await page.evaluate(async () => {
  const gs = window.game.scene.getScene('Game');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  delete GS.flags.boss_dungeon1;
  gs.loadRoom('dungeon1', '1,0', 10, 9);
  await wait(300);
  if (!gs.boss) return { ok: false, why: 'no boss' };
  // stand aligned so it charges; wait for a natural stun
  let sawStun = false;
  for (let i = 0; i < 400 && !sawStun; i++) {
    const b = gs.boss;
    gs.player.setPosition(b.x, Math.min(b.y + 70, 180));   // stay aligned below it
    gs.player.invulnUntil = gs.time.now + 9999;            // don't die during obs
    if (b.mem && b.mem.state === 'stunned') sawStun = true;
    await wait(30);
  }
  // now kill through the real vulnerability window
  let guard = 0;
  while (gs.boss && guard++ < 300) {
    if (gs.boss.mem) gs.boss.mem.state = 'stunned';
    gs.boss.invulnUntil = 0;
    gs.hitBoss('sword', 2);
    await wait(30);
  }
  await wait(1300);
  return {
    ok: true, sawNaturalStun: sawStun, dead: !gs.boss,
    flag: !!GS.flags.boss_dungeon1, complete: !!GS.flags.d1_complete || !!GS.flags.dungeon1_complete,
    pickups: gs.pickupsLive.map((p) => JSON.stringify(p.spec)), portal: gs.portalLive.length,
  };
});
console.log('BRAMBLEHORN:', JSON.stringify(bb));

// ---- sandWyrm: surfaces naturally? then kill while surfaced ----
const sw = await page.evaluate(async () => {
  const gs = window.game.scene.getScene('Game');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  delete GS.flags.boss_dungeon2;
  gs.loadRoom('dungeon2', '3,0', 10, 9);
  await wait(300);
  if (!gs.boss) return { ok: false, why: 'no boss' };
  let sawSurface = false;
  for (let i = 0; i < 300 && !sawSurface; i++) {
    gs.player.invulnUntil = gs.time.now + 9999;
    if (gs.boss.mem && gs.boss.mem.state === 'surfaced') sawSurface = true;
    await wait(30);
  }
  let guard = 0;
  while (gs.boss && guard++ < 300) {
    if (gs.boss.mem) { gs.boss.mem.state = 'surfaced'; gs.boss.mem.t = 100; }
    gs.boss.invulnUntil = 0;
    gs.hitBoss('arrow', 1);
    await wait(30);
  }
  await wait(1300);
  return { ok: true, sawNaturalSurface: sawSurface, dead: !gs.boss, flag: !!GS.flags.boss_dungeon2, pickups: gs.pickupsLive.map((p) => JSON.stringify(p.spec)) };
});
console.log('SANDWYRM:', JSON.stringify(sw));

// ---- equipped item use through the real input path (no dialogue open) ----
await page.evaluate(() => {
  const gs = window.game.scene.getScene('Game');
  gs.loadRoom('overworld', '3,3', 10, 6);
  for (const it of ['bow', 'bombBag']) gs.give({ item: it });
  gs.give({ arrows: 10 }); gs.give({ bombs: 5 });
  gs.bannerUntil = 0;
  GS.equipped = 'bow';
});
await page.waitForTimeout(200);
await key('X');
await page.waitForTimeout(300);
const bowRes = await page.evaluate(() => ({ arrows: GS.arrows }));
await page.evaluate(() => { GS.equipped = 'bombBag'; });
await key('X');
await page.waitForTimeout(2200);
const bombRes = await page.evaluate(() => ({ bombs: GS.bombs }));
console.log('BOW USED (10->9?):', JSON.stringify(bowRes), 'BOMB USED (5->4?):', JSON.stringify(bombRes));

console.log(`\n=== UNIQUE ERRORS (${[...new Set(errors)].length}) ===`);
for (const e of [...new Set(errors)].slice(0, 20)) console.log(e);
await browser.close();
server.kill();
