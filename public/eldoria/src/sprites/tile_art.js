// Tile art for The Shattered Crown — registers 16x16 art for EVERY tile name
// in src/world/tiles.js. Classic script: only calls window.registerArt().
//
// Conventions (per docs/ARCHITECTURE.md):
//  - Ground tiles are fully opaque.
//  - Props / solids are transparent-backed; the engine paints the biome's base
//    ground underneath them.
//  - Animated tiles (water, shallow, lava, flowers) register 2 frames.
//  - SNES-y palette, chunky 1px texels, soft deterministic dithering.
(function () {
  'use strict';

  var W = 16, H = 16;
  var SHADOW = 'rgba(0,0,0,0.22)';

  // ---------- tiny pixel helpers ----------
  function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function px(ctx, x, y, c) { rect(ctx, x, y, 1, 1, c); }
  function hline(ctx, x, y, len, c) { rect(ctx, x, y, len, 1, c); }
  function vline(ctx, x, y, len, c) { rect(ctx, x, y, 1, len, c); }

  // deterministic noise in [0,1) — same speckle every run, no flicker.
  function rnd(x, y, seed) {
    var n = Math.sin(x * 127.1 + y * 311.7 + (seed || 0) * 74.7) * 43758.5453;
    return n - Math.floor(n);
  }

  // soft dither: sprinkle single-pixel speckles from a small color set.
  function speckle(ctx, seed, density, colors) {
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        if (rnd(x, y, seed) < density) {
          px(ctx, x, y, colors[Math.floor(rnd(y, x, seed + 9) * colors.length) % colors.length]);
        }
      }
    }
  }

  // horizontal spans: list of [y, x0, x1] inclusive.
  function spans(ctx, list, c) {
    for (var i = 0; i < list.length; i++) {
      rect(ctx, list[i][1], list[i][0], list[i][2] - list[i][1] + 1, 1, c);
    }
  }

  // ---------- reusable ground painters ----------
  function paintGrass(ctx, seed) {
    rect(ctx, 0, 0, W, H, '#5f9e4a');
    speckle(ctx, seed, 0.12, ['#579644', '#67a651']);
  }

  function paintWallBase(ctx) {
    // dungeon/cave brick wall — also reused by 'cracked'.
    rect(ctx, 0, 0, W, H, '#666880');
    speckle(ctx, 31, 0.08, ['#5e6076', '#6e7088']);
    // brick top highlights
    hline(ctx, 0, 0, 16, '#767892');
    hline(ctx, 0, 4, 16, '#767892');
    hline(ctx, 0, 8, 16, '#767892');
    hline(ctx, 0, 12, 16, '#767892');
    // mortar rows
    var MORTAR = '#4f5166';
    hline(ctx, 0, 3, 16, MORTAR);
    hline(ctx, 0, 7, 16, MORTAR);
    hline(ctx, 0, 11, 16, MORTAR);
    hline(ctx, 0, 15, 16, MORTAR);
    // staggered vertical joints
    vline(ctx, 7, 0, 3, MORTAR);
    vline(ctx, 3, 4, 3, MORTAR);
    vline(ctx, 11, 4, 3, MORTAR);
    vline(ctx, 7, 8, 3, MORTAR);
    vline(ctx, 3, 12, 3, MORTAR);
    vline(ctx, 11, 12, 3, MORTAR);
  }

  function paintRockBase(ctx) {
    // rounded boulder on transparent — also reused by 'crackrock'.
    var OUT = '#4a4a54', FILL = '#8e8e9a', LT = '#abacb8', DK = '#6e6e7a';
    spans(ctx, [
      [3, 5, 10], [4, 3, 12], [5, 2, 13], [6, 2, 13], [7, 1, 14],
      [8, 1, 14], [9, 1, 14], [10, 2, 13], [11, 2, 13], [12, 3, 12],
    ], OUT);
    spans(ctx, [
      [4, 5, 10], [5, 3, 12], [6, 3, 12], [7, 2, 13], [8, 2, 13],
      [9, 2, 13], [10, 3, 12], [11, 3, 12],
    ], FILL);
    // top-left light
    spans(ctx, [[4, 5, 8], [5, 4, 7], [6, 4, 6]], LT);
    // bottom shade
    spans(ctx, [[10, 4, 12], [11, 4, 11]], DK);
    // a couple of pock marks
    px(ctx, 10, 6, DK); px(ctx, 5, 9, DK);
    // ground shadow
    hline(ctx, 3, 13, 10, SHADOW);
  }

  // small tall-grass tuft (chunky two-blade clump)
  function tuft(ctx, x, y, dk, lt) {
    vline(ctx, x, y - 2, 3, dk);
    vline(ctx, x + 2, y - 1, 2, dk);
    px(ctx, x + 1, y, dk);
    px(ctx, x, y - 3, lt);
    px(ctx, x + 2, y - 2, lt);
  }

  // little 5-pixel flower (plus on frame 0, x-shape on frame 1 = gentle sway)
  function flower(ctx, x, y, f, petals, center) {
    if (f === 0) {
      px(ctx, x, y - 1, petals); px(ctx, x, y + 1, petals);
      px(ctx, x - 1, y, petals); px(ctx, x + 1, y, petals);
    } else {
      px(ctx, x - 1, y - 1, petals); px(ctx, x + 1, y - 1, petals);
      px(ctx, x - 1, y + 1, petals); px(ctx, x + 1, y + 1, petals);
    }
    px(ctx, x, y, center);
  }

  // ============================================================
  // WALKABLE GROUND (fully opaque)
  // ============================================================

  registerArt('grass', { w: W, h: H, frames: 1, draw: function (ctx) {
    paintGrass(ctx, 1);
  }});

  registerArt('tallgrass', { w: W, h: H, frames: 1, draw: function (ctx) {
    rect(ctx, 0, 0, W, H, '#579a43');
    speckle(ctx, 2, 0.10, ['#509240', '#5fa44c']);
    var dk = '#3d8033', lt = '#7cc25e';
    tuft(ctx, 1, 5, dk, lt); tuft(ctx, 6, 5, dk, lt); tuft(ctx, 11, 5, dk, lt);
    tuft(ctx, 3, 12, dk, lt); tuft(ctx, 8, 12, dk, lt); tuft(ctx, 13, 12, dk, lt);
  }});

  registerArt('flowers', { w: W, h: H, frames: 2, draw: function (ctx, f) {
    paintGrass(ctx, 7);
    // leaves under blooms
    px(ctx, 4, 4, '#3f7e34'); px(ctx, 11, 6, '#3f7e34');
    px(ctx, 4, 11, '#3f7e34'); px(ctx, 13, 13, '#3f7e34');
    flower(ctx, 3, 3, f, '#f4f4f4', '#f0c040');   // white daisy
    flower(ctx, 10, 5, f, '#e87898', '#f8e088');  // pink
    flower(ctx, 5, 10, f, '#f0d860', '#d88830');  // gold
    flower(ctx, 12, 12, f, '#f4f4f4', '#f0c040'); // white daisy
  }});

  registerArt('path', { w: W, h: H, frames: 1, draw: function (ctx) {
    rect(ctx, 0, 0, W, H, '#c8a874');
    speckle(ctx, 3, 0.12, ['#bd9d68', '#d2b27e']);
    // small pebbles
    px(ctx, 4, 3, '#b09058'); px(ctx, 12, 7, '#b09058');
    px(ctx, 7, 12, '#b09058'); px(ctx, 14, 14, '#b09058');
  }});

  registerArt('sand', { w: W, h: H, frames: 1, draw: function (ctx) {
    rect(ctx, 0, 0, W, H, '#e2cf96');
    speckle(ctx, 4, 0.12, ['#d9c489', '#ebdaa4']);
    // wind-ripple dashes
    hline(ctx, 3, 4, 3, '#cdb87c'); hline(ctx, 10, 9, 3, '#cdb87c');
    hline(ctx, 5, 13, 3, '#cdb87c');
  }});

  registerArt('snow', { w: W, h: H, frames: 1, draw: function (ctx) {
    rect(ctx, 0, 0, W, H, '#e9f0f6');
    speckle(ctx, 5, 0.10, ['#dfe8f0', '#f3f8fc']);
    px(ctx, 4, 3, '#d3dee9'); px(ctx, 11, 8, '#d3dee9'); px(ctx, 6, 13, '#d3dee9');
    px(ctx, 13, 4, '#ffffff'); px(ctx, 3, 10, '#ffffff');
  }});

  registerArt('dirt', { w: W, h: H, frames: 1, draw: function (ctx) {
    rect(ctx, 0, 0, W, H, '#8a6f50');
    speckle(ctx, 6, 0.12, ['#816747', '#937856']);
    px(ctx, 5, 4, '#745c40'); px(ctx, 12, 9, '#745c40'); px(ctx, 3, 13, '#745c40');
  }});

  registerArt('dfloor', { w: W, h: H, frames: 1, draw: function (ctx) {
    rect(ctx, 0, 0, W, H, '#7b7d8e');
    speckle(ctx, 8, 0.08, ['#757787', '#818394']);
    // 8x8 offset stone slabs, gentle seams
    var SEAM = '#6e7080', LITE = '#86889a';
    hline(ctx, 0, 0, 16, LITE); hline(ctx, 0, 8, 16, LITE);
    hline(ctx, 0, 7, 16, SEAM); hline(ctx, 0, 15, 16, SEAM);
    vline(ctx, 7, 0, 8, SEAM);
    vline(ctx, 3, 8, 8, SEAM); vline(ctx, 11, 8, 8, SEAM);
  }});

  registerArt('bridge', { w: W, h: H, frames: 1, draw: function (ctx) {
    rect(ctx, 0, 0, W, H, '#a87a4a');
    speckle(ctx, 9, 0.08, ['#a07444', '#b08252']); // wood grain
    var SEAM = '#85603a', LT = '#b98a58';
    // horizontal plank bands of 4 rows
    hline(ctx, 0, 0, 16, LT); hline(ctx, 0, 4, 16, LT);
    hline(ctx, 0, 8, 16, LT); hline(ctx, 0, 12, 16, LT);
    hline(ctx, 0, 3, 16, SEAM); hline(ctx, 0, 7, 16, SEAM);
    hline(ctx, 0, 11, 16, SEAM); hline(ctx, 0, 15, 16, SEAM);
    // staggered plank-end joints
    vline(ctx, 5, 0, 3, SEAM); vline(ctx, 11, 4, 3, SEAM);
    vline(ctx, 3, 8, 3, SEAM); vline(ctx, 13, 12, 3, SEAM);
    // nails
    px(ctx, 1, 1, '#6b4a2c'); px(ctx, 14, 5, '#6b4a2c');
    px(ctx, 2, 9, '#6b4a2c'); px(ctx, 12, 13, '#6b4a2c');
  }});

  registerArt('ice', { w: W, h: H, frames: 1, draw: function (ctx) {
    rect(ctx, 0, 0, W, H, '#b6ddee');
    speckle(ctx, 10, 0.10, ['#aed7ea', '#c6e7f4']);
    // diagonal sheen
    var SHINE = '#e2f4fb';
    px(ctx, 3, 2, SHINE); px(ctx, 4, 3, SHINE); px(ctx, 5, 4, SHINE); px(ctx, 6, 5, SHINE);
    px(ctx, 10, 8, SHINE); px(ctx, 11, 9, SHINE); px(ctx, 12, 10, SHINE);
    // faint crack
    var CR = '#92c2da';
    px(ctx, 8, 3, CR); px(ctx, 9, 4, CR); px(ctx, 9, 5, CR); px(ctx, 10, 6, CR);
    px(ctx, 3, 11, CR); px(ctx, 4, 12, CR);
    px(ctx, 12, 3, '#ffffff'); px(ctx, 4, 9, '#ffffff');
  }});

  registerArt('shallow', { w: W, h: H, frames: 2, draw: function (ctx, f) {
    rect(ctx, 0, 0, W, H, '#5fb3c0');
    speckle(ctx, 11 + f, 0.10, ['#56a8b6', '#68bcc8']);
    var RIP = '#9adce2';
    if (f === 0) {
      hline(ctx, 3, 4, 3, RIP); hline(ctx, 10, 8, 4, RIP); hline(ctx, 5, 12, 3, RIP);
    } else {
      hline(ctx, 4, 5, 3, RIP); hline(ctx, 11, 9, 4, RIP); hline(ctx, 6, 13, 3, RIP);
    }
    px(ctx, 13, 3, '#4f9aae'); px(ctx, 2, 9, '#4f9aae');
  }});

  registerArt('rug', { w: W, h: H, frames: 1, draw: function (ctx) {
    rect(ctx, 0, 0, W, H, '#a64545');
    // dark outer edge
    hline(ctx, 0, 0, 16, '#7e3434'); hline(ctx, 0, 15, 16, '#7e3434');
    vline(ctx, 0, 0, 16, '#7e3434'); vline(ctx, 15, 0, 16, '#7e3434');
    // gold inner border
    var GOLD = '#d9af52';
    hline(ctx, 2, 2, 12, GOLD); hline(ctx, 2, 13, 12, GOLD);
    vline(ctx, 2, 2, 12, GOLD); vline(ctx, 13, 2, 12, GOLD);
    // center diamond + corner dots
    spans(ctx, [[6, 7, 8], [7, 6, 9], [8, 6, 9], [9, 7, 8]], GOLD);
    px(ctx, 7, 7, '#b95450'); px(ctx, 8, 8, '#b95450');
    px(ctx, 4, 4, GOLD); px(ctx, 11, 4, GOLD); px(ctx, 4, 11, GOLD); px(ctx, 11, 11, GOLD);
  }});

  // ============================================================
  // SOLID PROPS (transparent-backed, high-read silhouettes)
  // ============================================================

  registerArt('tree', { w: W, h: H, frames: 1, draw: function (ctx) {
    var OUT = '#1d3a16', FILL = '#2f7427', DK = '#26611f', MID = '#479b35', LT = '#5db04a';
    // canopy outline silhouette
    spans(ctx, [
      [0, 5, 10], [1, 3, 12], [2, 2, 13], [3, 1, 14], [4, 1, 14], [5, 1, 14],
      [6, 1, 14], [7, 1, 14], [8, 1, 14], [9, 2, 13], [10, 3, 12], [11, 5, 10],
    ], OUT);
    // canopy fill
    spans(ctx, [
      [1, 5, 10], [2, 3, 12], [3, 2, 13], [4, 2, 13], [5, 2, 13],
      [6, 2, 13], [7, 2, 13], [8, 2, 13], [9, 3, 12], [10, 4, 11],
    ], FILL);
    // lower-canopy shade
    spans(ctx, [[8, 3, 12], [9, 4, 11], [10, 5, 10]], DK);
    // leaf highlights, top-left
    spans(ctx, [[2, 4, 6], [3, 3, 5], [3, 8, 9], [4, 4, 7], [5, 3, 4]], MID);
    px(ctx, 4, 2, LT); px(ctx, 5, 3, LT); px(ctx, 9, 3, LT); px(ctx, 3, 5, LT);
    // trunk
    rect(ctx, 6, 11, 4, 4, '#7a5230');
    vline(ctx, 9, 11, 4, '#5c3c20');
    vline(ctx, 6, 11, 4, '#8d6238');
    hline(ctx, 4, 15, 8, SHADOW);
  }});

  registerArt('rock', { w: W, h: H, frames: 1, draw: function (ctx) {
    paintRockBase(ctx);
  }});

  registerArt('water', { w: W, h: H, frames: 2, draw: function (ctx, f) {
    rect(ctx, 0, 0, W, H, '#3b6cc1');
    speckle(ctx, 13 + f, 0.12, ['#3463b2', '#4274ca']);
    var WAVE = '#7aa2e0', CURL = '#9cc0ee';
    if (f === 0) {
      hline(ctx, 2, 3, 4, WAVE); px(ctx, 2, 2, CURL);
      hline(ctx, 10, 6, 3, WAVE);
      hline(ctx, 5, 10, 4, WAVE); px(ctx, 5, 9, CURL);
      hline(ctx, 12, 13, 3, WAVE);
    } else {
      hline(ctx, 3, 4, 4, WAVE); px(ctx, 6, 3, CURL);
      hline(ctx, 11, 7, 3, WAVE);
      hline(ctx, 6, 11, 4, WAVE); px(ctx, 9, 10, CURL);
      hline(ctx, 11, 14, 3, WAVE);
    }
  }});

  registerArt('mountain', { w: W, h: H, frames: 1, draw: function (ctx) {
    rect(ctx, 0, 0, W, H, '#8b7d6a');
    speckle(ctx, 14, 0.12, ['#827462', '#94866f']);
    // strata + bevel so massed tiles read as cliff
    hline(ctx, 0, 0, 16, '#a3947f');
    hline(ctx, 0, 5, 16, '#746755');
    hline(ctx, 0, 10, 16, '#746755');
    hline(ctx, 0, 6, 16, '#9c8e79');
    hline(ctx, 0, 11, 16, '#9c8e79');
    hline(ctx, 0, 15, 16, '#5f5444');
    // vertical cracks
    vline(ctx, 3, 1, 4, '#665a49');
    vline(ctx, 12, 6, 4, '#665a49');
    vline(ctx, 7, 11, 4, '#665a49');
  }});

  registerArt('housewall', { w: W, h: H, frames: 1, draw: function (ctx) {
    rect(ctx, 0, 0, W, H, '#c08a52');
    speckle(ctx, 15, 0.08, ['#ba8450', '#c89058']);
    // vertical plank seams + light plank edges
    var SEAM = '#9a6a3a';
    vline(ctx, 3, 3, 13, SEAM); vline(ctx, 7, 3, 13, SEAM);
    vline(ctx, 11, 3, 13, SEAM); vline(ctx, 15, 3, 13, SEAM);
    vline(ctx, 0, 3, 13, '#cf9a60'); vline(ctx, 4, 3, 13, '#cf9a60');
    vline(ctx, 8, 3, 13, '#cf9a60'); vline(ctx, 12, 3, 13, '#cf9a60');
    // top beam
    rect(ctx, 0, 0, 16, 3, '#8a5c34');
    hline(ctx, 0, 0, 16, '#a06c40');
    hline(ctx, 0, 2, 16, '#6e4828');
    // nails + base shadow
    px(ctx, 1, 6, '#7a5230'); px(ctx, 9, 9, '#7a5230'); px(ctx, 5, 13, '#7a5230');
    hline(ctx, 0, 15, 16, '#8a5c34');
  }});

  registerArt('wall', { w: W, h: H, frames: 1, draw: function (ctx) {
    paintWallBase(ctx);
  }});

  registerArt('fence', { w: W, h: H, frames: 1, draw: function (ctx) {
    var RAIL = '#a3743f', DK = '#7e5830', LT = '#bf8e54';
    // rails span full width so adjacent fence tiles connect
    hline(ctx, 0, 6, 16, LT); hline(ctx, 0, 7, 16, RAIL);
    hline(ctx, 0, 10, 16, LT); hline(ctx, 0, 11, 16, RAIL);
    // posts with pointed tops
    px(ctx, 3, 2, RAIL); px(ctx, 12, 2, RAIL);
    rect(ctx, 2, 3, 3, 11, RAIL);
    rect(ctx, 11, 3, 3, 11, RAIL);
    vline(ctx, 2, 3, 11, LT); vline(ctx, 4, 3, 11, DK);
    vline(ctx, 11, 3, 11, LT); vline(ctx, 13, 3, 11, DK);
    hline(ctx, 2, 14, 3, SHADOW); hline(ctx, 11, 14, 3, SHADOW);
  }});

  registerArt('cactus', { w: W, h: H, frames: 1, draw: function (ctx) {
    var OUT = '#1e4a1c', FILL = '#3f8c3a', LT = '#58a850';
    // outlines first, fills after (fills bridge over connector outlines)
    rect(ctx, 5, 1, 6, 14, OUT);                 // body silhouette
    rect(ctx, 1, 4, 4, 6, OUT);                  // left arm
    rect(ctx, 4, 6, 2, 4, OUT);                  // left connector
    rect(ctx, 11, 2, 4, 7, OUT);                 // right arm
    rect(ctx, 10, 5, 2, 4, OUT);                 // right connector
    rect(ctx, 6, 2, 4, 12, FILL);                // body
    rect(ctx, 2, 5, 2, 4, FILL);                 // left arm
    rect(ctx, 4, 7, 2, 2, FILL);                 // left bridge
    rect(ctx, 12, 3, 2, 5, FILL);                // right arm
    rect(ctx, 10, 6, 2, 2, FILL);                // right bridge
    vline(ctx, 6, 3, 10, LT);                    // body highlight
    vline(ctx, 2, 5, 3, LT);
    // spines + little bloom on top
    var SP = '#e8f0d8';
    px(ctx, 8, 4, SP); px(ctx, 7, 7, SP); px(ctx, 8, 10, SP);
    px(ctx, 3, 6, SP); px(ctx, 13, 5, SP);
    px(ctx, 7, 0, '#e87898'); px(ctx, 8, 0, '#f8b8c8');
    hline(ctx, 5, 15, 6, SHADOW);
  }});

  registerArt('iceblock', { w: W, h: H, frames: 1, draw: function (ctx) {
    rect(ctx, 0, 0, W, H, '#b8def0');
    rect(ctx, 0, 0, 16, 2, '#e4f5fc');           // lit top
    rect(ctx, 0, 2, 2, 12, '#d4ecf8');           // lit left
    rect(ctx, 0, 14, 16, 2, '#84b6d2');          // dark bottom
    rect(ctx, 14, 2, 2, 12, '#9ccae0');          // dark right
    var C = '#6ca4c6';
    px(ctx, 0, 0, C); px(ctx, 15, 0, C); px(ctx, 0, 15, C); px(ctx, 15, 15, C);
    var SHINE = '#f0fafe';
    px(ctx, 5, 5, SHINE); px(ctx, 6, 6, SHINE); px(ctx, 7, 7, SHINE);
    px(ctx, 10, 4, SHINE); px(ctx, 11, 5, SHINE);
  }});

  registerArt('statue', { w: W, h: H, frames: 1, draw: function (ctx) {
    // pedestal
    rect(ctx, 3, 12, 10, 3, '#6a6c7c');
    hline(ctx, 3, 12, 10, '#8a8ca0');
    hline(ctx, 3, 14, 10, '#4a4a56');
    // body
    rect(ctx, 5, 6, 6, 6, '#7e8094');
    vline(ctx, 5, 6, 6, '#9a9cb0');
    vline(ctx, 10, 6, 6, '#5e6070');
    // shoulders
    px(ctx, 4, 6, '#6e7082'); px(ctx, 4, 7, '#6e7082');
    px(ctx, 11, 6, '#6e7082'); px(ctx, 11, 7, '#6e7082');
    // head
    rect(ctx, 6, 1, 5, 5, '#8e90a4');
    hline(ctx, 6, 1, 5, '#a6a8ba');
    px(ctx, 7, 3, '#3a3a46'); px(ctx, 9, 3, '#3a3a46');  // stern eyes
    hline(ctx, 6, 5, 5, '#6e7082');                       // chin shade
    hline(ctx, 2, 15, 12, SHADOW);
  }});

  registerArt('bush', { w: W, h: H, frames: 1, draw: function (ctx) {
    var OUT = '#1c4416', FILL = '#37862c', DK = '#296c20', LT = '#52a440';
    spans(ctx, [
      [2, 5, 10], [3, 3, 12], [4, 2, 13], [5, 2, 13], [6, 1, 14], [7, 1, 14],
      [8, 1, 14], [9, 2, 13], [10, 2, 13], [11, 3, 12], [12, 5, 10],
    ], OUT);
    spans(ctx, [
      [3, 5, 10], [4, 3, 12], [5, 3, 12], [6, 2, 13], [7, 2, 13],
      [8, 2, 13], [9, 3, 12], [10, 3, 12], [11, 5, 10],
    ], FILL);
    spans(ctx, [[9, 4, 11], [10, 5, 10], [11, 6, 9]], DK);
    spans(ctx, [[4, 4, 6], [5, 4, 5], [5, 8, 9], [6, 3, 5]], LT);
    px(ctx, 7, 3, LT); px(ctx, 10, 5, LT);
    hline(ctx, 4, 13, 8, SHADOW);
  }});

  // ============================================================
  // DESTRUCTIBLES
  // ============================================================

  registerArt('cracked', { w: W, h: H, frames: 1, draw: function (ctx) {
    paintWallBase(ctx);
    // big jagged bombable crack
    var CR = '#2e3040';
    px(ctx, 8, 0, CR); px(ctx, 8, 1, CR); px(ctx, 7, 2, CR); px(ctx, 7, 3, CR);
    px(ctx, 8, 4, CR); px(ctx, 9, 5, CR); px(ctx, 9, 6, CR); px(ctx, 8, 7, CR);
    px(ctx, 7, 8, CR); px(ctx, 7, 9, CR); px(ctx, 8, 10, CR); px(ctx, 8, 11, CR);
    px(ctx, 9, 12, CR); px(ctx, 8, 13, CR); px(ctx, 8, 14, CR); px(ctx, 8, 15, CR);
    // branches + chips
    px(ctx, 6, 6, CR); px(ctx, 5, 7, CR); px(ctx, 10, 9, CR); px(ctx, 11, 10, CR);
    px(ctx, 9, 4, '#3e4254'); px(ctx, 6, 9, '#3e4254'); px(ctx, 10, 12, '#3e4254');
  }});

  registerArt('crackrock', { w: W, h: H, frames: 1, draw: function (ctx) {
    paintRockBase(ctx);
    var CR = '#3a3a44';
    px(ctx, 8, 4, CR); px(ctx, 7, 5, CR); px(ctx, 8, 6, CR); px(ctx, 8, 7, CR);
    px(ctx, 9, 8, CR); px(ctx, 8, 9, CR); px(ctx, 7, 10, CR); px(ctx, 8, 11, CR);
    px(ctx, 6, 7, CR); px(ctx, 5, 7, CR); px(ctx, 10, 8, CR); px(ctx, 11, 9, CR);
    px(ctx, 9, 6, '#5c5c66'); px(ctx, 7, 8, '#5c5c66');
  }});

  registerArt('pot', { w: W, h: H, frames: 1, draw: function (ctx) {
    var OUT = '#4a2818', BODY = '#b46a40', LT = '#d89058', DK = '#8a4c2c';
    // silhouette
    spans(ctx, [
      [1, 5, 10], [2, 5, 10], [3, 6, 9], [4, 4, 11], [5, 3, 12], [6, 3, 12],
      [7, 3, 12], [8, 3, 12], [9, 3, 12], [10, 3, 12], [11, 4, 11],
      [12, 5, 10], [13, 6, 9],
    ], OUT);
    // rim + neck + body fill
    spans(ctx, [[2, 6, 9]], '#cf8854');
    spans(ctx, [[3, 7, 8]], '#9a5832');
    spans(ctx, [
      [4, 5, 10], [5, 4, 11], [6, 4, 11], [7, 4, 11], [8, 4, 11],
      [9, 4, 11], [10, 4, 11], [11, 5, 10], [12, 6, 9],
    ], BODY);
    // shine left, shade right
    vline(ctx, 5, 5, 6, LT); px(ctx, 6, 4, LT);
    vline(ctx, 10, 5, 6, DK); vline(ctx, 11, 6, 4, DK);
    hline(ctx, 5, 14, 6, SHADOW);
  }});

  // ============================================================
  // HAZARDS
  // ============================================================

  registerArt('lava', { w: W, h: H, frames: 2, draw: function (ctx, f) {
    rect(ctx, 0, 0, W, H, '#c2391b');
    speckle(ctx, 17 + f, 0.15, ['#a52c12', '#d34a20']);
    var OR = '#ef7426', HOT = '#f8cf4a', RING = '#f59a32';
    hline(ctx, 2, 2, 4, OR); hline(ctx, 8, 6, 5, OR);
    hline(ctx, 4, 11, 4, OR); hline(ctx, 12, 13, 3, OR);
    // drifting hot blobs
    var spots = f === 0 ? [[4, 3], [10, 7], [6, 12]] : [[5, 4], [11, 8], [7, 13]];
    for (var i = 0; i < spots.length; i++) {
      var sx = spots[i][0], sy = spots[i][1];
      rect(ctx, sx - 1, sy, 3, 1, RING); rect(ctx, sx, sy - 1, 1, 3, RING);
      px(ctx, sx, sy, HOT);
    }
  }});

  registerArt('spikes', { w: W, h: H, frames: 1, draw: function (ctx) {
    var LT = '#c8ccd6', MID = '#a8aeba', DK = '#787e8e', OUT = '#4a4e5c';
    var bases = [0, 4, 8, 12];
    for (var i = 0; i < bases.length; i++) {
      var sx = bases[i];
      // tapered spike, light left / dark right
      px(ctx, sx + 1, 4, '#e8ecf2'); px(ctx, sx + 2, 4, LT);
      rect(ctx, sx + 1, 5, 1, 7, LT); rect(ctx, sx + 2, 5, 1, 7, DK);
      px(ctx, sx, 9, MID); px(ctx, sx, 10, MID); px(ctx, sx, 11, MID);
      px(ctx, sx + 3, 9, OUT); px(ctx, sx + 3, 10, OUT); px(ctx, sx + 3, 11, OUT);
    }
    // base plate
    rect(ctx, 0, 12, 16, 3, '#5a5e6c');
    hline(ctx, 0, 12, 16, '#7e8494');
    hline(ctx, 0, 14, 16, '#424652');
    px(ctx, 2, 13, '#383c48'); px(ctx, 6, 13, '#383c48');
    px(ctx, 10, 13, '#383c48'); px(ctx, 14, 13, '#383c48');
  }});

  registerArt('pit', { w: W, h: H, frames: 1, draw: function (ctx) {
    // rounded dark hole; corners stay transparent so ground peeks through
    rect(ctx, 2, 1, 12, 14, '#15151e');
    rect(ctx, 1, 2, 14, 12, '#15151e');
    // deep far edge at top, faint near edge at bottom
    rect(ctx, 2, 1, 12, 2, '#08080e');
    rect(ctx, 1, 3, 14, 2, '#0d0d14');
    rect(ctx, 2, 13, 12, 2, '#26262f');
    hline(ctx, 3, 12, 10, '#1e1e28');
  }});

  // ============================================================
  // WARP TILES
  // ============================================================

  registerArt('stairsdown', { w: W, h: H, frames: 1, draw: function (ctx) {
    // stone jambs
    rect(ctx, 0, 0, 3, 16, '#4e4f60');
    rect(ctx, 13, 0, 3, 16, '#4e4f60');
    vline(ctx, 2, 0, 16, '#3a3b4a'); vline(ctx, 13, 0, 16, '#3a3b4a');
    vline(ctx, 0, 0, 16, '#5e5f72'); vline(ctx, 15, 0, 16, '#5e5f72');
    // steps fading into darkness (dark = deep/far at top)
    rect(ctx, 3, 0, 10, 4, '#0d0d15');
    rect(ctx, 3, 4, 10, 3, '#303246');
    rect(ctx, 3, 7, 10, 3, '#4c4f66');
    rect(ctx, 3, 10, 10, 3, '#696d88');
    rect(ctx, 3, 13, 10, 3, '#8a8ea8');
    // lit step edges
    hline(ctx, 3, 4, 10, '#3c3e54');
    hline(ctx, 3, 7, 10, '#5d6078');
    hline(ctx, 3, 10, 10, '#7d819c');
    hline(ctx, 3, 13, 10, '#9da1ba');
  }});

  registerArt('stairsup', { w: W, h: H, frames: 1, draw: function (ctx) {
    rect(ctx, 0, 0, 3, 16, '#4e4f60');
    rect(ctx, 13, 0, 3, 16, '#4e4f60');
    vline(ctx, 2, 0, 16, '#3a3b4a'); vline(ctx, 13, 0, 16, '#3a3b4a');
    vline(ctx, 0, 0, 16, '#5e5f72'); vline(ctx, 15, 0, 16, '#5e5f72');
    // steps climbing toward light (bright at top)
    rect(ctx, 3, 0, 10, 3, '#d8dce8');
    rect(ctx, 3, 3, 10, 3, '#b4b8cc');
    rect(ctx, 3, 6, 10, 3, '#9296ac');
    rect(ctx, 3, 9, 10, 3, '#70748c');
    rect(ctx, 3, 12, 10, 4, '#525670');
    // step shadows
    hline(ctx, 3, 3, 10, '#a2a6bc');
    hline(ctx, 3, 6, 10, '#80849a');
    hline(ctx, 3, 9, 10, '#5e627a');
    hline(ctx, 3, 12, 10, '#42465e');
  }});

  registerArt('doorway', { w: W, h: H, frames: 1, draw: function (ctx) {
    // dark opening
    rect(ctx, 0, 0, W, H, '#16100a');
    // wooden frame
    rect(ctx, 0, 0, 2, 16, '#8a5c34');
    rect(ctx, 14, 0, 2, 16, '#8a5c34');
    rect(ctx, 0, 0, 16, 3, '#8a5c34');
    hline(ctx, 0, 0, 16, '#a06c40');
    vline(ctx, 0, 0, 16, '#a06c40');
    vline(ctx, 15, 0, 16, '#6e4828');
    hline(ctx, 2, 2, 12, '#6e4828');     // lintel underside
    vline(ctx, 2, 3, 13, '#5e3c22'); vline(ctx, 13, 3, 13, '#5e3c22');
    // warm glow near the floor + stone sill
    rect(ctx, 3, 10, 10, 3, '#241812');
    rect(ctx, 2, 13, 12, 3, '#8c7a5e');
    hline(ctx, 2, 13, 12, '#a8967a');
  }});
})();
