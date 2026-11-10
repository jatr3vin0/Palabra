#!/usr/bin/env node
/*
 * tools/validate.js — content validator for "The Shattered Crown".
 *
 * Run: node tools/validate.js
 *
 * Loads src/world/tiles.js + src/config.js, then every content file that
 * exists (files that have not landed yet are SKIPPED with a note), inside a
 * vm sandbox that stubs the engine registries:
 *   window, WORLD (maps.overworld prefilled), ENEMY_TYPES, BOSSES, DIALOGUE,
 *   registerArt / registerSong / registerSfx collectors.
 *
 * Checks (per docs/ARCHITECTURE.md "Validator" + docs/GAME_DESIGN.md):
 *   1.  every room: exactly 12 rows x 20 cols, all chars known to TILES.
 *   2.  overworld border solidity + the EXACT gateway list from GAME_DESIGN
 *       both-sides-walkable (+ all other cross-region edges sealed).
 *   3.  adjacent-room edge consistency (one-way walls -> warning, with count).
 *   4.  warps: target map+room exists, target tile walkable & not a warp
 *       tile; hidden warps sit on X/B tiles; every S/U/D tile has a warp.
 *   5.  entities on solid tiles -> error (except doors); chest/pickup id
 *       global uniqueness.
 *   6.  enemies/bosses/minibosses exist in ENEMY_TYPES/BOSSES; npc ids have
 *       DIALOGUE entries; sign ids have DIALOGUE.signs entries.
 *   7.  doors: `opens` references resolve in the SAME room; sealed doors
 *       have `opens` or are opened by an onClear; sealed doors must PERSIST
 *       (opens.persist:true or an onClear) so they cannot re-seal and soft-lock.
 *   8.  per-dungeon key economy: smallKey chests >= locked doors (and a
 *       bossKey chest for every boss door).
 *   9.  overworld reachability flood-fill from the START room, treating
 *       bushes/cracked tiles as passable.
 *   10. art keys referenced anywhere (tile legend names, enemy/boss arts,
 *       npc arts, required list in ARCHITECTURE) never registered; plus the
 *       required song/sfx key lists. These registry checks are WARN-only
 *       while the relevant content file is still missing.
 *
 * Output: ERROR/WARN lines with [map room @x,y] locations, summary counts,
 * exit code 1 when there are errors.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const ROOM_W = 20;
const ROOM_H = 12;
const WORLD_COLS = 10;
const WORLD_ROWS = 8;

/* ------------------------------------------------------------------ *
 * Result collectors
 * ------------------------------------------------------------------ */
const errors = [];
const warnings = [];
const notes = [];
function err(loc, msg) { errors.push((loc ? loc + ' ' : '') + msg); }
function warn(loc, msg) { warnings.push((loc ? loc + ' ' : '') + msg); }
function note(msg) { notes.push(msg); }
function at(map, room, x, y) {
  let s = '[' + map;
  if (room !== undefined && room !== null) s += ' ' + room;
  if (x !== undefined) s += ' @' + x + ',' + y;
  return s + ']';
}

/* ------------------------------------------------------------------ *
 * Documented constants (docs/GAME_DESIGN.md + docs/ARCHITECTURE.md)
 * ------------------------------------------------------------------ */
const REGION_NAMES = ['meadows', 'forest', 'lake', 'mountains', 'wastes', 'swamp', 'desert'];

// 'col,row' -> region name owning that overworld cell.
const REGION_CELLS = {};
(function claimAll() {
  function claim(name, c0, c1, r0, r1) {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) REGION_CELLS[c + ',' + r] = name;
  }
  claim('mountains', 0, 5, 0, 1);
  claim('wastes', 6, 9, 0, 1);
  claim('forest', 0, 2, 2, 4);
  claim('meadows', 3, 6, 2, 4);
  claim('meadows', 3, 4, 5, 7);
  claim('lake', 7, 9, 2, 4);
  claim('swamp', 0, 2, 5, 7);
  claim('desert', 5, 9, 5, 7);
})();

// EXACT cross-region gateway list from GAME_DESIGN. axis EW: a=west room
// (open tiles at x=19,y in open) / b=east room (x=0). axis NS: a=north room
// (y=11, x in open) / b=south room (y=0).
const GATEWAYS = [
  { a: '2,3', b: '3,3', axis: 'EW', open: [5, 6], label: 'forest(2,3) E<->W meadows(3,3)' },
  { a: '6,3', b: '7,3', axis: 'EW', open: [5, 6], label: 'meadows(6,3) E<->W lake(7,3)' },
  { a: '2,6', b: '3,6', axis: 'EW', open: [5, 6], label: 'swamp(2,6) E<->W meadows(3,6)' },
  { a: '4,6', b: '5,6', axis: 'EW', open: [5, 6], label: 'meadows(4,6) E<->W desert(5,6)' },
  { a: '5,1', b: '6,1', axis: 'EW', open: [5, 6], label: 'mountains(5,1) E<->W wastes(6,1)' },
  { a: '1,1', b: '1,2', axis: 'NS', open: [9, 10], label: 'mountains(1,1) S<->N forest(1,2)' },
  { a: '4,1', b: '4,2', axis: 'NS', open: [9, 10], label: 'mountains(4,1) S<->N meadows(4,2)' },
  { a: '6,4', b: '6,5', axis: 'NS', open: [9, 10], label: 'meadows(6,4) S<->N desert(6,5)' },
  { a: '8,4', b: '8,5', axis: 'NS', open: [9, 10], label: 'lake(8,4) S<->N desert(8,5)' },
  { a: '1,4', b: '1,5', axis: 'NS', open: [9, 10], label: 'forest(1,4) S<->N swamp(1,5)' },
];
const GATEWAY_BY_PAIR = {};
for (const g of GATEWAYS) GATEWAY_BY_PAIR[g.a + '|' + g.b] = g;

const BEHAVIORS = ['hopper', 'chase', 'wander', 'charge', 'shooter', 'flyer', 'turret', 'teleporter'];
const PROJECTILE_ARTS = ['seed', 'bone', 'iceShard', 'fireball', 'rockShot', 'magicBolt'];

const ENEMY_ROSTER = [
  'slime', 'redSlime', 'bat', 'spitter', 'beetle', 'skeleton', 'skeletonArcher',
  'scarab', 'mummy', 'iceWolf', 'frostWisp', 'iceSlime', 'knight', 'wizard',
  'eyeSentry', 'bigSlime', 'mummyKnight', 'alphaWolf', 'bogLurker',
];
const BOSS_KEYS = ['bramblehorn', 'sandWyrm', 'frostRevenant', 'morgrath'];

const ITEM_KEYS = [
  'sword', 'heroSword', 'bow', 'bombBag', 'lantern', 'boots', 'potion', 'oakCharm',
  'shardEmerald', 'shardRuby', 'shardSapphire', 'heartContainer', 'smallKey', 'bossKey',
];
const PICKUP_ITEM_KEYS = ['acorn', 'heart', 'gem', 'gems', 'arrows', 'bombs', 'potion'];
const SHOP_ITEM_KEYS = ['potion', 'arrows10', 'bombs5', 'lantern'];

const NPC_IDS = [
  'elder_rowan', 'shopkeep_mira', 'kid_pip', 'villager_ana', 'farmer_joss',
  'guard_tomas', 'fisher_finn', 'hermit_aldous', 'nomad_zara', 'witch_morla',
  'fairy_aria', 'nutwick',
];
const SIGN_IDS = [
  'sign_village_square', 'sign_village_shop', 'sign_farm', 'sign_crossroads',
  'sign_forest_edge', 'sign_d1_entrance', 'sign_lake', 'sign_desert_edge',
  'sign_d2_entrance', 'sign_oasis', 'sign_mountain_pass', 'sign_d3_entrance',
  'sign_swamp', 'sign_shrine', 'sign_barrier', 'sign_citadel',
];

const NPC_ART_KEYS = [
  'elder', 'shopkeep', 'kid', 'villager', 'farmer', 'guard', 'fisher',
  'hermit', 'nomad', 'witch', 'fairy', 'squirrel',
];
const ITEM_PROP_ART_KEYS = [
  'heart', 'heartHalf', 'heartEmpty', 'heartContainer', 'gem', 'gemBlue',
  'arrowPickup', 'bombPickup', 'smallKey', 'bossKey', 'bow', 'bombItem', 'lantern',
  'boots', 'potion', 'swordItem', 'heroSword', 'shardEmerald', 'shardRuby',
  'shardSapphire', 'acorn', 'oakCharm', 'crown', 'chestClosed', 'chestOpen',
  'bigChestClosed', 'bigChestOpen', 'block', 'plate', 'platePressed', 'torchLit',
  'torchUnlit', 'switchEye', 'switchEyeHit', 'switchCrystal', 'switchCrystalHit',
  'doorLocked', 'doorBoss', 'doorSealed', 'barrierTile', 'sign', 'portal',
  'arrow', 'seed', 'bone', 'iceShard', 'fireball', 'rockShot', 'magicBolt',
  'slashArc', 'explosion', 'sparkle', 'dust', 'shadow',
];

const REQUIRED_SONGS = [
  'title', 'meadows', 'forest', 'desert', 'mountains', 'swamp', 'lake', 'wastes',
  'dungeon1', 'dungeon2', 'dungeon3', 'citadel', 'shrine', 'boss', 'finalboss',
  'victory', 'gameover', 'fanfare', 'secret',
];
const REQUIRED_SFX = [
  'sword', 'hit', 'enemyDie', 'hurt', 'pickup', 'gem', 'heart', 'key', 'unlock',
  'doorOpen', 'chest', 'secret', 'bombPlace', 'explosion', 'arrow', 'push', 'plate',
  'switch', 'torch', 'stairs', 'blip', 'menuMove', 'menuSelect', 'save', 'fall',
  'shardGet', 'potion', 'denied', 'barrier', 'bossRoar',
];
const WAVES = ['square', 'triangle', 'sawtooth', 'sine', 'noiseHat', 'noiseSnare'];
const SFX_TYPES = ['sweep', 'blip', 'noise', 'chord'];

const ROOM_FIELDS = [
  'biome', 'tiles', 'dark', 'safe', 'isolated', 'heal', 'enemies', 'npcs', 'signs',
  'chests', 'pickups', 'pots', 'blocks', 'plates', 'torches', 'switches', 'doors',
  'warps', 'barrier', 'miniboss', 'boss', 'onClear', 'shopItems',
];
const MAP_FIELDS = ['kind', 'name', 'music', 'rooms'];
const KNOWN_MAPS = ['overworld', 'interiors', 'dungeon1', 'dungeon2', 'dungeon3', 'citadel', 'shrine'];
const DUNGEON_ENTRY = { dungeon1: '1,2', dungeon2: '1,2', dungeon3: '1,2', citadel: '1,3', shrine: '0,1' };
const DUNGEON_GRID = { dungeon1: [3, 3], dungeon2: [4, 3], dungeon3: [4, 3], citadel: [4, 4], shrine: [2, 2] };
const INTERIOR_ROOMS = [
  'elder_house', 'pip_house', 'village_shop', 'witch_hut', 'hermit_cave', 'nomad_tent',
  'fairy_pond_lake', 'fairy_pond_desert', 'cave_meadow_gems', 'cave_forest_gems',
  'cave_mountain_heart', 'cave_desert_heart', 'cave_lake_heart',
];

/* ------------------------------------------------------------------ *
 * Sandbox + loading
 * ------------------------------------------------------------------ */
const ART = Object.create(null);
const SONGS = Object.create(null);
const SFX = Object.create(null);

let currentFile = '(engine stub)';
const roomOwner = Object.create(null);   // overworld room key -> defining file

const sandbox = {};
sandbox.window = sandbox;                 // window.FOO === global FOO
sandbox.console = console;
sandbox.ENEMY_TYPES = {};
sandbox.BOSSES = {};
sandbox.DIALOGUE = { signs: {} };
sandbox.registerArt = function (name, def) { ART[String(name)] = def || {}; };
sandbox.registerSong = function (name, def) { SONGS[String(name)] = def || {}; };
sandbox.registerSfx = function (name, def) { SFX[String(name)] = def || {}; };

const overworldRooms = {};
sandbox.WORLD = {
  maps: {
    overworld: {
      kind: 'overworld',
      rooms: new Proxy(overworldRooms, {
        set(target, prop, value) {
          if (Object.prototype.hasOwnProperty.call(target, prop)) {
            err(at('overworld', prop),
              'room redefined by ' + currentFile + ' (first defined in ' + roomOwner[prop] + ')');
          }
          roomOwner[prop] = currentFile;
          target[prop] = value;
          return true;
        },
        defineProperty(target, prop, desc) {
          if (Object.prototype.hasOwnProperty.call(target, prop)) {
            err(at('overworld', prop),
              'room redefined by ' + currentFile + ' (first defined in ' + roomOwner[prop] + ')');
          }
          roomOwner[prop] = currentFile;
          return Reflect.defineProperty(target, prop, desc);
        },
      }),
    },
  },
};
vm.createContext(sandbox);

const skippedFiles = [];
function loadFile(rel, required) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    if (required) {
      err(null, 'required file missing: ' + rel);
    } else {
      skippedFiles.push(rel);
      note('skipped ' + rel + ' (not found yet — validator runs before all content lands)');
    }
    return false;
  }
  currentFile = rel;
  try {
    vm.runInContext(fs.readFileSync(full, 'utf8'), sandbox, { filename: rel });
    return true;
  } catch (e) {
    err('[' + rel + ']', 'threw while loading: ' + (e && e.message ? e.message : e));
    return false;
  } finally {
    currentFile = '(engine stub)';
  }
}
function listDir(relDir, re) {
  try {
    return fs.readdirSync(path.join(ROOT, relDir)).filter((f) => re.test(f)).sort();
  } catch (e) {
    return [];
  }
}

// --- base contracts (fatal if missing) ---
const haveTiles = loadFile('src/world/tiles.js', true);
const haveConfig = loadFile('src/config.js', true);
const TILES = sandbox.TILES;
const CONFIG = sandbox.CONFIG;
if (!haveTiles || !haveConfig || !TILES || !TILES.legend || !CONFIG) {
  console.error('FATAL: cannot validate without src/world/tiles.js and src/config.js');
  for (const e of errors) console.error('  ERROR ' + e);
  process.exit(1);
}

// --- content files (skip-with-note when absent) ---
const loaded = {
  enemyTypes: false, bosses: false, dialogue: false, art: false, audio: false,
  regions: {},
};
loaded.enemyTypes = loadFile('src/enemy_types.js');
loaded.bosses = loadFile('src/bosses.js');
loaded.dialogue = loadFile('src/dialogue_content.js');

const spriteFiles = listDir('src/sprites', /\.js$/);
if (spriteFiles.length === 0) {
  skippedFiles.push('src/sprites/*.js');
  note('skipped src/sprites/*.js (none found yet)');
}
for (const f of spriteFiles) {
  if (loadFile('src/sprites/' + f)) loaded.art = true;
}

loaded.audio = loadFile('src/audio_content.js');

// World data. Track which maps SHOULD exist after their file loads, and which
// maps are simply not loaded yet (warp targets to those become warnings).
const mapsNotLoaded = new Set();
function loadWorldFile(rel, mapName) {
  const ok = loadFile(rel);
  if (!ok) {
    if (mapName) mapsNotLoaded.add(mapName);
    return false;
  }
  if (mapName && !sandbox.WORLD.maps[mapName]) {
    err('[' + rel + ']', 'loaded but did not define WORLD.maps.' + mapName);
    mapsNotLoaded.add(mapName);
  }
  return ok;
}
loadWorldFile('src/world/interiors.js', 'interiors');
const dungeonFiles = new Set(listDir('src/world', /^dungeon.*\.js$/));
for (const expected of ['dungeon1.js', 'dungeon2.js', 'dungeon3.js']) dungeonFiles.add(expected);
for (const f of Array.from(dungeonFiles).sort()) {
  loadWorldFile('src/world/' + f, f.replace(/\.js$/, ''));
}
loadWorldFile('src/world/shrine.js', 'shrine');
loadWorldFile('src/world/citadel.js', 'citadel');
for (const name of REGION_NAMES) {
  loaded.regions[name] = loadFile('src/world/regions/' + name + '.js');
}
for (const f of listDir('src/world/regions', /\.js$/)) {
  const name = f.replace(/\.js$/, '');
  if (!REGION_NAMES.includes(name)) {
    warn('[src/world/regions/' + f + ']', 'not a documented region file');
    loadFile('src/world/regions/' + f);
  }
}

const WORLD = sandbox.WORLD;
const ENEMY_TYPES = sandbox.ENEMY_TYPES;
const BOSSES = sandbox.BOSSES;
const DIALOGUE = sandbox.DIALOGUE;

/* ------------------------------------------------------------------ *
 * Tile helpers
 * ------------------------------------------------------------------ */
function tdef(ch) { return TILES.legend[ch]; }
function known(ch) { return !!tdef(ch); }
function tileAt(room, x, y) {
  if (!room || !Array.isArray(room.tiles)) return undefined;
  const row = room.tiles[y];
  return (typeof row === 'string') ? row[x] : undefined;
}
function isSolid(ch) { const d = tdef(ch); return !!(d && d.solid); }
function isWalkable(ch) { return known(ch) && !isSolid(ch); }
function isDestructible(ch) { const d = tdef(ch); return !!(d && (d.cut || d.bomb)); }
// Hard solid: solid and not removable by sword/bomb.
function isHardSolid(ch) { return known(ch) && isSolid(ch) && !isDestructible(ch); }
// Flood-fill passability: walkable, or destructible (bushes/cracked count).
function isPassable(ch) { return known(ch) && (!isSolid(ch) || isDestructible(ch)); }
function isWarpTile(ch) { const d = tdef(ch); return !!(d && d.warpTile); }
function parseKey(k) {
  const m = /^(\d+),(\d+)$/.exec(k);
  return m ? { c: +m[1], r: +m[2] } : null;
}
function eachRoom(cb) {
  for (const [mapName, map] of Object.entries(WORLD.maps)) {
    if (!map || typeof map !== 'object') continue;
    for (const [roomKey, room] of Object.entries(map.rooms || {})) {
      cb(mapName, map, roomKey, room);
    }
  }
}
function doorPosSet(room) {
  const s = new Set();
  for (const d of (room && Array.isArray(room.doors) ? room.doors : [])) {
    s.add(d.x + ',' + d.y);
  }
  return s;
}
function runCheck(label, fn) {
  try { fn(); } catch (e) {
    err(null, 'validator internal failure in ' + label + ': ' + (e && e.stack ? e.stack.split('\n')[0] : e));
  }
}

/* ------------------------------------------------------------------ *
 * Map-level sanity (kinds, entries, grids, expected rooms)
 * ------------------------------------------------------------------ */
runCheck('map sanity', () => {
  for (const [mapName, map] of Object.entries(WORLD.maps)) {
    if (!KNOWN_MAPS.includes(mapName)) warn(at(mapName), 'not a documented map name');
    if (!map || typeof map !== 'object' || !map.rooms || typeof map.rooms !== 'object') {
      err(at(mapName), 'map has no rooms object');
      continue;
    }
    for (const f of Object.keys(map)) {
      if (!MAP_FIELDS.includes(f)) warn(at(mapName), "unknown map field '" + f + "'");
    }
    const entry = DUNGEON_ENTRY[mapName];
    if (entry && !map.rooms[entry]) {
      err(at(mapName), "entry room '" + entry + "' is missing");
    }
    const grid = DUNGEON_GRID[mapName];
    if (grid) {
      for (const rk of Object.keys(map.rooms)) {
        const p = parseKey(rk);
        if (!p) { err(at(mapName, rk), 'room key is not a "col,row" grid key'); continue; }
        if (p.c < 0 || p.c >= grid[0] || p.r < 0 || p.r >= grid[1]) {
          warn(at(mapName, rk), 'room outside documented ' + grid[0] + 'x' + grid[1] + ' grid');
        }
      }
    }
  }
  // interiors: every documented room name should exist (once the file lands)
  if (WORLD.maps.interiors && !mapsNotLoaded.has('interiors')) {
    for (const name of INTERIOR_ROOMS) {
      if (!WORLD.maps.interiors.rooms[name]) err(at('interiors', name), 'documented interior room missing');
    }
    for (const [name, room] of Object.entries(WORLD.maps.interiors.rooms)) {
      if (!room || room.isolated !== true) warn(at('interiors', name), 'interior room should have isolated:true');
    }
  }
  // overworld: room keys in bounds, biome matches owning region, owner file matches region
  for (const [rk, room] of Object.entries(WORLD.maps.overworld.rooms)) {
    const p = parseKey(rk);
    if (!p || p.c < 0 || p.c >= WORLD_COLS || p.r < 0 || p.r >= WORLD_ROWS) {
      err(at('overworld', rk), 'room key outside the ' + WORLD_COLS + 'x' + WORLD_ROWS + ' world grid');
      continue;
    }
    const region = REGION_CELLS[rk];
    if (room && typeof room === 'object') {
      if (!room.biome) warn(at('overworld', rk), 'overworld room has no biome');
      else if (room.biome !== region) {
        warn(at('overworld', rk), "biome '" + room.biome + "' does not match region '" + region + "'");
      }
    }
    const owner = roomOwner[rk];
    if (owner && /^src\/world\/regions\//.test(owner)) {
      const ownerName = owner.replace(/^src\/world\/regions\//, '').replace(/\.js$/, '');
      if (REGION_NAMES.includes(ownerName) && ownerName !== region) {
        err(at('overworld', rk), 'cell belongs to region ' + region + ' but was defined by ' + owner);
      }
    }
  }
  // every loaded region must define all of its cells
  for (const name of REGION_NAMES) {
    if (!loaded.regions[name]) continue;
    for (const [cell, region] of Object.entries(REGION_CELLS)) {
      if (region === name && !WORLD.maps.overworld.rooms[cell]) {
        err(at('overworld', cell), 'room missing (region ' + name + ' file is loaded but did not define it)');
      }
    }
  }
});

/* ------------------------------------------------------------------ *
 * Check 1 — room tile grids: 12 rows x 20 cols, all chars known
 * ------------------------------------------------------------------ */
runCheck('check 1 (tile grids)', () => {
  eachRoom((mapName, map, roomKey, room) => {
    const loc = at(mapName, roomKey);
    if (!room || typeof room !== 'object') { err(loc, 'room is not an object'); return; }
    for (const f of Object.keys(room)) {
      if (!ROOM_FIELDS.includes(f)) warn(loc, "unknown room field '" + f + "'");
    }
    if (!Array.isArray(room.tiles)) { err(loc, 'room has no tiles array'); return; }
    if (room.tiles.length !== ROOM_H) {
      err(loc, 'tiles has ' + room.tiles.length + ' rows (need exactly ' + ROOM_H + ')');
    }
    room.tiles.forEach((row, y) => {
      if (typeof row !== 'string') { err(at(mapName, roomKey, 0, y), 'tile row ' + y + ' is not a string'); return; }
      if (row.length !== ROOM_W) {
        err(at(mapName, roomKey, 0, y), 'tile row ' + y + ' is ' + row.length + ' chars (need exactly ' + ROOM_W + ')');
      }
      for (let x = 0; x < row.length; x++) {
        if (!known(row[x])) {
          err(at(mapName, roomKey, x, y), "unknown tile char '" + row[x] + "'");
        }
      }
    });
  });
});

/* ------------------------------------------------------------------ *
 * Check 2 — overworld border solidity + EXACT gateways + sealed edges
 * ------------------------------------------------------------------ */
runCheck('check 2 (borders + gateways)', () => {
  const rooms = WORLD.maps.overworld.rooms;

  // 2a. world outer border fully solid
  for (const [rk, room] of Object.entries(rooms)) {
    const p = parseKey(rk);
    if (!p || !room || !Array.isArray(room.tiles)) continue;
    const edges = [];
    if (p.r === 0) edges.push({ name: 'north', cells: range(ROOM_W).map((x) => [x, 0]) });
    if (p.r === WORLD_ROWS - 1) edges.push({ name: 'south', cells: range(ROOM_W).map((x) => [x, ROOM_H - 1]) });
    if (p.c === 0) edges.push({ name: 'west', cells: range(ROOM_H).map((y) => [0, y]) });
    if (p.c === WORLD_COLS - 1) edges.push({ name: 'east', cells: range(ROOM_H).map((y) => [ROOM_W - 1, y]) });
    for (const edge of edges) {
      const open = [];
      const soft = [];
      for (const [x, y] of edge.cells) {
        const ch = tileAt(room, x, y);
        if (ch === undefined || !known(ch)) continue; // check 1 reported it
        if (!isSolid(ch)) open.push(x + ',' + y + "='" + ch + "'");
        else if (isDestructible(ch)) soft.push(x + ',' + y + "='" + ch + "'");
      }
      if (open.length) err(at('overworld', rk), 'world ' + edge.name + ' border must be fully solid; non-solid at ' + open.join(' '));
      if (soft.length) warn(at('overworld', rk), 'world ' + edge.name + ' border has destructible tiles at ' + soft.join(' '));
    }
  }

  // 2b. the EXACT gateway list — both sides walkable at the open tiles
  for (const g of GATEWAYS) {
    const regA = REGION_CELLS[g.a];
    const regB = REGION_CELLS[g.b];
    if (!loaded.regions[regA] || !loaded.regions[regB]) {
      note('gateway ' + g.label + ' not checked (region file missing)');
      continue;
    }
    const ra = rooms[g.a];
    const rb = rooms[g.b];
    if (!ra || !rb) continue; // missing-room error already emitted
    for (const v of g.open) {
      const sideA = g.axis === 'EW'
        ? { x: ROOM_W - 1, y: v, room: ra, key: g.a }
        : { x: v, y: ROOM_H - 1, room: ra, key: g.a };
      const sideB = g.axis === 'EW'
        ? { x: 0, y: v, room: rb, key: g.b }
        : { x: v, y: 0, room: rb, key: g.b };
      for (const side of [sideA, sideB]) {
        const ch = tileAt(side.room, side.x, side.y);
        if (ch === undefined || !known(ch)) continue;
        if (isHardSolid(ch)) {
          err(at('overworld', side.key, side.x, side.y),
            "gateway tile must be walkable but is solid '" + ch + "' (" + g.label + ')');
        } else if (isSolid(ch)) {
          warn(at('overworld', side.key, side.x, side.y),
            "gateway tile is destructible '" + ch + "' — gateway should be open (" + g.label + ')');
        }
      }
    }
  }

  // 2c. every OTHER cross-region edge tile pair must be sealed (not both passable)
  for (let r = 0; r < WORLD_ROWS; r++) {
    for (let c = 0; c < WORLD_COLS; c++) {
      const aKey = c + ',' + r;
      // east neighbor
      if (c + 1 < WORLD_COLS) sealCheck(aKey, (c + 1) + ',' + r, 'EW');
      // south neighbor
      if (r + 1 < WORLD_ROWS) sealCheck(aKey, c + ',' + (r + 1), 'NS');
    }
  }
  function sealCheck(aKey, bKey, axis) {
    if (REGION_CELLS[aKey] === REGION_CELLS[bKey]) return; // same region: free connectivity
    const ra = rooms[aKey];
    const rb = rooms[bKey];
    if (!ra || !rb) return;
    const g = GATEWAY_BY_PAIR[aKey + '|' + bKey];
    const open = new Set(g && g.axis === axis ? g.open : []);
    const leaks = [];
    const len = axis === 'EW' ? ROOM_H : ROOM_W;
    for (let v = 0; v < len; v++) {
      if (open.has(v)) continue;
      const ca = axis === 'EW' ? tileAt(ra, ROOM_W - 1, v) : tileAt(ra, v, ROOM_H - 1);
      const cb = axis === 'EW' ? tileAt(rb, 0, v) : tileAt(rb, v, 0);
      if (ca === undefined || cb === undefined) continue;
      if (isPassable(ca) && isPassable(cb)) leaks.push(axis === 'EW' ? 'y=' + v : 'x=' + v);
    }
    if (leaks.length) {
      err(at('overworld', aKey),
        'cross-region edge to ' + bKey + ' (' + REGION_CELLS[aKey] + '/' + REGION_CELLS[bKey] +
        ') must be sealed solid outside documented gateways; passable at ' + leaks.join(','));
    }
  }
});
function range(n) { return Array.from({ length: n }, (_, i) => i); }

/* ------------------------------------------------------------------ *
 * Check 3 — adjacent-room edge consistency (one-way walls -> warning)
 * ------------------------------------------------------------------ */
let oneWayCount = 0;
runCheck('check 3 (edge consistency)', () => {
  for (const [mapName, map] of Object.entries(WORLD.maps)) {
    if (!map || !map.rooms || map.kind === 'interior') continue;
    for (const [rk, room] of Object.entries(map.rooms)) {
      const p = parseKey(rk);
      if (!p || !room || room.isolated) continue;
      // east neighbor
      pairCheck(mapName, map, rk, room, (p.c + 1) + ',' + p.r, 'EW');
      // south neighbor
      pairCheck(mapName, map, rk, room, p.c + ',' + (p.r + 1), 'NS');
    }
  }
  function pairCheck(mapName, map, aKey, ra, bKey, axis) {
    const rb = map.rooms[bKey];
    if (!rb || rb.isolated) return;
    const doorsA = doorPosSet(ra);
    const doorsB = doorPosSet(rb);
    const bad = [];
    const len = axis === 'EW' ? ROOM_H : ROOM_W;
    for (let v = 0; v < len; v++) {
      const pa = axis === 'EW' ? { x: ROOM_W - 1, y: v } : { x: v, y: ROOM_H - 1 };
      const pb = axis === 'EW' ? { x: 0, y: v } : { x: v, y: 0 };
      if (doorsA.has(pa.x + ',' + pa.y) || doorsB.has(pb.x + ',' + pb.y)) continue;
      const ca = tileAt(ra, pa.x, pa.y);
      const cb = tileAt(rb, pb.x, pb.y);
      if (ca === undefined || cb === undefined) continue;
      const oneWay = (isWalkable(ca) && isHardSolid(cb)) || (isHardSolid(ca) && isWalkable(cb));
      if (oneWay) bad.push((axis === 'EW' ? 'y=' + v : 'x=' + v) + "('" + ca + "'/'" + cb + "')");
    }
    if (bad.length) {
      oneWayCount += bad.length;
      warn(at(mapName, aKey),
        'one-way wall vs room ' + bKey + ' (walkable on one side, solid opposite) at ' + bad.join(' '));
    }
  }
});

/* ------------------------------------------------------------------ *
 * Check 4 — warps + every S/U/D tile has a warp
 * ------------------------------------------------------------------ */
runCheck('check 4 (warps)', () => {
  eachRoom((mapName, map, roomKey, room) => {
    if (!room || typeof room !== 'object') return;
    const warps = Array.isArray(room.warps) ? room.warps : [];

    for (const w of warps) {
      const loc = at(mapName, roomKey, w && w.x, w && w.y);
      if (!w || !Number.isInteger(w.x) || !Number.isInteger(w.y) ||
          w.x < 0 || w.x >= ROOM_W || w.y < 0 || w.y >= ROOM_H) {
        err(at(mapName, roomKey), 'warp with missing/out-of-range x,y: ' + JSON.stringify(w));
        continue;
      }
      const ch = tileAt(room, w.x, w.y);
      if (w.hidden !== undefined) {
        if (w.hidden === 'bomb') {
          if (ch !== 'X') err(loc, "hidden:'bomb' warp must sit on an 'X' tile (found '" + ch + "')");
        } else if (w.hidden === 'cut') {
          if (ch !== 'B') err(loc, "hidden:'cut' warp must sit on a 'B' tile (found '" + ch + "')");
        } else {
          err(loc, "warp hidden must be 'bomb' or 'cut' (found '" + w.hidden + "')");
        }
      } else if (ch !== undefined && isSolid(ch)) {
        err(loc, "warp on solid tile '" + ch + "' (only hidden warps may sit on X/B)");
      }
      if (!w.to || typeof w.to !== 'object') { err(loc, 'warp has no `to` target'); continue; }
      const t = w.to;
      const tMap = WORLD.maps[t.map];
      if (!tMap) {
        if (mapsNotLoaded.has(t.map)) {
          warn(loc, "warp target map '" + t.map + "' not loaded yet (file skipped) — recheck later");
        } else {
          err(loc, "warp target map '" + t.map + "' does not exist");
        }
        continue;
      }
      const tRoom = (tMap.rooms || {})[t.room];
      if (!tRoom) { err(loc, "warp target room '" + t.map + ':' + t.room + "' does not exist"); continue; }
      if (!Number.isInteger(t.x) || !Number.isInteger(t.y) ||
          t.x < 0 || t.x >= ROOM_W || t.y < 0 || t.y >= ROOM_H) {
        err(loc, 'warp target x,y out of range: ' + t.x + ',' + t.y);
        continue;
      }
      const tch = tileAt(tRoom, t.x, t.y);
      if (tch !== undefined && !isWalkable(tch)) {
        err(loc, "warp target tile " + t.map + ':' + t.room + ' @' + t.x + ',' + t.y + " is not walkable ('" + tch + "')");
      }
      if (tch !== undefined && isWarpTile(tch)) {
        err(loc, 'warp target tile ' + t.map + ':' + t.room + ' @' + t.x + ',' + t.y +
          " is itself a warp tile ('" + tch + "') — player would ping-pong; land one tile in front");
      }
      if ((tRoom.warps || []).some((w2) => w2 && w2.x === t.x && w2.y === t.y)) {
        err(loc, 'warp target ' + t.map + ':' + t.room + ' @' + t.x + ',' + t.y +
          ' has a warps entry at the same tile — player would ping-pong');
      }
      // interiors: return warps must land directly SOUTH of the overworld entrance tile
      if (map.kind === 'interior' && t.map === 'overworld') {
        const entrances = [];
        for (const [ork, oroom] of Object.entries(WORLD.maps.overworld.rooms)) {
          for (const ow of (oroom && oroom.warps) || []) {
            if (ow && ow.to && ow.to.map === mapName && ow.to.room === roomKey) {
              entrances.push({ room: ork, x: ow.x, y: ow.y });
            }
          }
        }
        if (entrances.length) {
          const ok = entrances.some((e) => t.room === e.room && t.x === e.x && t.y === e.y + 1);
          if (!ok) {
            warn(loc, 'interior return warp should target the tile directly SOUTH of its overworld entrance; ' +
              'overworld-side warp tile(s): ' +
              entrances.map((e) => '[overworld ' + e.room + ' @' + e.x + ',' + e.y + ']').join(' ') +
              ' but return targets ' + t.room + ' @' + t.x + ',' + t.y);
          }
        } else {
          warn(loc, 'interior room has a return warp but no overworld warp leads here');
        }
      }
    }

    // every S/U/D tile needs a warps entry at the same x,y; X should hide one
    if (Array.isArray(room.tiles)) {
      for (let y = 0; y < Math.min(room.tiles.length, ROOM_H); y++) {
        const row = room.tiles[y];
        if (typeof row !== 'string') continue;
        for (let x = 0; x < Math.min(row.length, ROOM_W); x++) {
          const ch = row[x];
          const hasWarp = warps.some((w) => w && w.x === x && w.y === y);
          if (isWarpTile(ch) && !hasWarp) {
            err(at(mapName, roomKey, x, y), "'" + ch + "' warp tile has no warps entry at this x,y");
          }
          if (ch === 'X' && !warps.some((w) => w && w.x === x && w.y === y && w.hidden === 'bomb')) {
            warn(at(mapName, roomKey, x, y),
              "'X' cracked boulder (becomes stairs) has no hidden:'bomb' warp at this x,y");
          }
        }
      }
    }
  });
});

/* ------------------------------------------------------------------ *
 * Check 5 — entities on solid tiles; chest/pickup id uniqueness
 * Check 6 — enemy/boss/npc/sign references resolve
 * ------------------------------------------------------------------ */
const globalIds = Object.create(null); // chest+pickup id -> location
let skippedEnemyRefs = 0;
let skippedBossRefs = 0;
let skippedNpcRefs = 0;
let skippedSignRefs = 0;

runCheck('checks 5+6 (entities + references)', () => {
  eachRoom((mapName, map, roomKey, room) => {
    if (!room || typeof room !== 'object') return;

    function place(x, y, what, opts) {
      opts = opts || {};
      const loc = at(mapName, roomKey, x, y);
      if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= ROOM_W || y < 0 || y >= ROOM_H) {
        err(at(mapName, roomKey), what + ' has missing/out-of-range x,y (' + x + ',' + y + ')');
        return undefined;
      }
      const ch = tileAt(room, x, y);
      if (ch !== undefined && !opts.allowSolid && isSolid(ch)) {
        err(loc, what + " placed on solid tile '" + ch + "'");
      }
      if (!opts.allowBorder && (x === 0 || x === ROOM_W - 1 || y === 0 || y === ROOM_H - 1)) {
        warn(loc, what + ' on outermost border tile (only doors/warps belong there)');
      }
      return ch;
    }
    function uniqueId(id, what, x, y) {
      const loc = at(mapName, roomKey, x, y);
      if (typeof id !== 'string' || !id) { err(loc, what + ' has no id (ids must be globally unique)'); return; }
      if (globalIds[id]) err(loc, what + " id '" + id + "' already used at " + globalIds[id]);
      else globalIds[id] = loc;
    }
    function roomUnique(list, what) {
      const seen = new Set();
      for (const e of list) {
        if (!e || typeof e.id !== 'string') continue;
        if (seen.has(e.id)) err(at(mapName, roomKey), 'duplicate ' + what + " id '" + e.id + "' in room");
        seen.add(e.id);
      }
    }

    for (const e of room.enemies || []) {
      place(e.x, e.y, "enemy '" + (e && e.type) + "'");
      if (!e || typeof e.type !== 'string') { err(at(mapName, roomKey), 'enemy entry has no type'); continue; }
      if (!loaded.enemyTypes) skippedEnemyRefs++;
      else if (!ENEMY_TYPES[e.type]) err(at(mapName, roomKey, e.x, e.y), "enemy type '" + e.type + "' not in ENEMY_TYPES");
      if (room.safe) warn(at(mapName, roomKey, e.x, e.y), 'enemy placed in a safe:true room');
    }
    if (room.miniboss) {
      const m = room.miniboss;
      place(m.x, m.y, "miniboss '" + m.type + "'");
      if (!loaded.enemyTypes) skippedEnemyRefs++;
      else if (!ENEMY_TYPES[m.type]) err(at(mapName, roomKey, m.x, m.y), "miniboss type '" + m.type + "' not in ENEMY_TYPES");
    }
    if (room.boss) {
      const b = room.boss;
      place(b.x, b.y, "boss '" + b.type + "'");
      if (!loaded.bosses) skippedBossRefs++;
      else if (!BOSSES[b.type]) err(at(mapName, roomKey, b.x, b.y), "boss type '" + b.type + "' not in BOSSES");
    }
    for (const n of room.npcs || []) {
      place(n.x, n.y, "npc '" + (n && n.id) + "'");
      if (!n || typeof n.id !== 'string') { err(at(mapName, roomKey), 'npc entry has no id'); continue; }
      if (!NPC_IDS.includes(n.id)) warn(at(mapName, roomKey, n.x, n.y), "npc id '" + n.id + "' is not in the documented NPC list");
      if (typeof n.art !== 'string') err(at(mapName, roomKey, n.x, n.y), "npc '" + n.id + "' has no art key");
      if (!loaded.dialogue) skippedNpcRefs++;
      else if (!DIALOGUE[n.id]) err(at(mapName, roomKey, n.x, n.y), "npc id '" + n.id + "' has no DIALOGUE entry");
    }
    for (const s of room.signs || []) {
      place(s.x, s.y, "sign '" + (s && s.id) + "'");
      if (!s || typeof s.id !== 'string') { err(at(mapName, roomKey), 'sign entry has no id'); continue; }
      if (!SIGN_IDS.includes(s.id)) warn(at(mapName, roomKey, s.x, s.y), "sign id '" + s.id + "' is not in the documented sign list");
      if (!loaded.dialogue) skippedSignRefs++;
      else if (!DIALOGUE.signs || !DIALOGUE.signs[s.id]) err(at(mapName, roomKey, s.x, s.y), "sign id '" + s.id + "' has no DIALOGUE.signs entry");
    }

    function checkChest(c, viaOnClear) {
      const what = (c.big ? 'big chest' : 'chest') + (viaOnClear ? ' (onClear)' : '') + " '" + c.id + "'";
      place(c.x, c.y, what);
      uniqueId(c.id, what, c.x, c.y);
      const loc = at(mapName, roomKey, c.x, c.y);
      const cont = c.contents;
      if (!cont || typeof cont !== 'object') { err(loc, what + ' has no contents'); return; }
      const keys = Object.keys(cont);
      const allowed = ['item', 'gems', 'arrows', 'bombs'];
      const payload = keys.filter((k) => allowed.includes(k));
      for (const k of keys) if (!allowed.includes(k)) warn(loc, what + " contents has unknown field '" + k + "'");
      if (payload.length !== 1) err(loc, what + ' contents must have exactly one of item/gems/arrows/bombs');
      if ('item' in cont && !ITEM_KEYS.includes(cont.item)) {
        err(loc, what + " contains unknown item '" + cont.item + "'");
      }
      for (const k of ['gems', 'arrows', 'bombs']) {
        if (k in cont && (typeof cont[k] !== 'number' || cont[k] <= 0)) err(loc, what + ' contents.' + k + ' must be a positive number');
      }
    }
    for (const c of room.chests || []) checkChest(c, false);
    if (room.onClear && room.onClear.chest) checkChest(room.onClear.chest, true);

    for (const p of room.pickups || []) {
      const what = "pickup '" + (p && p.item) + "'";
      place(p.x, p.y, what);
      uniqueId(p.id, what, p.x, p.y);
      if (p.item === 'smallKey' || p.item === 'bossKey') {
        err(at(mapName, roomKey, p.x, p.y), 'keys must come from chests, not floor pickups (' + p.item + ')');
      } else if (!PICKUP_ITEM_KEYS.includes(p.item)) {
        warn(at(mapName, roomKey, p.x, p.y), "pickup item '" + p.item + "' is not a documented floor pickup");
      }
    }

    for (const o of room.pots || []) place(o.x, o.y, 'pot');
    for (const b of room.blocks || []) place(b.x, b.y, 'block');
    for (const p of room.plates || []) place(p.x, p.y, "plate '" + (p && p.id) + "'");
    for (const t of room.torches || []) place(t.x, t.y, "torch '" + (t && t.id) + "'");
    for (const s of room.switches || []) {
      place(s.x, s.y, "switch '" + (s && s.id) + "'");
      if (s && s.kind !== undefined && s.kind !== 'crystal' && s.kind !== 'eye') {
        err(at(mapName, roomKey, s.x, s.y), "switch kind must be 'crystal' or 'eye' (found '" + s.kind + "')");
      }
    }
    roomUnique(room.plates || [], 'plate');
    roomUnique(room.torches || [], 'torch');
    roomUnique(room.switches || [], 'switch');
    roomUnique(room.doors || [], 'door');

    for (const b of room.barrier || []) place(b.x, b.y, 'barrier tile', { allowBorder: true });

    for (const s of room.shopItems || []) {
      place(s.x, s.y, "shop item '" + (s && s.item) + "'");
      if (!s || typeof s.item !== 'string') err(at(mapName, roomKey), 'shop item has no item key');
      else if (!SHOP_ITEM_KEYS.includes(s.item)) warn(at(mapName, roomKey, s.x, s.y), "shop item '" + s.item + "' is not a documented shop item");
      if (!s || typeof s.price !== 'number' || s.price <= 0) err(at(mapName, roomKey, s && s.x, s && s.y), 'shop item must have a positive numeric price');
    }
  });

  if (!loaded.enemyTypes && skippedEnemyRefs) warn(null, 'src/enemy_types.js missing: ' + skippedEnemyRefs + ' enemy/miniboss type references not checked');
  if (!loaded.bosses && skippedBossRefs) warn(null, 'src/bosses.js missing: ' + skippedBossRefs + ' boss type references not checked');
  if (!loaded.dialogue && (skippedNpcRefs || skippedSignRefs)) {
    warn(null, 'src/dialogue_content.js missing: ' + skippedNpcRefs + ' npc and ' + skippedSignRefs + ' sign id references not checked');
  }
});

/* ------------------------------------------------------------------ *
 * Check 7 — doors: kinds, placement, `opens` resolution, sealed logic
 * ------------------------------------------------------------------ */
runCheck('check 7 (doors)', () => {
  eachRoom((mapName, map, roomKey, room) => {
    if (!room || typeof room !== 'object') return;
    const doors = Array.isArray(room.doors) ? room.doors : [];
    for (const d of doors) {
      if (!d || typeof d !== 'object') { err(at(mapName, roomKey), 'malformed door entry'); continue; }
      const loc = at(mapName, roomKey, d.x, d.y);
      if (typeof d.id !== 'string' || !d.id) err(loc, 'door has no id');
      if (!['locked', 'boss', 'sealed'].includes(d.kind)) {
        err(loc, "door kind must be locked|boss|sealed (found '" + d.kind + "')");
      }
      if (!Number.isInteger(d.x) || !Number.isInteger(d.y) || d.x < 0 || d.x >= ROOM_W || d.y < 0 || d.y >= ROOM_H) {
        err(at(mapName, roomKey), "door '" + d.id + "' has out-of-range x,y");
        continue;
      }
      const expected = { N: d.y === 0, S: d.y === ROOM_H - 1, W: d.x === 0, E: d.x === ROOM_W - 1 };
      if (!['N', 'S', 'E', 'W'].includes(d.dir)) {
        err(loc, "door '" + d.id + "' dir must be N|S|E|W (found '" + d.dir + "')");
      } else if (!expected[d.dir]) {
        warn(loc, "door '" + d.id + "' dir '" + d.dir + "' does not match its room-edge position");
      }
      const ch = tileAt(room, d.x, d.y);
      if (ch !== undefined && !isSolid(ch)) {
        warn(loc, "door '" + d.id + "' sits on walkable tile '" + ch + "' (doors sit ON a wall tile at the room edge)");
      }

      // sealed logic
      const openedByOnClearHere = !!(room.onClear && Array.isArray(room.onClear.openDoors) && room.onClear.openDoors.includes(d.id));
      const openedByOnClearAnywhere = Object.values(map.rooms || {}).some((r2) =>
        r2 && r2.onClear && Array.isArray(r2.onClear.openDoors) && r2.onClear.openDoors.includes(d.id));
      if (d.kind === 'sealed') {
        if (!d.opens && !openedByOnClearHere) {
          if (openedByOnClearAnywhere) {
            warn(loc, "sealed door '" + d.id + "' is only opened by an onClear in a DIFFERENT room (mirrored door side?)");
          } else {
            err(loc, "sealed door '" + d.id + "' has no `opens` and no onClear opens it — it can never open");
          }
        }
        // A sealed door re-seals from the NEIGHBOR side once the player walks
        // through it, unless its open state PERSISTS. The engine persists a
        // sealed door only via opens.persist:true (updateDoors) or an onClear
        // that opens it (checkRoomClear always persists). Without persistence,
        // checkEdgeTransition re-blocks the crossing from the far room — if that
        // room is a dead-end branch the player is soft-locked. (This is exactly
        // the Sandstone Ruins torch door and the Dark Citadel torch/ice doors.)
        const persists = !!(d.opens && d.opens.persist === true) || openedByOnClearHere || openedByOnClearAnywhere;
        if (!persists) {
          err(loc, "sealed door '" + d.id + "' never persists (add opens.persist:true) — it re-seals from the neighbor side after the player passes through and can soft-lock");
        }
      } else if (d.opens) {
        warn(loc, "door '" + d.id + "' is '" + d.kind + "' but has an `opens` condition (only sealed doors use opens)");
      }

      // `opens` references must resolve within the SAME room
      if (d.opens && typeof d.opens === 'object') {
        const known2 = ['plates', 'torches', 'switches', 'clear', 'persist'];
        for (const k of Object.keys(d.opens)) {
          if (!known2.includes(k)) warn(loc, "door '" + d.id + "' opens has unknown field '" + k + "'");
        }
        const pools = {
          plates: new Set((room.plates || []).map((p) => p && p.id)),
          torches: new Set((room.torches || []).map((t) => t && t.id)),
          switches: new Set((room.switches || []).map((s) => s && s.id)),
        };
        for (const kind of ['plates', 'torches', 'switches']) {
          const refs = d.opens[kind];
          if (refs === undefined) continue;
          if (!Array.isArray(refs)) { err(loc, "door '" + d.id + "' opens." + kind + ' must be an array of ids'); continue; }
          for (const ref of refs) {
            if (!pools[kind].has(ref)) {
              err(loc, "door '" + d.id + "' opens." + kind + " references '" + ref + "' which is not a " + kind.slice(0, -1) + ' in the SAME room');
            }
          }
        }
      }
    }

    // onClear.openDoors must reference a real door (same room, else same map)
    if (room.onClear && Array.isArray(room.onClear.openDoors)) {
      const hereIds = new Set(doors.map((d) => d && d.id));
      for (const id of room.onClear.openDoors) {
        if (hereIds.has(id)) continue;
        const anywhere = Object.values(map.rooms || {}).some((r2) =>
          r2 && Array.isArray(r2.doors) && r2.doors.some((d2) => d2 && d2.id === id));
        if (!anywhere) err(at(mapName, roomKey), "onClear.openDoors references unknown door id '" + id + "'");
      }
    }
  });
});

/* ------------------------------------------------------------------ *
 * Check 8 — per-dungeon key economy
 * ------------------------------------------------------------------ */
runCheck('check 8 (key economy)', () => {
  for (const [mapName, map] of Object.entries(WORLD.maps)) {
    if (!map || !map.rooms) continue;
    let smallKeys = 0;
    let bossKeys = 0;
    const lockedIds = new Set();
    const bossDoorIds = new Set();
    for (const room of Object.values(map.rooms)) {
      if (!room || typeof room !== 'object') continue;
      const chests = (room.chests || []).concat(room.onClear && room.onClear.chest ? [room.onClear.chest] : []);
      for (const c of chests) {
        if (c && c.contents && c.contents.item === 'smallKey') smallKeys++;
        if (c && c.contents && c.contents.item === 'bossKey') bossKeys++;
      }
      for (const d of room.doors || []) {
        if (!d) continue;
        if (d.kind === 'locked') lockedIds.add(d.id || (Math.random() + ''));
        if (d.kind === 'boss') bossDoorIds.add(d.id || (Math.random() + ''));
      }
    }
    if (lockedIds.size > smallKeys) {
      err(at(mapName), 'key economy: ' + lockedIds.size + ' locked door(s) but only ' + smallKeys + ' smallKey chest(s)');
    }
    if (bossDoorIds.size > 0 && bossKeys < 1) {
      err(at(mapName), 'key economy: has boss door(s) but no bossKey chest');
    }
    if (bossKeys > 0 && bossDoorIds.size === 0) {
      warn(at(mapName), 'bossKey chest exists but the map has no boss door');
    }
  }
});

/* ------------------------------------------------------------------ *
 * Check 9 — overworld reachability flood-fill from START
 * ------------------------------------------------------------------ */
runCheck('check 9 (reachability)', () => {
  const allRegions = REGION_NAMES.every((n) => loaded.regions[n]);
  if (!allRegions) {
    note('check 9 (overworld reachability) skipped: not all region files are present yet');
    return;
  }
  const rooms = WORLD.maps.overworld.rooms;
  const start = CONFIG.START || {};
  const sp = parseKey(start.room || '');
  if (start.map !== 'overworld' || !sp) {
    err(null, 'CONFIG.START does not point at an overworld room: ' + JSON.stringify(start));
    return;
  }
  const startRoom = rooms[start.room];
  if (!startRoom) { err(at('overworld', start.room), 'START room is not defined'); return; }
  const startCh = tileAt(startRoom, start.x, start.y);
  if (startCh === undefined || !isWalkable(startCh)) {
    err(at('overworld', start.room, start.x, start.y), "START spawn tile is not walkable ('" + startCh + "')");
    return;
  }

  const GW = WORLD_COLS * ROOM_W;
  const GH = WORLD_ROWS * ROOM_H;
  function passAt(gx, gy) {
    if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) return false;
    const room = rooms[Math.floor(gx / ROOM_W) + ',' + Math.floor(gy / ROOM_H)];
    if (!room) return false;
    const ch = tileAt(room, gx % ROOM_W, gy % ROOM_H);
    return ch !== undefined && isPassable(ch);
  }
  const visited = new Uint8Array(GW * GH);
  const stack = [(sp.r * ROOM_H + start.y) * GW + (sp.c * ROOM_W + start.x)];
  visited[stack[0]] = 1;
  const reachedRooms = new Set();
  while (stack.length) {
    const cur = stack.pop();
    const gx = cur % GW;
    const gy = Math.floor(cur / GW);
    reachedRooms.add(Math.floor(gx / ROOM_W) + ',' + Math.floor(gy / ROOM_H));
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = gx + dx;
      const ny = gy + dy;
      const ni = ny * GW + nx;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || visited[ni]) continue;
      if (!passAt(nx, ny)) continue;
      visited[ni] = 1;
      stack.push(ni);
    }
  }
  let total = 0;
  for (const rk of Object.keys(rooms)) {
    if (!parseKey(rk)) continue;
    total++;
    if (!reachedRooms.has(rk)) {
      err(at('overworld', rk), 'room unreachable from START (' + start.room + ' @' + start.x + ',' + start.y +
        ') even treating bushes/cracked tiles as passable');
    }
  }
  note('check 9: flood-fill reached ' + reachedRooms.size + ' of ' + total + ' overworld rooms');
});

/* ------------------------------------------------------------------ *
 * Registry-level validation: ENEMY_TYPES / BOSSES / DIALOGUE structure
 * ------------------------------------------------------------------ */
runCheck('enemy registry', () => {
  if (!loaded.enemyTypes) return;
  for (const k of ENEMY_ROSTER) {
    if (!ENEMY_TYPES[k]) warn('[enemy_types]', "documented enemy '" + k + "' is not defined");
  }
  for (const [k, d] of Object.entries(ENEMY_TYPES)) {
    const loc = '[enemy_types ' + k + ']';
    if (!d || typeof d !== 'object') { err(loc, 'definition is not an object'); continue; }
    if (typeof d.hp !== 'number' || d.hp <= 0) err(loc, 'hp must be a positive number');
    if (typeof d.dmg !== 'number' || d.dmg < 0) err(loc, 'dmg must be a number >= 0');
    if (!BEHAVIORS.includes(d.behavior)) err(loc, "behavior '" + d.behavior + "' is not a documented behavior (" + BEHAVIORS.join('|') + ')');
    if (d.opts && d.opts.projectile && !PROJECTILE_ARTS.includes(d.opts.projectile)) {
      err(loc, "opts.projectile '" + d.opts.projectile + "' is not an available projectile art (" + PROJECTILE_ARTS.join('|') + ')');
    }
    if (d.immune !== undefined && !Array.isArray(d.immune)) warn(loc, 'immune should be an array');
    if (typeof d.art !== 'string') warn(loc, 'no art key (engine will use magenta placeholder)');
  }
});

runCheck('boss registry', () => {
  if (!loaded.bosses) return;
  for (const k of BOSS_KEYS) {
    if (!BOSSES[k]) warn('[bosses]', "documented boss '" + k + "' is not defined");
  }
  if (BOSSES.morgrath && !BOSSES.morgrath2) {
    warn('[bosses]', 'morgrath exists but morgrath2 is missing — the documented phase-2 transform will not happen');
  }
  for (const [k, b] of Object.entries(BOSSES)) {
    const loc = '[bosses ' + k + ']';
    if (!b || typeof b !== 'object') { err(loc, 'definition is not an object'); continue; }
    if (typeof b.hp !== 'number' || b.hp <= 0) err(loc, 'hp must be a positive number');
    if (typeof b.art !== 'string') warn(loc, 'no art key (engine will use magenta placeholder)');
    if (typeof b.update !== 'function') warn(loc, 'no update(scene,boss,dt) function');
  }
});

runCheck('dialogue registry', () => {
  if (!loaded.dialogue) return;
  for (const id of NPC_IDS) {
    if (!DIALOGUE[id]) warn('[dialogue]', "documented npc '" + id + "' has no DIALOGUE entry");
  }
  for (const id of SIGN_IDS) {
    if (!DIALOGUE.signs || !DIALOGUE.signs[id]) warn('[dialogue]', "documented sign '" + id + "' has no DIALOGUE.signs entry");
  }
  const CONDS = ['flagsAll', 'flagsNone', 'shardsMin', 'items', 'acornsMin'];
  for (const [id, entries] of Object.entries(DIALOGUE)) {
    if (id === 'signs') continue;
    const loc = '[dialogue ' + id + ']';
    if (!Array.isArray(entries) || entries.length === 0) { err(loc, 'must be a non-empty array of entries'); continue; }
    let hasDefault = false;
    entries.forEach((e, i) => {
      if (!e || typeof e !== 'object' || !Array.isArray(e.lines) || e.lines.length === 0) {
        err(loc, 'entry ' + i + ' has no lines pages');
        return;
      }
      e.lines.forEach((page, pi) => {
        if (!Array.isArray(page) || page.length < 1 || page.length > 3) {
          warn(loc, 'entry ' + i + ' page ' + pi + ' should be an array of 1-3 short lines');
          return;
        }
        page.forEach((line) => {
          if (typeof line !== 'string') err(loc, 'entry ' + i + ' page ' + pi + ' has a non-string line');
          else if (line.length > 38) warn(loc, 'entry ' + i + ' line longer than 38 chars: "' + line + '" (' + line.length + ')');
        });
      });
      if (!e.if) {
        hasDefault = true;
        if (i !== entries.length - 1) warn(loc, 'entry ' + i + ' has no `if` but is not last — later entries can never match');
      } else {
        for (const k of Object.keys(e.if)) {
          if (!CONDS.includes(k)) warn(loc, 'entry ' + i + " has unknown condition '" + k + "'");
        }
      }
    });
    if (!hasDefault) warn(loc, 'no default (condition-free) entry — npc can be speechless');
  }
  for (const [id, lines] of Object.entries(DIALOGUE.signs || {})) {
    const loc = '[dialogue signs.' + id + ']';
    if (!Array.isArray(lines) || lines.length < 1 || lines.length > 2 || lines.some((l) => typeof l !== 'string')) {
      warn(loc, 'sign text should be an array of 1-2 strings');
    } else {
      for (const l of lines) if (l.length > 38) warn(loc, 'sign line longer than 38 chars: "' + l + '"');
    }
  }
});

/* ------------------------------------------------------------------ *
 * Check 10 — art / song / sfx registries vs everything referenced
 * ------------------------------------------------------------------ */
runCheck('check 10 (art/audio registries)', () => {
  // ---- collect every art key the game needs, with a reason
  const wanted = new Map(); // key -> first reason
  function want(key, reason) {
    if (typeof key !== 'string' || !key) return;
    if (!wanted.has(key)) wanted.set(key, reason);
  }
  for (const [ch, d] of Object.entries(TILES.legend)) want(d.name, "tile '" + ch + "' in tiles.js");
  want('player', 'player sprite (ARCHITECTURE)');
  for (const k of ENEMY_ROSTER) want(k, 'enemy roster (GAME_DESIGN)');
  for (const k of NPC_ART_KEYS) want(k, 'NPC art list (ARCHITECTURE)');
  for (const k of BOSS_KEYS) want(k, 'boss list (GAME_DESIGN)');
  want('morgrath2', 'morgrath phase 2 (48x48, ARCHITECTURE)');
  for (const k of ITEM_PROP_ART_KEYS) want(k, 'item/prop/UI list (ARCHITECTURE)');
  if (loaded.enemyTypes) {
    for (const [k, d] of Object.entries(ENEMY_TYPES)) {
      if (d && typeof d === 'object') {
        want(d.art || k, 'ENEMY_TYPES.' + k + '.art');
        if (d.opts && d.opts.projectile) want(d.opts.projectile, 'ENEMY_TYPES.' + k + '.opts.projectile');
      }
    }
  }
  if (loaded.bosses) {
    for (const [k, b] of Object.entries(BOSSES)) {
      if (b && typeof b === 'object') want(b.art || k, 'BOSSES.' + k + '.art');
    }
  }
  eachRoom((mapName, map, roomKey, room) => {
    for (const n of (room && room.npcs) || []) {
      if (n && typeof n.art === 'string') want(n.art, 'npc ' + n.id + ' in ' + at(mapName, roomKey));
    }
  });

  if (!loaded.art) {
    warn(null, 'art registry checks skipped (no src/sprites/*.js yet): ' + wanted.size + ' required art keys unverified');
  } else {
    const missing = [];
    for (const [key, reason] of wanted) {
      if (!ART[key]) missing.push("art key '" + key + "' never registered (needed by: " + reason + ')');
    }
    missing.forEach((m) => err('[art]', m));
    for (const [key, def] of Object.entries(ART)) {
      if (!def || typeof def.draw !== 'function') warn('[art ' + key + ']', 'registered without a draw() function');
    }
    note('check 10: ' + Object.keys(ART).length + ' art keys registered, ' + wanted.size + ' required/referenced');
  }

  // ---- songs
  const wantedSongs = new Map();
  for (const k of REQUIRED_SONGS) wantedSongs.set(k, 'required song list (GAME_DESIGN)');
  for (const [mapName, map] of Object.entries(WORLD.maps)) {
    if (map && typeof map.music === 'string' && !wantedSongs.has(map.music)) {
      wantedSongs.set(map.music, 'WORLD.maps.' + mapName + '.music');
    }
  }
  if (!loaded.audio) {
    warn(null, 'song/sfx registry checks skipped (no src/audio_content.js yet): ' +
      wantedSongs.size + ' songs + ' + REQUIRED_SFX.length + ' sfx unverified');
  } else {
    for (const [key, reason] of wantedSongs) {
      if (!SONGS[key]) err('[audio]', "song '" + key + "' never registered (needed by: " + reason + ')');
    }
    for (const k of REQUIRED_SFX) {
      if (!SFX[k]) err('[audio]', "sfx '" + k + "' never registered (required sfx list, GAME_DESIGN)");
    }
    // light structural lint
    const NOTE_RE = /^([A-Ga-g][#b]?\d|x|-):\d+(\.\d+)?$/;
    for (const [k, s] of Object.entries(SONGS)) {
      if (!s || !Array.isArray(s.tracks) || s.tracks.length === 0) { warn('[audio ' + k + ']', 'song has no tracks'); continue; }
      s.tracks.forEach((t, i) => {
        if (!t || !WAVES.includes(t.wave)) warn('[audio ' + k + ']', 'track ' + i + " has unknown wave '" + (t && t.wave) + "'");
        if (!t || typeof t.notes !== 'string' || !t.notes.trim()) { warn('[audio ' + k + ']', 'track ' + i + ' has no notes'); return; }
        const bad = t.notes.trim().split(/\s+/).find((tok) => !NOTE_RE.test(tok));
        if (bad) warn('[audio ' + k + ']', 'track ' + i + " has malformed note token '" + bad + "'");
      });
    }
    for (const [k, s] of Object.entries(SFX)) {
      if (!s || !SFX_TYPES.includes(s.type)) warn('[audio sfx.' + k + ']', "unknown sfx type '" + (s && s.type) + "' (" + SFX_TYPES.join('|') + ')');
    }
    note('check 10: ' + Object.keys(SONGS).length + ' songs and ' + Object.keys(SFX).length + ' sfx registered');
  }
});

if (oneWayCount > 0) note('check 3: ' + oneWayCount + ' one-way wall tile(s) total');

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */
let mapCount = 0;
let roomCount = 0;
for (const map of Object.values(WORLD.maps)) {
  if (!map || !map.rooms) continue;
  mapCount++;
  roomCount += Object.keys(map.rooms).length;
}

console.log('The Shattered Crown — content validator');
console.log('');
if (notes.length) {
  console.log('Notes (' + notes.length + '):');
  for (const n of notes) console.log('  NOTE  ' + n);
  console.log('');
}
if (errors.length) {
  console.log('Errors (' + errors.length + '):');
  for (const e of errors) console.log('  ERROR ' + e);
  console.log('');
}
if (warnings.length) {
  console.log('Warnings (' + warnings.length + '):');
  for (const w of warnings) console.log('  WARN  ' + w);
  console.log('');
}
console.log('Checked ' + mapCount + ' map(s), ' + roomCount + ' room(s)' +
  (skippedFiles.length ? ' (' + skippedFiles.length + ' content file(s) not present yet)' : '') + '.');
console.log('Summary: ' + errors.length + ' error(s), ' + warnings.length + ' warning(s), ' + notes.length + ' note(s).');
console.log(errors.length ? 'FAIL' : 'OK');
process.exit(errors.length ? 1 : 0);
