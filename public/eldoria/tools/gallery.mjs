// Screenshot gallery across biomes, dungeons and interiors for visual review.
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shotDir = path.join(root, 'tools', 'gallery');
mkdirSync(shotDir, { recursive: true });
const PORT = 8931;
const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: root, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(2200);
await page.keyboard.press('Enter');
await page.waitForTimeout(500);
for (let i = 0; i < 5; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(250); }
await page.waitForTimeout(1200);

const stops = [
  ['overworld', '1,2', 'forest-temple'],
  ['overworld', '8,3', 'lake'],
  ['overworld', '2,0', 'mountains-d3'],
  ['overworld', '8,6', 'desert-d2'],
  ['overworld', '1,6', 'swamp-shrine'],
  ['overworld', '6,1', 'wastes-barrier'],
  ['overworld', '8,0', 'citadel-gate'],
  ['dungeon1', '1,1', 'dungeon1-hub'],
  ['dungeon2', '2,1', 'dungeon2'],
  ['dungeon3', '0,1', 'dungeon3-ice'],
  ['citadel', '1,2', 'citadel-dark'],
  ['shrine', '0,0', 'shrine'],
  ['interiors', 'village_shop', 'shop'],
  ['interiors', 'fairy_pond_lake', 'fairy-pond'],
];
for (const [map, room, name] of stops) {
  await page.evaluate(([m, r]) => {
    const gs = window.game.scene.getScene('Game');
    gs.loadRoom(m, r, 10, 7);
  }, [map, room]);
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(shotDir, name + '.png') });
}
console.log('GALLERY DONE');
await browser.close();
server.kill();
