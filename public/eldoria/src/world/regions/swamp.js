// src/world/regions/swamp.js — SWAMP region (cols 0-2, rows 5-7) of the overworld.
// Murky shallows (w, slow), deep water (W), gnarled trees (T), reeds (,).
// Gateways (per GAME_DESIGN, all other cross-region edges sealed solid):
//   - swamp (2,6) E <-> meadows (3,6) W  — open y=5,6
//   - forest (1,4) S <-> swamp (1,5) N   — open x=9,10
// World border: col 0 (west) fully solid, row 7 (south) fully solid.
// Features: Witch hut D-warp in (2,5) -> interiors 'witch_hut';
//   Sunken Shrine S-warp in (1,6) -> map 'shrine' room '0,1' pos 10,10;
//   sign_swamp in (1,5); sign_shrine in (1,6); 1 acorn on a deep-water
//   island in (0,7) behind a cuttable bush + wade path.
// Enemies used: slime, redSlime, spitter, bat (per region brief).

Object.assign(WORLD.maps.overworld.rooms, {

  // ---------------------------------------------------------------- (0,5)
  // Mistwood Pools — NW corner. Open E (y5,6) to (1,5), S (x9,10) to (0,6).
  // North edge sealed (forest above, no gateway). West edge = world border.
  '0,5': {
    biome: 'swamp',
    tiles: [
      'TTTTTTTTTTTTTTTTTTTT',
      'TT,,.TTT.....TTT.TTT',
      'T..wwww,..,,..ww,.TT',
      'T.wwWWww..TT.wWWw.TT',
      'T.wWWWWw..TT.wWWw.TT',
      'T..wwww.....,,......',
      'T...,,....TT...,....',
      'T.ww..,.....,..ww.TT',
      'T.wWWw...TT...wWWw.T',
      'T..www....TT..www..T',
      'TT...,,..........TTT',
      'TTTTTTTTT..TTTTTTTTT',
    ],
    enemies: [
      { type: 'slime', x: 4, y: 6 },
      { type: 'slime', x: 15, y: 9 },
      { type: 'bat', x: 13, y: 3 },
    ],
  },

  // ---------------------------------------------------------------- (1,5)
  // Swamp Gate — N gateway to forest (1,4) at x9,10. Open W/E (y5,6), S (x9,10).
  // sign_swamp greets travelers coming down from the forest.
  '1,5': {
    biome: 'swamp',
    tiles: [
      'TTTTTTTTTPPTTTTTTTTT',
      'TT,,..TT.PP.TT..,,TT',
      'T..ww....PP....ww.TT',
      'T.wWWw...PP...wWWw.T',
      'T.wwww...PP....www.T',
      '....PPPPPPPPPPPP....',
      '....PPPPPPPPPPPP....',
      'T..,,....PP...,,,..T',
      'T.ww,....PP....ww.TT',
      'T.wWw....PP....wWw.T',
      'TT.ww....PP....ww.TT',
      'TTTTTTTTTPPTTTTTTTTT',
    ],
    signs: [
      { id: 'sign_swamp', x: 12, y: 3 },
    ],
    enemies: [
      { type: 'spitter', x: 5, y: 7 },
      { type: 'slime', x: 14, y: 8 },
      { type: 'bat', x: 16, y: 2 },
    ],
  },

  // ---------------------------------------------------------------- (2,5)
  // Witch's Hollow — Morla's hut (H walls, D door at 10,4 -> interiors witch_hut).
  // Open W (y5,6) to (1,5), S (x9,10) to (2,6). North + east edges sealed.
  '2,5': {
    biome: 'swamp',
    tiles: [
      'TTTTTTTTTTTTTTTTTTTT',
      'TT,,..TTT.....TT..TT',
      'T..,..HHHHHHH..,..TT',
      'T.ww..HHHHHHH..ww.TT',
      'T.ww..HHHHDHH..ww.TT',
      '......PPPPP.....wWTT',
      '.........PP.....wWTT',
      'T...,....PP....,wWTT',
      'T.ww.....PP...wwWWTT',
      'T.wWw....PP....wWwTT',
      'TT.ww....PP....ww.TT',
      'TTTTTTTTTPPTTTTTTTTT',
    ],
    warps: [
      { x: 10, y: 4, to: { map: 'interiors', room: 'witch_hut', x: 10, y: 10 } },
    ],
    pots: [
      { x: 5, y: 4 },
      { x: 13, y: 4 },
    ],
    enemies: [
      { type: 'slime', x: 4, y: 8 },
      { type: 'redSlime', x: 5, y: 9 },
      { type: 'bat', x: 15, y: 2 },
    ],
  },

  // ---------------------------------------------------------------- (0,6)
  // Murk Maze — wading channels between deep pools.
  // Open N (x9,10) to (0,5), E (y5,6) to (1,6), S (x9,10) to (0,7).
  '0,6': {
    biome: 'swamp',
    tiles: [
      'TTTTTTTTT..TTTTTTTTT',
      'TWWww....,,...wwWWTT',
      'TWwwWWWww,,wwWWWwwWT',
      'TWw.wWWWw..wWWWw.wWT',
      'TWw.wwWww..wwWww..WT',
      'TW..w.w.,..,.w.w....',
      'TW..w.w......w.w....',
      'TWw.wWWWw..wWWWw.wWT',
      'TWwwWWWww..wwWWWwwWT',
      'TWWww....,,....wwWWT',
      'TTWww....,,....wwWTT',
      'TTTTTTTTT..TTTTTTTTT',
    ],
    enemies: [
      { type: 'redSlime', x: 9, y: 4 },
      { type: 'spitter', x: 4, y: 9 },
      { type: 'bat', x: 15, y: 5 },
    ],
  },

  // ---------------------------------------------------------------- (1,6)
  // Sunken Shrine — ancient stone facade (# walls, A statues), S stairs at
  // (10,3) warp -> map 'shrine' room '0,1' pos 10,10. sign_shrine by the gap.
  // Open on all four sides (N/S x9,10; W/E y5,6).
  '1,6': {
    biome: 'swamp',
    tiles: [
      'TTTTTTTTT..TTTTTTTTT',
      'TWWw.....,,.....wWWT',
      'TWw..##########..wWT',
      'TW...#APPPSPPA#...WT',
      'TW...####PP####...WT',
      '.....,...PP...,.....',
      '......,..PP..,......',
      'TWw...A..PP..A...wWT',
      'TWw..,...PP....,.wWT',
      'TWWw.....PP.....wWWT',
      'TTWww....PP....wwWTT',
      'TTTTTTTTTPPTTTTTTTTT',
    ],
    warps: [
      { x: 10, y: 3, to: { map: 'shrine', room: '0,1', x: 10, y: 10 } },
    ],
    signs: [
      { id: 'sign_shrine', x: 12, y: 5 },
    ],
    enemies: [
      { type: 'slime', x: 3, y: 8 },
      { type: 'spitter', x: 16, y: 8 },
      { type: 'redSlime', x: 4, y: 10 },
    ],
  },

  // ---------------------------------------------------------------- (2,6)
  // Eastward Trail — E gateway to meadows (3,6) at y5,6.
  // Open N (x9,10) to (2,5), W (y5,6) to (1,6), S (x9,10) to (2,7).
  '2,6': {
    biome: 'swamp',
    tiles: [
      'TTTTTTTTTPPTTTTTTTTT',
      'TT,,.....PP.....,,TT',
      'T..ww....PP....ww.TT',
      'T.wWWw...PP...wWWwTT',
      'T.wWWw...PP...wWWwTT',
      '..,.ww...PPPPPPPPPPP',
      '.........PPPPPPPPPPP',
      'T..,..B,.PP..,..,.TT',
      'T.ww.....PP....ww.TT',
      'T.wWw....PP....wWwTT',
      'TT.ww....PP....ww.TT',
      'TTTTTTTTTPPTTTTTTTTT',
    ],
    enemies: [
      { type: 'slime', x: 5, y: 8 },
      { type: 'redSlime', x: 14, y: 7 },
      { type: 'spitter', x: 4, y: 2 },
      { type: 'bat', x: 13, y: 9 },
    ],
  },

  // ---------------------------------------------------------------- (0,7)
  // Drowned Hollow — deep-water island holding the swamp acorn. Reached by
  // cutting the bush at (7,6) then wading (6,6) onto the island (x3-5).
  // Open N (x9,10) to (0,6), E (y5,6) to (1,7). West + south = world border.
  '0,7': {
    biome: 'swamp',
    tiles: [
      'TTTTTTTTT..TTTTTTTTT',
      'TWWWWWWW....WWWWWWTT',
      'TWWWWWWW.,..WWWWWWWT',
      'TWWwwWWW....WWWWWWWT',
      'TWW...WW..,.WWWWWWWT',
      'TWW.f.WW............',
      'TWW...wB............',
      'TWWWWWWW....WWWWWWWT',
      'TWWWWWWW.,..WWWWWWWT',
      'TWWwwWWW,..,WWWWWWWT',
      'TTWWWWWW....WWWWWWTT',
      'TTTTTTTTTTTTTTTTTTTT',
    ],
    pickups: [
      { x: 4, y: 5, item: 'acorn', id: 'ow_swamp_acorn1' },
    ],
    pots: [
      { x: 9, y: 10 },
      { x: 10, y: 10 },
    ],
    enemies: [
      { type: 'bat', x: 14, y: 5 },
      { type: 'spitter', x: 9, y: 8 },
      { type: 'slime', x: 12, y: 6 },
    ],
  },

  // ---------------------------------------------------------------- (1,7)
  // Boggy Bottom — soggy crossroads on the south rim.
  // Open N (x9,10) to (1,6), W (y5,6) to (0,7), E (y5,6) to (2,7). South = border.
  '1,7': {
    biome: 'swamp',
    tiles: [
      'TTTTTTTTTPPTTTTTTTTT',
      'TT,,.....PP....,,.TT',
      'T..ww,...PP...,ww.TT',
      'T.wWWw...PP...wWWwTT',
      'T.wWWw...PP...wWWw.T',
      '.....,...PP...,.....',
      '......,..PP..,......',
      'T..,.....PP......,.T',
      'T.ww..B..PP..B..ww.T',
      'T.wWw....PP....wWw.T',
      'TT.ww....PP....ww.TT',
      'TTTTTTTTTTTTTTTTTTTT',
    ],
    enemies: [
      { type: 'redSlime', x: 5, y: 5 },
      { type: 'slime', x: 14, y: 6 },
      { type: 'spitter', x: 16, y: 2 },
      { type: 'bat', x: 6, y: 9 },
    ],
  },

  // ---------------------------------------------------------------- (2,7)
  // Forgotten Corner — SE corner; a bush-walled nook hides a gem chest.
  // Open N (x9,10) to (2,6), W (y5,6) to (1,7). East sealed, south = border.
  '2,7': {
    biome: 'swamp',
    tiles: [
      'TTTTTTTTTPPTTTTTTTTT',
      'TT,......PP......,TT',
      'T..ww....PP....ww.TT',
      'T.wWWw...PP..,wWWwTT',
      'T.wwww...PP...wwww.T',
      '.....,...PP....,...T',
      '....,....PP......BBT',
      'T..,.....PP....BBBBT',
      'T.ww.....PP....B..BT',
      'T.wWw....PP....B..BT',
      'TT.ww....PP....BBBBT',
      'TTTTTTTTTTTTTTTTTTTT',
    ],
    chests: [
      { id: 'ow_swamp_gems1', x: 17, y: 9, contents: { gems: 20 } },
    ],
    enemies: [
      { type: 'slime', x: 5, y: 7 },
      { type: 'redSlime', x: 13, y: 4 },
      { type: 'bat', x: 6, y: 2 },
    ],
  },

});
