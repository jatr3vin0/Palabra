// Renders the full 10x8 overworld through the actual game engine and stitches
// the 80 screens into one PNG (2x scale, HUD cropped, player hidden).
// Usage: node tools/worldmap.mjs [outfile]
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || path.join(root, 'overworld-map.png');
const PORT = 8937;
const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: root, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(2200);
await page.keyboard.press('Enter');               // new game (fresh browser profile)
await page.waitForTimeout(500);
for (let i = 0; i < 5; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(250); }
await page.waitForTimeout(1200);

const dataUrl = await page.evaluate(async () => {
  const game = window.game;
  const gs = game.scene.getScene('Game');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const snap = () => new Promise((res) => game.renderer.snapshot((img) => res(img)));

  game.scene.stop('UI');                 // no HUD, no toasts in the captures
  gs.player.setVisible(false);

  const SCALE = 2;
  const W = 320, H = 192;                // world area per room (HUD row cropped)
  const big = document.createElement('canvas');
  big.width = 10 * W * SCALE;
  big.height = 8 * H * SCALE;
  const ctx = big.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 10; c++) {
      const key = c + ',' + r;
      if (!WORLD.room('overworld', key)) continue;
      gs.loadRoom('overworld', key, 10, 6);
      gs.player.setVisible(false);
      gs._animAcc = 0;                   // keep animated tiles on frame 0 → no seams
      await wait(90);                    // let a couple frames render
      const img = await snap();
      ctx.drawImage(img, 0, 16, W, H, c * W * SCALE, r * H * SCALE, W * SCALE, H * SCALE);
    }
  }
  return big.toDataURL('image/png');
});

const b64 = dataUrl.split(',')[1];
writeFileSync(out, Buffer.from(b64, 'base64'));
console.log('WROTE', out, Math.round(Buffer.from(b64, 'base64').length / 1024) + 'KB');
await browser.close();
server.kill();
