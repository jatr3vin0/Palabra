// The Shattered Crown — Dungeon 1: Vinewood Temple (forest-green, first dungeon)
//
// 3x3 grid of rooms. Entry room '1,2' (warp from forest overworld room '1,2').
//
//   '0,0' bossKey room   '1,0' BOSS bramblehorn   '2,0' supply room
//   '0,1' key #2 room    '1,1' hub                '2,1' miniboss + Bow
//   '0,2' key #1 room    '1,2' ENTRY              '2,2' bonus + C secret
//
// Flow: entry block/plate puzzle opens N door -> hub. Key #1 from clear-room
// reward in '0,2'. Locked door #1 (hub E) -> bigSlime miniboss guards the Bow
// big chest. Plates + clear open '2,1' N -> arrow/gem supply room. With the
// Bow, shoot the eye switch in the hub to open the W door -> key #2 ('0,1'),
// locked door #2 -> bossKey ('0,0'). Boss door (hub N) -> bramblehorn ('1,0').
// Sequence is deadlock-proof: locked door #2 sits behind the eye switch, so
// key #1 can only ever be spent on locked door #1.
//
// Secret: cracked wall 'C' in '2,2' hides a 50-gem chest — needs Bombs (D2),
// so it rewards a return visit.

WORLD.maps.dungeon1 = {
  kind: 'dungeon',
  name: 'Vinewood Temple',
  music: 'dungeon1',
  rooms: {

    // ---- ENTRY: arrival from forest, block/plate puzzle, clear-sealed side door ----
    '1,2': {
      tiles: [
        '####################',
        '#ddddddddAdAddddddd#',
        '#dddddddddddddddddd#',
        '#dd,ddddddddddddd,d#',
        '#dddddddddddddddddd#',
        'ddddddddddddddddddd#',
        'ddddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#d,dddddddddddddd,d#',
        '#OddddddddddddddddO#',
        '#ddddddddAdAddddddd#',
        '##########U#########',
      ],
      // player arrives at (10,10); stepping back onto the U stairs returns outside
      warps: [
        { x: 10, y: 11, to: { map: 'overworld', room: '1,2', x: 10, y: 8 } },
      ],
      enemies: [
        { type: 'slime', x: 5, y: 8 },
        { type: 'slime', x: 15, y: 8 },
      ],
      blocks: [{ x: 12, y: 7 }],
      plates: [{ id: 'd1_plate_entry', x: 12, y: 3 }],
      doors: [
        { id: 'd1_door_entry_n', x: 10, y: 0, dir: 'N', kind: 'sealed',
          opens: { plates: ['d1_plate_entry'], persist: true } },
        { id: 'd1_door_entry_e', x: 19, y: 5, dir: 'E', kind: 'sealed',
          opens: { clear: true, persist: true } },
      ],
    },

    // ---- KEY #1: clear the room, the key chest appears ----
    '0,2': {
      tiles: [
        '####################',
        '#dd,dddddddddddd,dd#',
        '#dddddddWWWWddddddd#',
        '#dddddddWWWWddddddd#',
        '#dddddddddddddddddd#',
        '#dd#dddddddddddddddd',
        '#dd#dddddddddddddddd',
        '#dddddddddddddddddd#',
        '#d,dddddddddddddd,d#',
        '#OddddddddddddddddO#',
        '#dddddddddddddddddd#',
        '####################',
      ],
      enemies: [
        { type: 'slime', x: 6, y: 5 },
        { type: 'slime', x: 13, y: 8 },
        { type: 'bat', x: 9, y: 5 },
        { type: 'spitter', x: 5, y: 2 },
      ],
      onClear: {
        chest: { id: 'd1_chest_key1', x: 9, y: 7, contents: { item: 'smallKey' } },
      },
    },

    // ---- BONUS: pots, gem chest, cracked-wall secret (bombs, return visit) ----
    '2,2': {
      tiles: [
        '####################',
        '#ddddddddddddd######',
        '#dd,dddddddddd#dddd#',
        '#dddddddddddddCdddd#',
        '#ddddddddddddd######',
        'ddddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#dd,dddddddddddd,dd#',
        '#dddddddddddddddddd#',
        '#OOdddddddddddddOOd#',
        '#dddddddddddddddddd#',
        '####################',
      ],
      enemies: [
        { type: 'beetle', x: 8, y: 7 },
        { type: 'slime', x: 4, y: 8 },
        { type: 'slime', x: 15, y: 6 },
      ],
      chests: [
        { id: 'd1_chest_gems1', x: 10, y: 9, contents: { gems: 20 } },
        // behind the cracked wall at (14,3) — bomb it on a return visit
        { id: 'd1_chest_secret', x: 16, y: 2, contents: { gems: 50 } },
      ],
    },

    // ---- HUB: boss door N, locked door E, eye-switch-sealed door W ----
    '1,1': {
      tiles: [
        '####################',
        '#ddddddddAdAddddddd#',
        '#dddddddddddddddddd#',
        '#dddd#dddddddd#dddd#',
        '#dAdddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#dAdddddddddddddddd#',
        '#dd,dddddddddd,dddd#',
        '#dddd#dddddddd#dddd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '##########d#########',
      ],
      enemies: [
        { type: 'bat', x: 7, y: 2 },
        { type: 'bat', x: 12, y: 9 },
        { type: 'spitter', x: 10, y: 6 },
      ],
      // statues flank the eye switch by the west door — arrows only (needs Bow)
      switches: [{ id: 'd1_eye_hub', x: 2, y: 5, kind: 'eye' }],
      doors: [
        { id: 'd1_door_boss', x: 10, y: 0, dir: 'N', kind: 'boss' },
        { id: 'd1_door_lock1', x: 19, y: 5, dir: 'E', kind: 'locked' },
        { id: 'd1_door_eye', x: 0, y: 5, dir: 'W', kind: 'sealed',
          opens: { switches: ['d1_eye_hub'], persist: true } },
      ],
    },

    // ---- MINIBOSS: bigSlime guards the Bow; plates + clear open the way north ----
    '2,1': {
      tiles: [
        '####################',
        '#dddddddddddddddddd#',
        '#ddddddddAdAddddddd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        'ddddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#dd,dddddddddddd,dd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#OddddddddddddddddO#',
        '####################',
      ],
      miniboss: { type: 'bigSlime', x: 10, y: 6 },
      chests: [
        { id: 'd1_chest_bow', x: 10, y: 2, contents: { item: 'bow' }, big: true },
      ],
      blocks: [
        { x: 6, y: 8 },
        { x: 14, y: 8 },
      ],
      plates: [
        { id: 'd1_plate_mb1', x: 6, y: 3 },
        { id: 'd1_plate_mb2', x: 14, y: 3 },
      ],
      doors: [
        { id: 'd1_door_mb_n', x: 10, y: 0, dir: 'N', kind: 'sealed',
          opens: { plates: ['d1_plate_mb1', 'd1_plate_mb2'], clear: true, persist: true } },
      ],
    },

    // ---- SUPPLY ROOM: arrows for the new Bow, gems, target practice ----
    '2,0': {
      tiles: [
        '####################',
        '#dd,dddddddddddd,dd#',
        '#dWWdddddddddddWWdd#',
        '#dWWdddddddddddWWdd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#dd,dddddddddddd,dd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#OOddddddddddddddOO#',
        '#dddddddddddddddddd#',
        '##########d#########',
      ],
      enemies: [
        { type: 'spitter', x: 5, y: 5 },
        { type: 'spitter', x: 14, y: 5 },
        { type: 'bat', x: 10, y: 7 },
      ],
      chests: [
        { id: 'd1_chest_arrows', x: 10, y: 4, contents: { arrows: 10 } },
        { id: 'd1_chest_gems2', x: 15, y: 7, contents: { gems: 20 } },
      ],
    },

    // ---- KEY #2: pit-moat chest, beetles on patrol (behind the eye door) ----
    '0,1': {
      tiles: [
        '####################',
        '#dd,dddddddddddd,dd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#ddddddddddddddddddd',
        '#ddddddddvvvddddddd#',
        '#ddddddddvdvddddddd#',
        '#ddddddddvdvddddddd#',
        '#dddddddddddddddddd#',
        '#OddddddddddddddddO#',
        '####################',
      ],
      enemies: [
        { type: 'beetle', x: 4, y: 4 },
        { type: 'beetle', x: 15, y: 4 },
        { type: 'spitter', x: 10, y: 3 },
      ],
      chests: [
        { id: 'd1_chest_key2', x: 10, y: 7, contents: { item: 'smallKey' } },
      ],
      doors: [
        { id: 'd1_door_lock2', x: 10, y: 0, dir: 'N', kind: 'locked' },
      ],
    },

    // ---- BOSS KEY: spike gauntlet guards the chest; clearing drops bonus gems ----
    '0,0': {
      tiles: [
        '####################',
        '#dddddddddddddddddd#',
        '#ddddddddAdAddddddd#',
        '#dddddddddddddddddd#',
        '#dd,dddddddddddd,dd#',
        '#ddddd^^^ddd^^^dddd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#OddddddddddddddddO#',
        '#dddddddddddddddddd#',
        '##########d#########',
      ],
      enemies: [
        { type: 'beetle', x: 6, y: 7 },
        { type: 'beetle', x: 13, y: 7 },
        { type: 'spitter', x: 10, y: 4 },
      ],
      chests: [
        { id: 'd1_chest_bosskey', x: 10, y: 2, contents: { item: 'bossKey' } },
      ],
      onClear: {
        chest: { id: 'd1_chest_clear_gems', x: 5, y: 8, contents: { gems: 20 } },
      },
    },

    // ---- BOSS: bramblehorn arena (statues to bait charges into) ----
    '1,0': {
      tiles: [
        '####################',
        '#dddddddddddddddddd#',
        '#dAddddddddddddddAd#',
        '#dddddddddddddddddd#',
        '#dd,dddddddddddd,dd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        '#dd,dddddddddddd,dd#',
        '#dddddddddddddddddd#',
        '#dAddddddddddddddAd#',
        '#dddddddddddddddddd#',
        '##########d#########',
      ],
      boss: { type: 'bramblehorn', x: 10, y: 4 },
    },

  },
};
