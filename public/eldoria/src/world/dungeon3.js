// dungeon3 — Glacier Hollow (D3, mountains). 4x3 grid, 11 rooms, entry '1,2'.
// Crystalline ice dungeon: ice-slide mazes, block-sokoban-on-ice onto plates,
// a 3-torch hall, cracked walls, eyeSentry turrets.
// Items: 3 smallKeys, bossKey, big chest = Power Boots.
// Miniboss: alphaWolf. Boss: frostRevenant (drops Sapphire Shard via engine).
//
// Flow:
//   entry '1,2'  -> W '0,2' ice-slide maze (key #1)
//                -> E '2,2' wolf den (clear-sealed) -> '3,2' sokoban-on-ice
//                   (plates open N door into the key #2 pocket of '3,1')
//   locked N door (L1) -> hub '1,1' (cracked wall hides key #3)
//   hub W locked (L3) -> '0,1' triple-plate sokoban -> '0,0' sentinel vault (bossKey on clear)
//   hub E locked (L2) -> '2,1' three flames hall -> '3,1' alphaWolf arena (boots big chest)
//                        '2,1' N -> '2,0' optional crevasse treasure (pits + sentries)
//   hub N boss door -> '1,0' frostRevenant.
// All 3 small keys are reachable with just bombs (guaranteed: D3 entrance needs
// bombs) so no key-order softlock: key1+key2 sit before L1, key3 is inside the hub.

WORLD.maps.dungeon3 = {
  kind: 'dungeon',
  name: 'Glacier Hollow',
  music: 'dungeon3',
  rooms: {

    // ---- entry: Frostgate Hall (player lands at 10,10 from the overworld boulder) ----
    '1,2': {
      tiles: [
        '####################',
        '#dddddddddddddddddd#',
        '#dIddddddddddddddId#',
        '#dddddiiiiiiiiddddd#',
        '#dddddiiiiiiiiddddd#',
        'ddddddiiiiiiiidddddd',
        'ddddddiiiiiiiidddddd',
        '#dddddiiiiiiiiddddd#',
        '#dddddddddddddddddd#',
        '#dOddddddddddddddOd#',
        '#dddddddddddddddddd#',
        '##########U#########',
      ],
      enemies: [
        { type: 'iceSlime', x: 4, y: 2 },
        { type: 'iceSlime', x: 15, y: 9 },
      ],
      doors: [
        { id: 'd3_door_lock1', x: 10, y: 0, dir: 'N', kind: 'locked' },
      ],
      warps: [
        { x: 10, y: 11, to: { map: 'overworld', room: '2,0', x: 10, y: 8 } },
      ],
    },

    // ---- Sliding Gallery: ice-slide maze, smallKey #1 on the NW pad ----
    // Intended path: enter E vestibule, slide W along y6 (stop at iceblock),
    // slide N to the top wall, slide W onto the chest pad. Slide S anywhere to
    // fall back to the south walkway.
    '0,2': {
      tiles: [
        '####################',
        '#dddiiiiiiiiiiiiii##',
        '#dddiiiiiiiiiiiiii##',
        '#iiiiiiiIiiiiiiiiid#',
        '#iiiiiiiiiiiiIiiiid#',
        '#iiiiiiiiiiiiiiiiidd',
        '#iiiiIiiiiiiiiiiiidd',
        '#iiiiiiiiiiiiiiiiid#',
        '#iiiiiiiiiiiiiiiiid#',
        '#iiiiiiiiiiiiiiiiid#',
        '#ddddOddddddOdddddd#',
        '####################',
      ],
      enemies: [
        { type: 'frostWisp', x: 10, y: 8 },
        { type: 'iceSlime', x: 9, y: 10 },
      ],
      chests: [
        { id: 'd3_chest_key1', x: 2, y: 1, contents: { item: 'smallKey' } },
      ],
    },

    // ---- Wolf Den: clear the pack to unseal the way east ----
    '2,2': {
      tiles: [
        '####################',
        '#dddddddddddddddddd#',
        '#ddIddddddddddddIdd#',
        '#dddddddddddddddddd#',
        '#ddddiiiddddiiidddd#',
        'ddddddddddddddddddd#',
        'ddddddddddddddddddd#',
        '#ddddiiiddddiiidddd#',
        '#dddddddddddddddddd#',
        '#ddIddddddddddddIdd#',
        '#dOddddddddddddddOd#',
        '####################',
      ],
      enemies: [
        { type: 'iceWolf', x: 6, y: 3 },
        { type: 'iceWolf', x: 13, y: 8 },
        { type: 'iceSlime', x: 10, y: 4 },
      ],
      doors: [
        { id: 'd3_door_den_e', x: 19, y: 6, dir: 'E', kind: 'sealed',
          opens: { clear: true, persist: true } },
      ],
    },

    // ---- Frozen Cellar: sokoban-on-ice. Slide both blocks onto the plates to
    // open the N door into the key #2 pocket (in '3,1'). Cracked wall hides gems.
    // Block A (5,4) pushed E slides to the plate at (12,4) (iceblock at 13,4).
    // Block B (9,7) pushed N slides to the plate at (9,3) (iceblock at 9,2).
    '3,2': {
      tiles: [
        '####################',
        '#ddddddddddddddddCd#',
        '#diiiiiiiIiiiiiii###',
        '#diiiiiiiiiiiiiiiid#',
        '#diiiiiiiiiiiIiiiid#',
        '#diiiiiiiiiiiiiiiid#',
        'ddiiiiiiiiiiiiiiiid#',
        '#diiiiiiiiiiiiiiiid#',
        '#diiiiiiiiiiiiiiiid#',
        '#diiiiiiiiiiiiiiiid#',
        '#dddddOdddddddddddd#',
        '####################',
      ],
      enemies: [
        { type: 'frostWisp', x: 12, y: 7 },
        { type: 'iceSlime', x: 3, y: 10 },
      ],
      blocks: [
        { x: 5, y: 4 },
        { x: 9, y: 7 },
      ],
      plates: [
        { id: 'd3_p_cellar1', x: 12, y: 4 },
        { id: 'd3_p_cellar2', x: 9, y: 3 },
      ],
      chests: [
        { id: 'd3_chest_gems1', x: 18, y: 1, contents: { gems: 50 } },
      ],
      doors: [
        { id: 'd3_door_cellar_n', x: 16, y: 0, dir: 'N', kind: 'sealed',
          opens: { plates: ['d3_p_cellar1', 'd3_p_cellar2'], persist: true } },
      ],
    },

    // ---- Crossways of Crystal (hub): bomb the cracked wall for smallKey #3.
    // Locked doors W + E, boss door N, entry door S (in '1,2').
    '1,1': {
      tiles: [
        '####################',
        '#d#d#dddddddddddddd#',
        '#ddCddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#ddddIdddddddIddddd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#ddddIdddddddIddddd#',
        '#dddddddddddddddddd#',
        '#dOddddddddddddddOd#',
        '#dddddddddddddddddd#',
        '##########d#########',
      ],
      enemies: [
        { type: 'frostWisp', x: 14, y: 3 },
        { type: 'iceWolf', x: 6, y: 8 },
        { type: 'iceSlime', x: 13, y: 9 },
      ],
      chests: [
        { id: 'd3_chest_key3', x: 3, y: 1, contents: { item: 'smallKey' } },
      ],
      doors: [
        { id: 'd3_door_boss', x: 10, y: 0, dir: 'N', kind: 'boss' },
        { id: 'd3_door_lock3', x: 0, y: 5, dir: 'W', kind: 'locked' },
        { id: 'd3_door_lock2', x: 19, y: 5, dir: 'E', kind: 'locked' },
      ],
    },

    // ---- Glacier Press: the trickiest sokoban. Two blocks slide onto plates
    // (block (6,3) pushed E stops at (14,3); block (12,8) pushed W stops at
    // (4,8)), then STAND on the third plate by the door to open it.
    '0,1': {
      tiles: [
        '####################',
        '#dddddddddddddddddd#',
        '#diiiiiiiiiiiiiiiid#',
        '#diiiiiiiiiiiiiIiid#',
        '#diiiiiiiiiiiiiiiid#',
        '#diiiiiiiiiiiiiiiidd',
        '#diiiiiiiiiiiiiiiid#',
        '#diiiiiiiiiiiiiiiid#',
        '#diIiiiiiiiiiiiiiid#',
        '#diiiiiiiiiiiiiiiid#',
        '#ddddddddOdddddddOd#',
        '####################',
      ],
      enemies: [
        { type: 'eyeSentry', x: 9, y: 6 },
        { type: 'frostWisp', x: 15, y: 6 },
      ],
      blocks: [
        { x: 6, y: 3 },
        { x: 12, y: 8 },
      ],
      plates: [
        { id: 'd3_p_press1', x: 14, y: 3 },
        { id: 'd3_p_press2', x: 4, y: 8 },
        { id: 'd3_p_press3', x: 10, y: 1 },
      ],
      doors: [
        { id: 'd3_door_press_n', x: 10, y: 0, dir: 'N', kind: 'sealed',
          opens: { plates: ['d3_p_press1', 'd3_p_press2', 'd3_p_press3'], persist: true } },
      ],
    },

    // ---- Sentinel Vault: dodge spike lanes + turret crossfire; clear the room
    // and the boss key chest appears.
    '0,0': {
      tiles: [
        '####################',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#dddIddddddddddIddd#',
        '#ddiiiiiiiiiiiiiidd#',
        '#ddiiiiiiiiiiiiiidd#',
        '#ddiii^^iiii^^iiidd#',
        '#ddiiiiiiiiiiiiiidd#',
        '#ddiiiiiiiiiiiiiidd#',
        '#dddddddddddddddddd#',
        '#dOddddddddddddddOd#',
        '##########d#########',
      ],
      enemies: [
        { type: 'eyeSentry', x: 5, y: 3 },
        { type: 'eyeSentry', x: 14, y: 3 },
        { type: 'iceWolf', x: 17, y: 8 },
      ],
      onClear: {
        chest: { id: 'd3_chest_bosskey', x: 10, y: 2, contents: { item: 'bossKey' } },
      },
    },

    // ---- Hall of Three Flames: light all 3 torches (lantern) to unseal the
    // east door to the alpha's arena. North corridor leads to optional loot.
    '2,1': {
      tiles: [
        '#########dd#########',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#ddiiiiiiddiiiiiidd#',
        '#ddiiiiiiddiiiiiidd#',
        'dddiiiiiiddiiiiiidd#',
        '#ddiiiiiiddiiiiiidd#',
        '#ddiiiiiiddiiiiiidd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#dOddddddddddddddOd#',
        '####################',
      ],
      enemies: [
        { type: 'frostWisp', x: 6, y: 4 },
        { type: 'frostWisp', x: 13, y: 7 },
        { type: 'iceSlime', x: 10, y: 9 },
      ],
      torches: [
        { id: 'd3_t1', x: 4, y: 2, lit: false },
        { id: 'd3_t2', x: 15, y: 2, lit: false },
        { id: 'd3_t3', x: 9, y: 8, lit: false },
      ],
      doors: [
        { id: 'd3_door_torch_e', x: 19, y: 6, dir: 'E', kind: 'sealed',
          opens: { torches: ['d3_t1', 'd3_t2', 'd3_t3'], persist: true } },
      ],
    },

    // ---- Treasure Crevasse (optional): a pit chasm crosses the room; only the
    // ice lanes at x6-7 and x14-15 slide you safely over to the chest ledge.
    '2,0': {
      tiles: [
        '####################',
        '#OddddddddddddddddO#',
        '#vvvvviivvvvvviivvv#',
        '#iiiiiiiiiiiiiiiiii#',
        '#iiiiiiiiiiiiiiiiii#',
        '#iiiiiiiiiiiiiiiiii#',
        '#iiIiiiiiiiIiiiiiii#',
        '#iiiiiiiiiiiiiiiiii#',
        '#iiiiiiiiiiiiiiiiii#',
        '#iiiiiiiiiiiiiiiiii#',
        '#dddddddddddddddddd#',
        '#########dd#########',
      ],
      enemies: [
        { type: 'eyeSentry', x: 2, y: 5 },
        { type: 'eyeSentry', x: 17, y: 5 },
        { type: 'frostWisp', x: 10, y: 6 },
      ],
      chests: [
        { id: 'd3_chest_arrows', x: 3, y: 1, contents: { arrows: 10 } },
        { id: 'd3_chest_gems2', x: 16, y: 1, contents: { gems: 50 } },
      ],
    },

    // ---- Alpha's Arena: alphaWolf + pack; clearing it spawns the boots big
    // chest. The walled SE pocket (entered from '3,2' sokoban door) holds key #2.
    '3,1': {
      tiles: [
        '####################',
        '#dddddddddddddddddd#',
        '#ddIdddddddddddIddd#',
        '#dddddddddddddddddd#',
        '#dddddiiiiiiiiddddd#',
        '#dddddiiiiiiiiddddd#',
        'ddddddiiiiiiiiddddd#',
        '#dddddiiiiiiiiddddd#',
        '#ddddddddddddd######',
        '#ddddddddddddd#dddd#',
        '#ddddddddddddd#OddO#',
        '################d###',
      ],
      miniboss: { type: 'alphaWolf', x: 9, y: 5 },
      enemies: [
        { type: 'iceWolf', x: 5, y: 7 },
        { type: 'iceWolf', x: 14, y: 7 },
      ],
      chests: [
        { id: 'd3_chest_key2', x: 17, y: 9, contents: { item: 'smallKey' } },
      ],
      onClear: {
        chest: { id: 'd3_chest_boots', x: 9, y: 3, contents: { item: 'boots' }, big: true },
      },
    },

    // ---- Frost Revenant's Sanctum (boss). Engine drops Heart Container +
    // Sapphire Shard + exit portal on victory.
    '1,0': {
      tiles: [
        '####################',
        '#dddddddddddddddddd#',
        '#dIddddddddddddddId#',
        '#dddddddddddddddddd#',
        '#dddddiiiiiiiiddddd#',
        '#dddddiiiiiiiiddddd#',
        '#dddddiiiiiiiiddddd#',
        '#dddddiiiiiiiiddddd#',
        '#dddddddddddddddddd#',
        '#dIddddddddddddddId#',
        '#dddddddddddddddddd#',
        '##########d#########',
      ],
      boss: { type: 'frostRevenant', x: 10, y: 5 },
    },
  },
};
