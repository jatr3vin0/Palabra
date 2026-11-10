// ============================================================================
// MOUNTAINS region — snowy passes between cliffs, ice patches.
// Overworld cells: cols 0-5, rows 0-1 (12 rooms). Biome 'mountains'.
//
// Connectivity (internal):
//   Row 0: (0,0)-(1,0)-(2,0)-(3,0)-(4,0)-(5,0)  open E/W at y=5,6
//   Row 1: (0,1)-(1,1)-(2,1)-(3,1)-(4,1)-(5,1)  open E/W at y=5,6
//   Vertical passes (x=9,10): (0,0)|(0,1), (2,0)|(2,1), (4,0)|(4,1)
// Gateways (exact, per GAME_DESIGN):
//   (5,1) E <-> wastes (6,1) W  open y=5,6
//   (1,1) S <-> forest (1,2) N  open x=9,10
//   (4,1) S <-> meadows (4,2) N open x=9,10
// Everything else (world border N/W, wastes E of (5,0), forest/meadows S of
// (0,1),(2,1),(3,1),(5,1), and the unused internal verticals) is sealed solid.
//
// Landmarks:
//   (2,0) D3 Glacier Hollow entrance: X boulder (BOMBS) -> dungeon3 '1,2' @10,10
//   (4,0) hermit cave: S stairs -> interiors 'hermit_cave'
//   (0,0) secret X boulder -> interiors 'cave_mountain_heart'
//   Acorns: (1,0) bush-sealed ledge, (5,0) bush-box. Signs: d3 entrance, mtn pass.
// ============================================================================

Object.assign(WORLD.maps.overworld.rooms, {

  // -------------------------------------------------------------- (0,0)
  // NW corner. Secret cracked boulder hides stairs to cave_mountain_heart.
  // Open: E y5,6 -> (1,0); S x9,10 -> (0,1). N + W = world border (solid).
  '0,0': {
    biome: 'mountains',
    tiles: [
      'MMMMMMMMMMMMMMMMMMMM',
      'MMMMMMMMMMMMMMMMMMMM',
      'MMnnnnnnMMMMnnnnnnMM',
      'MMnXnnnnMMnnnnRnnnMM',
      'MMnnnnnnnnnnnnnnnnMM',
      'MMnnRnnnnnnnnnnnnnnn',
      'MMnnnnnniinnnnRnnnnn',
      'MMMnnnnniinnnnnnnnMM',
      'MMMMnnnnnnnnnnnnnMMM',
      'MMMMMnnnnnnnnnnnMMMM',
      'MMMMMMMMMnnMMMMMMMMM',
      'MMMMMMMMMnnMMMMMMMMM',
    ],
    enemies: [
      { type: 'iceWolf', x: 13, y: 4 },
      { type: 'frostWisp', x: 6, y: 7 },
      { type: 'bat', x: 15, y: 8 },
    ],
    warps: [
      { x: 3, y: 3, to: { map: 'interiors', room: 'cave_mountain_heart', x: 10, y: 10 }, hidden: 'bomb' },
    ],
  },

  // -------------------------------------------------------------- (1,0)
  // Icy pass. Acorn ledge sealed by bushes (top-right). N solid, S sealed.
  '1,0': {
    biome: 'mountains',
    tiles: [
      'MMMMMMMMMMMMMMMMMMMM',
      'MMMMMMMMMMMMMMMMMMMM',
      'MMnnnnMMMMMMMMnnnnMM',
      'MMnnnnMMiiMMMMBBBBMM',
      'MMnnnnnniinnnnnnnnMM',
      'nnnnnnniiiinnnnnnnnn',
      'nnnnnnnniiinnnnnnnnn',
      'MMMnnRnnnnnnnRnnnMMM',
      'MMMMnnnnnnnnnnnMMMMM',
      'MMMMMMnnnnnnnMMMMMMM',
      'MMMMMMMMMMMMMMMMMMMM',
      'MMMMMMMMMMMMMMMMMMMM',
    ],
    enemies: [
      { type: 'iceSlime', x: 6, y: 8 },
      { type: 'frostWisp', x: 12, y: 5 },
    ],
    pickups: [
      { x: 16, y: 2, item: 'acorn', id: 'ow_mtn_acorn1' },
    ],
  },

  // -------------------------------------------------------------- (2,0)
  // D3 Glacier Hollow entrance: cave mouth in the north cliff, blocked by a
  // cracked boulder X (bombs). Statues flank the approach. S pass -> (2,1).
  '2,0': {
    biome: 'mountains',
    tiles: [
      'MMMMMMMMMMMMMMMMMMMM',
      'MMMMMMMMMXMMMMMMMMMM',
      'MMnnnnnAnnnAnnnnnnMM',
      'MMnnnnnnnnnnnnnnnnMM',
      'MMnniinnnnnnnniinnMM',
      'nnnniinnnnnnnniinnnn',
      'nnnnnnnnnnnnnnnnnnnn',
      'MMnnRnnnnnnnnnnRnnMM',
      'MMMnnnnnnnnnnnnnnMMM',
      'MMMMnnnnnnnnnnnnMMMM',
      'MMMMMMMMMnnMMMMMMMMM',
      'MMMMMMMMMnnMMMMMMMMM',
    ],
    enemies: [
      { type: 'frostWisp', x: 5, y: 7 },
      { type: 'iceSlime', x: 14, y: 8 },
    ],
    signs: [
      { id: 'sign_d3_entrance', x: 12, y: 3 },
    ],
    warps: [
      { x: 9, y: 1, to: { map: 'dungeon3', room: '1,2', x: 10, y: 10 }, hidden: 'bomb' },
    ],
  },

  // -------------------------------------------------------------- (3,0)
  // Big frozen pond — slide across; rocks to bump into. N solid, S sealed.
  '3,0': {
    biome: 'mountains',
    tiles: [
      'MMMMMMMMMMMMMMMMMMMM',
      'MMMMMMMMMMMMMMMMMMMM',
      'MMMMnnnnnnnnnnnnMMMM',
      'MMnnnniiiiiiiinnnnMM',
      'MMnnniiiiRiiiiinnnMM',
      'nnnnniiiiiiiiiinnnnn',
      'nnnnniiiiiiiiiinnnnn',
      'MMnnniiiiiRiiiinnnMM',
      'MMnnnniiiiiiiinnnnMM',
      'MMMMnnnnnnnnnnnnMMMM',
      'MMMMMMMMMMMMMMMMMMMM',
      'MMMMMMMMMMMMMMMMMMMM',
    ],
    enemies: [
      { type: 'iceSlime', x: 7, y: 3 },
      { type: 'frostWisp', x: 10, y: 2 },
      { type: 'bat', x: 12, y: 8 },
    ],
  },

  // -------------------------------------------------------------- (4,0)
  // Hermit's cave: stairs in the cliff face -> interiors 'hermit_cave'.
  // S pass x9,10 -> (4,1).
  '4,0': {
    biome: 'mountains',
    tiles: [
      'MMMMMMMMMMMMMMMMMMMM',
      'MMMMMMMMMMMMMSMMMMMM',
      'MMnnnnnnnnnnnnnnnnMM',
      'MMnnRnnnnnnnnnnnnnMM',
      'MMnnnnnniinnnnnRnnMM',
      'nnnnnnnniinnnnnnnnnn',
      'nnnnnnnnnnnnnnnnnnnn',
      'MMnnnnnnnnnnnnnnnnMM',
      'MMnnBnnnnnnnnnnnnnMM',
      'MMMnnnnnnnnnnnnnMMMM',
      'MMMMMMMMMnnMMMMMMMMM',
      'MMMMMMMMMnnMMMMMMMMM',
    ],
    enemies: [
      { type: 'iceWolf', x: 5, y: 7 },
      { type: 'bat', x: 15, y: 8 },
    ],
    warps: [
      { x: 13, y: 1, to: { map: 'interiors', room: 'hermit_cave', x: 10, y: 10 } },
    ],
  },

  // -------------------------------------------------------------- (5,0)
  // Dead-end treasure nook above the wastes pass. Bush-box hides an acorn;
  // a small chest and pots reward explorers. E (wastes) + S sealed.
  '5,0': {
    biome: 'mountains',
    tiles: [
      'MMMMMMMMMMMMMMMMMMMM',
      'MMMMMMMMMMMMMMMMMMMM',
      'MMMMMnnnnnnnnnnMMMMM',
      'MMMnnnnniinnnnnnnMMM',
      'MMnnnnnniinnnBBBnnMM',
      'nnnnnnnnnnnnnBnBnnMM',
      'nnnnnnnnnnnnnBnBnnMM',
      'MMnnnRnnnnnnnBBBnnMM',
      'MMMnnnnnnnnnnnnnnMMM',
      'MMMMMnnnnnnnnnMMMMMM',
      'MMMMMMMMMMMMMMMMMMMM',
      'MMMMMMMMMMMMMMMMMMMM',
    ],
    enemies: [
      { type: 'frostWisp', x: 10, y: 3 },
      { type: 'iceWolf', x: 7, y: 8 },
    ],
    pickups: [
      { x: 14, y: 5, item: 'acorn', id: 'ow_mtn_acorn2' },
    ],
    chests: [
      { id: 'ow_mtn_gems1', x: 5, y: 8, contents: { gems: 20 } },
    ],
    pots: [
      { x: 16, y: 5 },
      { x: 16, y: 6 },
    ],
  },

  // -------------------------------------------------------------- (0,1)
  // SW corner of the range. N pass -> (0,0). W world border, S sealed (forest).
  '0,1': {
    biome: 'mountains',
    tiles: [
      'MMMMMMMMMnnMMMMMMMMM',
      'MMMMMMMMMnnMMMMMMMMM',
      'MMnnnnnnnnnnnnnnnnMM',
      'MMnnRnnnnnnnnnRnnnMM',
      'MMnnnnniiiinnnnnnnMM',
      'MMnnnnniiiinnnnnnnnn',
      'MMnnnnnnnnnnnnnnnnnn',
      'MMnnnnnnnnnnRnnnnnMM',
      'MMnnBnnnnnnnnnnnnnMM',
      'MMMnnnnnnnnnnnnnMMMM',
      'MMMMMMMMMMMMMMMMMMMM',
      'MMMMMMMMMMMMMMMMMMMM',
    ],
    enemies: [
      { type: 'iceWolf', x: 6, y: 7 },
      { type: 'frostWisp', x: 14, y: 4 },
    ],
  },

  // -------------------------------------------------------------- (1,1)
  // Gateway room: S x9,10 open -> forest (1,2). Kept lighter (region entry).
  '1,1': {
    biome: 'mountains',
    tiles: [
      'MMMMMMMMMMMMMMMMMMMM',
      'MMMMMMMMMMMMMMMMMMMM',
      'MMnnnnnnnnnnnnnnnnMM',
      'MMnRnnnnniinnnnnRnMM',
      'MMnnnnnniiiinnnnnnMM',
      'nnnnnnnniiiinnnnnnnn',
      'nnnnnnnnniinnnnnnnnn',
      'MMnnnnnnnnnnnnnnnnMM',
      'MMnnnnRnnnnnnRnnnnMM',
      'MMMnnnnnnnnnnnnnMMMM',
      'MMMMMMMMMnnMMMMMMMMM',
      'MMMMMMMMMnnMMMMMMMMM',
    ],
    enemies: [
      { type: 'iceSlime', x: 5, y: 8 },
      { type: 'iceSlime', x: 15, y: 7 },
      { type: 'bat', x: 13, y: 3 },
    ],
  },

  // -------------------------------------------------------------- (2,1)
  // Crossroads under the D3 approach. N pass -> (2,0). S sealed (forest).
  '2,1': {
    biome: 'mountains',
    tiles: [
      'MMMMMMMMMnnMMMMMMMMM',
      'MMMMMMMMMnnMMMMMMMMM',
      'MMnnnnnnnnnnnnnnnnMM',
      'MMnnniinnnnnniinnnMM',
      'MMnnniinnnnnniinnnMM',
      'nnnnnnnnnnnnnnnnnnnn',
      'nnnnnnnRnnnnRnnnnnnn',
      'MMnnnnnnnnnnnnnnnnMM',
      'MMnnnnnnniinnnnnnnMM',
      'MMMnnnnnnnnnnnnnMMMM',
      'MMMMMMMMMMMMMMMMMMMM',
      'MMMMMMMMMMMMMMMMMMMM',
    ],
    enemies: [
      { type: 'iceSlime', x: 4, y: 8 },
      { type: 'iceSlime', x: 15, y: 3 },
      { type: 'bat', x: 10, y: 6 },
    ],
  },

  // -------------------------------------------------------------- (3,1)
  // Windy mid-pass with an ice strip. N + S sealed. Pots for a snack break.
  '3,1': {
    biome: 'mountains',
    tiles: [
      'MMMMMMMMMMMMMMMMMMMM',
      'MMMMMMMMMMMMMMMMMMMM',
      'MMMMnnnnnnnnnnnnMMMM',
      'MMnnnnRnnnnnnRnnnnMM',
      'MMnnnnnniiiinnnnnnMM',
      'nnnnnnnniiiinnnnnnnn',
      'nnnnnnnniiiinnnnnnnn',
      'MMnnnnnnniinnnnnnnMM',
      'MMnnnRnnnnnnnnRnnnMM',
      'MMMMnnnnnnnnnnnnMMMM',
      'MMMMMMMMMMMMMMMMMMMM',
      'MMMMMMMMMMMMMMMMMMMM',
    ],
    enemies: [
      { type: 'iceWolf', x: 5, y: 3 },
      { type: 'frostWisp', x: 10, y: 8 },
      { type: 'bat', x: 14, y: 5 },
    ],
    pots: [
      { x: 4, y: 2 },
      { x: 15, y: 2 },
    ],
  },

  // -------------------------------------------------------------- (4,1)
  // Mountain pass gate: S x9,10 open -> meadows (4,2); N pass -> hermit (4,0).
  // sign_mountain_pass greets climbers coming up from the meadows.
  '4,1': {
    biome: 'mountains',
    tiles: [
      'MMMMMMMMMnnMMMMMMMMM',
      'MMMMMMMMMnnMMMMMMMMM',
      'MMnnnnnnnnnnnnnnnnMM',
      'MMnRnnnnnnnnnnnnRnMM',
      'MMnnnnniinnnnnnnnnMM',
      'nnnnnnniinnnnnnnnnnn',
      'nnnnnnnnnnnnnnnnnnnn',
      'MMnnnnnnnnnnnnnnnnMM',
      'MMnnnnRnnnnnnnRnnnMM',
      'MMMnnnnnnnnnnnnnMMMM',
      'MMMMMMMMMnnMMMMMMMMM',
      'MMMMMMMMMnnMMMMMMMMM',
    ],
    enemies: [
      { type: 'iceSlime', x: 5, y: 4 },
      { type: 'bat', x: 14, y: 7 },
    ],
    signs: [
      { id: 'sign_mountain_pass', x: 11, y: 9 },
    ],
  },

  // -------------------------------------------------------------- (5,1)
  // Eastern pass toward the Ashen Wastes: E open ONLY at y=5,6 (barrier sits
  // on the wastes side). Toughest mountain room. N + S sealed.
  '5,1': {
    biome: 'mountains',
    tiles: [
      'MMMMMMMMMMMMMMMMMMMM',
      'MMMMMMMMMMMMMMMMMMMM',
      'MMMMnnnnnnnnnnnnMMMM',
      'MMnnnnRnnnnnnRnnnnMM',
      'MMnnnnnnniinnnnnnnMM',
      'nnnnnnnnniinnnnnnnnn',
      'nnnnnnnnnnnnnnnnnnnn',
      'MMnnnRnnnnnnnnRnnnMM',
      'MMMnnnnnnnnnnnnnnMMM',
      'MMMMMnnnnnnnnnnMMMMM',
      'MMMMMMMMMMMMMMMMMMMM',
      'MMMMMMMMMMMMMMMMMMMM',
    ],
    enemies: [
      { type: 'iceWolf', x: 12, y: 3 },
      { type: 'iceWolf', x: 6, y: 8 },
      { type: 'frostWisp', x: 9, y: 9 },
    ],
  },

});
