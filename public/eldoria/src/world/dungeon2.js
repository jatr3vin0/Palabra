// dungeon2 — SANDSTONE RUINS (D2, desert tomb). 4x3 grid, 11 rooms, entry '1,2'.
// Classic script: attaches to the predefined WORLD registry only (see ARCHITECTURE.md).
//
// Progression:
//   entry (1,2) -> west (0,2): LANTERN chest in plain sight (early, never blocks torches)
//   entry -> east (2,2): kill room (onClear smallKey #1) + 2-torch puzzle opens N sealed door
//   (2,1) miniboss mummyKnight; clearing opens E sealed door -> (3,1) BIG CHEST: bombBag
//   key #1 unlocks entry N door -> hub (1,1): twin eye switches (bow) open E shortcut door
//   hub west -> (0,1) push-block plates + torch open N sealed door -> (0,0) bossKey vault
//   key #2 (0,1) unlocks hub N door -> (1,0) dark pit maze: key #3 + CRACKED WALL (bombs)
//   key #3 unlocks (1,0) E door -> (2,0) gauntlet -> boss door -> (3,0) sandWyrm sand arena
// Cracked walls 'C' also hide bonus caches in (0,2), (0,0), (2,0), (3,1).

WORLD.maps.dungeon2 = {
  kind: 'dungeon',
  name: 'La Mina de Demas',
  music: 'dungeon2',
  rooms: {

    // ---------------------------------------------------------------- entry
    // Tomb antechamber. U stairs return to the desert ruin facade.
    '1,2': {
      tiles: [
        '####################',
        '#dddddddddddddddddd#',
        '#dddddddAdddAdddddd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        'dddddddddddddddddddd',
        'dddddddddddddddddddd',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#dOddddddddddddddOd#',
        '#dOddddddddddddddOd#',
        '##########U#########',
      ],
      warps: [{ x: 10, y: 11, to: { map: 'overworld', room: '8,6', x: 10, y: 8 } }],
      doors: [{ id: 'd2_door_entry', x: 10, y: 0, dir: 'N', kind: 'locked' }],
      enemies: [
        { type: 'scarab', x: 5, y: 8 },
        { type: 'scarab', x: 14, y: 8 },
      ],
    },

    // -------------------------------------------------- lantern room (west)
    // Easily-found early chest: the LANTERN sits on a statue dais in the open.
    // NW cracked-wall alcove hides a gem cache for later (bombs).
    '0,2': {
      tiles: [
        '####################',
        '#dddd#ddddddddddddd#',
        '#ddddCddddddddddddd#',
        '#dddd#dddAdAddddddd#',
        '######ddddddddddddd#',
        '#ddddddddddddddddddd',
        '#ddddddddddddddddddd',
        '#dddddddddddddddddd#',
        '#ddssssdddddddddddd#',
        '#ddssssddddddddddOd#',
        '#ddddddddddddddddOd#',
        '####################',
      ],
      chests: [
        { id: 'd2_chest_lantern', x: 10, y: 3, contents: { item: 'lantern' } },
        { id: 'd2_chest_gems1', x: 2, y: 2, contents: { gems: 50 } },
      ],
      enemies: [
        { type: 'scarab', x: 13, y: 8 },
        { type: 'scarab', x: 6, y: 9 },
      ],
    },

    // ------------------------------------------------ torch hall (east)
    // Clear the room to spawn smallKey #1; light both torches (lantern) to
    // open the sealed north door toward the miniboss.
    '2,2': {
      tiles: [
        '####################',
        '#dddddddddddddddddd#',
        '#dddddAdddddddAdddd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        'ddddddddddddddddddd#',
        'ddddddddddddddddddd#',
        '#dd^^dddddddddd^^dd#',
        '#dddddddddddddddddd#',
        '#dOddddddddddddddOd#',
        '#dddddddddddddddddd#',
        '####################',
      ],
      doors: [{
        id: 'd2_door_torch', x: 10, y: 0, dir: 'N', kind: 'sealed',
        opens: { torches: ['d2_torch_a', 'd2_torch_b'], persist: true },
      }],
      torches: [
        { id: 'd2_torch_a', x: 8, y: 3, lit: false },
        { id: 'd2_torch_b', x: 12, y: 3, lit: false },
      ],
      enemies: [
        { type: 'skeleton', x: 5, y: 8 },
        { type: 'skeleton', x: 15, y: 8 },
        { type: 'scarab', x: 10, y: 8 },
      ],
      onClear: { chest: { id: 'd2_chest_key1', x: 10, y: 4, contents: { item: 'smallKey' } } },
    },

    // ----------------------------------------------------------- hub
    // Crossing of Whispers. Two pit-ringed eye switches (bow) open the east
    // shortcut to the miniboss room. North locked door needs key #2.
    '1,1': {
      tiles: [
        '####################',
        '#dddddddddddddddddd#',
        '#dOddddddddddddvvvd#',
        '#ddddddddddddddvdvd#',
        '#ddddddddddddddvvvd#',
        'ddddddddddddddddddd#',
        'ddddddddddddddddddd#',
        '#ddddddddddddddvvvd#',
        '#ddddddddddddddvdvd#',
        '#dOddddddddddddvvvd#',
        '#dddddddddddddddddd#',
        '##########d#########',
      ],
      doors: [
        { id: 'd2_door_hub_n', x: 10, y: 0, dir: 'N', kind: 'locked' },
        {
          id: 'd2_door_hub_e', x: 19, y: 5, dir: 'E', kind: 'sealed',
          opens: { switches: ['d2_eye_a', 'd2_eye_b'], persist: true },
        },
      ],
      switches: [
        { id: 'd2_eye_a', x: 16, y: 3, kind: 'eye' },
        { id: 'd2_eye_b', x: 16, y: 8, kind: 'eye' },
      ],
      enemies: [
        { type: 'mummy', x: 10, y: 6 },
        { type: 'scarab', x: 5, y: 3 },
        { type: 'skeletonArcher', x: 13, y: 10 },
      ],
    },

    // -------------------------------------------- push-block chamber (west)
    // Push the two blocks north onto the plates AND light the torch to open
    // the sealed door to the bossKey vault. smallKey #2 waits in the spike nook
    // (safe gap in the spikes at x=2).
    '0,1': {
      tiles: [
        '####################',
        '#ddd^dddddddddddddd#',
        '#ddd^dddddddddddddd#',
        '#ddd^dddddddddddddd#',
        '#^d^^dddddddddddddd#',
        '#ddddddddddddddddddd',
        '#ddddddddddddddddddd',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#ddddddddddddddddOd#',
        '#ddddddddddddddddOd#',
        '####################',
      ],
      doors: [{
        id: 'd2_door_plates', x: 10, y: 0, dir: 'N', kind: 'sealed',
        opens: { plates: ['d2_plate_a', 'd2_plate_b'], torches: ['d2_torch_c'], persist: true },
      }],
      plates: [
        { id: 'd2_plate_a', x: 7, y: 4 },
        { id: 'd2_plate_b', x: 13, y: 4 },
      ],
      torches: [{ id: 'd2_torch_c', x: 10, y: 2, lit: false }],
      blocks: [
        { x: 7, y: 7 },
        { x: 13, y: 7 },
      ],
      chests: [{ id: 'd2_chest_key2', x: 2, y: 2, contents: { item: 'smallKey' } }],
      enemies: [
        { type: 'scarab', x: 10, y: 9 },
        { type: 'skeletonArcher', x: 16, y: 2 },
      ],
    },

    // ------------------------------------------------------ bossKey vault
    // Dark tomb of the pharaoh: mummies guard the boss key. Cracked wall in
    // the NE corner hides a gem cache.
    '0,0': {
      dark: true,
      tiles: [
        '####################',
        '#dddddddddddddd#ddd#',
        '#dddddddddddddd##C##',
        '#dddddddAdddAdddddd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#dddddddsssssdddddd#',
        '#dddddddsssssdddddd#',
        '#dOddddddddddddddOd#',
        '#dddddddddddddddddd#',
        '##########d#########',
      ],
      chests: [
        { id: 'd2_chest_bosskey', x: 10, y: 4, contents: { item: 'bossKey' } },
        { id: 'd2_chest_gems2', x: 17, y: 1, contents: { gems: 20 } },
      ],
      enemies: [
        { type: 'skeletonArcher', x: 5, y: 2 },
        { type: 'skeletonArcher', x: 13, y: 2 },
        { type: 'mummy', x: 8, y: 6 },
        { type: 'mummy', x: 12, y: 6 },
      ],
    },

    // ----------------------------------------------------- dark pit maze
    // Ring walkway around a pit field; bridge (x=8) reaches the key #3 island.
    // The east exit corridor is plugged by cracked wall tiles — bombs required
    // — then the locked door (key #3) leads to the pre-boss gauntlet.
    '1,0': {
      dark: true,
      tiles: [
        '####################',
        '#dddddddddddddddd###',
        '#dddddddddddddddd###',
        '#ddvvvvvdvvvvvvdd###',
        '#ddvvvvvdvvvvvvdd###',
        '#ddvvvvddddvvvvddCd#',
        '#ddvvvvddddvvvvddCd#',
        '#ddvvvvvvvvvvvvdd###',
        '#ddvvvvvvvvvvvvdd###',
        '#dddddddddddddddd###',
        '#dddddddddddddddd###',
        '##########d#########',
      ],
      doors: [{ id: 'd2_door_maze_e', x: 19, y: 5, dir: 'E', kind: 'locked' }],
      chests: [
        { id: 'd2_chest_key3', x: 9, y: 6, contents: { item: 'smallKey' } },
        { id: 'd2_chest_arrows', x: 2, y: 1, contents: { arrows: 10 } },
      ],
      enemies: [
        { type: 'skeletonArcher', x: 15, y: 2 },
        { type: 'skeletonArcher', x: 3, y: 9 },
        { type: 'skeleton', x: 5, y: 10 },
      ],
    },

    // -------------------------------------------------- pre-boss gauntlet
    // Spike rows with safe gaps, tomb guardians, the BOSS door east. A cracked
    // NE alcove hides one more gem cache.
    '2,0': {
      tiles: [
        '####################',
        '#dddddddddddddd#ddd#',
        '#dddddddddddddd##C##',
        '#dddddddddddddddddd#',
        '#ddd^^^^^dd^^^^^ddd#',
        'ddddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#ddd^^^^^dd^^^^^ddd#',
        '#dOddddddddddddddOd#',
        '#dddddddddddddddddd#',
        '####################',
      ],
      doors: [{ id: 'd2_door_boss', x: 19, y: 5, dir: 'E', kind: 'boss' }],
      chests: [{ id: 'd2_chest_gems3', x: 17, y: 1, contents: { gems: 20 } }],
      enemies: [
        { type: 'skeletonArcher', x: 10, y: 3 },
        { type: 'mummy', x: 6, y: 6 },
        { type: 'mummy', x: 13, y: 6 },
        { type: 'scarab', x: 10, y: 9 },
      ],
    },

    // ------------------------------------------------------- BOSS arena
    // Sand-filled arena: sandWyrm surfaces at the sand spots.
    '3,0': {
      tiles: [
        '####################',
        '#dddddddddddddddddd#',
        '#dAddddddddddddddAd#',
        '#ddssssssssssssssdd#',
        '#ddssssssssssssssdd#',
        'dddssssssssssssssdd#',
        '#ddssssssssssssssdd#',
        '#ddssssssssssssssdd#',
        '#ddssssssssssssssdd#',
        '#ddssssssssssssssdd#',
        '#dAddddddddddddddAd#',
        '####################',
      ],
      boss: { type: 'sandWyrm', x: 10, y: 6 },
    },

    // ----------------------------------------------------- miniboss arena
    // The mummyKnight. Beating it opens the sealed east door to the bombBag
    // vault and spawns a bonus chest.
    '2,1': {
      tiles: [
        '####################',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#ddddAddddddddAdddd#',
        '#dddddddddddddddddd#',
        'ddddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#ddddAddddddddAdddd#',
        '#dOddddddddddddddOd#',
        '#dddddddddddddddddd#',
        '##########d#########',
      ],
      doors: [{
        id: 'd2_door_mini', x: 19, y: 5, dir: 'E', kind: 'sealed',
        opens: { clear: true, persist: true },
      }],
      miniboss: { type: 'mummyKnight', x: 10, y: 6 },
      onClear: { chest: { id: 'd2_chest_mini', x: 10, y: 3, contents: { gems: 20 } } },
    },

    // ------------------------------------------------------ bombBag vault
    // The BIG CHEST. The cracked wall in the south wall is a freebie lesson:
    // bomb it open for a spare-bombs chest.
    '3,1': {
      tiles: [
        '####################',
        '#dddddddddddddddddd#',
        '#dOddddddddddddddOd#',
        '#dddddddddddddddddd#',
        '#dddddddAdddAdddddd#',
        'ddddddddddddddddddd#',
        '#dddddddAdddAdddddd#',
        '#dddddddddddddddddd#',
        '#ddddddd##C##dddddd#',
        '#ddddddd#ddd#dddddd#',
        '#ddddddd#ddd#dddddd#',
        '####################',
      ],
      chests: [
        { id: 'd2_chest_bombbag', x: 10, y: 5, contents: { item: 'bombBag' }, big: true },
        { id: 'd2_chest_bombs', x: 10, y: 10, contents: { bombs: 5 } },
      ],
      torches: [
        { id: 'd2_torch_v1', x: 7, y: 3, lit: true },
        { id: 'd2_torch_v2', x: 13, y: 3, lit: true },
      ],
    },
  },
};
