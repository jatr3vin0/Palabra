// Unlock dungeon1's first locked door with a real key bump, then verify the
// doorway tile is visibly floor — immediately and after re-entering the room.
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shotDir = path.join(root, 'tools', 'shots-doors');
mkdirSync(shotDir, { recursive: true });
const PORT = 8949;
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

// find a locked door in dungeon1's hub, stand in front of it with a key
const setup = await page.evaluate(async () => {
  const gs = window.game.scene.getScene('Game');
  GS.hearts = GS.maxHearts;
  gs.player.invulnUntil = gs.time.now + 99999;
  GS.keys.dungeon1 = 1;
  gs.loadRoom('dungeon1', '1,1', 10, 6);
  await new Promise((r) => setTimeout(r, 200));
  for (const e of gs.enemies.slice()) { const i = gs.enemies.indexOf(e); gs.enemies.splice(i, 1); e.destroy(); }
  const door = gs.doorsLive.find((d) => d.def.kind === 'locked' && !d.isOpen);
  if (!door) return null;
  // stand one tile inside the room from the door, facing it
  const dx = door.tx === 0 ? 1 : door.tx === 19 ? -1 : 0;
  const dy = door.ty === 0 ? 1 : door.ty === 11 ? -1 : 0;
  gs.player.setPosition((door.tx + dx) * 16 + 8, (door.ty + dy) * 16 + 8);
  gs.player.facing = dx === 1 ? 'left' : dx === -1 ? 'right' : dy === 1 ? 'up' : 'down';
  return { id: door.def.id, tx: door.tx, ty: door.ty };
});
console.log('door under test:', JSON.stringify(setup));
await page.waitForTimeout(200);
await canvas.screenshot({ path: path.join(shotDir, '1-locked.png') });

await page.keyboard.press('Space');   // real unlock bump
await page.waitForTimeout(500);
const after = await page.evaluate(([tx, ty]) => {
  const gs = window.game.scene.getScene('Game');
  return { tile: gs.tileAt(tx, ty), keys: GS.keys.dungeon1, open: gs.doorsLive.find((d) => d.tx === tx && d.ty === ty).isOpen };
}, [setup.tx, setup.ty]);
console.log('after unlock:', JSON.stringify(after));
await canvas.screenshot({ path: path.join(shotDir, '2-unlocked.png') });

// leave + re-enter: the carved pathway must persist
const reload = await page.evaluate(async ([tx, ty]) => {
  const gs = window.game.scene.getScene('Game');
  gs.loadRoom('dungeon1', '1,2', 10, 6);
  await new Promise((r) => setTimeout(r, 150));
  gs.loadRoom('dungeon1', '1,1', 10, 6);
  await new Promise((r) => setTimeout(r, 150));
  for (const e of gs.enemies.slice()) { const i = gs.enemies.indexOf(e); gs.enemies.splice(i, 1); e.destroy(); }
  return { tile: gs.tileAt(tx, ty), open: gs.doorsLive.find((d) => d.tx === tx && d.ty === ty).isOpen };
}, [setup.tx, setup.ty]);
console.log('after re-entry:', JSON.stringify(reload));
await page.waitForTimeout(200);
await canvas.screenshot({ path: path.join(shotDir, '3-reentered.png') });

await browser.close();
server.kill();
