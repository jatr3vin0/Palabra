// Regression for the dialog-loop fix + font rendering screenshots.
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shotDir = path.join(root, 'tools', 'shots5');
mkdirSync(shotDir, { recursive: true });
const PORT = 8935;
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
await page.waitForTimeout(2500);
await shot('01-title-font');
await key('Enter');
await page.waitForTimeout(600);
await shot('02-intro-font');
await key('Enter', 5, 300);
await page.waitForTimeout(1200);

// stand in front of the sign next to spawn and MASH space like a kid
await page.evaluate(() => {
  const gs = window.game.scene.getScene('Game');
  const sign = gs.signsLive[0];
  gs.player.setPosition(sign.sprite.x, sign.sprite.y + 18);
  gs.player.facing = 'up';
});
await key('Space');
await page.waitForTimeout(600);
await shot('03-dialog-with-arrow');
const states = [];
const dlg = () => page.evaluate(() => window.game.scene.getScene('Game').dialogOpen);
states.push(['opened', await dlg()]);
await key('Space', 8, 180);   // mash!
await page.waitForTimeout(400);
states.push(['after 8 mashes', await dlg()]);
await key('Space', 4, 180);   // keep mashing
states.push(['after 4 more', await dlg()]);
// now walk away one step and talk again deliberately
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(250);
await page.evaluate(() => { const gs = window.game.scene.getScene('Game'); gs.player.facing = 'up'; });
await key('Space');
await page.waitForTimeout(500);
states.push(['deliberate re-talk after moving', await dlg()]);
await key('Space', 3, 400);   // close it politely
await page.waitForTimeout(300);
states.push(['after closing politely', await dlg()]);
for (const [k, v] of states) console.log('DIALOG', k + ':', v);

// HUD + pause font shots
await page.evaluate(() => {
  const gs = window.game.scene.getScene('Game');
  gs.give({ gems: 87 }); gs.give({ item: 'bow' }); gs.bannerUntil = 0;
});
await page.waitForTimeout(300);
await shot('04-hud-font');
await key('Enter');
await page.waitForTimeout(500);
await shot('05-pause-font');
await key('Escape');

console.log(`\n=== UNIQUE ERRORS (${[...new Set(errors)].length}) ===`);
for (const e of [...new Set(errors)].slice(0, 20)) console.log(e);
await browser.close();
server.kill();
