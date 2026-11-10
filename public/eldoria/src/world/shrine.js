// Sunken Shrine — optional secret dungeon beneath the swamp.
// Map key: 'shrine'. 2x2 grid (rooms '0,0','1,0','0,1','1,1'), entry '0,1'.
// Entered from overworld swamp room (1,6) via its S stairs (lands here at 10,10).
// The U tile at (10,11) of room '0,1' warps back to overworld '1,6' pos 10,8.
//
// Flow (short, mysterious, rewarding):
//   '0,1' entry  — flooded antechamber. Push the block onto the plate AND light
//                  both torches to open the sealed north door.
//   '1,1' east   — drowned cellar: slime/redSlime/spitter fight; clearing it
//                  spawns a 50-gem chest. Optional treasure detour.
//   '0,0' north  — hall of echoing lights: two block-plates + one torch open
//                  the sealed east door.
//   '1,0' arena  — miniboss bogLurker; killing it spawns the big chest with
//                  the heroSword. No boss, no bossKey, no small keys.
WORLD.maps.shrine = {
  kind: 'dungeon',
  name: 'Sunken Shrine',
  music: 'shrine',
  rooms: {

    // ---- entry: Flooded Antechamber (plate + 2-torch combo door) ----
    '0,1': {
      tiles: [
        '####################',
        '#WWWddddAdddAdddWWW#',
        '#WWdOddddddddddOdWW#',
        '#wddddddddddddddddw#',
        '#dddddddddddddddddd#',
        '#ddddddddddddddddddd',
        '#ddddddddddddddddddd',
        '#dddddddddddddddddd#',
        '#wddddddddddddddddw#',
        '#WWddddddddddddddWW#',
        '#WWWddddddddddddWWW#',
        '##########U#########',
      ],
      enemies: [
        { type: 'slime', x: 6, y: 3 },
        { type: 'slime', x: 14, y: 8 },
      ],
      blocks: [{ x: 6, y: 7 }],
      plates: [{ id: 'shr_plate_entry', x: 4, y: 5 }],
      torches: [
        { id: 'shr_torch_e1', x: 8, y: 2, lit: false },
        { id: 'shr_torch_e2', x: 12, y: 2, lit: false },
      ],
      doors: [
        { id: 'shr_door_entry_n', x: 10, y: 0, dir: 'N', kind: 'sealed',
          opens: { plates: ['shr_plate_entry'],
                   torches: ['shr_torch_e1', 'shr_torch_e2'],
                   persist: true } },
      ],
      warps: [
        { x: 10, y: 11, to: { map: 'overworld', room: '1,6', x: 10, y: 8 } },
      ],
    },

    // ---- east: Drowned Cellar (combat room, gem chest on clear) ----
    '1,1': {
      tiles: [
        '####################',
        '#WWWWddddddddddWWWW#',
        '#WWdddOddddddOdddWW#',
        '#wdd,,dddddddd,,ddw#',
        '#dddddddddddddddddd#',
        'ddddddddddddddddddd#',
        'ddddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#wdd,,dddddddd,,ddw#',
        '#WWddddddddddddddWW#',
        '#WWWWddddddddddWWWW#',
        '####################',
      ],
      enemies: [
        { type: 'spitter', x: 10, y: 2 },
        { type: 'slime', x: 5, y: 4 },
        { type: 'slime', x: 14, y: 4 },
        { type: 'redSlime', x: 7, y: 7 },
        { type: 'redSlime', x: 12, y: 7 },
      ],
      onClear: {
        chest: { id: 'shr_chest_gems', x: 10, y: 4, contents: { gems: 50 } },
      },
    },

    // ---- north: Hall of Echoing Lights (2 plates + torch open east door) ----
    '0,0': {
      tiles: [
        '####################',
        '#OdAddddddddddddAdO#',
        '#dddddddddddddddddd#',
        '#ddWWWddddddddWWWdd#',
        '#ddWWWddddddddWWWdd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#ddWWWddddddddWWWdd#',
        '#ddWWWddddddddWWWdd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '##########d#########',
      ],
      enemies: [
        { type: 'redSlime', x: 4, y: 9 },
        { type: 'spitter', x: 10, y: 9 },
        { type: 'redSlime', x: 15, y: 9 },
      ],
      blocks: [
        { x: 6, y: 6 },
        { x: 13, y: 6 },
      ],
      plates: [
        { id: 'shr_plate_a', x: 6, y: 2 },
        { id: 'shr_plate_b', x: 13, y: 2 },
      ],
      torches: [{ id: 'shr_torch_n1', x: 10, y: 1, lit: false }],
      doors: [
        { id: 'shr_door_mini_e', x: 19, y: 5, dir: 'E', kind: 'sealed',
          opens: { plates: ['shr_plate_a', 'shr_plate_b'],
                   torches: ['shr_torch_n1'],
                   persist: true } },
      ],
    },

    // ---- arena: the Lurker's Basin (miniboss guards the heroSword) ----
    '1,0': {
      tiles: [
        '####################',
        '#WWddddddddddddddWW#',
        '#WddddddddddddddddW#',
        '#dddddddAdddAdddddd#',
        '#dwwddddddddddddwwd#',
        'ddddddddddddddddddd#',
        '#wwddddddddddddddww#',
        '#wwddddddddddddddww#',
        '#dwwddddddddddddwwd#',
        '#dOddddddddddddddOd#',
        '#WWddddddddddddddWW#',
        '####################',
      ],
      miniboss: { type: 'bogLurker', x: 10, y: 6 },
      onClear: {
        chest: { id: 'shr_chest_hero', x: 10, y: 3,
                 contents: { item: 'heroSword' }, big: true },
      },
    },

  },
};
