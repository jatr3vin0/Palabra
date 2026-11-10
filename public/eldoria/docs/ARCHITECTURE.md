# Architecture & Data Contracts

Plain JS, no build step, classic `<script>` tags (NO `import`/`export`/modules).
Every file attaches to `window.*` registries that the engine defines BEFORE content
files load. Content files contain ONLY data + registration calls — no engine edits,
no new globals, no Phaser calls.

Load order (index.html): config → tiles → engine (textures/audio/save/dialogue/items/
enemies/player/etc.) → CONTENT FILES (art, audio_content, dialogue_content,
enemy_types, bosses, world data) → scenes → main.

## Coordinates

A room is 20 tiles wide (x: 0–19, west→east) and 12 tall (y: 0–11, north→south).
All entity positions in room data are TILE coordinates (integers). Tile (0,0) is
top-left. `tiles` is an array of EXACTLY 12 strings, each EXACTLY 20 chars, using
ONLY chars from `src/world/tiles.js`.

## Map & room registration

```js
// Region file (e.g. src/world/regions/forest.js):
Object.assign(WORLD.maps.overworld.rooms, {
  '1,2': { biome: 'forest', tiles: [/*12 strings*/], enemies: [...], ... },
});
// Dungeon file (e.g. src/world/dungeon1.js):
WORLD.maps.dungeon1 = {
  kind: 'dungeon', name: 'Vinewood Temple', music: 'dungeon1',
  rooms: { '1,2': {...}, '1,1': {...} },
};
// interiors.js:
WORLD.maps.interiors = { kind: 'interior', rooms: { elder_house: { isolated: true, ... } } };
```
`WORLD.maps.overworld` is predefined by the engine (`kind:'overworld'`). Adjacent
grid rooms in non-isolated maps connect automatically by walking off an open edge.

## Room schema (all fields optional except `tiles`; omit empty ones)

```js
{
  biome: 'forest',          // overworld only: meadows|forest|lake|mountains|wastes|swamp|desert
  tiles: ['....', ...],     // 12 x 20 chars
  dark: true,               // darkness overlay; lantern widens visible circle
  safe: true,               // no enemies will ever spawn (village)
  isolated: true,           // interiors: no edge transitions
  heal: true,               // fairy pond: walking into the room's center pool heals (engine handles via this flag)
  enemies: [{ type: 'slime', x: 5, y: 4 }],            // type ∈ ENEMY_TYPES
  npcs:    [{ id: 'elder_rowan', art: 'elder', x: 9, y: 5 }], // id keys DIALOGUE
  signs:   [{ id: 'sign_lake', x: 4, y: 6 }],          // id keys DIALOGUE.signs
  chests:  [{ id: 'd1_key1', x: 9, y: 4, contents: { item: 'bow' }, big: true }],
           // contents: {item:'bow'} | {gems:50} | {arrows:10} | {bombs:5}
           //           | {item:'smallKey'} | {item:'bossKey'} | {item:'heartContainer'}
           // id must be GLOBALLY unique (prefix with map: 'd1_', 'ow_', 'int_').
  pickups: [{ x: 3, y: 4, item: 'acorn', id: 'ow_acorn_forest1' }],  // persistent floor pickup
  pots:    [{ x: 4, y: 4 }],                            // breakable, random drops (use tile 'O' instead when convenient)
  blocks:  [{ x: 8, y: 5 }],                            // pushable 1 tile at a time
  plates:  [{ id: 'p1', x: 10, y: 5 }],                 // pressed by player OR block
  torches: [{ id: 't1', x: 4, y: 2, lit: false }],      // light w/ lantern (stand adjacent, use it)
  switches:[{ id: 's1', x: 10, y: 2, kind: 'eye' }],    // kind: 'crystal' (hit w/ anything) | 'eye' (arrow only)
  doors:   [{ id: 'd1_door_a', x: 10, y: 0, dir: 'N', kind: 'locked' }],
           // kind: 'locked' (smallKey) | 'boss' (bossKey) | 'sealed'
           // sealed doors need `opens`: { plates:['p1'], torches:['t1'], switches:['s1'], clear:true }
           //   (all listed conditions must hold; 'clear' = all enemies in room dead)
           // doors sit ON a wall tile at the room edge (x 0-19/y 0 or 11), dir = which edge.
           // Opened locked/boss doors stay open forever (flag). Sealed doors with clear-condition
           // re-seal on re-entry (unless their opens also has persist:true).
  warps:   [{ x: 9, y: 3, to: { map: 'dungeon1', room: '1,2', x: 10, y: 10 },
              hidden: 'bomb' }],   // hidden: 'bomb'|'cut' → only active once the X/B tile at
                                   // that position is destroyed (engine flags it permanently)
  barrier: [{ x: 19, y: 5 }, { x: 19, y: 6 }],  // shard barrier tiles; vanish with 3 shards
  miniboss: { type: 'mummyKnight', x: 10, y: 4 },  // killed-once-forever (auto flag)
  boss:     { type: 'bramblehorn', x: 10, y: 4 },  // BOSSES key; arena room
  onClear:  { openDoors: ['d1_door_b'], chest: { id: 'd1_bonus', x: 10, y: 6, contents: { gems: 20 } } },
            // fires when all enemies+miniboss in the room die (once per visit; chest spawn is flagged)
  shopItems: [{ x: 6, y: 4, item: 'potion', price: 40 }], // walk up + press action to buy
}
```

Entity placement rules: never on a solid tile; never on the outermost border tile
unless it's a door/warp; keys/bossKey via chests, not floor pickups. Warp `to.x/to.y`
must be a walkable tile in the target room, NOT itself a warp tile (or the player
ping-pongs) — land the player one tile in front of the return warp.

Every `S`/`U`/`D` tile should have a matching `warps` entry at the same x,y.
Interior return warps point back to the overworld tile directly SOUTH of the
entrance tile (which must be walkable).

## Enemy definitions (src/enemy_types.js)

```js
ENEMY_TYPES.slime = {
  art: 'slime', hp: 1, dmg: 0.5, speed: 30, behavior: 'hopper',
  opts: {},                       // behavior tuning, see below
  drops: { heart: .25, gems: .35, arrows: .05, bombs: .05 }, // rest = nothing
  immune: [],                     // e.g. ['arrow'] for knight
  big: true,                      // minibosses: uses 32x32 art, 2x body
};
```
Behaviors implemented by the engine (use ONLY these; tune via `opts`):
- `hopper`  — hops toward player-ish. opts: `{hopMs:900, pause:400}`
- `chase`   — walks at player when within `opts.aggro` px (default 100), else wanders
- `wander`  — random walk
- `charge`  — telegraph (flash) then dash at player in a cardinal direction; stunned on wall hit. opts: `{dashSpeed:160}`
- `shooter` — keeps `opts.range` distance, fires `opts.projectile` (art key) every `opts.cooldown` ms (default 1500), speed `opts.shotSpeed`
- `flyer`   — sine-wave float toward player, passes over pits/hazards. Combine shooting via `opts.shoot:true` + shooter opts.
- `turret`  — stationary; fires when player roughly aligned (row/col)
- `teleporter` — blinks near player every `opts.blinkMs` (default 2200), fires a shot after appearing

Projectile art keys available: `seed, bone, iceShard, fireball, rockShot, magicBolt`.

## Bosses (src/bosses.js) — real code, against this exact API

```js
BOSSES.bramblehorn = {
  art: 'bramblehorn', w: 32, h: 32, hp: 14, dmg: 1,
  create(scene, boss) { boss.mem = {state:'idle', t:0}; },   // boss is a Phaser sprite
  update(scene, boss, dt) { /* dt ms; drive boss.x/boss.y or use helpers */ },
  onHit(scene, boss, source) {     // source: 'sword'|'heroSword'|'arrow'|'bomb'
    // return damage number to apply, or 0 to reject the hit (clank)
    return boss.mem.state === 'stunned' ? 2 : 0;
  },
};
```
Helpers available inside update/create (all on `scene`):
- `scene.bossShoot(boss, {angle, atPlayer:true, speed:90, art:'fireball', dmg:1})` — angle in radians, or atPlayer
- `scene.bossShootSpread(boss, {count:5, spread:Math.PI/3, atPlayer:true, speed, art, dmg})`
- `scene.spawnEnemy(type, tx, ty)` — spawn minion at tile coords
- `scene.playerPos()` → `{x, y}` pixels; `boss.x/boss.y` are pixels too
- `scene.moveToward(boss, x, y, speed)` — call each update tick to move; stops at walls
- `scene.tileAtPixel(x, y)` → tile char (check walls: `TILES.isSolid(ch)`)
- `scene.shake(ms, power)`, `scene.sfx(name)`, `scene.bossSetFrame(boss, i)`
- `boss.hp` (engine-managed), `boss.invulnUntil` (timestamp ms, set to reject hits),
  `scene.time.now`, `boss.mem` (free scratch object)
Engine handles: touch damage (`dmg`), weapon collisions (calls `onHit`; if no `onHit`,
all hits deal their normal damage), death (drops, heart container, shard for dungeon
bosses, flags, doors). Morgrath ONLY: when phase-1 hp hits 0, the engine looks for
`BOSSES.morgrath2` and transforms (full hp from morgrath2.hp) before final death.

## Art (src/sprites/*.js)

```js
registerArt('slime', { w: 16, h: 16, frames: 2, draw(ctx, f) {
  // ctx: Canvas2D, origin top-left, draw within w x h. f = frame index.
  // Use ctx.fillStyle / fillRect for chunky pixels (e.g. 1px = 1 texel).
}});
```
Engine turns each registration into textures `name_0 .. name_{frames-1}`.
Missing art auto-falls-back to a magenta placeholder (never crashes).
- Tile arts use the tile NAME from tiles.js (`grass`, `tree`, `pot`...), 16x16.
  GROUND tiles opaque; props/solids may use transparency — engine paints the biome's
  base ground underneath everything. Animated tiles: register 2 frames (`water`,
  `shallow`, `lava`, `flowers` should have 2).
- Player art key `player` is special: w:16 h:16, frames laid out as
  0-1 walk-down, 2-3 walk-up, 4-5 walk-left, 6-7 walk-right,
  8 swing-down, 9 swing-up, 10 swing-left, 11 swing-right, 12 item-raise (16 frames ok; extras unused).
- Required keys are enumerated in GAME_DESIGN (tiles, every enemy, NPC arts `elder,
  shopkeep, kid, villager, farmer, guard, fisher, hermit, nomad, witch, fairy, squirrel`,
  bosses at 32x32 (`morgrath2` 48x48), items/props/projectiles below).
- Item/prop/UI keys: `heart, heartHalf, heartEmpty, heartContainer, gem, gemBlue,
  arrowPickup, bombPickup, smallKey, bossKey, bow, bombItem, lantern, boots, potion,
  swordItem, heroSword, shardEmerald, shardRuby, shardSapphire, acorn, oakCharm, crown,
  chestClosed, chestOpen, bigChestClosed, bigChestOpen, block, plate, platePressed,
  torchLit, torchUnlit, switchEye, switchEyeHit, switchCrystal, switchCrystalHit,
  doorLocked, doorBoss, doorSealed, barrierTile, sign, portal,
  arrow, seed, bone, iceShard, fireball, rockShot, magicBolt,
  slashArc, explosion, sparkle, dust, shadow` (projectiles/effects 2 frames where sensible:
  explosion 3 frames, sparkle 2).
- Weapons during swing: engine draws `slashArc` rotated; arrows use `arrow`.

## Audio (src/audio_content.js)

```js
registerSong('meadows', { bpm: 112, loop: true, tracks: [
  { wave: 'square', volume: .18, notes: 'C4:1 E4:1 G4:2 -:1 A4:1 ...' },
  { wave: 'triangle', volume: .25, notes: 'C2:4 G2:4 ...' },   // bass
  { wave: 'noiseHat', volume: .05, notes: 'x:1 -:1 x:1 -:1' }, // percussion: 'x' = tick
]});
```
`notes`: space-separated `NAME:BEATS` tokens. NAME = note like `C4 D#4 Eb3 A5` or `-`
(rest) or `x` (percussion tick). BEATS may be fractional (`:0.5`). Tracks loop
independently over the song length (longest track defines loop length).
Waves: `square | triangle | sawtooth | sine | noiseHat | noiseSnare`.
```js
registerSfx('sword', { type: 'sweep', wave: 'square', from: 700, to: 220, dur: 0.09, vol: .3 });
// types: 'sweep' (freq from→to), 'blip' (freq, dur), 'noise' (dur, from→to filter-ish pitch),
// 'chord' (freqs:[..], dur, stagger)  — vol 0..1
```
Required song + sfx keys are listed in GAME_DESIGN. Engine plays `secret`/`fanfare`
jingles over music automatically at the right moments.

## Dialogue (src/dialogue_content.js)

```js
DIALOGUE.elder_rowan = [
  { if: { flagsAll: ['d1_complete'], shardsMin: 1 }, lines: [
      ['Wonderful! The Emerald Shard!', 'Two remain, brave one.'],  // page = array of 1-3 short lines
      ['Seek the desert ruins next.'] ],
    set: { flag: 'elder_told_d2' },          // optional: set flag after reading
    give: { gems: 30, once: 'elder_gift1' }, // optional one-time gift (flagged)
  },
  { lines: [['Monsters in the meadows...', 'Be careful out there.']] }, // default LAST (no `if`)
];
DIALOGUE.signs = { sign_lake: ['Lake Aria', 'No swimming. Monsters.'] };   // signs: 1 page, 1-2 lines
```
Condition fields (all optional, AND-ed): `flagsAll:[..]`, `flagsNone:[..]`,
`shardsMin:n`, `items:['bow']`, `acornsMin:n`. First matching entry wins, so order
specific→general, default last. Useful engine-set flags: `d1_complete, d2_complete,
d3_complete, shrine_complete, game_complete, has_bow, has_bombBag, has_lantern,
has_boots, has_heroSword, has_oakCharm`. NPCs you may `set`/test custom flags on:
prefix `npc_` (e.g. `npc_elder_met`). `nutwick` acorn rewards are engine-driven; his
dialogue should react to `acornsMin` + flags `nutwick_r1/r2/r3` (set by engine at 4/8/12).

## Save / flags

localStorage, 3 slots. Engine persists: hearts/maxHearts, gems/arrows/bombs/potions,
items owned, shards, acorns, all `flags` (opened chests `chest_<id>`, doors, secrets,
bosses, picked pickups), checkpoint (map/room/xy at last entrance/door). Content files
never touch SAVE directly — chests/doors/pickups/secrets are flagged automatically by id.

## Validator (tools/validate.js)

Node script, run `node tools/validate.js`. Loads tiles.js + config.js + content files
in a sandbox (define the registries it needs: `window={}`, `WORLD`, `ENEMY_TYPES`,
`BOSSES` stub, `DIALOGUE`, `registerArt/registerSong/registerSfx` collectors), then checks:
1. every room: exactly 12 rows x 20 cols, all chars known to TILES.
2. overworld border solidity + the EXACT gateway list from GAME_DESIGN both-sides-walkable.
3. adjacent-room edge consistency: any walkable border tile whose neighbor-room
   opposite tile is solid → warning (one-way wall); both-walkable = fine; report count.
4. warps: target map+room exists, target tile walkable & not a warp tile; hidden warps
   sit on `X`/`B` tiles; every S/U/D tile has a warp (else error).
5. entities on solid tiles → error (except doors). chest/pickup id global uniqueness.
6. enemies/bosses/minibosses exist in ENEMY_TYPES/BOSSES; npc ids have DIALOGUE entries;
   sign ids have DIALOGUE.signs entries.
7. doors: `opens` references resolve to plates/torches/switches in the SAME room;
   sealed doors have `opens` or are opened by onClear of their room.
8. per-dungeon key economy: smallKey chests ≥ locked doors.
9. overworld reachability flood-fill from START room treating bushes/cracked as passable.
10. art keys referenced anywhere (tiles legend names, enemy/boss arts, npc arts,
    required list in ARCHITECTURE) that were never registered (needs art files loaded).
Exit non-zero on errors; print warnings separately.

## Rules for content agents

1. Write ONLY the file(s) assigned to you. Never edit engine files, tiles.js, or docs.
2. Use only documented schema fields, tile chars, behavior names, item keys, art keys.
3. ASCII rooms: EXACTLY 12 strings of EXACTLY 20 chars. Count carefully.
4. Prefix all ids with your map (`d1_`, `ow_mead_`, `int_`...) for global uniqueness.
5. Don't place entities on solid tiles; keep 1-tile borders solid except openings.
6. Make it FUN and generous: secrets, pots, gem caches, varied room shapes. The player
   is a kid — challenging but fair, telegraphed hazards, no pixel-perfect demands.
```
