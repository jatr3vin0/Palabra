// THE canonical tile legend. Every map file authors rooms as arrays of
// 12 strings x 20 chars, where each char is one of the codes below.
// This file is the single source of truth — content files must not invent chars.
//
// Properties:
//   solid    – blocks movement
//   cut      – destroyed by sword (becomes `becomes` char); may reveal hidden warps
//   bomb     – destroyed by bomb (becomes `becomes` char); may reveal hidden warps
//   slide    – ice: player slides until hitting something
//   slow     – movement at 55% speed (shallow swamp water)
//   hazard   – damages on contact (half heart + knockback)
//   pit      – fall in: half heart, respawn at room entry
//   warpTile – usually paired with an entry in room.warps at the same x,y
window.TILES = {
  legend: {
    // ---- walkable ground ----
    '.': { name: 'grass' },
    ',': { name: 'tallgrass', cut: true, becomes: '.' },   // cuttable, may drop pickups
    'f': { name: 'flowers' },
    'P': { name: 'path' },
    's': { name: 'sand' },
    'n': { name: 'snow' },
    'e': { name: 'dirt' },        // cave / interior floor
    'd': { name: 'dfloor' },      // dungeon floor
    'b': { name: 'bridge' },
    'i': { name: 'ice', slide: true },
    'w': { name: 'shallow', slow: true },  // shallow water / swamp wade
    'g': { name: 'rug' },         // interior rug / fancy floor
    // ---- solid ----
    'T': { name: 'tree', solid: true },
    'R': { name: 'rock', solid: true },
    'W': { name: 'water', solid: true },
    'M': { name: 'mountain', solid: true },
    'H': { name: 'housewall', solid: true },
    '#': { name: 'wall', solid: true },     // dungeon / cave wall
    'F': { name: 'fence', solid: true },
    'Y': { name: 'cactus', solid: true, hazard: true },
    'I': { name: 'iceblock', solid: true },
    'A': { name: 'statue', solid: true },
    // ---- destructible ----
    'B': { name: 'bush', solid: true, cut: true, becomes: '.' },
    'C': { name: 'cracked', solid: true, bomb: true, becomes: 'd' },  // cracked dungeon/cave wall
    'X': { name: 'crackrock', solid: true, bomb: true, becomes: 'S' },// cracked boulder hiding stairs
    'O': { name: 'pot', solid: true, cut: true, becomes: 'd' },       // breakable pot, can drop pickups
    // ---- hazards ----
    'L': { name: 'lava', solid: true, hazard: true },
    '^': { name: 'spikes', hazard: true },
    'v': { name: 'pit', pit: true },
    // ---- warp tiles (pair with room.warps at same x,y) ----
    'S': { name: 'stairsdown', warpTile: true },
    'U': { name: 'stairsup', warpTile: true },
    'D': { name: 'doorway', warpTile: true },   // house / building door
  },

  get(ch) { return this.legend[ch] || this.legend['.']; },
  isSolid(ch) { return !!this.get(ch).solid; },
  known(ch) { return !!this.legend[ch]; },
};
