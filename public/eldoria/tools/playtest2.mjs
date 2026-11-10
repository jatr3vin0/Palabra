// Deep playtest: dialogue, full 141-room sweep, item grants, boss gauntlet
// (incl. Morgrath both phases -> Victory), plus a screenshot gallery.
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shotDir = path.join(root, 'tools', 'shots2');
mkdirSync(shotDir, { recursive: true });
const PORT = 8927;
const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: root, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('ERROR: ' + m.text()); });

const shot = (n) => page.screenshot({ path: path.join(shotDir, n + '.png') });
const key = async (k, times = 1, delay = 150) => {
  for (let i = 0; i < times; i++) { await page.keyboard.press(k); await page.waitForTimeout(delay); }
};

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(2200);
await key('Enter');
await page.waitForTimeout(500);
await key('Enter', 5, 250);
await page.waitForTimeout(1200);

// ---------- 1. dialogue with kid_pip ----------
await page.evaluate(() => {
  const gs = window.game.scene.getScene('Game');
  const npc = gs.npcsLive[0];
  if (npc) {
    gs.player.setPosition(npc.sprite.x, npc.sprite.y + 18);
    gs.player.facing = 'up';
  }
});
await key('Space');
await page.waitForTimeout(900);
const dlg = await page.evaluate(() => window.game.scene.getScene('Game').dialogOpen);
console.log('DIALOGUE OPENED:', dlg);
await shot('10-dialogue');
await key('Space', 6, 500);
const dlgClosed = await page.evaluate(() => !window.game.scene.getScene('Game').dialogOpen);
console.log('DIALOGUE CLOSED AFTER ADVANCING:', dlgClosed);

// ---------- 2. sweep every room of every map ----------
const sweep = await page.evaluate(async () => {
  const gs = window.game.scene.getScene('Game');
  const results = [];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (const [mapId, m] of Object.entries(WORLD.maps)) {
    for (const roomKey of Object.keys(m.rooms || {})) {
      try {
        GS.hearts = GS.maxHearts;                      // immortal surveyor
        gs.player.invulnUntil = gs.time.now + 9999;
        gs.loadRoom(mapId, roomKey, 10, 6);
        await wait(70);   // let a few update frames run
        results.push({ map: mapId, room: roomKey, ok: true, enemies: gs.enemies.length, boss: !!gs.boss });
      } catch (e) {
        results.push({ map: mapId, room: roomKey, ok: false, err: e.message });
      }
    }
  }
  return results;
});
const failed = sweep.filter((r) => !r.ok);
console.log(`ROOM SWEEP: ${sweep.length} rooms, ${failed.length} threw`);
for (const f of failed) console.log('  FAIL', f.map, f.room, f.err);
const bossRooms = sweep.filter((r) => r.boss).map((r) => r.map + ':' + r.room);
console.log('BOSS ROOMS SEEN:', bossRooms.join(', '));

// ---------- 3. item grants + use ----------
const items = await page.evaluate(() => {
  const gs = window.game.scene.getScene('Game');
  gs.loadRoom('overworld', '4,3', 10, 8);
  for (const it of ['bow', 'bombBag', 'lantern', 'boots', 'heroSword']) gs.give({ item: it });
  gs.give({ gems: 100 }); gs.give({ arrows: 10 }); gs.give({ bombs: 5 }); gs.give({ item: 'potion' });
  gs.bannerUntil = 0;   // skip banners for the test
  return { items: Object.keys(GS.items), gems: GS.gems, arrows: GS.arrows, bombs: GS.bombs, potions: GS.potions, equipped: GS.equipped };
});
console.log('ITEMS:', JSON.stringify(items));
// fire the bow + place a bomb via the real input path
await page.evaluate(() => { GS.equipped = 'bow'; });
await key('X');
await page.evaluate(() => { GS.equipped = 'bombBag'; });
await key('X');
await page.waitForTimeout(2000); // bomb explodes
const ammo = await page.evaluate(() => ({ arrows: GS.arrows, bombs: GS.bombs, shots: window.game.scene.getScene('Game').shots.length }));
console.log('AFTER BOW+BOMB:', JSON.stringify(ammo));

// ---------- 4. boss gauntlet ----------
const bosses = [
  ['dungeon1', '1,0'], ['dungeon2', '3,0'], ['dungeon3', '1,0'],
];
for (const [map, room] of bosses) {
  const res = await page.evaluate(async ([map, room]) => {
    const gs = window.game.scene.getScene('Game');
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    delete GS.flags['boss_' + map];
    gs.loadRoom(map, room, 10, 9);
    await wait(400);
    if (!gs.boss) return { map, ok: false, why: 'no boss spawned' };
    const name = gs.boss.bossType;
    let guard = 0;
    while (gs.boss && guard++ < 200) {
      GS.hearts = GS.maxHearts;                       // the bot is here to test bosses, not to die
      gs.player.invulnUntil = gs.time.now + 9999;
      gs.boss.invulnUntil = 0;
      gs.hitBoss('sword', 2);
      await wait(30);
    }
    await wait(1200);  // death sequence
    return {
      map, ok: true, boss: name,
      flagSet: !!GS.flags['boss_' + map],
      complete: !!GS.flags[map + '_complete'],
      pickups: gs.pickupsLive.map((p) => JSON.stringify(p.spec)),
      portal: gs.portalLive.length,
    };
  }, [map, room]);
  console.log('BOSS:', JSON.stringify(res));
}
await shot('11-after-d1-boss');

// ---------- 5. Morgrath two-phase + victory ----------
const morg = await page.evaluate(async () => {
  const gs = window.game.scene.getScene('Game');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  gs.loadRoom('citadel', '1,0', 10, 9);
  await wait(400);
  if (!gs.boss) return { ok: false, why: 'no morgrath' };
  const p1 = gs.boss.bossType;
  const shield = () => { GS.hearts = GS.maxHearts; gs.player.invulnUntil = gs.time.now + 9999; };
  let guard = 0;
  while (gs.boss && guard++ < 100) { shield(); gs.boss.invulnUntil = 0; gs.hitBoss('sword', 3); await wait(25); }
  await wait(1500);  // transform delay
  const p2 = gs.boss && gs.boss.bossType;
  guard = 0;
  while (gs.boss && guard++ < 150) { shield(); gs.boss.invulnUntil = 0; gs.hitBoss('sword', 3); await wait(25); }
  await wait(2800);  // victory delay
  return { ok: true, p1, p2, gameComplete: !!GS.flags.game_complete };
});
console.log('MORGRATH:', JSON.stringify(morg));
await page.waitForTimeout(2500);
const finalScene = await page.evaluate(() => window.game.scene.getScenes(true).map((s) => s.scene.key));
console.log('SCENES AFTER MORGRATH:', JSON.stringify(finalScene));
await shot('12-victory');

console.log(`\n=== UNIQUE ERRORS (${[...new Set(errors)].length}) ===`);
for (const e of [...new Set(errors)].slice(0, 30)) console.log(e);
await browser.close();
server.kill();
