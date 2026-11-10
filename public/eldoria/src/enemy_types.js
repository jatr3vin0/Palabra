// Enemy roster data for The Shattered Crown.
// Fills window.ENEMY_TYPES (defined by src/enemies.js). Data only — no engine
// code, no Phaser. hp / dmg / behavior match the roster table in
// docs/GAME_DESIGN.md exactly; speed/opts/drops are tuning per ARCHITECTURE.md.
// Player walks at 85 px/s for speed reference. Drop chances are per-kill and
// the remainder is "nothing"; tougher enemies drop hearts more often.

Object.assign(window.ENEMY_TYPES, {

  // ---------------------------------------------------------------- basics
  // Green slime: the friendly-ish first enemy. Slow hops, easy to dodge.
  slime: {
    art: 'slime', hp: 1, dmg: 0.5, speed: 30, behavior: 'hopper',
    opts: { hopMs: 900, pause: 450 },
    drops: { heart: 0.20, gems: 0.30 },
  },

  // Red slime: same hop, but quicker and with less downtime.
  redSlime: {
    art: 'redSlime', hp: 2, dmg: 0.5, speed: 42, behavior: 'hopper',
    opts: { hopMs: 800, pause: 300 },
    drops: { heart: 0.22, gems: 0.34 },
  },

  // Bat: erratic flyer, weaves over pits. Fragile.
  bat: {
    art: 'bat', hp: 1, dmg: 0.5, speed: 55, behavior: 'flyer',
    opts: { aggro: 140 },
    drops: { heart: 0.18, gems: 0.28 },
  },

  // Spitter: rooted plant that lobs seeds. Barely shuffles in place.
  spitter: {
    art: 'spitter', hp: 2, dmg: 0.5, speed: 8, behavior: 'shooter',
    opts: { range: 95, projectile: 'seed', cooldown: 1600, shotSpeed: 75 },
    drops: { heart: 0.20, gems: 0.30, arrows: 0.08 },
  },

  // Beetle: telegraphs (flashes), then dashes in a straight line.
  beetle: {
    art: 'beetle', hp: 2, dmg: 1, speed: 35, behavior: 'charge',
    opts: { dashSpeed: 150 },
    drops: { heart: 0.25, gems: 0.30, bombs: 0.05 },
  },

  // ------------------------------------------------------- desert / undead
  // Skeleton: steady chaser.
  skeleton: {
    art: 'skeleton', hp: 3, dmg: 1, speed: 45, behavior: 'chase',
    opts: { aggro: 110 },
    drops: { heart: 0.28, gems: 0.32, arrows: 0.08 },
  },

  // Skeleton archer: keeps its distance and throws bones.
  skeletonArcher: {
    art: 'skeletonArcher', hp: 2, dmg: 0.5, speed: 38, behavior: 'shooter',
    opts: { range: 115, projectile: 'bone', cooldown: 1700, shotSpeed: 90 },
    drops: { heart: 0.22, gems: 0.28, arrows: 0.18 },
  },

  // Scarab: fast desert charger — quicker dash than the beetle.
  scarab: {
    art: 'scarab', hp: 2, dmg: 1, speed: 50, behavior: 'charge',
    opts: { dashSpeed: 190 },
    drops: { heart: 0.25, gems: 0.35 },
  },

  // Mummy: slow tank; shrug off a few hits and it keeps coming.
  mummy: {
    art: 'mummy', hp: 5, dmg: 1, speed: 25, behavior: 'chase',
    opts: { aggro: 130 },
    drops: { heart: 0.35, gems: 0.35, bombs: 0.08 },
  },

  // --------------------------------------------------------------- mountain
  // Ice wolf: fast chaser with a long aggro leash.
  iceWolf: {
    art: 'iceWolf', hp: 3, dmg: 1, speed: 65, behavior: 'chase',
    opts: { aggro: 140 },
    drops: { heart: 0.30, gems: 0.30 },
  },

  // Frost wisp: floating shooter (flyer + shoot per ARCHITECTURE), ice shards.
  frostWisp: {
    art: 'frostWisp', hp: 2, dmg: 0.5, speed: 45, behavior: 'flyer',
    opts: { aggro: 150, shoot: true, projectile: 'iceShard', cooldown: 1900, shotSpeed: 85 },
    drops: { heart: 0.20, gems: 0.35 },
  },

  // Ice slime: chunkier hop, hits a full heart.
  iceSlime: {
    art: 'iceSlime', hp: 2, dmg: 1, speed: 32, behavior: 'hopper',
    opts: { hopMs: 950, pause: 400 },
    drops: { heart: 0.24, gems: 0.32 },
  },

  // ---------------------------------------------------------- wastes elites
  // Knight: armored chaser; arrows clank right off (sword/bombs only).
  knight: {
    art: 'knight', hp: 6, dmg: 1, speed: 40, behavior: 'chase',
    opts: { aggro: 130 },
    drops: { heart: 0.40, gems: 0.35, arrows: 0.10 },
    immune: ['arrow'],
  },

  // Wizard: blinks near the player and fires a fireball on arrival.
  wizard: {
    art: 'wizard', hp: 4, dmg: 1, speed: 30, behavior: 'teleporter',
    opts: { blinkMs: 2200, projectile: 'fireball', shotSpeed: 95 },
    drops: { heart: 0.35, gems: 0.40 },
  },

  // Eye sentry: stationary turret; no touch damage (dmg 0 per roster), but
  // its bolts sting when you line up with it.
  eyeSentry: {
    art: 'eyeSentry', hp: 3, dmg: 0, speed: 0, behavior: 'turret',
    opts: { projectile: 'magicBolt', cooldown: 1500, shotSpeed: 110 },
    drops: { heart: 0.25, gems: 0.35 },
  },

  // ----------------------------------------------------------- minibosses
  // Big Slime (D1): a huge, bouncy wall of goo. Slow hops, big squash.
  bigSlime: {
    art: 'bigSlime', hp: 10, dmg: 1, speed: 38, behavior: 'hopper',
    opts: { hopMs: 1100, pause: 550 },
    drops: { heart: 0.50, gems: 0.40 },
    big: true,
  },

  // Mummy Knight (D2): roster says chase+charge; 'charge' carries the kit —
  // it stalks between telegraphed dashes and stuns itself on walls.
  mummyKnight: {
    art: 'mummyKnight', hp: 14, dmg: 1.5, speed: 55, behavior: 'charge',
    opts: { dashSpeed: 170 },
    drops: { heart: 0.50, gems: 0.35, bombs: 0.10 },
    big: true,
  },

  // Alpha Wolf (D3): the fastest dasher in the game; punish it mid-stun.
  alphaWolf: {
    art: 'alphaWolf', hp: 12, dmg: 1, speed: 70, behavior: 'charge',
    opts: { dashSpeed: 200 },
    drops: { heart: 0.55, gems: 0.35 },
    big: true,
  },

  // Bog Lurker (shrine): teleporter+shooter — the engine teleporter fires a
  // shot each time it reappears; mud-rock globs, quick blink cycle.
  bogLurker: {
    art: 'bogLurker', hp: 12, dmg: 1, speed: 30, behavior: 'teleporter',
    opts: { blinkMs: 1900, projectile: 'rockShot', shotSpeed: 90 },
    drops: { heart: 0.50, gems: 0.40 },
    big: true,
  },

});
