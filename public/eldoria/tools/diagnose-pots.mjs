// Reproduce: break a pot in the overworld vs in dungeon1, through the REAL
// input path. Report grid char before/after and capture before/after shots.
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shotDir = path.join(root, 'tools', 'shots-pots');
mkdirSync(shotDir, { recursive: true });
const PORT = 8947;
const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: root, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
const canvas = page.locator('#game canvas');

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(2200);
await page.keyboard.press('Enter');
await page.waitForTimeout(500);
for (let i = 0; i < 5; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(250); }
await page.waitForTimeout(1200);

const findPotAndStand = async (map, room) => page.evaluate(async ([map, room]) => {
  const gs = window.game.scene.getScene('Game');
  GS.hearts = GS.maxHearts;
  gs.player.invulnUntil = gs.time.now + 99999;
  gs.loadRoom(map, room, 10, 6);
  await new Promise((r) => setTimeout(r, 150));
  for (let y = 1; y < 11; y++) {
    for (let x = 1; x < 19; x++) {
      if (gs.tileAt(x, y) === 'O') {
        // stand below the pot facing up (kill enemies so they don't interfere)
        for (const e of gs.enemies.slice()) { const i = gs.enemies.indexOf(e); gs.enemies.splice(i, 1); e.destroy(); }
        gs.player.setPosition(x * 16 + 8, (y + 1) * 16 + 8);
        gs.player.facing = 'up';
        return { x, y, ch: gs.tileAt(x, y) };
      }
    }
  }
  return null;
}, [map, room]);

for (const [label, map, room] of [['overworld', 'overworld', '4,3'], ['dungeon1', 'dungeon1', '1,2']]) {
  const pot = await findPotAndStand(map, room);
  if (!pot) { console.log(label, ': no pot found in', room); continue; }
  await page.waitForTimeout(200);
  await canvas.screenshot({ path: path.join(shotDir, label + '-before.png') });
  await page.keyboard.press('Space');     // real input path
  await page.waitForTimeout(500);
  const after = await page.evaluate(([x, y]) => {
    const gs = window.game.scene.getScene('Game');
    return { ch: gs.tileAt(x, y), drops: gs.pickupsLive.length };
  }, [pot.x, pot.y]);
  await canvas.screenshot({ path: path.join(shotDir, label + '-after.png') });
  console.log(label, '| pot at', pot.x + ',' + pot.y, '| before:', pot.ch, '| after:', after.ch, '| drops:', after.drops);
}
await browser.close();
server.kill();
