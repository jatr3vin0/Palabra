// ============================================================================
// THE ASHEN WASTES — end-game region (cols 6-9, rows 0-1). 8 rooms.
// Ash ground (e), dead trees (T), lava pools (L), rubble (R), charred cliffs
// (M) as the solid borders. Hardest overworld enemies: knight, wizard,
// skeleton, bat. No acorns here.
//
// Layout / connectivity (all other edges sealed, incl. world border):
//   (6,0) pot/gem cache   — E y5,6 -> (7,0); S x9,10 -> (6,1)
//   (7,0) scorched cross  — W y5,6 <- (6,0); E y5,6 -> (8,0); S x9,10 -> (7,1)
//   (8,0) DARK CITADEL    — W y5,6 <- (7,0); E y5,6 -> (9,0); S sealed
//   (9,0) ember boneyard  — W y5,6 <- (8,0); S x9,10 -> (9,1)
//   (6,1) BARRIER gateway — W y5,6 <- mountains (5,1) into a walled pocket
//         sealed by barrier entities at x=4 (engine removes with 3 shards);
//         N x9,10 -> (6,0); E y5,6 -> (7,1)
//   (7,1) ash flats       — N x9,10 -> (7,0); E y5,6 -> (8,1)
//   (8,1) statue gauntlet — E y5,6 -> (9,1); onClear gem chest
//   (9,1) lava river      — N x9,10 -> (9,0); east bank only via bridge
// ============================================================================

Object.assign(WORLD.maps.overworld.rooms, {

  // --- (6,0) NW corner: ruined vault stuffed with pots + a gem chest -------
  '6,0': {
    biome: 'wastes',
    tiles: [
      'MMMMMMMMMMMMMMMMMMMM',
      'MeeeeeeeeeeeeeeTeeeM',
      'Me#######eeeeeReeeeM',
      'Me#OeeeO#eeeeeeeeTeM',
      'Me#OeeeO#eeLLeeeeeeM',
      'Me#OeeeO#eeeeeReeeee',
      'Me###e###eeeeeeeeeee',
      'MeeeeeeeeeTeeeeeLLeM',
      'MeRee,eeeeeeeeeeLLeM',
      'MeeeeeeeeeeeeReeeeeM',
      'MTeeeeeeeeeeeeeeeTeM',
      'MMMMMMMMMeeMMMMMMMMM',
    ],
    chests: [
      { id: 'ow_wastes_gemcache', x: 5, y: 3, contents: { gems: 50 } },
    ],
    enemies: [
      { type: 'knight',   x: 5,  y: 8 },   // guards the vault gap
      { type: 'skeleton', x: 12, y: 8 },
      { type: 'bat',      x: 15, y: 3 },
    ],
  },

  // --- (7,0) scorched crossroads: lava channels, dead forest ---------------
  '7,0': {
    biome: 'wastes',
    tiles: [
      'MMMMMMMMMMMMMMMMMMMM',
      'MeeTeeeeeeeeeeeeTeeM',
      'MeeeeeLLLeeeeeeeeeeM',
      'MeReeeLLLeeeeReeeTeM',
      'MeeeeeeLeeeeeeeeeeeM',
      'eeeeTeeeeeeeeeee,eee',
      'eeeeeeeeeee,eeeeeeee',
      'MeeLLeeeeeeeeeeReeeM',
      'MeeLLeeeeeeeeeeeeTeM',
      'MeeeeeeeReeeeeeeeeeM',
      'MTeeeeeeeeeeeeeeeeTM',
      'MMMMMMMMMeeMMMMMMMMM',
    ],
    pots: [
      { x: 2, y: 9 }, { x: 17, y: 9 },
    ],
    enemies: [
      { type: 'wizard',   x: 10, y: 3 },
      { type: 'knight',   x: 6,  y: 8 },
      { type: 'skeleton', x: 14, y: 9 },
      { type: 'bat',      x: 4,  y: 2 },
    ],
  },

  // --- (8,0) DARK CITADEL entrance: huge evil facade, lava moat ------------
  '8,0': {
    biome: 'wastes',
    tiles: [
      'MMMMMMMMMMMMMMMMMMMM',
      'Meeeee#########eeeeM',
      'Meeeee#AeeSeeA#eeeeM',
      'Meeeee#eeeeeee#eeeeM',
      'MeeLee###eee###eeLeM',
      'eeeeeeeeAeeeAeeeeeee',
      'eeeeeeeeeeeeeeeeeeee',
      'MeeLLeeeeeeeeeeLLeeM',
      'MeeLLeee,eeeeeeLLeeM',
      'MeeeeeeReeeeReeeeeeM',
      'MTeeTeeeeeeeeeeTeeTM',
      'MMMMMMMMMMMMMMMMMMMM',
    ],
    warps: [
      { x: 10, y: 2, to: { map: 'citadel', room: '1,3', x: 10, y: 10 } },
    ],
    signs: [
      { id: 'sign_citadel', x: 12, y: 6 },
    ],
    pots: [
      { x: 2, y: 6 }, { x: 17, y: 6 },
    ],
    enemies: [
      { type: 'knight', x: 9,  y: 7 },
      { type: 'knight', x: 11, y: 8 },
      { type: 'wizard', x: 10, y: 9 },
      { type: 'bat',    x: 5,  y: 6 },
    ],
  },

  // --- (9,0) NE corner: ember boneyard, bomb cache in a pot nook -----------
  '9,0': {
    biome: 'wastes',
    tiles: [
      'MMMMMMMMMMMMMMMMMMMM',
      'MeeeeReeeeeeeeReeeeM',
      'MeTeeeeeLLLeeeeeeTeM',
      'MeeeeeeeLLLeeeeeeeeM',
      'MeeReeeeeLeeeeeOOeeM',
      'eeeeeeeeeeeeeeeOeeeM',
      'eeeeeeee,eeeeeeeeeeM',
      'MeeeLLeeeeeeeReeeeeM',
      'MeeeLLeeeeeeeeeeTeeM',
      'MeReeeeeeeeeeeeeeeeM',
      'MTeeeeeeeeeeeeeeReTM',
      'MMMMMMMMMeeMMMMMMMMM',
    ],
    chests: [
      { id: 'ow_wastes_bombcache', x: 16, y: 3, contents: { bombs: 5 } },
    ],
    enemies: [
      { type: 'wizard',   x: 10, y: 4 },
      { type: 'knight',   x: 14, y: 6 },   // guards the pot nook
      { type: 'skeleton', x: 6,  y: 9 },
      { type: 'skeleton', x: 12, y: 8 },
      { type: 'bat',      x: 7,  y: 7 },
    ],
  },

  // --- (6,1) western gateway: shard BARRIER seals the walled entry pocket --
  // Mountains gateway enters at x=0, y=5,6 into a pocket (x1-3, y4-7).
  // Barrier entities at (4,5),(4,6) block the only way east until 3 shards.
  '6,1': {
    biome: 'wastes',
    tiles: [
      'MMMMMMMMMeeMMMMMMMMM',
      'MeeeeeeeeeeeeTeeReeM',
      'MeReeeeLLeeeeeeeeTeM',
      'MMMMMeeLLeeeeReeeeeM',
      'MeeeMeeeeeeTeeeeReeM',
      'eeeeeeeeeeeeeeeeeeee',
      'eeeeeee,eeeee,eeeeee',
      'MeeeMeeLLeeeeeeeTeeM',
      'MMMMMeeLLeeeReeeeeeM',
      'MeeeeeeeeeeTeeeeReeM',
      'MeTeeeeeeeeeeeeeeTeM',
      'MMMMMMMMMMMMMMMMMMMM',
    ],
    barrier: [
      { x: 4, y: 5 }, { x: 4, y: 6 },
    ],
    signs: [
      { id: 'sign_barrier', x: 3, y: 4 },  // in the pocket, beside the barrier
    ],
    enemies: [
      { type: 'knight',   x: 10, y: 9 },
      { type: 'wizard',   x: 14, y: 3 },
      { type: 'skeleton', x: 8,  y: 9 },
      { type: 'skeleton', x: 6,  y: 2 },
      { type: 'bat',      x: 15, y: 7 },
    ],
  },

  // --- (7,1) ash flats: open killing field under the crossroads ------------
  '7,1': {
    biome: 'wastes',
    tiles: [
      'MMMMMMMMMeeMMMMMMMMM',
      'MeeeeTeeeeeeeeTeeeeM',
      'MeeeeeeeeeeLLeeeeReM',
      'MeReeeeeeeeLLeeeeeeM',
      'MeeeeLeeeeeeLeeTeeeM',
      'eeeee,eeeeeeeeeeeeee',
      'eeeeeeeeeeee,eeeeeee',
      'MeeTeeeeeeeeeeeeLLeM',
      'MeeeeeeRReeeeeeeLLeM',
      'Me,eeeeeeeeeeReeeeeM',
      'MTeeTeeeeeeeeeeTeeTM',
      'MMMMMMMMMMMMMMMMMMMM',
    ],
    enemies: [
      { type: 'knight',   x: 10, y: 8 },
      { type: 'wizard',   x: 6,  y: 3 },
      { type: 'skeleton', x: 14, y: 7 },
      { type: 'skeleton', x: 4,  y: 8 },
      { type: 'bat',      x: 16, y: 2 },
    ],
  },

  // --- (8,1) statue gauntlet: clear every foe for a gem chest --------------
  '8,1': {
    biome: 'wastes',
    tiles: [
      'MMMMMMMMMMMMMMMMMMMM',
      'MeeeeeeReeeeeeeeeeTM',
      'MeeLLLeeeeeeeeAeeeeM',
      'MeeLLLLeeeeeeeeeeReM',
      'MeeeLLeeeAeeAeeeeeeM',
      'eeeeeeeeee,eeeeeeeee',
      'eeeeeeeeeeeeeeeeeeee',
      'MeeeeeeeeAeeAeeLLeeM',
      'MeReeeeeeeeeeeeLLLeM',
      'MeeeeTeeeeeeeeeeLLeM',
      'MTeTeeeeeeeeeeeeeTeM',
      'MMMMMMMMMMMMMMMMMMMM',
    ],
    enemies: [
      { type: 'knight',   x: 10, y: 4 },
      { type: 'knight',   x: 11, y: 7 },
      { type: 'wizard',   x: 10, y: 9 },
      { type: 'skeleton', x: 4,  y: 7 },
      { type: 'bat',      x: 16, y: 4 },
    ],
    onClear: {
      chest: { id: 'ow_wastes_gauntlet', x: 11, y: 6, contents: { gems: 20 } },
    },
  },

  // --- (9,1) SE corner: lava river, lone bridge to a pot-rich east bank ----
  '9,1': {
    biome: 'wastes',
    tiles: [
      'MMMMMMMMMeeMMMMMMMMM',
      'MeeeeTeeeeeeLLeeeeeM',
      'MeeeeeeeeeeeLLLeeReM',
      'MeReeeeeeeeeLLLeeeeM',
      'MeeeeeeOeeeeeLLeeeeM',
      'eeeeeeeeeeeeebbeeeeM',
      'eeeeeeeeeeeeeLLeeeeM',
      'MeeeeRee,eeeeLLeeeeM',
      'MeeeeeeeeeeeeLLLeeeM',
      'MeTeeeeeeReeeeLLeeeM',
      'MTeeeeeeeeeeeeLLeTeM',
      'MMMMMMMMMMMMMMMMMMMM',
    ],
    pots: [
      { x: 16, y: 3 }, { x: 17, y: 4 }, { x: 16, y: 8 },
    ],
    enemies: [
      { type: 'knight',   x: 8,  y: 6 },
      { type: 'wizard',   x: 16, y: 6 },   // haunts the east bank
      { type: 'skeleton', x: 6,  y: 8 },
      { type: 'skeleton', x: 10, y: 2 },
      { type: 'bat',      x: 4,  y: 9 },
    ],
  },

});
