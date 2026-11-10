// The Shattered Crown — LAKE region (overworld cells: cols 7-9, rows 2-4).
// A big lake fills the heart of the region; beaches, bridges and reeds ring it.
// Cross-region gateways (exact, all other external edges sealed solid):
//   meadows (6,3) E <-> lake (7,3) W : open y=5,6
//   lake (8,4) S <-> desert (8,5) N  : open x=9,10
// Sealed: north seam to wastes (rows 0 of 7,2/8,2/9,2), west seams to
// meadows except the gateway, east world border (col 19 of 9,*), and the
// south seam to desert except the gateway.
Object.assign(WORLD.maps.overworld.rooms, {

  // ---- (7,2) NW lakewoods: a bush pocket hides a golden acorn ----------
  '7,2': {
    biome: 'lake',
    tiles: [
      'TTTTTTTTTTTTTTTTTTTT',
      'T....,......,......T',
      'T.BBB......T.......T',
      'T.B.B...,..........T',
      'T.BBB....,.........T',
      'T,,.................',
      'T,,......T..........',
      'T.............,WWWWW',
      'T....B.......ssWWWWW',
      'T...,........ssWWWWW',
      'T.........,..ssWWWWW',
      'TTTT..TTTTTTTTTWWWWW',
    ],
    enemies: [
      { type: 'slime', x: 8, y: 8 },
      { type: 'bat', x: 12, y: 5 },
    ],
    pickups: [{ x: 3, y: 3, item: 'acorn', id: 'ow_lake_acorn_bushes' }],
  },

  // ---- (8,2) north beach: path along the top, sand shelving into water -
  '8,2': {
    biome: 'lake',
    tiles: [
      'TTTTTTTTTTTTTTTTTTTT',
      'T......T.......,...T',
      'T...,..........T...T',
      'T..................T',
      'T....,......,......T',
      '.PPPPPPPPPPPPPPPPPP.',
      '.PPPPPPPPPPPPPPPPPP.',
      'T.....,......,.....T',
      'TssssssssssssssssssT',
      'TsssWWWWWWWWWWWWsssT',
      'TsWWWWWWWWWWWWWWWWsT',
      'WWWWWWWWWWWWWWWWWWWW',
    ],
    enemies: [
      { type: 'beetle', x: 9, y: 3 },
      { type: 'bat', x: 6, y: 8 },
    ],
  },

  // ---- (9,2) fairy pond grove: statue-flanked stairs down to the pond --
  '9,2': {
    biome: 'lake',
    safe: true,
    tiles: [
      'TTTTTTTTTTTTTTTTTTTT',
      'T...f..........f...T',
      'T...WWWWfffWWWW....T',
      'T...WWWWASAWWWW....T',
      'T...WWWW...WWWW....T',
      '.PPPPPPPPP.....ffffT',
      '.PPP....,..........T',
      'T..................T',
      'T..,....ff....,....T',
      'T.....,......,.....T',
      'T........PP........T',
      'TTTTTTTTT..TTTTTTTTT',
    ],
    warps: [
      { x: 9, y: 3, to: { map: 'interiors', room: 'fairy_pond_lake', x: 10, y: 10 } },
    ],
    pots: [{ x: 16, y: 8 }, { x: 17, y: 8 }],
  },

  // ---- (7,3) west gateway: Finn's fishing dock, sign by the path -------
  '7,3': {
    biome: 'lake',
    tiles: [
      'TTTT..TTTTTTTTTWWWWW',
      'T...PP.......ssWWWWW',
      'T...PP..,....ssWWWWW',
      'T...PP.B.....ssWWWWW',
      'T...PP.......ssWWWWW',
      '.PPPPPPPPPPPPssbbbbb',
      '.PPPPPPPPPPPPssbbbbb',
      'T.......,....ssWWWWW',
      'T............ssbbbWW',
      'T..,.........ssWWWWW',
      'T.....B......ssWWWWW',
      'TTTT..TTTTTTTTTWWWWW',
    ],
    npcs: [{ id: 'fisher_finn', art: 'fisher', x: 16, y: 8 }],
    signs: [{ id: 'sign_lake', x: 3, y: 4 }],
    enemies: [
      { type: 'slime', x: 8, y: 9 },
      { type: 'spitter', x: 10, y: 2 },
    ],
    pots: [{ x: 1, y: 8 }, { x: 2, y: 8 }],
  },

  // ---- (8,3) lake heart: bridges cross to an island holding an acorn ---
  '8,3': {
    biome: 'lake',
    tiles: [
      'WWWWWWWWWWWWWWWWWWWW',
      'WWWWWWWWWWWWWWWWWWWW',
      'WWWWWWWWWWWWWWWRWWWW',
      'WWWWWWssssssssWWWWWW',
      'WWWWWWs,ssss,sWWWWWW',
      'bbbbbbssssssssbbbbbb',
      'bbbbbbssssssssbbbbbb',
      'WWWWWWsssbbsssWWWWWW',
      'WWWWWWWWWbbWWWWWWWWW',
      'WWWWWWWWWbbWWWWWWWWW',
      'WWWWWWWWWbbWWWWWWWWW',
      'WWWWWWWWWbbWWWWWWWWW',
    ],
    enemies: [
      { type: 'spitter', x: 7, y: 3 },
      { type: 'bat', x: 16, y: 6 },
    ],
    pickups: [{ x: 10, y: 4, item: 'acorn', id: 'ow_lake_acorn_island' }],
  },

  // ---- (9,3) east shore: sandy strip under the world's edge ------------
  '9,3': {
    biome: 'lake',
    tiles: [
      'TTTTTTTTT..TTTTTTTTT',
      'WWWWWWs.....,......T',
      'WWWWWWs........R...T',
      'WWWWWWs....,.......T',
      'WWWWWWss...........T',
      'bbbbbbss...........T',
      'bbbbbbss....,......T',
      'WWWWWWss...........T',
      'WWWWWWs.......,....T',
      'WWWWWWs............T',
      'WWWWWWs..,.........T',
      'TTTTTTTTT..TTTTTTTTT',
    ],
    enemies: [
      { type: 'beetle', x: 13, y: 8 },
      { type: 'bat', x: 12, y: 9 },
    ],
  },

  // ---- (7,4) south headland: bush thicket hides stairs to a heart cave -
  '7,4': {
    biome: 'lake',
    tiles: [
      'TTTT..TTTTTTTTTWWWWW',
      'T...PP.......ssWWWWW',
      'T...PP..,....ssWWWWW',
      'T...PP.......ssWWWWW',
      'T...PP.......sssssWW',
      'T....PPPPPPPPPPPPPP.',
      'T..,................',
      'T.......BBBB.......T',
      'T.......BBBB.......T',
      'T.......BBBB.......T',
      'T...,.........,....T',
      'TTTTTTTTTTTTTTTTTTTT',
    ],
    warps: [
      { x: 9, y: 8, to: { map: 'interiors', room: 'cave_lake_heart', x: 10, y: 10 }, hidden: 'cut' },
    ],
    enemies: [
      { type: 'slime', x: 4, y: 8 },
      { type: 'spitter', x: 14, y: 9 },
    ],
  },

  // ---- (8,4) south beach crossroads: bridge lands here; desert gateway -
  '8,4': {
    biome: 'lake',
    tiles: [
      'WWWWWWWWWbbWWWWWWWWW',
      'WWWWWWWssbbssWWWWWWW',
      'WWWWWsssssssssWWWWWW',
      'WWWsssss,sss,ssssWWW',
      'WssssssssssssssssssW',
      'ssssssssssssssssssss',
      'ssssssssssssssssssss',
      'T..,.........,.....T',
      'T......,...........T',
      'T....T........T....T',
      'T...,....PP...,....T',
      'TTTTTTTTTssTTTTTTTTT',
    ],
    enemies: [
      { type: 'bat', x: 10, y: 3 },
      { type: 'beetle', x: 5, y: 8 },
      { type: 'slime', x: 14, y: 5 },
    ],
    pots: [{ x: 2, y: 8 }, { x: 3, y: 8 }],
  },

  // ---- (9,4) SE cove: bush-ringed stash with a little gem chest --------
  '9,4': {
    biome: 'lake',
    tiles: [
      'TTTTTTTTT..TTTTTTTTT',
      'T........,.........T',
      'T..R...............T',
      'T.......WWW....,...T',
      'T......WWWWW.......T',
      '.......WWW.........T',
      '.....,.............T',
      'T..................T',
      'T...,.......BBBBB..T',
      'T...........B...B..T',
      'T...........BBBBB..T',
      'TTTTTTTTTTTTTTTTTTTT',
    ],
    chests: [
      { id: 'ow_lake_cove_gems', x: 14, y: 9, contents: { gems: 20 } },
    ],
    pots: [{ x: 15, y: 9 }],
    enemies: [
      { type: 'spitter', x: 5, y: 9 },
      { type: 'bat', x: 16, y: 3 },
    ],
  },

});
