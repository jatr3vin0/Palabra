// ===========================================================================
// The Shattered Crown — MEADOWS region (start region)
// 18 rooms: cols 3-6 rows 2-4, plus cols 3-4 rows 5-7.
//
// Gateways honored on the meadows side (all other boundary edges sealed):
//   forest    (2,3) E <-> meadows (3,3) W  — open y=5,6
//   meadows   (6,3) E <-> lake    (7,3) W  — open y=5,6
//   swamp     (2,6) E <-> meadows (3,6) W  — open y=5,6
//   meadows   (4,6) E <-> desert  (5,6) W  — open y=5,6
//   mountains (4,1) S <-> meadows (4,2) N  — open x=9,10
//   meadows   (6,4) S <-> desert  (6,5) N  — open x=9,10
//
// Willow Village spans (4,3)+(5,3) (safe). Spawn: (4,3) tile 10,8.
// Secrets: 2 acorns (bush maze in (3,2), bush pocket in (4,7)),
//          X boulder in room (3,4) at tile 4,3 -> interiors cave_meadow_gems.
// ===========================================================================
Object.assign(WORLD.maps.overworld.rooms, {

  // ---- (3,2) Bramble Hollow — bush maze hiding golden acorn #1 -----------
  '3,2': {
    biome: 'meadows',
    tiles: [
      'TTTTTTTTTTTTTTTTTTTT',
      'T,,.BBBBBBBBB...,,.T',
      'T,..B.......B..,...T',
      'T...B.BBBBB.B.,,...T',
      'T.,.B.B...B.B......T',
      'T...B.B.B.B.B....,.P',
      'T.,.BBB.B.B.....PPPP',
      'T.......B.B..,...,.T',
      'T..,,...B.B....,,..T',
      'T...,..........,...T',
      'T....,..,PP,..,....T',
      'TTTTTTTTTPPTTTTTTTTT',
    ],
    enemies: [
      { type: 'slime', x: 15, y: 8 },
      { type: 'slime', x: 4, y: 9 },
    ],
    pickups: [{ x: 7, y: 2, item: 'acorn', id: 'ow_mead_acorn1' }],
  },

  // ---- (4,2) North Road — gateway N to mountains (4,1); guard Tomas ------
  '4,2': {
    biome: 'meadows',
    tiles: [
      'TTTTTTTTTPPTTTTTTTTT',
      'T..f....,PP,....f..T',
      'T.......,PP,.......T',
      'T.RR....,PP,....RR.T',
      'T..,....,PP,....,..T',
      'P.......,PP,.......P',
      'PPPPPPPPPPPPPPPPPPPP',
      'T.f.....,PP,.....f.T',
      'T.......,PP,.......T',
      'T..RR...,PP,...RR..T',
      'T...,...,PP,...,...T',
      'TTTTTTTTTPPTTTTTTTTT',
    ],
    npcs: [{ id: 'guard_tomas', art: 'guard', x: 12, y: 2 }],
    enemies: [{ type: 'slime', x: 4, y: 8 }],
  },

  // ---- (5,2) Rocky Rise — boulders and tall grass ------------------------
  '5,2': {
    biome: 'meadows',
    tiles: [
      'TTTTTTTTTTTTTTTTTTTT',
      'T,,...R.......R...,T',
      'T,.....RR...RR....,T',
      'T...f..............T',
      'T.,......RR......,.T',
      '.........RR.........',
      '....................',
      'T..RR....,,....RR..T',
      'T.,......RR......,.T',
      'T....,...........,.T',
      'T...f...,PP,...f...T',
      'TTTTTTTTTPPTTTTTTTTT',
    ],
    enemies: [
      { type: 'redSlime', x: 5, y: 3 },
      { type: 'slime', x: 14, y: 8 },
    ],
  },

  // ---- (6,2) Bushy Bluff — bush-ringed gem chest -------------------------
  '6,2': {
    biome: 'meadows',
    tiles: [
      'TTTTTTTTTTTTTTTTTTTT',
      'T..,,.......BBBBB..T',
      'T...........B...B..T',
      'T......,....BBBBB..T',
      'T.RR...............T',
      'P...........RR.....T',
      'P..................T',
      'T....,,......f.....T',
      'T.f.......RR.......T',
      'T........,PP,......T',
      'T...,....,PP,..,...T',
      'TTTTTTTTTPPTTTTTTTTT',
    ],
    chests: [{ id: 'ow_mead_chest_bluff', x: 14, y: 2, contents: { gems: 20 } }],
    enemies: [
      { type: 'redSlime', x: 6, y: 8 },
      { type: 'slime', x: 15, y: 7 },
    ],
  },

  // ---- (3,3) Forest Gate — gateway W to forest (2,3) ---------------------
  '3,3': {
    biome: 'meadows',
    tiles: [
      'TTTTTTTTTPPTTTTTTTTT',
      'TT....,..PP..,....TT',
      'TT.f.....PP.....f.TT',
      'T........PP........T',
      'TT..,....PP....,..TT',
      'P........PP........P',
      'PPPPPPPPPPPPPPPPPPPP',
      'TT...,...PP...,...TT',
      'T..f.....PP.....f..T',
      'TT.......PP.......TT',
      'TT..,....PP....,..TT',
      'TTTTTTTTTPPTTTTTTTTT',
    ],
    enemies: [
      { type: 'slime', x: 5, y: 3 },
      { type: 'redSlime', x: 14, y: 8 },
    ],
  },

  // ---- (4,3) Willow Village West — spawn room; elder + pip houses --------
  '4,3': {
    biome: 'meadows',
    safe: true,
    tiles: [
      'TTTTTTTTTPPTTTTTTTTT',
      'Tf..f....PP....f..fT',
      'T.HHHHH..PP..HHHHH.T',
      'T.HHHHH..PP..HHHHH.T',
      'T.HHDHH..PP..HHDHH.P',
      'P...P....PP....P...P',
      'PPPPPPPPPPPPPPPPPPPP',
      'T.f.f....PP....f.f.P',
      'T.......PPPP.......T',
      'T..,,....PP....,,..T',
      'Tf......fPPf......fT',
      'TTTTTTTTTPPTTTTTTTTT',
    ],
    warps: [
      { x: 4, y: 4, to: { map: 'interiors', room: 'elder_house', x: 10, y: 10 } },
      { x: 15, y: 4, to: { map: 'interiors', room: 'pip_house', x: 10, y: 10 } },
    ],
    npcs: [{ id: 'kid_pip', art: 'kid', x: 12, y: 8 }],
    signs: [{ id: 'sign_village_square', x: 7, y: 8 }],
    pots: [{ x: 2, y: 8 }, { x: 17, y: 8 }],
  },

  // ---- (5,3) Willow Village East — shop, pond, Ana -----------------------
  '5,3': {
    biome: 'meadows',
    safe: true,
    tiles: [
      'TTTTTTTTTPPTTTTTTTTT',
      'Tf...f...PP...f...fT',
      'T........PP.HHHHHH.T',
      'T..FF....PP.HHHHHH.T',
      'P..FF....PP.HHDHHH.T',
      'P........PP...P....P',
      'PPPPPPPPPPPPPPPPPPPP',
      'P...f....PP....f...T',
      'T..WWW...PP........T',
      'T..WWW...PP...,,,..T',
      'Tf.......PP....,..fT',
      'TTTTTTTTTPPTTTTTTTTT',
    ],
    warps: [
      { x: 14, y: 4, to: { map: 'interiors', room: 'village_shop', x: 10, y: 10 } },
    ],
    npcs: [{ id: 'villager_ana', art: 'villager', x: 6, y: 8 }],
    signs: [{ id: 'sign_village_shop', x: 12, y: 5 }],
    pots: [{ x: 17, y: 8 }, { x: 17, y: 9 }],
  },

  // ---- (6,3) Lake Road — gateway E to lake (7,3) -------------------------
  '6,3': {
    biome: 'meadows',
    tiles: [
      'TTTTTTTTTPPTTTTTTTTT',
      'T........PP.....WWWT',
      'T..f.....PP......WWT',
      'T........PP.......WT',
      'T.,......PP,.......T',
      'P........PPPPPPPPPPP',
      'PPPPPPPPPPPPPPPPPPPP',
      'T...,....PP....,...T',
      'T.f......PP......f.T',
      'T........PP.....WWWT',
      'T..,.....PP.....WWWT',
      'TTTTTTTTTPPTTTTTTTTT',
    ],
    enemies: [
      { type: 'slime', x: 5, y: 8 },
      { type: 'slime', x: 14, y: 7 },
    ],
  },

  // ---- (3,4) Boulder Rock — cracked boulder X at (4,3): bomb -> stairs ---
  '3,4': {
    biome: 'meadows',
    tiles: [
      'TTTTTTTTTPPTTTTTTTTT',
      'T...,....PP....,...T',
      'T..RRR...PP........T',
      'T..RXR...PP...RR...T',
      'T..R.R...PP........T',
      'T................,.P',
      'T..,...........,...P',
      'T...,....PP....RR..T',
      'T..f.....PP........T',
      'T........PP...,,...T',
      'T...,....PP....,...T',
      'TTTTTTTTTPPTTTTTTTTT',
    ],
    warps: [
      { x: 4, y: 3, hidden: 'bomb',
        to: { map: 'interiors', room: 'cave_meadow_gems', x: 10, y: 10 } },
    ],
    enemies: [
      { type: 'redSlime', x: 14, y: 8 },
      { type: 'slime', x: 6, y: 9 },
    ],
  },

  // ---- (4,4) Crossroads — paths meet; signpost ---------------------------
  '4,4': {
    biome: 'meadows',
    tiles: [
      'TTTTTTTTTPPTTTTTTTTT',
      'T...f....PP....f...T',
      'T.,......PP......,.T',
      'T........PP........T',
      'T..ff....PP....ff..T',
      'P........PP........P',
      'PPPPPPPPPPPPPPPPPPPP',
      'T...,....PP....,...T',
      'T.f......PP......f.T',
      'T........PP........T',
      'T..,.....PP.....,..T',
      'TTTTTTTTTPPTTTTTTTTT',
    ],
    signs: [{ id: 'sign_crossroads', x: 12, y: 5 }],
    enemies: [
      { type: 'slime', x: 5, y: 3 },
      { type: 'slime', x: 15, y: 9 },
    ],
  },

  // ---- (5,4) South Meadow — tall grass sea (S edge sealed vs desert) -----
  '5,4': {
    biome: 'meadows',
    tiles: [
      'TTTTTTTTTPPTTTTTTTTT',
      'T,,......PP......,,T',
      'T,,,.....PP.....,,,T',
      'T..,,....PP....,,..T',
      'T...f....PP....f...T',
      'P........PP........P',
      '....................',
      'T..,,,.......,,,...T',
      'T.,,,,,....,,,,,...T',
      'T..,,,..f...,,,....T',
      'T....,........,....T',
      'TTTTTTTTTTTTTTTTTTTT',
    ],
    enemies: [
      { type: 'redSlime', x: 5, y: 8 },
      { type: 'redSlime', x: 14, y: 3 },
      { type: 'slime', x: 7, y: 9 },
    ],
  },

  // ---- (6,4) Dusty Gate — gateway S to desert (6,5); sand creeps in ------
  '6,4': {
    biome: 'meadows',
    tiles: [
      'TTTTTTTTTPPTTTTTTTTT',
      'T...,....PP....,...T',
      'T.RR.....PP.....RR.T',
      'T........PP........T',
      'T..,.....PP......s.T',
      'P........PP......ssT',
      'P........PP.....sssT',
      'T........PP....ssssT',
      'T..R.....PP...sssssT',
      'T....,...PP..sssss.T',
      'T........PP...ssss.T',
      'TTTTTTTTTPPTTTTTTTTT',
    ],
    enemies: [
      { type: 'redSlime', x: 5, y: 3 },
      { type: 'slime', x: 14, y: 8 },
    ],
  },

  // ---- (3,5) Joss Farm — fenced crop plots, farmer Joss ------------------
  '3,5': {
    biome: 'meadows',
    tiles: [
      'TTTTTTTTTPPTTTTTTTTT',
      'T........PP........T',
      'T.FFFFFF.PP.FFFFFF.T',
      'T.F,,,,F.PP.F,,,,F.T',
      'T.F,,,,F.PP.F,,,,F.T',
      'T.FF..FF.PP.FF..FF.P',
      'T..................P',
      'T.,......PP......,.T',
      'T..,,,,..PP..,,,,..T',
      'T..,,,,..PP..,,,,..T',
      'T........PP........T',
      'TTTTTTTTTPPTTTTTTTTT',
    ],
    npcs: [{ id: 'farmer_joss', art: 'farmer', x: 5, y: 7 }],
    signs: [{ id: 'sign_farm', x: 12, y: 7 }],
    enemies: [{ type: 'slime', x: 16, y: 10 }],
  },

  // ---- (4,5) Wheat Fields — crop rows with scarecrow statues -------------
  '4,5': {
    biome: 'meadows',
    tiles: [
      'TTTTTTTTTPPTTTTTTTTT',
      'T,,,,....PP....,,,,T',
      'T,,,,,...PP...,,,,,T',
      'T,,A,,...PP...,,A,,T',
      'T,,,,,...PP...,,,,,T',
      'P........PP........T',
      'P........PP........T',
      'T..,,,...PP...,,,..T',
      'T.,,,,...PP...,,,,.T',
      'T.,,,....PP....,,,.T',
      'T........PP........T',
      'TTTTTTTTTPPTTTTTTTTT',
    ],
    enemies: [
      { type: 'slime', x: 5, y: 8 },
      { type: 'slime', x: 15, y: 9 },
    ],
  },

  // ---- (3,6) Marsh Edge — gateway W to swamp (2,6); wet ground -----------
  '3,6': {
    biome: 'meadows',
    tiles: [
      'TTTTTTTTTPPTTTTTTTTT',
      'T..,.....PP......,.T',
      'T.ww,....PP....,...T',
      'T.www....PP........T',
      'T..w.....PP..,,....T',
      'P........PP........P',
      'PPPPPPPPPPPPPPPPPPPP',
      'T...,....PP.....w..T',
      'T.,......PP....www.T',
      'T........PP....www.T',
      'T..,.....PP.....w..T',
      'TTTTTTTTTPPTTTTTTTTT',
    ],
    enemies: [
      { type: 'redSlime', x: 5, y: 8 },
      { type: 'slime', x: 14, y: 3 },
    ],
  },

  // ---- (4,6) Dry Gate — gateway E to desert (5,6); first cactus! ---------
  '4,6': {
    biome: 'meadows',
    tiles: [
      'TTTTTTTTTPPTTTTTTTTT',
      'T...,....PP....s...T',
      'T.R......PP.....ss.T',
      'T........PP....sss.T',
      'T..,.....PP...ssss.T',
      'P........PP..sssssss',
      'PPPPPPPPPPPPPsssssss',
      'T...,....PP...ssss.T',
      'T.,......PP....sss.T',
      'T..f.....PP.....Y..T',
      'T........PP....s...T',
      'TTTTTTTTTPPTTTTTTTTT',
    ],
    enemies: [
      { type: 'redSlime', x: 5, y: 3 },
      { type: 'redSlime', x: 15, y: 7 },
    ],
  },

  // ---- (3,7) South Hollow — bush-ringed gem chest, wild grass ------------
  '3,7': {
    biome: 'meadows',
    tiles: [
      'TTTTTTTTTPPTTTTTTTTT',
      'T...,....PP....,...T',
      'T.BBB....PP........T',
      'T.B.B....PP...RR...T',
      'T.BBB....PP........T',
      'T........PP......,.P',
      'T..,.....PP........P',
      'T........PP....,,..T',
      'T.,,.....PP........T',
      'T,,,,....PP...,,,..T',
      'T..,.....PP....,...T',
      'TTTTTTTTTTTTTTTTTTTT',
    ],
    chests: [{ id: 'ow_mead_chest_hollow', x: 3, y: 3, contents: { gems: 20 } }],
    enemies: [
      { type: 'redSlime', x: 14, y: 8 },
      { type: 'slime', x: 6, y: 9 },
    ],
  },

  // ---- (4,7) Old Orchard — tree rows; golden acorn #2 in bush pocket -----
  '4,7': {
    biome: 'meadows',
    tiles: [
      'TTTTTTTTTPPTTTTTTTTT',
      'T........PP........T',
      'T.T..T...PP...T..T.T',
      'T........PP........T',
      'T.T..T...PP...T..T.T',
      'P........PP........T',
      'P........PP........T',
      'T.T..T...PP...T..T.T',
      'T........PP.....BBBT',
      'T..,.....PP.....B..T',
      'T...,....PP.....BBBT',
      'TTTTTTTTTTTTTTTTTTTT',
    ],
    pickups: [{ x: 18, y: 9, item: 'acorn', id: 'ow_mead_acorn2' }],
    enemies: [
      { type: 'redSlime', x: 5, y: 5 },
      { type: 'slime', x: 13, y: 3 },
    ],
  },

});
