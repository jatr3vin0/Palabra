// =====================================================================
// THE SHATTERED CROWN — Dark Citadel (map 'citadel')
// End-game gauntlet. 4x4 grid, 13 rooms. Entry room '1,3' (from the
// Ashen Wastes, overworld room '8,0'). Final boss: morgrath in '1,0'
// (engine handles his two phases + victory sequence).
//
// Layout (col,row — row 0 = north):
//            [1,0 THRONE]
//   [0,1]    [1,1 sanctum] [2,1 war]   [3,1 hoard]
//   [0,2]    [1,2 hub]     [2,2 torch] [3,2 ice]
//   [0,3]    [1,3 ENTRY]   [2,3 gaunt] [3,3 spikes]
//
// Key economy: 4 smallKeys / 4 locked doors. Every key is reachable
// WITHOUT spending a key (k1 '2,3' clear, k2 '0,3', k3 '0,2', k4 '2,1'),
// so the player can never softlock. Locked doors:
//   cit_door_entry   '1,3' N -> hub '1,2'        (required)
//   cit_door_sanctum '1,2' N -> pre-boss '1,1'   (required)
//   cit_door_west    '1,2' W -> '0,2' shortcut   (optional)
//   cit_door_vault   '3,3' N -> ice vault        (optional treasure)
// BossKey: big chest in '0,1' (lava gallery, eye switches open a
// shortcut door into '1,1'). Hidden heartContainer: bombable alcove
// in '2,2'. Sealed combat rooms: '0,3' and '2,3' (persist once beaten).
// =====================================================================

WORLD.maps.citadel = {
  kind: 'dungeon',
  name: 'Fortaleza de Apollyon',
  music: 'citadel',
  rooms: {

    // ---------------- '1,3' — Entry Hall ----------------
    // U warp at (10,11) returns to the Ashen Wastes facade.
    // Locked door north is the "front gate" into the citadel proper.
    '1,3': {
      tiles: [
        '####################',
        '#AddddddddddddddddA#',
        '#ddOddddddddddddOdd#',
        '#dddddddddddddddddd#',
        '#dddAddddddddddAddd#',
        'dddddddddddddddddddd',
        'dddddddddddddddddddd',
        '#dddAddddddddddAddd#',
        '#dddddddddddddddddd#',
        '#ddOddddddddddddOdd#',
        '#dddddddddddddddddd#',
        '##########U#########',
      ],
      warps: [
        { x: 10, y: 11, to: { map: 'overworld', room: '8,0', x: 10, y: 8 } },
      ],
      doors: [
        { id: 'cit_door_entry', x: 10, y: 0, dir: 'N', kind: 'locked' },
      ],
      enemies: [
        { type: 'bat', x: 5, y: 3 },
        { type: 'bat', x: 14, y: 8 },
      ],
    },

    // ---------------- '0,3' — West Crypt (dark, sealed combat) ----------------
    // Clear the dead to open the north seal. Key chest among the tombs.
    '0,3': {
      dark: true,
      tiles: [
        '####################',
        '#ddddddddddddddddOO#',
        '#dAdAdddddddddAdAdd#',
        '#dddddddddddddddddd#',
        '#dd^^^dddddddd^^^dd#',
        '#ddddddddddddddddddd',
        '#ddddddddddddddddddd',
        '#dd^^^dddddddd^^^dd#',
        '#dddddddddddddddddd#',
        '#dAdAdddddddddAdAdd#',
        '#OOdddddddddddddddd#',
        '####################',
      ],
      doors: [
        { id: 'cit_seal_crypt', x: 10, y: 0, dir: 'N', kind: 'sealed',
          opens: { clear: true, persist: true } },
      ],
      chests: [
        { id: 'cit_chest_key2', x: 10, y: 2, contents: { item: 'smallKey' } },
      ],
      enemies: [
        { type: 'mummy', x: 5, y: 5 },
        { type: 'mummy', x: 14, y: 6 },
        { type: 'skeleton', x: 4, y: 8 },
        { type: 'skeleton', x: 15, y: 3 },
        { type: 'bat', x: 9, y: 9 },
      ],
    },

    // ---------------- '2,3' — East Gauntlet (sealed combat) ----------------
    // Pit-ringed arena. Clearing it opens the north seal and spawns key #1.
    '2,3': {
      tiles: [
        '####################',
        '#dddddddddddddddddd#',
        '#dvvddddddddddddvvd#',
        '#dvvddddddddddddvvd#',
        '#ddddddd^^^^ddddddd#',
        'dddddddddddddddddddd',
        'dddddddddddddddddddd',
        '#ddddddd^^^^ddddddd#',
        '#dvvddddddddddddvvd#',
        '#dvvddddddddddddvvd#',
        '#OddddddddddddddddO#',
        '####################',
      ],
      doors: [
        { id: 'cit_seal_gauntlet', x: 10, y: 0, dir: 'N', kind: 'sealed',
          opens: { clear: true, persist: true } },
      ],
      enemies: [
        { type: 'knight', x: 10, y: 3 },
        { type: 'skeleton', x: 5, y: 6 },
        { type: 'skeleton', x: 14, y: 5 },
        { type: 'bat', x: 7, y: 9 },
        { type: 'bat', x: 12, y: 2 },
      ],
      onClear: {
        chest: { id: 'cit_chest_key1', x: 10, y: 8, contents: { item: 'smallKey' } },
      },
    },

    // ---------------- '3,3' — Serpent's Walk (spike + pit maze) ----------------
    // Sentries rake the lanes; locked vault door at the top.
    '3,3': {
      tiles: [
        '####################',
        '#dddddddddddddddddd#',
        '#dOddddddddddddddOd#',
        '#^^^^^^^^dd^^^^^^^^#',
        '#dddddddddddddddddd#',
        'ddddddddvvvvddddddd#',
        'ddddddddvvvvddddddd#',
        '#dddddddddddddddddd#',
        '#^^^^^^^^dd^^^^^^^^#',
        '#dddddddddddddddddd#',
        '#dOddddddddddddddOd#',
        '####################',
      ],
      doors: [
        { id: 'cit_door_vault', x: 10, y: 0, dir: 'N', kind: 'locked' },
      ],
      chests: [
        { id: 'cit_chest_arrows1', x: 17, y: 1, contents: { arrows: 10 } },
        { id: 'cit_chest_gems1', x: 16, y: 10, contents: { gems: 20 } },
      ],
      enemies: [
        { type: 'eyeSentry', x: 1, y: 1 },
        { type: 'eyeSentry', x: 18, y: 9 },
        { type: 'bat', x: 5, y: 4 },
        { type: 'bat', x: 14, y: 7 },
        { type: 'mummy', x: 13, y: 7 },
      ],
    },

    // ---------------- '1,2' — Shadow Crossroads (dark hub) ----------------
    // Three doors: north to the sanctum, west shortcut, south back out.
    '1,2': {
      dark: true,
      tiles: [
        '####################',
        '#dddddddddddddddddd#',
        '#dLLddddddddddddLLd#',
        '#dLLddddddddddddLLd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#dAddddddddddddddAd#',
        '#dLLddddddddddddLLd#',
        '#dddddddddddddddddd#',
        '##########d#########',
      ],
      doors: [
        { id: 'cit_door_sanctum', x: 10, y: 0, dir: 'N', kind: 'locked' },
        { id: 'cit_door_west', x: 0, y: 5, dir: 'W', kind: 'locked' },
      ],
      chests: [
        { id: 'cit_chest_bombs1', x: 10, y: 2, contents: { bombs: 5 } },
      ],
      enemies: [
        { type: 'wizard', x: 10, y: 4 },
        { type: 'skeleton', x: 5, y: 7 },
        { type: 'skeleton', x: 14, y: 7 },
        { type: 'bat', x: 10, y: 9 },
      ],
      pots: [
        { x: 1, y: 10 },
        { x: 18, y: 10 },
      ],
    },

    // ---------------- '2,2' — Hall of Embers (dark, torch puzzle) ----------------
    // Light both torches to unseal the north door. The cracked wall on the
    // east hides the citadel's heartContainer.
    '2,2': {
      dark: true,
      tiles: [
        '####################',
        '#dddddddddddddddddd#',
        '#dAddddddddddddddAd#',
        '#dddddddddddddddddd#',
        '#ddvvddddddddddvvdd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#ddddddddddddd######',
        '#ddddddddddddd#dddd#',
        '#dddddddddddddCdddd#',
        '#ddddddddddddd#dddd#',
        '##########d#########',
      ],
      doors: [
        { id: 'cit_seal_torch', x: 10, y: 0, dir: 'N', kind: 'sealed',
          opens: { torches: ['cit_t1', 'cit_t2'], persist: true } },
      ],
      torches: [
        { id: 'cit_t1', x: 6, y: 2, lit: false },
        { id: 'cit_t2', x: 13, y: 2, lit: false },
      ],
      chests: [
        { id: 'cit_chest_heart', x: 16, y: 9, contents: { item: 'heartContainer' }, big: true },
      ],
      enemies: [
        { type: 'knight', x: 10, y: 5 },
        { type: 'eyeSentry', x: 1, y: 1 },
        { type: 'eyeSentry', x: 18, y: 1 },
        { type: 'bat', x: 4, y: 6 },
        { type: 'bat', x: 15, y: 5 },
      ],
      pots: [
        { x: 1, y: 10 },
        { x: 13, y: 10 },
      ],
    },

    // ---------------- '0,2' — Sokoban Hall (block + plate puzzle) ----------------
    // Push both blocks onto the plates to unseal the way north.
    '0,2': {
      tiles: [
        '####################',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#ddAddddddddddddAdd#',
        '#dddddddddddddddddd#',
        '#ddddddddddddddddddd',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#ddAddddddddddddAdd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '##########d#########',
      ],
      doors: [
        { id: 'cit_seal_plates', x: 10, y: 0, dir: 'N', kind: 'sealed',
          opens: { plates: ['cit_p1', 'cit_p2'], persist: true } },
      ],
      plates: [
        { id: 'cit_p1', x: 8, y: 4 },
        { id: 'cit_p2', x: 11, y: 4 },
      ],
      blocks: [
        { x: 8, y: 6 },
        { x: 11, y: 6 },
      ],
      chests: [
        { id: 'cit_chest_key3', x: 2, y: 2, contents: { item: 'smallKey' } },
      ],
      enemies: [
        { type: 'skeleton', x: 4, y: 5 },
        { type: 'skeleton', x: 15, y: 6 },
        { type: 'bat', x: 10, y: 9 },
      ],
    },

    // ---------------- '3,2' — Frozen Vault (ice-slide puzzle) ----------------
    // Morgrath's sorcerous frost. Slide across the ice, ring the crystal,
    // and the north door opens onto the hoard.
    '3,2': {
      tiles: [
        '####################',
        '#dddddddddddddddddd#',
        '#ddiiiiiiiiiiiiiidd#',
        '#diiiiIiiiiiiIiiiid#',
        '#diiiiiiiiiiiiiiiid#',
        '#IiiIiiiiiiiiiiIiiI#',
        '#diiiiiiiiiiiiiiiid#',
        '#diiiiiiIiiiiiiiiid#',
        '#ddiiiiiiiiiiiiiidd#',
        '#dddddddddddddddddd#',
        '#ddddOddddddddOdddd#',
        '##########d#########',
      ],
      doors: [
        { id: 'cit_seal_ice', x: 10, y: 0, dir: 'N', kind: 'sealed',
          opens: { switches: ['cit_sw_crystal'], persist: true } },
      ],
      switches: [
        { id: 'cit_sw_crystal', x: 4, y: 1, kind: 'crystal' },
      ],
      enemies: [
        { type: 'eyeSentry', x: 2, y: 10 },
        { type: 'bat', x: 5, y: 9 },
        { type: 'bat', x: 14, y: 1 },
      ],
    },

    // ---------------- '3,1' — Hoard of the Fallen (treasure) ----------------
    // Spike-ringed dais with the citadel's gem hoard. Loops west to the
    // War Gallery.
    '3,1': {
      tiles: [
        '####################',
        '#OOddddddddddddddOO#',
        '#dddddddddddddddddd#',
        '#dddAddddddddddAddd#',
        '#ddddddd^^^^ddddddd#',
        'ddddddd^dddd^dddddd#',
        'ddddddd^dddd^dddddd#',
        '#ddddddd^^d^ddddddd#',
        '#dddddddddddddddddd#',
        '#dddAddddddddddAddd#',
        '#OOddddddddddddddOO#',
        '##########d#########',
      ],
      chests: [
        { id: 'cit_chest_gems2', x: 9, y: 5, contents: { gems: 50 }, big: true },
        { id: 'cit_chest_bombs2', x: 10, y: 2, contents: { bombs: 5 } },
      ],
      enemies: [
        { type: 'mummy', x: 5, y: 3 },
        { type: 'mummy', x: 14, y: 8 },
        { type: 'skeleton', x: 3, y: 6 },
        { type: 'skeleton', x: 16, y: 5 },
      ],
    },

    // ---------------- '2,1' — War Gallery (dark, brutal arena) ----------------
    // Morgrath's elite. Clearing the room spawns small key #4.
    '2,1': {
      dark: true,
      tiles: [
        '####################',
        '#OddddddddddddddddO#',
        '#ddAddddddddddddAdd#',
        '#dddddddddddddddddd#',
        '#dd^^dddddddddd^^dd#',
        '#ddddddddddddddddddd',
        '#ddddddddddddddddddd',
        '#dd^^dddddddddd^^dd#',
        '#dddddddddddddddddd#',
        '#ddAddddddddddddAdd#',
        '#OddddddddddddddddO#',
        '##########d#########',
      ],
      enemies: [
        { type: 'knight', x: 6, y: 5 },
        { type: 'knight', x: 13, y: 6 },
        { type: 'wizard', x: 10, y: 3 },
        { type: 'mummy', x: 10, y: 8 },
      ],
      onClear: {
        chest: { id: 'cit_chest_key4', x: 10, y: 6, contents: { item: 'smallKey' } },
      },
    },

    // ---------------- '0,1' — Molten Gallery (bossKey) ----------------
    // Lava river, bridge crossing, the Boss Key on the far bank. Two eye
    // switches out on the lava (bow shots) open the east shortcut into
    // the sanctum.
    '0,1': {
      tiles: [
        '####################',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#LLLdLLLLLbLLLLLLLL#',
        '#LLLLLLLLLbLLLLLdLL#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#ddAddddddddddddAdd#',
        '#dddddddddddddddddd#',
        '#OddddddddddddddddO#',
        '##########d#########',
      ],
      doors: [
        { id: 'cit_seal_eyes', x: 19, y: 6, dir: 'E', kind: 'sealed',
          opens: { switches: ['cit_eye1', 'cit_eye2'], persist: true } },
      ],
      switches: [
        { id: 'cit_eye1', x: 4, y: 4, kind: 'eye' },
        { id: 'cit_eye2', x: 16, y: 5, kind: 'eye' },
      ],
      chests: [
        { id: 'cit_chest_bossKey', x: 10, y: 1, contents: { item: 'bossKey' }, big: true },
      ],
      enemies: [
        { type: 'wizard', x: 5, y: 2 },
        { type: 'wizard', x: 14, y: 2 },
        { type: 'eyeSentry', x: 10, y: 8 },
      ],
    },

    // ---------------- '1,1' — Sanctum of the Generals (pre-boss) ----------------
    // Last stand before the throne. Pots to stock up; boss door north.
    '1,1': {
      tiles: [
        '####################',
        '#AddddddddddddddddA#',
        '#dddddddddddddddddd#',
        '#ddAdddddddddddAddd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        'ddddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#ddAdddddddddddAddd#',
        '#dddddddddddddddddd#',
        '#OOddddddddddddddOO#',
        '##########d#########',
      ],
      doors: [
        { id: 'cit_door_boss', x: 10, y: 0, dir: 'N', kind: 'boss' },
      ],
      enemies: [
        { type: 'knight', x: 7, y: 4 },
        { type: 'knight', x: 12, y: 4 },
        { type: 'wizard', x: 10, y: 7 },
      ],
    },

    // ---------------- '1,0' — Throne of Morgrath (final boss) ----------------
    // The engine drives both phases and the victory sequence.
    '1,0': {
      tiles: [
        '####################',
        '#AAddddddddddddddAA#',
        '#ddddddddggdddddddd#',
        '#ddddddddggdddddddd#',
        '#ddddddddggdddddddd#',
        '#LdddddddggdddddddL#',
        '#LdddddddggdddddddL#',
        '#ddddddddggdddddddd#',
        '#ddddddddggdddddddd#',
        '#ddddddddggdddddddd#',
        '#AdddddddggdddddddA#',
        '##########g#########',
      ],
      boss: { type: 'morgrath', x: 10, y: 4 },
    },
  },
};
