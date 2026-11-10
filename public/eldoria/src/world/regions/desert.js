// ============================================================================
// DESERT region — "The Shattered Crown" overworld, cols 5-9 x rows 5-7 (15 rooms)
// Dunes ('s'), cactus hazards ('Y'), rocks ('R'), scattered ruins ('#'/'A').
//
// Highlights:
//  - (5,5) Nomad tent: 'D' door warp -> interiors 'nomad_tent'
//  - (6,6) Oasis: water + palms, 'S' stairs -> interiors 'fairy_pond_desert' (safe room)
//  - (8,6) D2 Sandstone Ruins facade: 'S' warp -> dungeon2 '1,2' sits in an alcove
//          behind a 'sealed' door opened by an 'eye' switch (Bow required)
//  - (9,7) cracked boulder 'X' -> interiors 'cave_desert_heart' (Heart Container)
//  - 2 golden acorns: cactus maze in (9,5), rock pocket in (5,7)
//
// Gateways honored EXACTLY (all other cross-region edges + world border sealed):
//  - meadows (4,6) E <-> desert (5,6) W   open y=5,6
//  - meadows (6,4) S <-> desert (6,5) N   open x=9,10
//  - lake    (8,4) S <-> desert (8,5) N   open x=9,10
// ============================================================================

Object.assign(WORLD.maps.overworld.rooms, {

  // --------------------------------------------------------------- (5,5)
  // Nomad camp. Tent (H walls, D door) -> interiors 'nomad_tent'.
  // N sealed (meadows 5,4), W sealed (meadows 4,5), E + S open.
  '5,5': {
    biome: 'desert',
    tiles: [
      'RRRRRRRRRRRRRRRRRRRR',
      'RssssssssssssssssssR',
      'RsssHHHHHssssYsssssR',
      'RsssHHHHHssssssssssR',
      'RsssHHDHHssssssssssR',
      'RssssssssssssssYssss',
      'Rsssssssssssssssssss',
      'RssRRssssssssssssssR',
      'RsssssssssssssssYssR',
      'Rss,,ssssssssssssssR',
      'RssssssssssssssssssR',
      'RRRRRRRRRssRRRRRRRRR',
    ],
    warps: [
      { x: 6, y: 4, to: { map: 'interiors', room: 'nomad_tent', x: 10, y: 9 } },
    ],
    pots: [{ x: 2, y: 7 }, { x: 9, y: 3 }],
    enemies: [
      { type: 'scarab', x: 14, y: 8 },
      { type: 'spitter', x: 5, y: 9 },
    ],
  },

  // --------------------------------------------------------------- (6,5)
  // Gateway dunes: N opening to meadows (6,4) at x=9,10. All edges open.
  '6,5': {
    biome: 'desert',
    tiles: [
      'RRRRRRRRRssRRRRRRRRR',
      'RssssssssssssssssssR',
      'RssssYssssssssRssssR',
      'RssssssssssssssssssR',
      'RssRRssssssssssssssR',
      'ssssssssssssssssssss',
      'ssssssssssssssssssss',
      'RsssssYssssssssssssR',
      'RsssssssssssssYssssR',
      'Rss,,ssssssssssssssR',
      'RssssssssssssssssssR',
      'RRRRRRRRRssRRRRRRRRR',
    ],
    enemies: [
      { type: 'scarab', x: 5, y: 3 },
      { type: 'spitter', x: 14, y: 9 },
      { type: 'scarab', x: 12, y: 7 },
    ],
  },

  // --------------------------------------------------------------- (7,5)
  // Broken ruin walls; a chest of arrows to help with the D2 eye switch.
  // N sealed (lake 7,4); W/E/S open.
  '7,5': {
    biome: 'desert',
    tiles: [
      'RRRRRRRRRRRRRRRRRRRR',
      'RssssssssssssssssssR',
      'Rss##A##sssssssssssR',
      'Rss#ssssssssss##sssR',
      'Rss#ssssssssss#ssssR',
      'ssss#sssssssss#sssss',
      'ssssssssssssssssssss',
      'RsssYssssssssssYsssR',
      'RssssssssssssssssssR',
      'RssssssRRssssssssssR',
      'RssssssssssssssssssR',
      'RRRRRRRRRssRRRRRRRRR',
    ],
    chests: [
      { id: 'ow_des_chest_arrows', x: 10, y: 3, contents: { arrows: 10 } },
    ],
    enemies: [
      { type: 'skeleton', x: 6, y: 8 },
      { type: 'skeletonArcher', x: 13, y: 4 },
      { type: 'spitter', x: 16, y: 9 },
    ],
  },

  // --------------------------------------------------------------- (8,5)
  // Gateway dunes: N opening to lake (8,4) at x=9,10.
  // S sealed (the D2 facade fills the room below); W/E open.
  '8,5': {
    biome: 'desert',
    tiles: [
      'RRRRRRRRRssRRRRRRRRR',
      'RssssssssssssssssssR',
      'RssYssssssssssssYssR',
      'RssssssssssssssssssR',
      'RssssssRsssssssssssR',
      'ssssssssssssssssssss',
      'ssssssssssssssssssss',
      'RssssssssssssssssssR',
      'Rsss,,sssssssssssssR',
      'RsssssssssssssYssssR',
      'RssssssssssssssssssR',
      'RRRRRRRRRRRRRRRRRRRR',
    ],
    enemies: [
      { type: 'skeletonArcher', x: 5, y: 8 },
      { type: 'scarab', x: 14, y: 3 },
      { type: 'spitter', x: 9, y: 9 },
    ],
  },

  // --------------------------------------------------------------- (9,5)
  // Cactus maze hiding golden acorn #1. N sealed (lake 9,4), E sealed
  // (world border); W/S open.
  '9,5': {
    biome: 'desert',
    tiles: [
      'RRRRRRRRRRRRRRRRRRRR',
      'RssssssssssssssssssR',
      'RssssssssYYYYYYssssR',
      'RssssssssYssssYssssR',
      'RssssssssYYssYYssssR',
      'sssssssssssssssssssR',
      'sssssssssssssssssssR',
      'RssRRssssssssssssssR',
      'RssssssssssssssssssR',
      'RsssssYssssssssssssR',
      'RssssssssssssssssssR',
      'RRRRRRRRRssRRRRRRRRR',
    ],
    pickups: [
      { x: 10, y: 3, item: 'acorn', id: 'ow_acorn_desert1' },
    ],
    enemies: [
      { type: 'skeleton', x: 4, y: 8 },
      { type: 'skeletonArcher', x: 15, y: 7 },
      { type: 'scarab', x: 6, y: 3 },
    ],
  },

  // --------------------------------------------------------------- (5,6)
  // Western gateway room: W opening to meadows (4,6) at y=5,6.
  // sign_desert_edge greets travelers. All four edges open.
  '5,6': {
    biome: 'desert',
    tiles: [
      'RRRRRRRRRssRRRRRRRRR',
      'RssssssssssssssssssR',
      'RssssRsssssssssssssR',
      'RsssssssssssssYssssR',
      'RssssssssssssssssssR',
      'ssssssssssssssssssss',
      'ssssssssssssssssssss',
      'RssssssssssssssssssR',
      'RssYsssssssssssssssR',
      'Rsssssssss,,sssssssR',
      'RssssssssssssssssssR',
      'RRRRRRRRRssRRRRRRRRR',
    ],
    signs: [{ id: 'sign_desert_edge', x: 2, y: 4 }],
    enemies: [
      { type: 'scarab', x: 13, y: 8 },
      { type: 'spitter', x: 16, y: 3 },
    ],
  },

  // --------------------------------------------------------------- (6,6)
  // The Oasis: palm-ringed pool, stairs down to the desert fairy pond.
  // Safe room — no enemies ever. All four edges open.
  '6,6': {
    biome: 'desert',
    safe: true,
    tiles: [
      'RRRRRRRRRssRRRRRRRRR',
      'RssssssssssssssssssR',
      'RsssTssssssssssTsssR',
      'RssssssTsSsTsssssssR',
      'RssssssssssssssssssR',
      'sssssssWWWWWWsssssss',
      'sssssssWWWWWWsssssss',
      'RssssssWWWWWWssssssR',
      'RssssssssssssssssssR',
      'RsssTssssssssssTsssR',
      'RssssssssssssssssssR',
      'RRRRRRRRRssRRRRRRRRR',
    ],
    warps: [
      { x: 9, y: 3, to: { map: 'interiors', room: 'fairy_pond_desert', x: 10, y: 9 } },
    ],
    signs: [{ id: 'sign_oasis', x: 12, y: 4 }],
    pots: [{ x: 3, y: 9 }, { x: 16, y: 9 }],
  },

  // --------------------------------------------------------------- (7,6)
  // Crossroads dunes with crumbled ruin chunks. Mummy country begins.
  // All four edges open.
  '7,6': {
    biome: 'desert',
    tiles: [
      'RRRRRRRRRssRRRRRRRRR',
      'RssssssssssssssssssR',
      'Rss#A#sssssssssssssR',
      'Rsssssssssssssss##sR',
      'RssssssssssssssssssR',
      'ssssssssssssssssssss',
      'ssssssssssssssssssss',
      'RssssYsssssssssssssR',
      'RssssssssssssRRssssR',
      'RssssssssssssssssssR',
      'Rss,,ssssssssssssssR',
      'RRRRRRRRRssRRRRRRRRR',
    ],
    enemies: [
      { type: 'mummy', x: 10, y: 8 },
      { type: 'skeleton', x: 5, y: 3 },
      { type: 'spitter', x: 15, y: 9 },
      { type: 'skeletonArcher', x: 8, y: 2 },
    ],
  },

  // --------------------------------------------------------------- (8,6)
  // D2 SANDSTONE RUINS entrance. Grand facade; the stairs alcove (S at 10,2)
  // is blocked by a sealed door (10,4) that opens when the eye switch
  // between the statues (13,5) is shot with an arrow (Bow required).
  // N sealed; W/E/S open.
  '8,6': {
    biome: 'desert',
    tiles: [
      'RRRRRRRRRRRRRRRRRRRR',
      'Rss###############sR',
      'Rss######sSs######sR',
      'Rss######sss######sR',
      'Rss###############sR',
      'ssssssssssssAsAsssss',
      'ssssssssssssssssssss',
      'RsssYssssssssssssssR',
      'RsssssssssssssssssYR',
      'RssssssssssssssssssR',
      'RssRRssssssssssssssR',
      'RRRRRRRRRssRRRRRRRRR',
    ],
    warps: [
      { x: 10, y: 2, to: { map: 'dungeon2', room: '1,2', x: 10, y: 10 } },
    ],
    switches: [
      { id: 'ow_des_d2_eye', x: 13, y: 5, kind: 'eye' },
    ],
    doors: [
      { id: 'ow_des_d2_door', x: 10, y: 4, dir: 'S', kind: 'sealed',
        opens: { switches: ['ow_des_d2_eye'], persist: true } },
    ],
    signs: [{ id: 'sign_d2_entrance', x: 7, y: 5 }],
    enemies: [
      { type: 'skeleton', x: 5, y: 8 },
      { type: 'skeletonArcher', x: 15, y: 9 },
      { type: 'mummy', x: 8, y: 9 },
    ],
  },

  // --------------------------------------------------------------- (9,6)
  // Rocky hollow with a gem cache pocket (enter from the south gap).
  // E sealed (world border); N/W/S open.
  '9,6': {
    biome: 'desert',
    tiles: [
      'RRRRRRRRRssRRRRRRRRR',
      'RssssssssssssssssssR',
      'RssssssssssssRRRRssR',
      'RssssssssssssRssRssR',
      'RssssssssssssRsRRssR',
      'sssssssssssssssssssR',
      'sssssssssssssssssssR',
      'RssssYYssssssssssssR',
      'RssssssssssssssssssR',
      'RssssssssssssssRRssR',
      'RssssssssssssssssssR',
      'RRRRRRRRRssRRRRRRRRR',
    ],
    chests: [
      { id: 'ow_des_chest_gems', x: 14, y: 3, contents: { gems: 50 } },
    ],
    enemies: [
      { type: 'mummy', x: 8, y: 7 },
      { type: 'skeletonArcher', x: 4, y: 9 },
      { type: 'scarab', x: 10, y: 5 },
    ],
  },

  // --------------------------------------------------------------- (5,7)
  // Southern dunes; rock pocket hides golden acorn #2 (slip in via the gap
  // at 4,4). W sealed (meadows 4,7), S sealed (world border); N/E open.
  '5,7': {
    biome: 'desert',
    tiles: [
      'RRRRRRRRRssRRRRRRRRR',
      'RssssssssssssssssssR',
      'RssRRRsssssssssssssR',
      'RssRsRssssssss,,sssR',
      'RssRsRsssssssssssssR',
      'Rsssssssssssssssssss',
      'Rsssssssssssssssssss',
      'RsssssssYssssssssssR',
      'Rss,,ssssssssssssssR',
      'RsssssssssssssYssssR',
      'RssssssssssssssssssR',
      'RRRRRRRRRRRRRRRRRRRR',
    ],
    pickups: [
      { x: 4, y: 3, item: 'acorn', id: 'ow_acorn_desert2' },
    ],
    enemies: [
      { type: 'spitter', x: 12, y: 8 },
      { type: 'scarab', x: 6, y: 9 },
      { type: 'skeleton', x: 15, y: 5 },
    ],
  },

  // --------------------------------------------------------------- (6,7)
  // Ruined plaza with pots among the rubble. S sealed (world border);
  // N/W/E open.
  '6,7': {
    biome: 'desert',
    tiles: [
      'RRRRRRRRRssRRRRRRRRR',
      'RssssssssssssssssssR',
      'Rsss##ss##sssssssssR',
      'RsssssssssssssssAssR',
      'RssssssssssssssssssR',
      'ssssssssssssssssssss',
      'ssssssssssssssssssss',
      'RssssssssYsssssssssR',
      'RssssssssssssssssssR',
      'RssssRRsssssssss,,sR',
      'RssssssssssssssssssR',
      'RRRRRRRRRRRRRRRRRRRR',
    ],
    pots: [{ x: 6, y: 2 }, { x: 7, y: 2 }],
    enemies: [
      { type: 'mummy', x: 12, y: 7 },
      { type: 'skeleton', x: 4, y: 8 },
      { type: 'spitter', x: 15, y: 3 },
    ],
  },

  // --------------------------------------------------------------- (7,7)
  // Sunken courtyard between statue gates — a little gauntlet. Clearing it
  // conjures a bonus gem chest. S sealed (world border); N/W/E open.
  '7,7': {
    biome: 'desert',
    tiles: [
      'RRRRRRRRRssRRRRRRRRR',
      'RssssssssssssssssssR',
      'Rs#A#sssssssss#A#ssR',
      'RssssssssssssssssssR',
      'RssssssYssssYssssssR',
      'ssssssssssssssssssss',
      'ssssssssssssssssssss',
      'RssssssssssssssssssR',
      'Rss##sssssssssss##sR',
      'RssssssssssssssssssR',
      'Rs,,sssssssssssss,sR',
      'RRRRRRRRRRRRRRRRRRRR',
    ],
    pots: [{ x: 5, y: 2 }, { x: 13, y: 2 }],
    enemies: [
      { type: 'mummy', x: 10, y: 4 },
      { type: 'mummy', x: 6, y: 9 },
      { type: 'skeletonArcher', x: 14, y: 3 },
      { type: 'scarab', x: 3, y: 6 },
    ],
    onClear: {
      chest: { id: 'ow_des_chest_bonus', x: 10, y: 7, contents: { gems: 20 } },
    },
  },

  // --------------------------------------------------------------- (8,7)
  // Windswept flats below the ruins; skeleton patrols. S sealed (world
  // border); N/W/E open.
  '8,7': {
    biome: 'desert',
    tiles: [
      'RRRRRRRRRssRRRRRRRRR',
      'RssssssssssssssssssR',
      'RsssssssssssssssYssR',
      'RssRRssssssssssssssR',
      'RssssssssssssssssssR',
      'ssssssssssssssssssss',
      'ssssssssssssssssssss',
      'RssssssssYYssssssssR',
      'RssssssssssssssssssR',
      'Rssss,,ssssssssssssR',
      'RssssssssssssssssssR',
      'RRRRRRRRRRRRRRRRRRRR',
    ],
    enemies: [
      { type: 'skeleton', x: 5, y: 4 },
      { type: 'skeleton', x: 14, y: 8 },
      { type: 'skeletonArcher', x: 10, y: 3 },
      { type: 'spitter', x: 16, y: 9 },
    ],
  },

  // --------------------------------------------------------------- (9,7)
  // Far corner of the desert. A cracked boulder (15,3) hides stairs down to
  // cave_desert_heart (Heart Container) — bombs required. Mummies guard it.
  // E + S sealed (world border); N/W open.
  '9,7': {
    biome: 'desert',
    tiles: [
      'RRRRRRRRRssRRRRRRRRR',
      'RssssssssssssssssssR',
      'RssssssssssssRRRRRsR',
      'RssssssssssssRsXsRsR',
      'RssssssssssssRsssRsR',
      'sssssssssssssssssssR',
      'sssssssssssssssssssR',
      'RssYsssssssssssssssR',
      'RsssssssssYssssssssR',
      'Rss,,ssssssssssssssR',
      'RssssssssssssssssssR',
      'RRRRRRRRRRRRRRRRRRRR',
    ],
    warps: [
      { x: 15, y: 3, to: { map: 'interiors', room: 'cave_desert_heart', x: 10, y: 9 },
        hidden: 'bomb' },
    ],
    enemies: [
      { type: 'mummy', x: 8, y: 5 },
      { type: 'mummy', x: 13, y: 8 },
      { type: 'skeletonArcher', x: 5, y: 9 },
    ],
  },

});
