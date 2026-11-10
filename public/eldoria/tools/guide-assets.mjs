// Captures every asset for the player's guide into guide/img/:
//  - sprite art (4x nearest-neighbor PNGs) for enemies, bosses, NPCs, items
//  - gameplay screenshots (village, dungeon entrances, boss fights, secrets)
//  - stitched dungeon maps (darkness disabled, player hidden)
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, copyFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imgDir = path.join(root, 'guide', 'img');
mkdirSync(imgDir, { recursive: true });
const PORT = 8939;
const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: root, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

const saveB64 = (name, dataUrl) =>
  writeFileSync(path.join(imgDir, name + '.png'), Buffer.from(dataUrl.split(',')[1], 'base64'));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(2400);

// ---------- title screenshot ----------
const canvas = page.locator('#game canvas');
await canvas.screenshot({ path: path.join(imgDir, 'shot-title.png') });

await page.keyboard.press('Enter');
await page.waitForTimeout(500);
await canvas.screenshot({ path: path.join(imgDir, 'shot-intro.png') });
for (let i = 0; i < 5; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(250); }
await page.waitForTimeout(1400);
// no "Saved!" toasts in guide screenshots
await page.evaluate(() => window.game.events.removeAllListeners('ui:saved'));

// ---------- sprite dumps (4x) ----------
const SPRITES = [
  'player', 'elder', 'shopkeep', 'kid', 'villager', 'farmer', 'guard', 'fisher',
  'hermit', 'nomad', 'witch', 'fairy', 'squirrel',
  'slime', 'redSlime', 'bat', 'spitter', 'beetle', 'skeleton', 'skeletonArcher',
  'scarab', 'mummy', 'iceWolf', 'frostWisp', 'iceSlime', 'knight', 'wizard', 'eyeSentry',
  'bigSlime', 'mummyKnight', 'alphaWolf', 'bogLurker',
  'bramblehorn', 'sandWyrm', 'frostRevenant', 'morgrath', 'morgrath2',
  'swordItem', 'heroSword', 'bow', 'bombItem', 'lantern', 'boots', 'potion', 'oakCharm',
  'shardEmerald', 'shardRuby', 'shardSapphire', 'heartContainer', 'heart', 'gem', 'gemBlue',
  'acorn', 'smallKey', 'bossKey', 'crown', 'arrowPickup', 'bombPickup',
  'chestClosed', 'bigChestClosed', 'torchLit', 'switchEye', 'doorBoss', 'barrierTile', 'portal',
];
for (const key of SPRITES) {
  const dataUrl = await page.evaluate((key) => {
    const game = window.game;
    const tkey = ART.tex(key, 0);
    const src = game.textures.get(tkey).getSourceImage();
    const c = document.createElement('canvas');
    c.width = src.width * 4; c.height = src.height * 4;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  }, key);
  saveB64('sprite-' + key, dataUrl);
}
console.log('sprites done');

// ---------- gameplay screenshots ----------
const SHOTS = [
  // [name, map, room, tx, ty, settleMs, prep]
  ['village', 'overworld', '4,3', 10, 8, 600],
  ['shop', 'interiors', 'village_shop', 10, 9, 400],
  ['elder-house', 'interiors', 'elder_house', 10, 9, 400],
  ['forest-temple', 'overworld', '1,2', 10, 8, 400],
  ['d2-entrance', 'overworld', '8,6', 10, 8, 400],
  ['d3-boulder', 'overworld', '2,0', 10, 7, 400],
  ['barrier', 'overworld', '6,1', 3, 5, 400],
  ['citadel-gate', 'overworld', '8,0', 10, 8, 400],
  ['witch-hut', 'interiors', 'witch_hut', 10, 9, 400],
  ['fairy-pond', 'interiors', 'fairy_pond_lake', 10, 9, 400],
  ['nutwick-grove', 'overworld', '0,3', 8, 6, 400],
  ['shrine-entrance', 'overworld', '1,6', 10, 7, 400],
  ['ice-sokoban', 'dungeon3', '3,2', 10, 9, 400],
  ['dark-room', 'citadel', '2,2', 10, 6, 500],
  ['boss-bramblehorn', 'dungeon1', '1,0', 10, 9, 1600],
  ['boss-sandwyrm', 'dungeon2', '3,0', 10, 9, 1600],
  ['boss-frostrevenant', 'dungeon3', '1,0', 10, 9, 1600],
  ['boss-boglurker', 'shrine', '1,0', 10, 9, 1400],
  ['boss-morgrath', 'citadel', '1,0', 10, 9, 1600],
];
for (const [name, map, room, tx, ty, settle] of SHOTS) {
  await page.evaluate(([map, room, tx, ty]) => {
    const gs = window.game.scene.getScene('Game');
    GS.hearts = GS.maxHearts;
    gs.player.invulnUntil = gs.time.now + 99999;
    delete GS.flags['boss_' + map];
    delete GS.flags['mini_' + map + '_' + room];
    gs.loadRoom(map, room, tx, ty);
  }, [map, room, tx, ty]);
  await page.waitForTimeout(settle);
  await canvas.screenshot({ path: path.join(imgDir, 'shot-' + name + '.png') });
}
// morgrath phase 2
await page.evaluate(async () => {
  const gs = window.game.scene.getScene('Game');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const shield = () => { GS.hearts = GS.maxHearts; gs.player.invulnUntil = gs.time.now + 99999; };
  let guard = 0;
  while (gs.boss && guard++ < 100) { shield(); gs.boss.invulnUntil = 0; gs.hitBoss('sword', 4); await wait(20); }
  await wait(1400);
});
await page.waitForTimeout(1200);
await canvas.screenshot({ path: path.join(imgDir, 'shot-boss-morgrath2.png') });
console.log('screenshots done');

// ---------- stitched dungeon maps ----------
const GRIDS = {
  dungeon1: [3, 3], dungeon2: [4, 3], dungeon3: [4, 3], citadel: [4, 4], shrine: [2, 2],
};
for (const [mapId, [cols, rows]] of Object.entries(GRIDS)) {
  const dataUrl = await page.evaluate(async ([mapId, cols, rows]) => {
    const game = window.game;
    const gs = game.scene.getScene('Game');
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const snap = () => new Promise((res) => game.renderer.snapshot((img) => res(img)));
    game.scene.stop('UI');
    gs.player.setVisible(false);
    const W = 320, H = 192, S = 2;
    const big = document.createElement('canvas');
    big.width = cols * W * S; big.height = rows * H * S;
    const ctx = big.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, big.width, big.height);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = c + ',' + r;
        const room = WORLD.room(mapId, key);
        if (!room) continue;
        room.dark = false;                      // guide maps show everything
        GS.hearts = GS.maxHearts;
        gs.player.invulnUntil = gs.time.now + 99999;
        delete GS.flags['boss_' + mapId];
        gs.loadRoom(mapId, key, 10, 6);
        gs.player.setVisible(false);
        gs._animAcc = 0;
        await wait(90);
        const img = await snap();
        ctx.drawImage(img, 0, 16, W, H, c * W * S, r * H * S, W * S, H * S);
      }
    }
    return big.toDataURL('image/png');
  }, [mapId, cols, rows]);
  saveB64('map-' + mapId, dataUrl);
  // restart UI scene for subsequent shots
  await page.evaluate(() => window.game.scene.start('UI'));
  await page.waitForTimeout(200);
}
console.log('dungeon maps done');

// victory screen
await page.evaluate(() => {
  const gs = window.game.scene.getScene('Game');
  gs.scene.stop('UI');
  gs.scene.start('Victory');
});
await page.waitForTimeout(7500);
await canvas.screenshot({ path: path.join(imgDir, 'shot-victory.png') });

copyFileSync(path.join(root, 'overworld-map.png'), path.join(imgDir, 'map-overworld.png'));
copyFileSync(path.join(root, 'lib', 'press-start-2p.woff2'), path.join(root, 'guide', 'press-start-2p.woff2'));
console.log('ALL ASSETS DONE');
await browser.close();
server.kill();
