# The Shattered Crown — Game Design

A top-down 2D Zelda-like (A Link to the Past vibes) built in Phaser 3. All art and
music are procedurally generated in code. Read docs/ARCHITECTURE.md for the exact
data schemas; this document is WHAT to build, that one is HOW.

## Story

Long ago the Crown of Eldoria kept the land in balance. The sorcerer **Morgrath**
shattered it into three shards and hid them in three temples guarded by his
generals, then raised the Dark Citadel in the Ashen Wastes behind a magical
barrier. Monsters now roam the land. A kid from **Willow Village** (the player)
is chosen by Elder Rowan to recover the **Emerald, Ruby and Sapphire shards**,
break the barrier, storm the Citadel and defeat Morgrath to reforge the crown.

Acts:
1. Wake in Willow Village → Elder Rowan sends you to **Vinewood Temple** (forest, D1). Reward: **Bow** + Emerald Shard.
2. **Sandstone Ruins** (desert, D2; cracked walls everywhere). Reward: **Bombs** + Ruby Shard.
   **Glacier Hollow** (mountains, D3; ice puzzles). Reward: **Power Boots** + Sapphire Shard.
   (D2/D3 doable in either order; D2 is gated by needing the Bow for its entrance eye-switch,
   D3's entrance is blocked by a cracked boulder needing Bombs.)
3. Three shards dissolve the barrier at the Ashen Wastes → **Dark Citadel** → Morgrath
   (two-phase final boss) → crown reforged → victory + credits.

Optional: hidden **Sunken Shrine** in the swamp holds the **Hero's Blade** (2x damage).

## Overworld — 10 cols x 8 rows of rooms (80 screens)

Room keys are `"col,row"`, col 0–9 west→east, row 0–7 north→south. Each room is
20x12 tiles. Regions own these cells (file = `src/world/regions/<name>.js`):

| Region    | Cells                          | Rooms | Biome key   |
|-----------|--------------------------------|-------|-------------|
| mountains | cols 0–5, rows 0–1             | 12    | `mountains` |
| wastes    | cols 6–9, rows 0–1             | 8     | `wastes`    |
| forest    | cols 0–2, rows 2–4             | 9     | `forest`    |
| meadows   | cols 3–6 rows 2–4 + cols 3–4 rows 5–7 | 18 | `meadows` |
| lake      | cols 7–9, rows 2–4             | 9     | `lake`      |
| swamp     | cols 0–2, rows 5–7             | 9     | `swamp`     |
| desert    | cols 5–9, rows 5–7             | 15    | `desert`    |

### Cross-region gateways (EXACT — all other cross-region edges must be sealed solid)

Edge geometry: rooms are x:0–19, y:0–11. An east/west gateway "y=5,6" means tiles
(19,5),(19,6) of the west room AND (0,5),(0,6) of the east room are walkable, with
walkable ground continuing inward. A north/south gateway "x=9,10" means (9,11),(10,11)
of the north room and (9,0),(10,0) of the south room are walkable.

- forest (2,3) E ↔ meadows (3,3) W — open y=5,6
- meadows (6,3) E ↔ lake (7,3) W — open y=5,6
- swamp (2,6) E ↔ meadows (3,6) W — open y=5,6
- meadows (4,6) E ↔ desert (5,6) W — open y=5,6
- mountains (5,1) E ↔ wastes (6,1) W — open y=5,6 (wastes side has the shard BARRIER, see wastes brief)
- mountains (1,1) S ↔ forest (1,2) N — open x=9,10
- mountains (4,1) S ↔ meadows (4,2) N — open x=9,10
- meadows (6,4) S ↔ desert (6,5) N — open x=9,10
- lake (8,4) S ↔ desert (8,5) N — open x=9,10
- forest (1,4) S ↔ swamp (1,5) N — open x=9,10

Within your own region you choose connectivity freely, but BOTH sides of every
open internal edge must be walkable, and every room must be reachable.
The outer border of the world (row 0 north edge, row 7 south edge, col 0 west
edge, col 9 east edge) must be fully solid.

### Region briefs

**meadows** (start region, `src/world/regions/meadows.js`)
- Willow Village spans (4,3)+(5,3): houses (use `H` walls + `D` doors), paths, fences, flowers.
  Player spawns at (4,3) tile 10,8.
- Warps: `D` at elder's house → interiors `elder_house`; house → `pip_house`;
  shop building → `village_shop`. Place sign `sign_village_square`, `sign_village_shop`.
- NPCs outside: `kid_pip` (4,3), `villager_ana` (5,3), `farmer_joss` at farm (3,5) or (4,5),
  `guard_tomas` at (4,2) (warns about mountain pass).
- South cells (3,5)–(4,7) are farmland/fields: crops (use `,` rows + fences), a farm,
  sign `sign_farm`, sign `sign_crossroads` at (4,4) or (5,4).
- Secrets: 2 golden acorns (one in a `X`-hidden cave? No — meadows acorns sit behind bush mazes
  or pot/bush cuts: place as collectible entities per ARCHITECTURE), 1 cracked boulder `X` at
  (3,4) hiding stairs → interiors `cave_meadow_gems` (chest of gems).
- Enemies: light — slime, redSlime in outer cells; village cells (4,3),(5,3) SAFE (no enemies).

**forest** (`forest.js`)
- Dense `T` borders, winding paths, tallgrass everywhere.
- D1 **Vinewood Temple** entrance: room (1,2) — temple facade (`#`/`A` statues) with `S`
  stairs warp → map `dungeon1` room `1,2` pos 10,10. Sign `sign_d1_entrance`.
- Squirrel grove: room (0,3) hidden behind cuttable bush wall → NPC `nutwick` (Squirrel King).
- Secrets: 3 acorns (one in grove, one behind bushes, one in `cave_forest_gems` — `X` boulder
  in (2,4) warps to that interior). Sign `sign_forest_edge` at the meadows gateway room (2,3).
- Enemies: slime, bat, spitter, beetle.

**lake** (`lake.js`)
- Big `W` lake spanning the middle cells, beaches (`s`), bridges (`b`), reeds (`,`).
- NPC `fisher_finn` at (7,3). Sign `sign_lake`.
- Fairy pond: room (9,2) has `D`/`S` warp → interiors `fairy_pond_lake` (full heal + `fairy_aria`).
- Secrets: bush-hidden stairs at (7,4) → interiors `cave_lake_heart` (Heart Container!);
  2 acorns (one on an island reachable by bridge, one behind bushes).
- Enemies: slime, spitter, bat, beetle.

**mountains** (`mountains.js`)
- `M` cliffs, `n` snow ground, `R` rocks, narrow passes, `i` ice patches.
- D3 **Glacier Hollow** entrance: room (2,0) — cave mouth blocked by cracked boulder `X`
  (BOMBS required) warping → map `dungeon3` room `1,2` pos 10,10. Sign `sign_d3_entrance`.
- Hermit cave: `S` in (4,0) → interiors `hermit_cave` (NPC `hermit_aldous`).
- Secrets: `X` boulder in (0,0) → interiors `cave_mountain_heart` (Heart Container);
  2 acorns. Sign `sign_mountain_pass` at (4,1).
- Enemies: iceWolf, iceSlime, frostWisp, bat.

**wastes** (`wastes.js`)
- Ash ground (`e`), dead trees `T`, lava `L`, rubble `R`. Hostile, end-game.
- Room (6,1): the BARRIER — place entity `barrier` (see ARCHITECTURE room schema:
  `barrier:{x,y}` list) as a wall of magic across the western gateway corridor; engine
  removes it when player has 3 shards. Sign `sign_barrier` next to it.
- Dark Citadel entrance: room (8,0), big evil facade, `S` warp → map `citadel` room `1,3`
  pos 10,10. Sign `sign_citadel`.
- Enemies: knight, wizard, skeleton, bat (hardest overworld region).
- 0 acorns. A pot/gem cache room is fine.

**swamp** (`swamp.js`)
- `w` shallows (slow), `W` deep water, `T` gnarled trees, mist vibes, `,` reeds.
- Witch hut: `D` in (2,5) → interiors `witch_hut` (NPC `witch_morla`, hints shrine).
- **Sunken Shrine** entrance: room (1,6), ancient stones, `S` warp → map `shrine`
  room `0,1` pos 10,10. Sign `sign_shrine` (riddle-ish hint), sign `sign_swamp` at (1,5).
- Secrets: 1 acorn on a deep-water island reachable by hidden bridge or wade path.
- Enemies: slime, redSlime, spitter, bat.

**desert** (`desert.js`)
- `s` sand, `Y` cactus, `R` rocks, ruins chunks (`#`,`A`).
- D2 **Sandstone Ruins** entrance: room (8,6) — ruin facade; the `S` warp (→ map `dungeon2`
  room `1,2` pos 10,10) is BEHIND a locked mechanism: place an `eye` switch (needs BOW) that
  opens a `sealed` door blocking the stairs alcove. Sign `sign_d2_entrance`.
- Nomad tent: `D` in (5,5) → interiors `nomad_tent` (NPC `nomad_zara`).
- Oasis: room (6,6) — water + palms(`T`) + `S` → interiors `fairy_pond_desert` (full heal).
  Sign `sign_oasis`.
- Secrets: `X` boulder at (9,7) → interiors `cave_desert_heart` (Heart Container); 2 acorns.
  Sign `sign_desert_edge` at (5,6) or (6,5).
- Enemies: scarab, skeleton, skeletonArcher, mummy (deeper cells), spitter.

## Interiors (map `interiors`, file `src/world/interiors.js`)

Room keys are names (not grid coords); `isolated:true`; exit by walking back onto the
entry `D`/`U` warp tile, which warps back outside (interiors agent adds the return warp;
coordinates of each overworld-side warp tile are listed by the validator if mismatched —
coordinate exactly with the region briefs above).

Rooms to build: `elder_house`, `pip_house`, `village_shop` (shop items: potion 40,
arrows10 20, bombs5 25, lantern 60 — see ARCHITECTURE `shopItems`), `witch_hut`,
`hermit_cave`, `nomad_tent`, `fairy_pond_lake` (fairy `heal:true` zone + `fairy_aria`),
`fairy_pond_desert` (heal), `cave_meadow_gems` (chest: 50 gems), `cave_forest_gems`
(chest: 50 gems + acorn entity), `cave_mountain_heart` (chest: heartContainer),
`cave_desert_heart` (chest: heartContainer), `cave_lake_heart` (chest: heartContainer),
`nutwick_grove`? — NO: nutwick stands in forest room (0,3) directly.

Interior return warps must target the overworld room/tile just below/next to the
entrance tile the player used.

## Dungeons

Every dungeon is its own map with rooms on a small grid. Dungeon rooms use `#` walls,
`d` floors, `O` pots, hazards. Connectivity via open edge corridors and `doors`
(see schema). Each dungeon: small keys open `locked` doors (consumed), one `bossKey`
opens the `boss` door, `sealed` doors open on room clear or puzzle conditions.
Bosses drop a **Heart Container** and their **shard pickup**, and a portal (warp entity)
back to the entrance appears. The dungeon-complete flag is set automatically.

**dungeon1 — Vinewood Temple** (file `dungeon1.js`, 3x3 grid, ~9 rooms, entry room `1,2`)
- Enemies: slime, bat, spitter, beetle. 2 smallKeys, 1 bossKey, item: **Bow** (big chest).
- Flow: entry → block/plate puzzle opens way → key #1 in clear-room seal → locked door →
  miniboss **bigSlime** guards the Bow big chest → eye-switch (now you have Bow) opens
  path to key #2 + bossKey chest → boss door at `1,0`: **bramblehorn**.
- Reward: Emerald Shard.

**dungeon2 — Sandstone Ruins** (`dungeon2.js`, 4x3 grid, ~11 rooms, entry `1,2`)
- Enemies: scarab, mummy, skeleton, skeletonArcher. 3 smallKeys, bossKey, item: **Bombs**
  (bombBag big chest mid-dungeon). Early chest contains **lantern** (so torch puzzles
  never hard-block; engine converts duplicate item chests to 20 gems).
- Puzzles: torch lighting (lantern), cracked walls `C` (post-bombs), eye switches,
  pits/spikes, push blocks. Miniboss **mummyKnight**. Boss `3,0` or similar: **sandWyrm**.
- Reward: Ruby Shard.

**dungeon3 — Glacier Hollow** (`dungeon3.js`, 4x3 grid, ~11 rooms, entry `1,2`)
- Enemies: iceSlime, iceWolf, frostWisp, eyeSentry. 3 smallKeys, bossKey, item:
  **Power Boots** (big chest). Puzzles: `i` ice-slide mazes, block-sokoban-on-ice onto
  plates, 3-torch rooms, cracked floor `C` walls. Miniboss **alphaWolf**.
  Boss: **frostRevenant**. Reward: Sapphire Shard.

**citadel — Dark Citadel** (`citadel.js`, 4x4 grid, ~13 rooms, entry `1,3`)
- Enemies: knight, wizard, skeleton, eyeSentry, mummy, bat — elite mixes. 4 smallKeys,
  bossKey. `dark:true` rooms (lantern shows more). All puzzle types combined.
  A **heartContainer** chest hidden mid-citadel. Gauntlet rooms (sealed until clear).
- Final boss room `1,0`→ **morgrath** (engine handles his two phases). Beating him
  triggers the victory sequence.

**shrine — Sunken Shrine** (`shrine.js`, 2x2 grid, 4 rooms, entry `0,1`)
- Optional secret. Enemies: slime, redSlime, spitter. Plate+torch combo puzzles,
  miniboss **bogLurker** guarding big chest: **heroSword**. No boss key.

## Enemies (keys = ENEMY_TYPES keys = art keys)

| key | hp | touch dmg (hearts) | behavior | notes |
|---|---|---|---|---|
| slime | 1 | 0.5 | hopper | green |
| redSlime | 2 | 0.5 | hopper | faster |
| bat | 1 | 0.5 | flyer | erratic |
| spitter | 2 | 0.5 | shooter | plant, spits seeds |
| beetle | 2 | 1 | charge | telegraphs, dashes |
| skeleton | 3 | 1 | chase | |
| skeletonArcher | 2 | 0.5 | shooter | keeps distance, bones |
| scarab | 2 | 1 | charge | fast |
| mummy | 5 | 1 | chase | slow tank |
| iceWolf | 3 | 1 | chase | fast |
| frostWisp | 2 | 0.5 | flyer+shooter | ice shards |
| iceSlime | 2 | 1 | hopper | |
| knight | 6 | 1 | chase | immune to arrows |
| wizard | 4 | 1 | teleporter | fireballs |
| eyeSentry | 3 | 0 | turret | fires when aligned |
| bigSlime | 10 | 1 | hopper (miniboss, big art) | D1 |
| mummyKnight | 14 | 1.5 | chase+charge (miniboss) | D2 |
| alphaWolf | 12 | 1 | charge (miniboss) | D3 |
| bogLurker | 12 | 1 | teleporter+shooter (miniboss) | shrine |

Bosses (custom code in `src/bosses.js`): `bramblehorn` (14hp giant beetle: charges,
hits wall, stunned → vulnerable), `sandWyrm` (20hp: surfaces at sand spots, spits,
vulnerable while surfaced), `frostRevenant` (22hp: teleports, ice barrages, summons
frostWisps at thresholds), `morgrath` (phase 1: 18hp wizard duel; phase 2: 26hp demon
form, 32x32, spread shots + charges + summons).

## Items & pickups

Inventory items: `sword` (start), `heroSword`, `bow` (+arrows ammo), `bombBag` (+bombs),
`lantern`, `boots`, `potion` (consumable, full heal, max 4), `oakCharm` (12 acorns:
halves damage), shards `shardEmerald`/`shardRuby`/`shardSapphire`, `heartContainer`.
Pickups: hearts, gems (1/5/20 denominations), arrows, bombs, smallKey, bossKey, `acorn`
(12 total world-wide: meadows 2, forest 3, lake 2, mountains 2, swamp 1, desert 2).
Nutwick rewards at 4/8/12 acorns: 100 gems / Heart Container / Oak Charm.

## NPC + sign ids (dialogue lives in src/dialogue_content.js)

NPCs: `elder_rowan`, `shopkeep_mira`, `kid_pip`, `villager_ana`, `farmer_joss`,
`guard_tomas`, `fisher_finn`, `hermit_aldous`, `nomad_zara`, `witch_morla`,
`fairy_aria`, `nutwick`.
Signs: `sign_village_square`, `sign_village_shop`, `sign_farm`, `sign_crossroads`,
`sign_forest_edge`, `sign_d1_entrance`, `sign_lake`, `sign_desert_edge`,
`sign_d2_entrance`, `sign_oasis`, `sign_mountain_pass`, `sign_d3_entrance`,
`sign_swamp`, `sign_shrine`, `sign_barrier`, `sign_citadel`.
Dialogue must react to progress flags (see ARCHITECTURE): shards owned, dungeons
complete, items owned. Tone: warm, lightly funny, readable by a kid. Keep lines short
(max ~38 chars per line, 3 lines per page).

## Music & SFX (src/audio_content.js)

Songs (loops unless noted): `title`, `meadows`, `forest`, `desert`, `mountains`,
`swamp`, `lake`, `wastes`, `dungeon1`, `dungeon2`, `dungeon3`, `citadel`, `shrine`,
`boss`, `finalboss`, `victory`, `gameover`, plus jingles (non-loop): `fanfare`
(item get), `secret` (secret found). Engine maps biome/map → song.
SFX recipe keys the engine will call: `sword, hit, enemyDie, hurt, pickup, gem, heart,
key, unlock, doorOpen, chest, secret, bombPlace, explosion, arrow, push, plate, switch,
torch, stairs, blip, menuMove, menuSelect, save, fall, shardGet, potion, denied, barrier,
bossRoar`.
