// =====================================================================
// The Shattered Crown — FOREST region (src/world/regions/forest.js)
// Overworld cells: cols 0-2, rows 2-4 (9 rooms). Biome: 'forest'.
//
// Cross-region gateways honored EXACTLY (all other outside edges sealed,
// including the col-0 world border):
//   - mountains (1,1) S <-> forest (1,2) N : open x=9,10
//   - forest (2,3) E   <-> meadows (3,3) W : open y=5,6
//   - forest (1,4) S   <-> swamp (1,5) N   : open x=9,10
//
// Internal forest connectivity (both sides walkable, all rooms reachable):
//   (0,2)<->(1,2) y=8,9   (1,2)<->(2,2) y=5,6   (1,2)<->(1,3) x=9,10
//   (2,2)<->(2,3) x=15,16 (0,3)<->(1,3) y=5,6   (1,3)<->(2,3) y=5,6
//   (1,3)<->(1,4) x=9,10  (2,3)<->(2,4) x=15,16 (0,4)<->(1,4) y=5,6
//   (1,4)<->(2,4) y=8,9
//
// Highlights:
//   (1,2) Vinewood Temple facade — S stairs -> dungeon1 '1,2' (10,10)
//   (0,3) Nutwick's hidden grove behind a cuttable bush wall (acorn #2)
//   (0,2) bush-sealed alcove: acorn #1 + gem chest
//   (2,4) cracked boulder X -> interiors 'cave_forest_gems' (acorn #3
//         lives inside that interior, per GAME_DESIGN)
// =====================================================================

Object.assign(WORLD.maps.overworld.rooms, {

  // -------------------------------------------------------------------
  // (0,2) — Tangled Thicket. Dead-end secret room west of the temple.
  // NW alcove (enter by cutting the bush at 3,4) hides an acorn + chest.
  // Open: E y=8,9 only.
  // -------------------------------------------------------------------
  '0,2': {
    biome: 'forest',
    tiles: [
      //123456789012345678901
      'TTTTTTTTTTTTTTTTTTTT', // 0
      'T..f.fT,,....,,...TT', // 1  alcove top
      'T.....T.,,...,...,.T', // 2  acorn (2,2), chest (4,2)
      'T.....T,....,,..,,.T', // 3
      'TTTBTTT....,,....,.T', // 4  bush door into alcove at (3,4)
      'T,.....,...,....,,.T', // 5
      'T..,T,...T...,..T,.T', // 6
      'T,...,....,....,...T', // 7
      'T..,,...T...,,......', // 8  open east
      'T,...,....,...,.....', // 9  open east
      'T,,..,,,..T..,,..,,T', // 10
      'TTTTTTTTTTTTTTTTTTTT', // 11
    ],
    enemies: [
      { type: 'slime', x: 5, y: 7 },
      { type: 'slime', x: 12, y: 9 },
      { type: 'beetle', x: 14, y: 6 },
    ],
    chests: [
      { id: 'ow_forest_chest1', x: 4, y: 2, contents: { gems: 20 } },
    ],
    pickups: [
      { x: 2, y: 2, item: 'acorn', id: 'ow_acorn_forest1' },
    ],
  },

  // -------------------------------------------------------------------
  // (1,2) — Vinewood Temple facade (D1 entrance). Stairs S at (10,3)
  // warp to dungeon1. North gateway to mountains at x=9,10.
  // Open: N x=9,10 (gateway) | S x=9,10 | W y=8,9 | E y=5,6.
  // No enemies — a calm landmark screen before the dungeon.
  // -------------------------------------------------------------------
  '1,2': {
    biome: 'forest',
    tiles: [
      //123456789012345678901
      'TTTTTTTTTPPTTTTTTTTT', // 0  mountains gateway
      'T,,......PP......,,T', // 1
      'T....#####A#####...T', // 2  temple top wall + crown statue
      'T....#A...S...A#...T', // 3  stairs down at (10,3)
      'T....####.P.####...T', // 4  entrance gap x=9..11
      'T.,.......P.........', // 5  open east
      'T.........P.........', // 6  open east
      'T,........P........T', // 7
      '..........P........T', // 8  open west
      '.....,....P....,...T', // 9  open west
      'T,,.......P......,,T', // 10
      'TTTTTTTTTPPTTTTTTTTT', // 11
    ],
    warps: [
      { x: 10, y: 3, to: { map: 'dungeon1', room: '1,2', x: 10, y: 10 } },
    ],
    signs: [
      { id: 'sign_d1_entrance', x: 12, y: 5 },
    ],
    pots: [
      { x: 4, y: 2 },
      { x: 16, y: 2 },
    ],
  },

  // -------------------------------------------------------------------
  // (2,2) — Rocky Underbrush. Winding tree pockets, light foes.
  // Open: W y=5,6 | S x=15,16.
  // -------------------------------------------------------------------
  '2,2': {
    biome: 'forest',
    tiles: [
      //123456789012345678901
      'TTTTTTTTTTTTTTTTTTTT', // 0
      'T,,...,,TT,,...,,..T', // 1
      'T..T.....,....T....T', // 2
      'T.,..,TT...,..,..,.T', // 3
      'T....,....T,....TT.T', // 4
      '.,....,....,...,...T', // 5  open west
      '..,...T,,...T...,..T', // 6  open west
      'T,...R..,....R..,..T', // 7
      'T..,....,,T....,...T', // 8
      'T.T...,......,..T..T', // 9
      'T,,..,...,....TPP,.T', // 10
      'TTTTTTTTTTTTTTTPPTTT', // 11 down to (2,3)
    ],
    enemies: [
      { type: 'bat', x: 5, y: 3 },
      { type: 'spitter', x: 8, y: 8 },
      { type: 'slime', x: 15, y: 5 },
    ],
  },

  // -------------------------------------------------------------------
  // (0,3) — Nutwick's Hidden Grove. The only way in is the east corridor,
  // blocked by a cuttable bush wall at x=14 (y=5,6). Inside: flowers,
  // a pond, the Squirrel King, and an acorn.
  // Open: E y=5,6 only (behind bushes).
  // -------------------------------------------------------------------
  '0,3': {
    biome: 'forest',
    tiles: [
      //123456789012345678901
      'TTTTTTTTTTTTTTTTTTTT', // 0
      'T.f.f...f.f...TTTTTT', // 1
      'T..,..WWW....,TTTTTT', // 2
      'T....WWWW....fTTTTTT', // 3  acorn at (3,3)
      'T.f...WW......TTTTTT', // 4
      'T..f.....f....BPPPPP', // 5  bush wall (14,5), open east
      'T,......,..,..BPPPPP', // 6  bush wall (14,6), open east
      'T.f..,....f...TTTTTT', // 7
      'T..,...f..,...TTTTTT', // 8
      'T,.f.,....,..TTTTTTT', // 9
      'TT,..,..f..,.TTTTTTT', // 10
      'TTTTTTTTTTTTTTTTTTTT', // 11
    ],
    npcs: [
      { id: 'nutwick', art: 'squirrel', x: 6, y: 6 },
    ],
    pickups: [
      { x: 3, y: 3, item: 'acorn', id: 'ow_acorn_forest2' },
    ],
  },

  // -------------------------------------------------------------------
  // (1,3) — Forest Crossroads. Central hub: paths run N/S/E/W.
  // Open: N x=9,10 | S x=9,10 | W y=5,6 | E y=5,6.
  // -------------------------------------------------------------------
  '1,3': {
    biome: 'forest',
    tiles: [
      //123456789012345678901
      'TTTTTTTTTPPTTTTTTTTT', // 0
      'T,,......PP......,,T', // 1
      'T..T..,..PP..,..T..T', // 2
      'T,....T..PP..T....,T', // 3
      'T..,.....PP.....,..T', // 4
      '.PPPPPPPPPPPPPPPPPP.', // 5  open west + east
      '..,...T.,PP,.T...,..', // 6  open west + east
      'T...,....PP....,...T', // 7
      'T.T......PP......T.T', // 8
      'T,...,T..PP..T,...,T', // 9
      'T,,......PP......,,T', // 10
      'TTTTTTTTTPPTTTTTTTTT', // 11
    ],
    enemies: [
      { type: 'slime', x: 4, y: 4 },
      { type: 'beetle', x: 14, y: 4 },
      { type: 'spitter', x: 3, y: 8 },
      { type: 'bat', x: 15, y: 8 },
    ],
  },

  // -------------------------------------------------------------------
  // (2,3) — Forest Edge. East gateway to the meadows (y=5,6) with the
  // sign_forest_edge marker beside the road.
  // Open: E y=5,6 (gateway) | W y=5,6 | N x=15,16 | S x=15,16.
  // -------------------------------------------------------------------
  '2,3': {
    biome: 'forest',
    tiles: [
      //123456789012345678901
      'TTTTTTTTTTTTTTTPPTTT', // 0  up to (2,2)
      'T,,..,....,...,PP..T', // 1
      'T..T,...TT...,.PP,.T', // 2
      'T,....,....,...PP..T', // 3
      'T...,....,.....P...T', // 4  sign at (16,4)
      '.PPPPPPPPPPPPPPPPPP.', // 5  open west + meadows gateway east
      '..,....,....,....,..', // 6  open west + meadows gateway east
      'T...T,....,...T...,T', // 7
      'T,...,...,....,....T', // 8
      'T..,....TT...,...,.T', // 9
      'T,....,....,...PP..T', // 10
      'TTTTTTTTTTTTTTTPPTTT', // 11 down to (2,4)
    ],
    signs: [
      { id: 'sign_forest_edge', x: 16, y: 4 },
    ],
    enemies: [
      { type: 'slime', x: 5, y: 8 },
      { type: 'slime', x: 12, y: 8 },
      { type: 'bat', x: 8, y: 3 },
    ],
  },

  // -------------------------------------------------------------------
  // (0,4) — Spitter Hollow. Dead-end overgrown pocket stuffed with
  // tallgrass to cut, pots, and a fat gem chest.
  // Open: E y=5,6 only.
  // -------------------------------------------------------------------
  '0,4': {
    biome: 'forest',
    tiles: [
      //123456789012345678901
      'TTTTTTTTTTTTTTTTTTTT', // 0
      'T,,,..,,,,..,,,..,,T', // 1
      'T,T,,..,,T,,..,,T,,T', // 2  pots at (5,2),(12,2)
      'T,,..,,..,,..,,..,,T', // 3
      'T..T,...T....,..T..T', // 4
      'T...,....,....,.....', // 5  open east
      'T,....,....,....,...', // 6  open east
      'T..T..,..T...,..T..T', // 7
      'T,,..,,..,,,..,,..,T', // 8
      'T,.,,T,,..,,..T,,.,T', // 9
      'T,,,..,,..,,..,,,,.T', // 10 chest at (2,10)
      'TTTTTTTTTTTTTTTTTTTT', // 11
    ],
    enemies: [
      { type: 'spitter', x: 10, y: 4 },
      { type: 'slime', x: 15, y: 3 },
      { type: 'spitter', x: 6, y: 9 },
      { type: 'beetle', x: 10, y: 9 },
    ],
    chests: [
      { id: 'ow_forest_chest2', x: 2, y: 10, contents: { gems: 50 } },
    ],
    pots: [
      { x: 5, y: 2 },
      { x: 12, y: 2 },
    ],
  },

  // -------------------------------------------------------------------
  // (1,4) — Southwood Trail. Road south to the swamp gateway (x=9,10).
  // Open: N x=9,10 | S x=9,10 (gateway) | W y=5,6 | E y=8,9.
  // -------------------------------------------------------------------
  '1,4': {
    biome: 'forest',
    tiles: [
      //123456789012345678901
      'TTTTTTTTTPPTTTTTTTTT', // 0
      'T,,......PP......,,T', // 1
      'T...T,...PP...,T...T', // 2
      'T,...,...PP...,...,T', // 3
      'T..,.....PP.....,..T', // 4
      '.PPPPPPPPPP.....,..T', // 5  open west
      '..,......PP....T,..T', // 6  open west
      'T...T....PP..,.....T', // 7
      'T,.......PPPPPPPPPP.', // 8  open east
      'T..,.....PP......,..', // 9  open east
      'T,,......PP......,,T', // 10
      'TTTTTTTTTPPTTTTTTTTT', // 11 swamp gateway
    ],
    enemies: [
      { type: 'slime', x: 5, y: 3 },
      { type: 'bat', x: 14, y: 4 },
      { type: 'spitter', x: 4, y: 9 },
    ],
  },

  // -------------------------------------------------------------------
  // (2,4) — Boulder Dell. A cracked boulder (X at 9,3) hides stairs to
  // the gem cave interior (bomb it to reveal them). E/S sealed.
  // Open: N x=15,16 | W y=8,9.
  // -------------------------------------------------------------------
  '2,4': {
    biome: 'forest',
    tiles: [
      //123456789012345678901
      'TTTTTTTTTTTTTTTPPTTT', // 0  up to (2,3)
      'T,,...,......,.PP..T', // 1
      'T..,...RRRRR...PP.,T', // 2  rock cap over the boulder
      'T,.....R.X.R...P...T', // 3  cracked boulder at (9,3)
      'T..,...R...R...P,..T', // 4
      'T,...,....,....P...T', // 5
      'T..T,...T...,..P...T', // 6
      'T,....,..,.....P..,T', // 7
      '.PPPPPPPPPPPPPPP...T', // 8  open west
      '..,....,....,....,.T', // 9  open west
      'T,,..,,,..,,..,,,..T', // 10
      'TTTTTTTTTTTTTTTTTTTT', // 11
    ],
    warps: [
      { x: 9, y: 3, to: { map: 'interiors', room: 'cave_forest_gems', x: 10, y: 10 }, hidden: 'bomb' },
    ],
    enemies: [
      { type: 'beetle', x: 5, y: 5 },
      { type: 'bat', x: 12, y: 7 },
      { type: 'spitter', x: 5, y: 9 },
      { type: 'slime', x: 10, y: 10 },
    ],
  },

});
