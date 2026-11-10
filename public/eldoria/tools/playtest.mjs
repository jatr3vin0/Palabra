// Headless playtest: boots the game, walks through title -> intro -> gameplay,
// swings the sword, opens the pause menu, saves, reloads, and confirms the
// save came back. Captures console errors + screenshots along the way.
// Usage: node tools/playtest.mjs [--shots-only]
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shotDir = path.join(root, 'tools', 'shots');
mkdirSync(shotDir, { recursive: true });

const PORT = 8917;
const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: root, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type().toUpperCase() + ': ' + m.text());
});

const shot = (name) => page.screenshot({ path: path.join(shotDir, name + '.png') });
const key = async (k, times = 1, delay = 120) => {
  for (let i = 0; i < times; i++) { await page.keyboard.press(k); await page.waitForTimeout(delay); }
};
const hold = async (k, ms) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); };

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await shot('01-title');

  // new game on slot 1 -> intro
  await key('Enter');
  await page.waitForTimeout(800);
  await shot('02-intro');
  await key('Enter', 5, 350);
  await page.waitForTimeout(1500);
  await shot('03-village-spawn');

  // wander + swing
  await hold('ArrowDown', 400);
  await hold('ArrowRight', 600);
  await key('Space');
  await page.waitForTimeout(400);
  await shot('04-sword-swing');
  await hold('ArrowUp', 500);
  await hold('ArrowLeft', 800);
  await page.waitForTimeout(300);
  await shot('05-explore');

  // pause menu + save
  await key('Enter');
  await page.waitForTimeout(600);
  await shot('06-pause');
  await key('S');
  await page.waitForTimeout(400);
  await key('Escape');
  await page.waitForTimeout(500);

  // walk west a couple screens toward the forest
  await hold('ArrowLeft', 2500);
  await page.waitForTimeout(400);
  await shot('07-westward');
  await hold('ArrowLeft', 2500);
  await page.waitForTimeout(400);
  await shot('08-westward2');

  // check the save state from the page
  const save = await page.evaluate(() => localStorage.getItem('shattered-crown-slot-0'));
  console.log('SAVE EXISTS:', !!save);
  if (save) {
    const s = JSON.parse(save);
    console.log('SAVE SUMMARY:', JSON.stringify({ hearts: s.hearts, room: s.checkpoint, gems: s.gems }));
  }

  // reload -> continue
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(2200);
  await key('Enter');
  await page.waitForTimeout(1500);
  await shot('09-continue');

  console.log('PLAYTEST COMPLETE');
} catch (e) {
  console.log('PLAYTEST CRASHED: ' + e.message);
  await shot('99-crash').catch(() => {});
} finally {
  const uniq = [...new Set(errors)];
  console.log(`\n=== CONSOLE ISSUES (${uniq.length} unique) ===`);
  for (const e of uniq.slice(0, 40)) console.log(e);
  await browser.close();
  server.kill();
}
