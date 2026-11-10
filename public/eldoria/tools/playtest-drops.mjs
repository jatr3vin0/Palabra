// Regression: boss rewards (shard, heart container, return portal) must land
// on walkable tiles even when the boss dies pressed into a wall or corner —
// the exact scenario bramblehorn's wall-charging creates.
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8945;
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

const CASES = [
  // [map, bossRoom, corner to pin the dying boss into]
  ['dungeon1', '1,0', 'west'],
  ['dungeon1', '1,0', 'northeast'],
  ['dungeon2', '3,0', 'east'],
  ['dungeon3', '1,0', 'north'],
];
for (const [map, room, corner] of CASES) {
  const res = await page.evaluate(async ([map, room, corner]) => {
    const gs = window.game.scene.getScene('Game');
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    delete GS.flags['boss_' + map];
    delete GS.flags['pickup_shard_' + map];
    delete GS.flags['pickup_hc_' + map];
    GS.shards = GS.shards.filter((s) => s !== DUNGEON_SHARDS[map]);
    gs.loadRoom(map, room, 10, 9);
    await wait(300);
    if (!gs.boss) return { ok: false, why: 'no boss' };
    // pin the boss against a wall/corner like a real wall-crash death
    const pos = {
      west: [20, 96], northeast: [300, 28], east: [300, 96], north: [160, 28],
    }[corner];
    gs.boss.x = pos[0]; gs.boss.y = pos[1];
    const vulnState = map === 'dungeon2' ? 'surfaced' : 'stunned';  // wyrm is only soft surfaced
    let guard = 0;
    while (gs.boss && guard++ < 300) {
      GS.hearts = GS.maxHearts;
      gs.player.invulnUntil = gs.time.now + 9999;
      if (gs.boss.mem) { gs.boss.mem.state = vulnState; gs.boss.mem.t = 100; }
      gs.boss.x = pos[0]; gs.boss.y = pos[1];   // keep it pinned
      gs.boss.invulnUntil = 0;
      gs.hitBoss('sword', 3);
      await wait(25);
    }
    await wait(1400);   // reward spawn at +800ms
    const bad = [];
    const checkTile = (label, x, y) => {
      const tx = Math.floor(x / 16), ty = Math.floor(y / 16);
      const td = TILES.get(gs.tileAt(tx, ty));
      const blocked = gs.blockedAt(tx * 16 + 8, ty * 16 + 8, {});
      if (blocked || td.pit || td.hazard) bad.push(label + '@' + tx + ',' + ty + ' tile=' + td.name + ' blocked=' + blocked);
    };
    for (const p of gs.pickupsLive) checkTile(JSON.stringify(p.spec), p.x, p.bobBase || p.y);
    for (const pt of gs.portalLive) checkTile('portal', pt.tx * 16 + 8, pt.ty * 16 + 8);
    return {
      ok: bad.length === 0, bad,
      pickups: gs.pickupsLive.length, portals: gs.portalLive.length,
    };
  }, [map, room, corner]);
  console.log(`${map} (${corner}):`, JSON.stringify(res));
}

// enemy drops near walls: kill enemies shoved into corners, check transient drops
const dropRes = await page.evaluate(async () => {
  const gs = window.game.scene.getScene('Game');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  gs.loadRoom('overworld', '3,3', 10, 6);
  await wait(200);
  const bad = [];
  for (let i = 0; i < 30; i++) {
    const e = gs.spawnEnemy('slime', 10, 6);
    if (!e) continue;
    e.x = 18; e.y = 28;          // jam it into the NW wall corner
    gs.damageEnemy(e, 99, 'sword');
  }
  await wait(200);
  for (const p of gs.pickupsLive) {
    const tx = Math.floor(p.x / 16), ty = Math.floor((p.bobBase || p.y) / 16);
    if (gs.blockedAt(tx * 16 + 8, ty * 16 + 8, {})) bad.push(tx + ',' + ty);
  }
  return { drops: gs.pickupsLive.length, bad };
});
console.log('corner enemy drops:', JSON.stringify(dropRes));

console.log(`\n=== UNIQUE ERRORS (${[...new Set(errors)].length}) ===`);
for (const e of [...new Set(errors)].slice(0, 10)) console.log(e);
await browser.close();
server.kill();
