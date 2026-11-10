// item_art.js — registerArt for all item / prop / UI / effect keys.
// (See docs/ARCHITECTURE.md "Art" section.) Every sprite is 16x16; chunky
// 1px-texel pixel art. Pickups are jewel-bright; doors/switches have clearly
// distinct states. No globals are created: helpers live in this IIFE.
(function () {
  'use strict';

  // ---- tiny pixel helpers --------------------------------------------------
  function px(ctx, c, x, y, w, h) {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w == null ? 1 : w, h == null ? 1 : h);
  }
  // Paint a grid of chars through a palette ({char: color}); unknown/' ' and
  // '.' chars are transparent. ox/oy offset the grid inside the 16x16 canvas.
  function blit(ctx, pal, rows, ox, oy) {
    ox = ox || 0; oy = oy || 0;
    for (var y = 0; y < rows.length; y++) {
      var row = rows[y];
      for (var x = 0; x < row.length; x++) {
        var c = pal[row.charAt(x)];
        if (c) { ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, 1, 1); }
      }
    }
  }
  function still(name, pal, rows, ox, oy) {
    registerArt(name, { w: 16, h: 16, frames: 1, draw: function (ctx) {
      blit(ctx, pal, rows, ox, oy);
    } });
  }

  // ==== hearts ===============================================================
  var HEART = [
    '..xx....xx..',
    '.xxxx..xxxx.',
    'xxxxxxxxxxxx',
    'xxxxxxxxxxxx',
    'xxxxxxxxxxxx',
    '.xxxxxxxxxx.',
    '..xxxxxxxx..',
    '...xxxxxx...',
    '....xxxx....',
    '.....xx.....',
  ];
  // left/right halves can differ (heartHalf); bottom rows shaded darker.
  function heartShape(ctx, l, lD, r, rD, hl) {
    for (var y = 0; y < HEART.length; y++) {
      for (var x = 0; x < 12; x++) {
        if (HEART[y].charAt(x) !== 'x') continue;
        var c = x < 6 ? (y >= 6 ? lD : l) : (y >= 6 ? rD : r);
        px(ctx, c, x + 2, y + 3);
      }
    }
    if (hl) { px(ctx, hl, 4, 4); px(ctx, hl, 5, 5); }
  }
  registerArt('heart', { w: 16, h: 16, frames: 1, draw: function (ctx) {
    heartShape(ctx, '#ee3c52', '#b01f33', '#ee3c52', '#b01f33', '#ffb0bc');
  } });
  registerArt('heartHalf', { w: 16, h: 16, frames: 1, draw: function (ctx) {
    heartShape(ctx, '#ee3c52', '#b01f33', '#5a5a6e', '#42424f', '#ffb0bc');
  } });
  registerArt('heartEmpty', { w: 16, h: 16, frames: 1, draw: function (ctx) {
    heartShape(ctx, '#5a5a6e', '#42424f', '#5a5a6e', '#42424f', '#80808e');
  } });
  still('heartContainer', { g: '#f4c542', r: '#ee3c52', h: '#ffb0bc' }, [
    '...gg....gg...',
    '..grrg..grrg..',
    '.grrrrggrrrrg.',
    'grrhrrrrrrrrrg',
    'grhrrrrrrrrrrg',
    'grrrrrrrrrrrrg',
    '.grrrrrrrrrrg.',
    '..grrrrrrrrg..',
    '...grrrrrrg...',
    '....grrrrg....',
    '.....grrg.....',
    '......gg......',
  ], 1, 2);

  // ==== gems =================================================================
  var GEM = [
    '...oo...',
    '..oLLo..',
    '.oLLggo.',
    'oLLggggo',
    'oLgggGGo',
    'ogggGGGo',
    'ogggGGGo',
    'oLgggGGo',
    '.oggGGo.',
    '..oGGo..',
    '...oo...',
  ];
  still('gem', { o: '#0c3a1c', L: '#a8f5b0', g: '#35c94f', G: '#1d8a35' }, GEM, 4, 2);
  still('gemBlue', { o: '#0c2050', L: '#a8d8ff', g: '#3b8df6', G: '#1d4fae' }, GEM, 4, 2);

  // ==== ammo pickups =========================================================
  still('arrowPickup', { h: '#cfd8e6', s: '#a9743d', f: '#e04040' }, [
    '..hh..',
    '.hhhh.',
    '..ss..',
    '..ss..',
    '..ss..',
    '..ss..',
    '..ss..',
    '..ss..',
    '.fssf.',
    'ffssff',
    '.f..f.',
  ], 5, 2);

  var BOMB = [
    '........yY..',
    '.......s....',
    '......s.....',
    '....bbbb....',
    '...bbbbbb...',
    '..bhhbbbbb..',
    '..bhbbbbbb..',
    '..bbbbbbbb..',
    '..bbbbbbbb..',
    '...bbbbbb...',
    '....bbbb....',
  ];
  still('bombPickup',
    { b: '#23232e', h: '#5a5a6e', s: '#c9a04e', y: '#ffd84e', Y: '#ff8c2e' },
    BOMB, 2, 2);
  registerArt('bombItem', { w: 16, h: 16, frames: 1, draw: function (ctx) {
    blit(ctx, { b: '#2e3450', h: '#6a7090', s: '#c9a04e', y: '#ffd84e', Y: '#ff8c2e' },
      BOMB, 2, 2);
    px(ctx, '#c9a04e', 4, 9, 8, 1); // gold band = inventory bomb-bag icon
  } });

  // ==== keys =================================================================
  still('smallKey', { y: '#f4c542', Y: '#c89428' }, [
    '.yyyy.',
    'yy..yy',
    'yy..yy',
    '.yyyy.',
    '..yY..',
    '..yY..',
    '..yY..',
    '..yY..',
    '..yYy.',
    '..yY..',
    '..yYy.',
  ], 5, 2);
  still('bossKey', { y: '#f4c542', Y: '#c89428', r: '#e0344e' }, [
    '..yyyy..',
    '.yrrrry.',
    '.yrrrry.',
    '..yyyy..',
    '...yY...',
    '...yY...',
    '...yY...',
    '...yY...',
    '...yYyy.',
    '...yY...',
    '...yYyy.',
  ], 4, 2);

  // ==== equipment items ======================================================
  still('bow', { b: '#8a5a2b', G: '#5a3a1b', s: '#e8e8f0' }, [
    '..bb...',
    '.bb.s..',
    '.b..s..',
    'bb..s..',
    'b...s..',
    'b...s..',
    'G...s..',
    'G...s..',
    'b...s..',
    'b...s..',
    'bb..s..',
    '.b..s..',
    '.bb.s..',
    '..bb...',
  ], 4, 1);

  still('lantern', { m: '#b08a3e', Y: '#ffe27a', f: '#ff9a2e' }, [
    '..mmmm..',
    '.m....m.',
    '..mmmm..',
    '.mYYYYm.',
    '.mYffYm.',
    '.mYffYm.',
    '.mYYYYm.',
    '..mmmm..',
    '...mm...',
  ], 4, 3);

  still('boots', { y: '#f4c542', r: '#c0392b', b: '#5a3a1b' }, [
    '.yy...yy...',
    '.rr...rr...',
    '.rr...rr...',
    '.rr...rr...',
    '.rrr..rrr..',
    '.rrrr.rrrr.',
    '.bbbb.bbbb.',
  ], 3, 5);

  still('potion', { c: '#a9743d', g: '#cfe6ff', r: '#e0344e', h: '#ff7a8e' }, [
    '...cc...',
    '...gg...',
    '...gg...',
    '..grrg..',
    '.grrrrg.',
    '.grhrrg.',
    '.grrrrg.',
    '.grrrrg.',
    '.grrrrg.',
    '..gggg..',
  ], 4, 3);

  still('swordItem', { w: '#e6edf8', W: '#9ab0cc', y: '#f4c542', b: '#7a4a22' }, [
    '..w...',
    '..wW..',
    '..wW..',
    '..wW..',
    '..wW..',
    '..wW..',
    '..wW..',
    '.yyyy.',
    'yyyyyy',
    '..bb..',
    '..bb..',
    '..yy..',
  ], 5, 1);

  still('heroSword',
    { c: '#bfe0ff', C: '#6aa0d8', w: '#ffffff', y: '#f4c542', B: '#3b8df6', b: '#2e4a8a' }, [
    '...c....',
    '...cC...',
    '...cC...',
    '..wcC...',
    '...cC...',
    '...cC...',
    '...cC...',
    '...cC...',
    '.yyyyyy.',
    'yyyBByyy',
    '...bb...',
    '...bb...',
    '..yyyy..',
    '...yy...',
  ], 4, 1);

  // ==== shards ===============================================================
  var SHARD = [
    '...h...',
    '..hcc..',
    '..ccc..',
    '.hcccc.',
    '.ccccc.',
    '.ccCCc.',
    '.cCCCc.',
    '..cCC..',
    '..cC...',
    '...c...',
  ];
  still('shardEmerald', { h: '#b8ffc8', c: '#35c94f', C: '#1d8a35' }, SHARD, 4, 3);
  still('shardRuby', { h: '#ffb8c4', c: '#e0344e', C: '#9c1f33' }, SHARD, 4, 3);
  still('shardSapphire', { h: '#b8dcff', c: '#3b8df6', C: '#1d4fae' }, SHARD, 4, 3);

  // ==== collectibles =========================================================
  still('acorn', { s: '#5a3a1b', p: '#7a4a22', b: '#c98e4e', h: '#e8be86' }, [
    '...ss...',
    '..pppp..',
    '.pppppp.',
    '.pppppp.',
    '.bhbbbb.',
    '.bhbbbb.',
    '..bbbb..',
    '...bb...',
  ], 4, 3);

  still('oakCharm', { p: '#5a3a1b', w: '#a9743d', g: '#3da943' }, [
    '....pp....',
    '...p..p...',
    '..wwwwww..',
    '.wwwwwwww.',
    'wwwwggwwww',
    'wwwggggwww',
    'wwwggggwww',
    'wwwwggwwww',
    'wwwwggwwww',
    '.wwwwwwww.',
    '..wwwwww..',
  ], 3, 2);

  still('crown',
    { y: '#f4c542', Y: '#b8862e', G: '#35c94f', R: '#e0344e', B: '#3b8df6' }, [
    '.y....yy....y.',
    '.y...yyyy...y.',
    '.yy.yyyyyy.yy.',
    '.yyyyyyyyyyyy.',
    '.yyyyyyyyyyyy.',
    '.yGyyyRRyyyBy.',
    '.yyyyyyyyyyyy.',
    '.YYYYYYYYYYYY.',
  ], 1, 4);

  // ==== chests ===============================================================
  var CHEST_CLOSED = [
    '.oooooooooooo.',
    'oBBBBBBBBBBBBo',
    'oBBBBBBBBBBBBo',
    'oyyyyyyyyyyyyo',
    'obbbbbLLbbbbbo',
    'obbbbbLLbbbbbo',
    'obbbbbbbbbbbbo',
    'obbbbbbbbbbbbo',
    '.oooooooooooo.',
  ];
  var CHEST_OPEN = [
    '.oooooooooooo.',
    'oBBBBBBBBBBBBo',
    'okkkkkkkkkkkko',
    'okkkkywwykkkko',
    'oyyyyyyyyyyyyo',
    'obbbbbLLbbbbbo',
    'obbbbbLLbbbbbo',
    'obbbbbbbbbbbbo',
    '.oooooooooooo.',
  ];
  var CHEST_PAL = { o: '#4a2e12', B: '#b07a3e', b: '#8a5a2b', y: '#f4c542',
    L: '#f4c542', k: '#1c1410', w: '#fff2b0' };
  var BIGCHEST_PAL = { o: '#141a30', B: '#3e62b0', b: '#2e4a8a', y: '#f4c542',
    L: '#e0344e', k: '#0e1322', w: '#fff2b0' };
  still('chestClosed', CHEST_PAL, CHEST_CLOSED, 1, 4);
  still('chestOpen', CHEST_PAL, CHEST_OPEN, 1, 4);
  still('bigChestClosed', BIGCHEST_PAL, CHEST_CLOSED, 1, 4);
  still('bigChestOpen', BIGCHEST_PAL, CHEST_OPEN, 1, 4);

  // ==== dungeon props ========================================================
  registerArt('block', { w: 16, h: 16, frames: 1, draw: function (ctx) {
    px(ctx, '#3a3a4a', 0, 0, 16, 16);   // outline
    px(ctx, '#9aa0b0', 1, 1, 14, 14);   // stone face
    px(ctx, '#c4cad8', 1, 1, 14, 1);    // top light
    px(ctx, '#c4cad8', 1, 1, 1, 14);    // left light
    px(ctx, '#666c7c', 1, 14, 14, 1);   // bottom shade
    px(ctx, '#666c7c', 14, 1, 1, 14);   // right shade
    px(ctx, '#7e8494', 4, 4, 8, 1);     // carved inner panel
    px(ctx, '#7e8494', 4, 4, 1, 8);
    px(ctx, '#b4bac8', 4, 11, 8, 1);
    px(ctx, '#b4bac8', 11, 4, 1, 8);
  } });

  registerArt('plate', { w: 16, h: 16, frames: 1, draw: function (ctx) {
    px(ctx, '#55555f', 2, 2, 12, 12);   // raised plate
    px(ctx, '#a8aebc', 3, 3, 10, 10);
    px(ctx, '#c8ceda', 3, 3, 10, 1);
    px(ctx, '#c8ceda', 3, 3, 1, 10);
    px(ctx, '#8a8f9c', 6, 6, 4, 4);
  } });
  registerArt('platePressed', { w: 16, h: 16, frames: 1, draw: function (ctx) {
    px(ctx, '#46464f', 3, 3, 10, 10);   // sunken, darker, smaller
    px(ctx, '#71767f', 4, 4, 8, 8);
    px(ctx, '#5b6068', 6, 6, 4, 4);
  } });

  // torches -------------------------------------------------------------------
  function torchBase(ctx) {
    px(ctx, '#9a9aaa', 5, 6, 6, 1);  // bowl rim
    px(ctx, '#6e6e7e', 5, 7, 6, 1);  // bowl
    px(ctx, '#8a5a2b', 7, 8, 2, 5);  // post
    px(ctx, '#5a3a1b', 6, 13, 4, 1); // base
  }
  var FLAME = [
    [ // frame 0
      '...YY...',
      '..YYO...',
      '..YOOO..',
      '.YOOOO..',
      '..OOOO..',
      '..ROOR..',
    ],
    [ // frame 1 (flicker)
      '....Y...',
      '...OYY..',
      '..OOOY..',
      '..OOOOY.',
      '..OOOO..',
      '..ROOR..',
    ],
  ];
  registerArt('torchLit', { w: 16, h: 16, frames: 2, draw: function (ctx, f) {
    torchBase(ctx);
    blit(ctx, { Y: '#ffe27a', O: '#ff9a2e', R: '#e04018' }, FLAME[f], 4, 0);
  } });
  registerArt('torchUnlit', { w: 16, h: 16, frames: 1, draw: function (ctx) {
    torchBase(ctx);
    px(ctx, '#3a3a44', 6, 5, 4, 1); // cold coals
  } });

  // switches -------------------------------------------------------------------
  still('switchEye',
    { k: '#23232e', w: '#f0f0f4', i: '#e0344e', s: '#6e6e7e' }, [
    '....kkkk....',
    '..kkwwwwkk..',
    '.kwwwwwwwwk.',
    '.kwwiiiiwwk.',
    'kwwiikkiiwwk',
    'kwwiikkiiwwk',
    '.kwwiiiiwwk.',
    '.kwwwwwwwwk.',
    '..kkwwwwkk..',
    '....kkkk....',
    '..ssssssss..',
    '.ssssssssss.',
  ], 2, 2);
  still('switchEyeHit',
    { k: '#23232e', g: '#8a8a9a', s: '#6e6e7e' }, [
    '....kkkk....',
    '..kkggggkk..',
    '.kggggggggk.',
    '.kggggggggk.',
    '.kkkkkkkkkk.',  // closed lid
    'kggggggggggk',
    '.kggggggggk.',
    '.kggggggggk.',
    '..kkggggkk..',
    '....kkkk....',
    '..ssssssss..',
    '.ssssssssss.',
  ], 2, 2);

  var CRYSTAL = [
    '....cc....',
    '...chhc...',
    '..cchhcc..',
    '.cccccccc.',
    '.ccccCCcc.',
    '..ccCCcc..',
    '...cCCc...',
    '....cc....',
    '..ssssss..',
    '.ssssssss.',
  ];
  still('switchCrystal',
    { c: '#4ea0f0', h: '#cfe9ff', C: '#2358b0', s: '#6e6e7e' }, CRYSTAL, 3, 3);
  still('switchCrystalHit',
    { c: '#f05a5a', h: '#ffd0d0', C: '#b02828', s: '#6e6e7e' }, CRYSTAL, 3, 3);

  // doors -----------------------------------------------------------------------
  function doorBase(ctx, frame, edge, dark) {
    px(ctx, frame, 0, 0, 16, 16);  // stone surround
    px(ctx, edge, 0, 0, 16, 1);
    px(ctx, edge, 0, 15, 16, 1);
    px(ctx, edge, 0, 0, 1, 16);
    px(ctx, edge, 15, 0, 1, 16);
    px(ctx, dark, 3, 4, 10, 12);   // opening
    px(ctx, dark, 4, 3, 8, 1);     // arch
  }
  registerArt('doorLocked', { w: 16, h: 16, frames: 1, draw: function (ctx) {
    doorBase(ctx, '#5d5d70', '#3a3a48', '#181020');
    px(ctx, '#d8b04e', 6, 6, 4, 1);   // padlock shackle
    px(ctx, '#d8b04e', 5, 7, 1, 2);
    px(ctx, '#d8b04e', 10, 7, 1, 2);
    px(ctx, '#f4c542', 5, 9, 6, 4);   // padlock body
    px(ctx, '#3a2e10', 7, 10, 2, 2);  // keyhole
  } });
  registerArt('doorBoss', { w: 16, h: 16, frames: 1, draw: function (ctx) {
    doorBase(ctx, '#53395f', '#33203d', '#100818');
    px(ctx, '#e8e8f0', 5, 6, 6, 5);   // skull
    px(ctx, '#100818', 6, 8, 1, 2);   // eye sockets
    px(ctx, '#100818', 9, 8, 1, 2);
    px(ctx, '#ff3030', 6, 9, 1, 1);   // red glow
    px(ctx, '#ff3030', 9, 9, 1, 1);
    px(ctx, '#100818', 7, 10, 1, 1);  // nose
    px(ctx, '#e8e8f0', 6, 11, 1, 1);  // teeth
    px(ctx, '#e8e8f0', 8, 11, 1, 1);
    px(ctx, '#e8e8f0', 10, 11, 1, 1);
  } });
  registerArt('doorSealed', { w: 16, h: 16, frames: 1, draw: function (ctx) {
    doorBase(ctx, '#5d5d70', '#3a3a48', '#26262e');
    px(ctx, '#80808e', 3, 4, 10, 12); // blocking slab
    px(ctx, '#80808e', 4, 3, 8, 1);
    px(ctx, '#4e4e5a', 5, 4, 1, 12);  // bars
    px(ctx, '#4e4e5a', 8, 4, 1, 12);
    px(ctx, '#4e4e5a', 11, 4, 1, 12);
    px(ctx, '#5a5a66', 3, 9, 10, 1);  // crossband
  } });

  // shard barrier (2-frame shimmer) ----------------------------------------------
  registerArt('barrierTile', { w: 16, h: 16, frames: 2, draw: function (ctx, f) {
    for (var y = 0; y < 16; y++) {
      for (var x = 0; x < 16; x++) {
        var v = (x + y + f * 2) % 4;
        px(ctx, v < 2 ? 'rgba(178,62,240,0.88)' : 'rgba(120,30,180,0.88)', x, y);
      }
    }
    var sp = f ? [[3, 4], [12, 9], [7, 13]] : [[5, 11], [10, 3], [13, 12]];
    for (var i = 0; i < sp.length; i++) px(ctx, '#ffd6ff', sp[i][0], sp[i][1]);
  } });

  // sign ---------------------------------------------------------------------------
  still('sign',
    { o: '#5a3a1b', b: '#c98e4e', t: '#5a3a1b', p: '#8a5a2b' }, [
    '.oooooooooooo.',
    'obbbbbbbbbbbbo',
    'obttbtttbttbbo',
    'obbbbbbbbbbbbo',
    'obtttbttbttbbo',
    '.oooooooooooo.',
    '......pp......',
    '......pp......',
    '......pp......',
    '.....pppp.....',
  ], 1, 3);

  // portal (2-frame swirl) ----------------------------------------------------------
  var PORTAL = [
    '...pppppp...',
    '..pccccccp..',
    '.pcckkkkccp.',
    'pcckkkkkkccp',
    'pckkkkkkkkcp',
    'pckkwkkkkkcp',
    'pckkkkkwkkcp',
    'pckkkkkkkkcp',
    'pcckkkkkkccp',
    '.pcckkkkccp.',
    '..pccccccp..',
    '...pppppp...',
  ];
  registerArt('portal', { w: 16, h: 16, frames: 2, draw: function (ctx, f) {
    var pal = f
      ? { p: '#3ec8f0', c: '#8a3ef0', k: '#140a26', w: '#e8f4ff' }
      : { p: '#8a3ef0', c: '#3ec8f0', k: '#140a26', w: '#e8f4ff' };
    blit(ctx, pal, PORTAL, 2, 2);
  } });

  // ==== projectiles ===========================================================
  still('arrow', { f: '#e04040', s: '#a9743d', w: '#dfe8f4' }, [
    '............w...',
    'ffsssssssssswww.',
    'ffsssssssssswww.',
    '............w...',
  ], 0, 6);

  still('seed', { g: '#7ac943', G: '#4a8a2a' }, [
    '..gg..',
    '.gggg.',
    '.gGgg.',
    '.gGGg.',
    '..gg..',
  ], 5, 6);

  still('bone', { w: '#f0ead8', W: '#c8c0a8' }, [
    '.ww........ww.',
    'wwwwwwwwwwwwww',
    'wwWWWWWWWWWWww',
    '.ww........ww.',
  ], 1, 6);

  still('iceShard', { h: '#ffffff', c: '#9adcff', C: '#4ea0d0' }, [
    '..c...',
    '..cc..',
    '.hcc..',
    '.cccc.',
    '.cCCc.',
    '..cC..',
    '..cC..',
    '...c..',
  ], 5, 4);

  var FIREBALL = [
    [
      '...RR...',
      '..ROOR..',
      '.ROYYOR.',
      '.OYYYYO.',
      '.OYYYYO.',
      '.ROYYOR.',
      '..ROOR..',
      '...RR...',
    ],
    [
      '..R..R..',
      '.RROORR.',
      '.ROYYOR.',
      'ROYYYYOR',
      '.OYYYYO.',
      '.ROYYOR.',
      '..ROOR..',
      '....R...',
    ],
  ];
  registerArt('fireball', { w: 16, h: 16, frames: 2, draw: function (ctx, f) {
    blit(ctx, { R: '#e04018', O: '#ff8c2e', Y: '#ffd84e' }, FIREBALL[f], 4, 4);
  } });

  still('rockShot', { g: '#9a9aaa', G: '#6a6a7a', h: '#c4c4d0' }, [
    '..ggg...',
    '.ggggg..',
    'gghGggg.',
    'ggGGGgg.',
    '.gGGGg..',
    '..ggg...',
  ], 4, 5);

  var MAGICBOLT = [
    [
      '...pp...',
      '..pwwp..',
      '.pwwwwp.',
      '.pwwwwp.',
      '..pwwp..',
      '...pp...',
    ],
    [
      'p..pp..p',
      '.pwwwwp.',
      '.pwWWwp.',
      '.pwWWwp.',
      '.pwwwwp.',
      'p..pp..p',
    ],
  ];
  registerArt('magicBolt', { w: 16, h: 16, frames: 2, draw: function (ctx, f) {
    blit(ctx, { p: '#b04ef0', w: '#e8c8ff', W: '#ffffff' }, MAGICBOLT[f], 4, 5);
  } });

  // ==== effects ===============================================================
  // crescent slash (engine rotates per swing direction)
  registerArt('slashArc', { w: 16, h: 16, frames: 1, draw: function (ctx) {
    for (var y = 0; y < 16; y++) {
      for (var x = 0; x < 16; x++) {
        var dx = x - 7.5, dy = y - 7.5;
        var d = Math.sqrt(dx * dx + dy * dy);
        var dx2 = x - 4.5;
        var d2 = Math.sqrt(dx2 * dx2 + dy * dy);
        if (d <= 7.5 && d2 >= 7) {
          px(ctx, d >= 6.5 ? '#bcd6ff' : '#f4f8ff', x, y);
        }
      }
    }
  } });

  registerArt('explosion', { w: 16, h: 16, frames: 3, draw: function (ctx, f) {
    for (var y = 0; y < 16; y++) {
      for (var x = 0; x < 16; x++) {
        var dx = x - 7.5, dy = y - 7.5;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (f === 0) {           // bright burst
          if (d <= 2) px(ctx, '#ffffff', x, y);
          else if (d <= 3.6) px(ctx, '#ffe27a', x, y);
          else if (d <= 4.6) px(ctx, '#ff8c2e', x, y);
        } else if (f === 1) {    // full fireball
          if (d <= 2.4) px(ctx, '#ffffff', x, y);
          else if (d <= 4.4) px(ctx, '#ffe27a', x, y);
          else if (d <= 6.2) px(ctx, '#ff8c2e', x, y);
          else if (d <= 7.4 && (x * 3 + y * 5) % 3 !== 0) px(ctx, '#e04018', x, y);
        } else {                 // dissipating ring + smoke
          if (d >= 5.2 && d <= 7.6) px(ctx, (x + y) % 2 ? '#ff8c2e' : '#e04018', x, y);
          else if (d < 4.5 && (x * 7 + y * 3) % 5 === 0) px(ctx, '#8a8a9a', x, y);
        }
      }
    }
  } });

  var SPARKLE = [
    [
      '...w...',
      '...w...',
      '...w...',
      'wwwYwww',
      '...w...',
      '...w...',
      '...w...',
    ],
    [
      'w.....w',
      '.w...w.',
      '..w.w..',
      '...Y...',
      '..w.w..',
      '.w...w.',
      'w.....w',
    ],
  ];
  registerArt('sparkle', { w: 16, h: 16, frames: 2, draw: function (ctx, f) {
    blit(ctx, { w: '#ffffff', Y: '#fff0a0' }, SPARKLE[f], 4, 4);
  } });

  var DUST = [
    [
      '..oo...O..',
      '.oooo.OOO.',
      '..oo...O..',
    ],
    [
      '.o......O.',
      'ooo.OO.OOO',
      '.o..OO...O',
    ],
  ];
  registerArt('dust', { w: 16, h: 16, frames: 2, draw: function (ctx, f) {
    blit(ctx, { o: '#c0c0cc', O: '#9a9aaa' }, DUST[f], 3, 9);
  } });

  // soft drop shadow under entities
  registerArt('shadow', { w: 16, h: 16, frames: 1, draw: function (ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    for (var y = 0; y < 16; y++) {
      for (var x = 0; x < 16; x++) {
        var dx = (x - 7.5) / 6;
        var dy = (y - 12) / 2.6;
        if (dx * dx + dy * dy <= 1) ctx.fillRect(x, y, 1, 1);
      }
    }
  } });
})();
