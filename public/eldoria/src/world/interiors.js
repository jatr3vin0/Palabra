// ---------------------------------------------------------------------------
// src/world/interiors.js — map `interiors` (kind: 'interior')
//
// Every room is an isolated 20x12 box. The player enters via an overworld
// warp and leaves by stepping back onto the D/U warp tile near the bottom.
//
// Entrance <-> return-warp pairing (overworld side verified against the
// region files; each return warp lands the player on the walkable tile
// directly SOUTH of the overworld entrance tile):
//
//   elder_house         <- overworld '4,3' D(4,4)   -> back to (4,5)
//   pip_house           <- overworld '4,3' D(15,4)  -> back to (15,5)
//   village_shop        <- overworld '5,3' D(14,4)  -> back to (14,5)
//   witch_hut           <- overworld '2,5' D(10,4)  -> back to (10,5)
//   hermit_cave         <- overworld '4,0' S(13,1)  -> back to (13,2)
//   nomad_tent          <- overworld '5,5' D(6,4)   -> back to (6,5)
//   fairy_pond_lake     <- overworld '9,2' S(9,3)   -> back to (9,4)
//   fairy_pond_desert   <- overworld '6,6' S(9,3)   -> back to (9,4)
//   cave_meadow_gems    <- overworld '3,4' X(4,3)   -> back to (4,4)
//   cave_forest_gems    <- overworld '2,4' X(9,3)   -> back to (9,4)
//   cave_mountain_heart <- overworld '0,0' X(3,3)   -> back to (3,4)
//   cave_desert_heart   <- overworld '9,7' X(15,3)  -> back to (15,4)
//   cave_lake_heart     <- overworld '7,4' B(9,8)   -> back to (9,10)
//     (lake heart: tile (9,9) directly south is a bush in the static map,
//      so the return lands one tile further south on open grass)
//
// Overworld arrival points inside these rooms:
//   meadows/forest/lake/mountains/swamp rooms arrive at (10,10); the
//   desert-authored rooms (nomad_tent, fairy_pond_desert, cave_desert_heart)
//   arrive at (10,9) — their return warp tile sits at (10,10) instead.
// ---------------------------------------------------------------------------

WORLD.maps.interiors = {
  kind: 'interior',
  rooms: {

    // ---- elder_house — Elder Rowan's study (Willow Village) ---------------
    elder_house: {
      isolated: true,
      safe: true,
      tiles: [
        'HHHHHHHHHHHHHHHHHHHH',
        'HeeeeeeeeeeeeeeeeeeH',
        'HeAeeeeeeeeeeeeeeAeH',
        'HeeegggggggggggggeeH',
        'HeeegggggggggggggeeH',
        'HeeegggggggggggggeeH',
        'HeeegggggggggggggeeH',
        'HeeegggggggggggggeeH',
        'HeeegggggggggggggeeH',
        'HeeeeeeeeeeeeeeeeeeH',
        'HeeeeeeeeeeeeeeeeeeH',
        'HHHHHHHHHHDHHHHHHHHH',
      ],
      npcs: [{ id: 'elder_rowan', art: 'elder', x: 10, y: 4 }],
      pots: [{ x: 2, y: 9 }, { x: 17, y: 9 }],
      warps: [
        { x: 10, y: 11, to: { map: 'overworld', room: '4,3', x: 4, y: 5 } },
      ],
    },

    // ---- pip_house — Pip's family cottage: two beds, big play rug ---------
    pip_house: {
      isolated: true,
      safe: true,
      tiles: [
        'HHHHHHHHHHHHHHHHHHHH',
        'HeeeeeeeeeeeeeeeeeeH',
        'HeHHeeeeeeeeeeeHHeeH',
        'HeHHeeeeeeeeeeeHHeeH',
        'HeeeeeggggggggeeeeeH',
        'HeeeeeggggggggeeeeeH',
        'HeeeeeggggggggeeeeeH',
        'HeeeeeggggggggeeeeeH',
        'HeeeeeeeeeeeeeeeeeeH',
        'HeeeeeeeeeeeeeeeeeeH',
        'HeeeeeeeeeeeeeeeeeeH',
        'HHHHHHHHHHDHHHHHHHHH',
      ],
      pots: [{ x: 2, y: 9 }, { x: 17, y: 9 }, { x: 5, y: 2 }],
      warps: [
        { x: 10, y: 11, to: { map: 'overworld', room: '4,3', x: 15, y: 5 } },
      ],
    },

    // ---- village_shop — Mira behind the counter, wares on the rug ---------
    village_shop: {
      isolated: true,
      safe: true,
      tiles: [
        'HHHHHHHHHHHHHHHHHHHH',
        'HeeeeeeeeeeeeeeeeeeH',
        'HeeeeeeeeeeeeeeeeeeH',
        'HeeHHHHHHHeHHHHHHeeH',
        'HeeeeeeeeeeeeeeeeeeH',
        'HeggggggggggggggggeH',
        'HeggggggggggggggggeH',
        'HeggggggggggggggggeH',
        'HeeeeeeeeeeeeeeeeeeH',
        'HeeeeeeeeeeeeeeeeeeH',
        'HeeeeeeeeeeeeeeeeeeH',
        'HHHHHHHHHHDHHHHHHHHH',
      ],
      npcs: [{ id: 'shopkeep_mira', art: 'shopkeep', x: 10, y: 2 }],
      shopItems: [
        { x: 4,  y: 6, item: 'potion',  price: 40 },
        { x: 8,  y: 6, item: 'arrows',  price: 20 },
        { x: 12, y: 6, item: 'bombs',   price: 25 },
        { x: 16, y: 6, item: 'lantern', price: 60 },
      ],
      pots: [{ x: 2, y: 10 }, { x: 17, y: 10 }],
      warps: [
        { x: 10, y: 11, to: { map: 'overworld', room: '5,3', x: 14, y: 5 } },
      ],
    },

    // ---- witch_hut — Morla's swamp parlor: statues, brew pots, rug --------
    witch_hut: {
      isolated: true,
      safe: true,
      tiles: [
        'HHHHHHHHHHHHHHHHHHHH',
        'HeeeeeeeeeeeeeeeeeeH',
        'HeeAeeeeeeeeeeeeAeeH',
        'HeeeeeeeeeeeeeeeeeeH',
        'HeeeeeggggggggeeeeeH',
        'HeeeeeggggggggeeeeeH',
        'HeeeeeggggggggeeeeeH',
        'HeeeeeggggggggeeeeeH',
        'HeeeeeeeeeeeeeeeeeeH',
        'HeeeeeeeeeeeeeeeeeeH',
        'HeeeeeeeeeeeeeeeeeeH',
        'HHHHHHHHHHDHHHHHHHHH',
      ],
      npcs: [{ id: 'witch_morla', art: 'witch', x: 10, y: 3 }],
      pots: [{ x: 5, y: 2 }, { x: 14, y: 2 }, { x: 4, y: 9 }, { x: 15, y: 9 }],
      warps: [
        { x: 10, y: 11, to: { map: 'overworld', room: '2,5', x: 10, y: 5 } },
      ],
    },

    // ---- hermit_cave — Aldous's snug cave home in the mountains -----------
    hermit_cave: {
      isolated: true,
      safe: true,
      tiles: [
        '####################',
        '#eeeeeeeeeeeeeeeeee#',
        '#ee##eeeeeeeeee##ee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeReeeeeeeeeeReee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#ee#eeeeeeeeeeee#ee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeeeeeeeeeeeeeeee#',
        '##########U#########',
      ],
      npcs: [{ id: 'hermit_aldous', art: 'hermit', x: 10, y: 4 }],
      pots: [{ x: 2, y: 9 }, { x: 17, y: 9 }],
      warps: [
        { x: 10, y: 11, to: { map: 'overworld', room: '4,0', x: 13, y: 2 } },
      ],
    },

    // ---- nomad_tent — Zara's rug-lined tent at the desert camp ------------
    // (overworld warp drops the player at 10,9; exit D sits at 10,10)
    nomad_tent: {
      isolated: true,
      safe: true,
      tiles: [
        'HHHHHHHHHHHHHHHHHHHH',
        'HeeeeeeeeeeeeeeeeeeH',
        'HeeggggggggggggggeeH',
        'HeeggggggggggggggeeH',
        'HeeggggggggggggggeeH',
        'HeeggggggggggggggeeH',
        'HeeggggggggggggggeeH',
        'HeeggggggggggggggeeH',
        'HeeggggggggggggggeeH',
        'HeeeeeeeeeeeeeeeeeeH',
        'HHHHHHHHHHDHHHHHHHHH',
        'HHHHHHHHHHHHHHHHHHHH',
      ],
      npcs: [{ id: 'nomad_zara', art: 'nomad', x: 10, y: 4 }],
      pots: [{ x: 4, y: 8 }, { x: 15, y: 8 }],
      warps: [
        { x: 10, y: 10, to: { map: 'overworld', room: '5,5', x: 6, y: 5 } },
      ],
    },

    // ---- fairy_pond_lake — Aria's healing grotto under the lake grove -----
    fairy_pond_lake: {
      isolated: true,
      safe: true,
      heal: true,
      tiles: [
        '####################',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeeeffffffffeeeee#',
        '#eeeeefwwwwwwfeeeee#',
        '#eeeeefwwwwwwfeeeee#',
        '#eeeeefwwwwwwfeeeee#',
        '#eeeeefwwwwwwfeeeee#',
        '#eeeeeffffffffeeeee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeeeeeeeeeeeeeeee#',
        '##########U#########',
      ],
      npcs: [{ id: 'fairy_aria', art: 'fairy', x: 10, y: 2 }],
      warps: [
        { x: 10, y: 11, to: { map: 'overworld', room: '9,2', x: 9, y: 4 } },
      ],
    },

    // ---- fairy_pond_desert — hidden oasis spring (full heal, no fairy) ----
    // (overworld warp drops the player at 10,9; exit U sits at 10,10)
    fairy_pond_desert: {
      isolated: true,
      safe: true,
      heal: true,
      tiles: [
        '####################',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeeeffffffffeeeee#',
        '#eeeeefwwwwwwfeeeee#',
        '#eeeeefwwwwwwfeeeee#',
        '#eeeeefwwwwwwfeeeee#',
        '#eeeeeffffffffeeeee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeeeeeeeeeeeeeeee#',
        '##########U#########',
        '####################',
      ],
      pots: [{ x: 3, y: 8 }, { x: 16, y: 8 }],
      warps: [
        { x: 10, y: 10, to: { map: 'overworld', room: '6,6', x: 9, y: 4 } },
      ],
    },

    // ---- cave_meadow_gems — boulder cache under the meadows ---------------
    cave_meadow_gems: {
      isolated: true,
      tiles: [
        '####################',
        '#eeeeeeeeeeeeeeeeee#',
        '#ee##eeeeeeeeee##ee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeReeeeeeeeeeReee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#ee#eeeeeeeeeeee#ee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeeeeeeeeeeeeeeee#',
        '##########U#########',
      ],
      chests: [
        { id: 'int_meadow_gems', x: 10, y: 3, contents: { gems: 50 } },
      ],
      enemies: [
        { type: 'slime', x: 5, y: 6 },
        { type: 'slime', x: 14, y: 7 },
      ],
      pots: [{ x: 2, y: 9 }, { x: 17, y: 9 }],
      warps: [
        { x: 10, y: 11, to: { map: 'overworld', room: '3,4', x: 4, y: 4 } },
      ],
    },

    // ---- cave_forest_gems — gem chest + golden acorn #3 of the forest -----
    cave_forest_gems: {
      isolated: true,
      tiles: [
        '####################',
        '#eeeeeeeeeeeeeeeeee#',
        '#ee##eeeeeeeeee##ee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeReeeeeeeeeeReee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#ee#eeeeeeeeeeee#ee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeeeeeeeeeeeeeeee#',
        '##########U#########',
      ],
      chests: [
        { id: 'int_forest_gems', x: 8, y: 3, contents: { gems: 50 } },
      ],
      pickups: [
        { x: 12, y: 3, item: 'acorn', id: 'int_acorn_forest3' },
      ],
      enemies: [
        { type: 'slime', x: 5, y: 6 },
        { type: 'bat', x: 14, y: 6 },
      ],
      pots: [{ x: 2, y: 9 }, { x: 17, y: 9 }],
      warps: [
        { x: 10, y: 11, to: { map: 'overworld', room: '2,4', x: 9, y: 4 } },
      ],
    },

    // ---- cave_mountain_heart — frosty vault with a Heart Container --------
    cave_mountain_heart: {
      isolated: true,
      tiles: [
        '####################',
        '#eeeeeeeeeeeeeeeeee#',
        '#ee##eeeeeeeeee##ee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeReeeeeeeeeeReee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#ee#eeeeeeeeeeee#ee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeeeeeeeeeeeeeeee#',
        '##########U#########',
      ],
      chests: [
        { id: 'int_mtn_heart', x: 10, y: 3, contents: { item: 'heartContainer' }, big: true },
      ],
      enemies: [
        { type: 'iceSlime', x: 6, y: 6 },
        { type: 'bat', x: 13, y: 7 },
      ],
      pots: [{ x: 2, y: 9 }, { x: 17, y: 9 }],
      warps: [
        { x: 10, y: 11, to: { map: 'overworld', room: '0,0', x: 3, y: 4 } },
      ],
    },

    // ---- cave_desert_heart — buried vault with a Heart Container ----------
    // (overworld warp drops the player at 10,9; exit U sits at 10,10)
    cave_desert_heart: {
      isolated: true,
      tiles: [
        '####################',
        '#eeeeeeeeeeeeeeeeee#',
        '#ee##eeeeeeeeee##ee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeReeeeeeeeeeReee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#ee#eeeeeeeeeeee#ee#',
        '#eeeeeeeeeeeeeeeeee#',
        '##########U#########',
        '####################',
      ],
      chests: [
        { id: 'int_desert_heart', x: 10, y: 3, contents: { item: 'heartContainer' }, big: true },
      ],
      enemies: [
        { type: 'scarab', x: 5, y: 6 },
        { type: 'skeleton', x: 14, y: 7 },
      ],
      pots: [{ x: 2, y: 9 }, { x: 17, y: 9 }],
      warps: [
        { x: 10, y: 10, to: { map: 'overworld', room: '9,7', x: 15, y: 4 } },
      ],
    },

    // ---- cave_lake_heart — bush-hidden grotto with a Heart Container ------
    cave_lake_heart: {
      isolated: true,
      tiles: [
        '####################',
        '#eeeeeeeeeeeeeeeeee#',
        '#ee##eeeeeeeeee##ee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeReeeeeeeeeeReee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#ee#eeeeeeeeeeee#ee#',
        '#eeeeeeeeeeeeeeeeee#',
        '#eeeeeeeeeeeeeeeeee#',
        '##########U#########',
      ],
      chests: [
        { id: 'int_lake_heart', x: 10, y: 3, contents: { item: 'heartContainer' }, big: true },
      ],
      enemies: [
        { type: 'slime', x: 5, y: 6 },
        { type: 'spitter', x: 14, y: 7 },
      ],
      pots: [{ x: 2, y: 9 }, { x: 17, y: 9 }],
      warps: [
        { x: 10, y: 11, to: { map: 'overworld', room: '7,4', x: 9, y: 10 } },
      ],
    },

  },
};
