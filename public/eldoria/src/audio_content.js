// ============================================================================
// THE PILGRIM'S PROGRESS — music + sound effects (data only)
// ----------------------------------------------------------------------------
// Registers every documented song key via registerSong() and every documented
// sfx key via registerSfx() (engine-provided globals; see docs/ARCHITECTURE.md).
//
// SOUNDTRACK — public-domain hymn melodies, chiptune arrangements.
// Happy and fast-paced per owner spec; instrumental only, no lyrics.
// Every melody below is transcribed from public-domain hymn tune sources
// (freehymns/hymns ABC transcriptions of The Cyber Hymnal / United Methodist
// Hymnal scores), transposed into C major for the chip voices:
//   title       ODE TO JOY (Beethoven, 1824)
//   meadows     ST. GERTRUDE — "Onward, Christian Soldiers" (Sullivan, 1871)
//   forest      WEBB — "Stand Up, Stand Up for Jesus" (G.J. Webb, 1830)
//   desert      ST. GERTRUDE, verses 2-3 ("Like a mighty army...")
//   mountains   WEBB, third couplet + final phrase
//   swamp       ST. GERTRUDE, verses 5-6 ("We are not divided...")
//   wastes      WEBB (re-timbre of the forest arrangement)
//   dungeon1    ASSURANCE — "Blessed Assurance" verse (P.P. Knapp, 1873)
//   dungeon2    TO GOD BE THE GLORY refrain (W.H. Doane, 1875)
//   dungeon3    ASSURANCE — "This is my story, this is my song" refrain
//   citadel     TO GOD BE THE GLORY verse
//   shrine      ASSURANCE verse, glassy
//   lake        ASSURANCE verse + refrain
//   boss        EIN FESTE BURG — "A Mighty Fortress" A-section (Luther, 1529)
//   finalboss   EIN FESTE BURG, complete form
//   victory     original short fanfare in the PAULUS/LYRA hymn-anthem class
//   gameover    (unchanged original lament — not part of the hymn mandate)
//   fanfare     item-get jingle (same melody, re-timed faster)
//   secret      discovery jingle (same melody, re-timed faster)
//
// Song format:  { bpm, loop, tracks: [{ wave, volume, notes }] }
//   notes = space-separated NAME:BEATS tokens. NAME = note (C4, Eb3, F#5...),
//   '-' = rest, 'x' = percussion tick. Tracks loop independently; the longest
//   track defines the loop length, so every other track's length must divide
//   the melody length exactly.
// Volume caps: melody <= .3, bass <= .25, percussion <= .08.
// ============================================================================

// ----------------------------------------------------------------------------
// SONGS
// ----------------------------------------------------------------------------

// --- title: ODE TO JOY, bright C major, all four phrases. 16 bars. ---------
registerSong('title', {
  bpm: 132, loop: true,
  tracks: [
    { wave: 'square', volume: 0.2, notes:
      'E4:1 E4:1 F4:1 G4:1' +          // phrase A, bar 1
      ' G4:1 F4:1 E4:1 D4:1' +         // bar 2
      ' C4:1 C4:1 D4:1 E4:1' +         // bar 3
      ' E4:1.5 D4:0.5 D4:2' +          // bar 4
      ' E4:1 E4:1 F4:1 G4:1' +         // phrase A repeat
      ' G4:1 F4:1 E4:1 D4:1' +
      ' C4:1 C4:1 D4:1 E4:1' +
      ' D4:1.5 C4:0.5 C4:2' +          // bar 8
      ' D4:1 D4:1 E4:1 C4:1' +         // phrase B, bar 9
      ' D4:1 E4:0.5 F4:0.5 E4:1 C4:1' + // bar 10
      ' D4:1 E4:0.5 F4:0.5 E4:1 D4:1' + // bar 11
      ' C4:1 D4:1 G3:2' +              // bar 12
      ' E4:1 E4:1 F4:1 G4:1' +         // phrase A return
      ' G4:1 F4:1 E4:1 D4:1' +
      ' C4:1 C4:1 D4:1 E4:1' +
      ' D4:1.5 C4:0.5 C4:2' },         // bar 16
    { wave: 'triangle', volume: 0.24, notes:
      'C3:1 G3:1 C3:1 G3:1' +   // m1 C
      ' G2:1 G3:1 G2:1 G3:1' +  // m2 G
      ' C3:1 G3:1 C3:1 G3:1' +  // m3 C
      ' G2:1 G3:1 G2:2' +       // m4 G7
      ' C3:1 G3:1 C3:1 G3:1' +  // m5
      ' G2:1 G3:1 G2:1 G3:1' +  // m6
      ' C3:1 G3:1 C3:1 G3:1' +  // m7
      ' G2:2 C3:2' +            // m8 G->C
      ' G2:1 G3:1 G2:1 G3:1' +  // m9 G
      ' C3:1 G3:1 C3:1 G3:1' +  // m10 C
      ' G2:1 G3:1 G2:1 G3:1' +  // m11 G
      ' G2:2 C3:2' +            // m12 G7->C
      ' C3:1 G3:1 C3:1 G3:1' +  // m13
      ' G2:1 G3:1 G2:1 G3:1' +  // m14
      ' C3:1 G3:1 C3:1 G3:1' +  // m15
      ' G2:1 G2:1 C3:2' },      // m16 G7->C
    { wave: 'noiseHat', volume: 0.05, notes: 'x:1 -:0.5 x:0.5 x:1 x:1' },
  ],
});

// --- meadows: ST. GERTRUDE, verse + refrain ("Onward, Christian
//     soldiers... With the cross of Jesus"). 8 bars, bright march. -----------
registerSong('meadows', {
  bpm: 132, loop: true,
  tracks: [
    { wave: 'square', volume: 0.2, notes:
      'G4:1 G4:1 G4:1 G4:1' +    // "On-ward, Chris-tian" (pickup bar)
      ' G4:1.5 A4:0.5 G4:2' +    // "sol-diers"
      ' G4:1 G4:1 F4:1 G4:1' +   // "march-ing as to"
      ' C5:4' +                  // "war"
      ' C5:1 E5:1 G5:1 C6:1' +   // "with the cross of"
      ' C6:2 B5:2' +             // "Je-sus"
      ' A5:1 A5:1 E5:1 F5:1' +   // "go-ing on be-"
      ' G5:4' },                 // "fore"
    { wave: 'triangle', volume: 0.24, notes:
      'C3:1 G3:1 C3:1 G3:1' +
      ' C3:2 G2:2' +
      ' F2:2 G2:2' +
      ' C3:4' +
      ' C3:1 G3:1 C3:1 G3:1' +
      ' C3:2 G2:2' +
      ' F2:1 F3:1 F2:2' +
      ' G2:4' },
    { wave: 'noiseHat', volume: 0.06, notes: 'x:1 x:0.5 x:0.5 x:1 x:1' },
  ],
});

// --- forest: WEBB, first couplet ("Stand up, stand up for Jesus, ye
//     soldiers of the word"). 8 bars, upbeat. ----------------------------------
registerSong('forest', {
  bpm: 128, loop: true,
  tracks: [
    { wave: 'square', volume: 0.2, notes:
      'C5:1.5 C5:0.5 E5:1 C5:1' +  // "Stand up, stand up for"
      ' C5:2 A4:1 C5:1' +          // "Je-sus, ye"
      ' G4:1 C5:1 D5:1 E5:1' +     // "sol-diers of the"
      ' D5:3 G4:1' +               // "word" (+pickup)
      ' C5:1.5 C5:0.5 E5:1 C5:1' + // repeat phrase
      ' C5:2 A4:1 C5:1' +
      ' G4:1 C5:1 E5:1 D5:1' +
      ' C5:3 -:1' },               // tonic close
    { wave: 'triangle', volume: 0.24, notes:
      'C3:1 G3:1 C3:1 G3:1' +
      ' F2:1 C3:1 F2:1 C3:1' +
      ' G2:1 G3:1 G2:1 G3:1' +
      ' G2:2 D3:2' +
      ' C3:1 G3:1 C3:1 G3:1' +
      ' F2:1 C3:1 F2:1 C3:1' +
      ' G2:1 G3:1 G2:1 G3:1' +
      ' C3:2 G2:2' },
    { wave: 'noiseHat', volume: 0.05, notes: 'x:0.5 x:0.5 x:1 x:1 x:1' },
  ],
});

// --- desert: ST. GERTRUDE, verses 2-3 ("Like a mighty army moves the
//     church of God... Brothers, we are treading"). 8 bars. --------------------
registerSong('desert', {
  bpm: 124, loop: true,
  tracks: [
    { wave: 'square', volume: 0.2, notes:
      'G4:1 G4:1 G4:1 G4:1' +    // "like a might-y ar-"
      ' A4:1.5 B4:0.5 A4:2' +    // "my"
      ' G4:1 G4:1 C5:1 G4:1' +   // "moves the church of"
      ' A4:4' +                  // "God"
      ' A4:1 G4:1 F4:1 G4:1' +   // "broth-ers we are"
      ' A4:1 G4:1 F4:1 G4:1' +   // "tread-ing where the"
      ' A4:1 G4:1 F4:1 E4:1' +   // "saints have trod"
      ' D4:4' },                 // (hold)
    { wave: 'triangle', volume: 0.24, notes:
      'C3:1 G3:1 C3:1 G3:1' +
      ' F2:2 G2:2' +
      ' C3:1 G3:1 C3:1 G3:1' +
      ' F2:4' +
      ' C3:1 G3:1 C3:1 G3:1' +
      ' C3:1 G3:1 F2:1 G2:1' +
      ' F2:1 G2:1 G2:2' +
      ' G2:2 D3:2' },
    { wave: 'noiseHat', volume: 0.06, notes: 'x:1 x:0.5 x:0.5 x:1 x:1' },
  ],
});

// --- mountains: WEBB, third couplet + final phrase. 8 bars, steady
//     march with snare. ---------------------------------------------------------
registerSong('mountains', {
  bpm: 116, loop: true,
  tracks: [
    { wave: 'square', volume: 0.2, notes:
      'G4:1 D5:1.5 D5:0.5 C5:1' +  // "each piece of ar-mor" (pickup folded)
      ' D5:2 D5:1 D5:1' +          // "on, with the"
      ' E5:1 D5:1 A4:1 D5:1' +     // "shield of faith be-"  (line F)
      ' C5:2 B4:1 G4:1' +          // "fore" (+pickup)
      ' C5:1.5 C5:0.5 E5:1 C5:1' + // final phrase (line G-H)
      ' C5:2 A4:1 G4:1' +
      ' G4:1 C5:1 E5:1 D5:1' +
      ' C5:3 -:1' },               // tonic close
    { wave: 'triangle', volume: 0.24, notes:
      'G2:1 G3:1 G2:1 G3:1' +
      ' G2:2 C3:2' +
      ' G2:1 G3:1 G2:1 G3:1' +
      ' C3:2 G2:2' +
      ' C3:1 G3:1 C3:1 G3:1' +
      ' F2:1 C3:1 F2:1 C3:1' +
      ' G2:1 G3:1 G2:1 G3:1' +
      ' C3:2 G2:2' },
    { wave: 'noiseSnare', volume: 0.06, notes: 'x:1 x:0.5 x:0.5 -:1 x:1' },
  ],
});

// --- swamp: ST. GERTRUDE, verses 5-6 ("We are not divided, all one
//     body we... one in hope and doctrine"). 8 bars, darker timbre. ------------
registerSong('swamp', {
  bpm: 112, loop: true,
  tracks: [
    { wave: 'triangle', volume: 0.22, notes:
      'C4:1 C4:1 C4:1 C4:1' +      // "we are not di-vi-"
      ' C4:1 B3:0.5 A3:0.5 B3:1 C4:1' + // "ded, all one bod-"
      ' D4:1 D4:1 D4:1 C4:0.5 D4:0.5' + // "y we"
      ' E4:4' +                    // (hold)
      ' G4:1 G4:1 C5:1 B4:1' +     // "one in hope and doc-"
      ' C5:2 G4:2' +               // "trine, one in"
      ' F4:1 E4:1 D4:1.5 C4:0.5' + // "cha-ri-ty"
      ' C4:4' },                   // tonic close
    { wave: 'sine', volume: 0.22, notes:
      'C3:1 G3:1 C3:1 G3:1' +
      ' C3:2 G2:2' +
      ' G2:2 D3:2' +
      ' C3:4' +
      ' C3:1 G3:1 C3:1 G3:1' +
      ' C3:2 G2:2' +
      ' F2:1 G2:1 G2:2' +
      ' C3:4' },
    { wave: 'noiseHat', volume: 0.04, notes: 'x:1 -:1 x:1 -:1' },
  ],
});

// --- wastes: WEBB first couplet re-timbred for the bleak outer road. --------
registerSong('wastes', {
  bpm: 122, loop: true,
  tracks: [
    { wave: 'sawtooth', volume: 0.18, notes:
      'C5:1.5 C5:0.5 E5:1 C5:1' +
      ' C5:2 A4:1 C5:1' +
      ' G4:1 C5:1 D5:1 E5:1' +
      ' D5:3 G4:1' +
      ' C5:1.5 C5:0.5 E5:1 C5:1' +
      ' C5:2 A4:1 C5:1' +
      ' G4:1 C5:1 E5:1 D5:1' +
      ' C5:3 -:1' },
    { wave: 'triangle', volume: 0.25, notes:
      'C3:1 C2:1 C3:1 C2:1' +
      ' F2:1 C3:1 F2:1 C3:1' +
      ' G2:1 G3:1 G2:1 G3:1' +
      ' G2:2 D3:2' +
      ' C3:1 C2:1 C3:1 C2:1' +
      ' F2:1 C3:1 F2:1 C3:1' +
      ' G2:1 G3:1 G2:1 G3:1' +
      ' C3:2 C2:2' },
    { wave: 'noiseSnare', volume: 0.05, notes: '-:1 x:1 -:1 x:1' },
  ],
});

// --- dungeon1: ASSURANCE verse ("Blessed assurance, Jesus is mine!
//     O what a foretaste of glory divine!..."). 9/8, 36 beats. ------------------
registerSong('dungeon1', {
  bpm: 116, loop: true,
  tracks: [
    { wave: 'square', volume: 0.2, notes:
      'E4:0.5 D4:0.5 C4:0.5' +           // "Bless-ed as-"
      ' G4:1.5 G4:1.5 F4:0.5 G4:0.5 A4:0.5' + // "sur-ance, Je-sus is"
      ' G4:3' +                          // "mine!"
      ' G4:0.5 E4:0.5 G4:0.5' +          // "O what a"
      ' C5:1.5 B4:1 B4:0.5 A4:0.5 G4:0.5 F#4:0.5' + // "fore-taste of glo-ry di-"
      ' G4:3' +                          // "vine!"
      ' E4:0.5 D4:0.5 C4:0.5' +          // "Heir of sal-"
      ' G4:1.5 G4:1.5 F4:0.5 G4:0.5 A4:0.5' + // "va-tion pur-chase of"
      ' G4:3' +                          // "God"
      ' C4:0.5 D4:0.5 E4:0.5' +          // "born of His"
      ' F4:1.5 D4:1.5 C4:0.5 D4:0.5 B3:0.5' + // "Spi-rit washed in His"
      ' C4:3' },                         // "blood"
    { wave: 'triangle', volume: 0.24, notes:
      'C3:1.5 G2:1.5 C3:1.5 G2:1.5 C3:1.5 G2:1.5' +   // 9
      ' G2:1.5 D3:1.5 G2:1.5 D3:1.5 G2:1.5 D3:1.5' +  // 9
      ' C3:1.5 G2:1.5 C3:1.5 G2:1.5 C3:1.5 G2:1.5' +  // 9
      ' G2:1.5 D3:1.5 G2:1.5 G2:1.5 C3:1.5 C3:1.5' }, // 9
    { wave: 'noiseHat', volume: 0.05, notes: 'x:1.5 -:1.5 x:1.5 x:1.5 -:1.5 x:1.5' },
  ],
});

// --- dungeon2: TO GOD BE THE GLORY refrain ("Praise the Lord, praise
//     the Lord, let the earth hear His voice!..."). 3/4, 36 beats. -------------
registerSong('dungeon2', {
  bpm: 132, loop: true,
  tracks: [
    { wave: 'square', volume: 0.2, notes:
      'E5:0.75 F#5:0.25 G5:2' +      // "praise the LORD!"
      ' E5:0.75 F#5:0.25 G5:2' +     // "praise the Lord!"
      ' E5:0.75 C5:0.25 C5:1 D5:1' + // "let the earth"
      ' E5:1 D5:2' +                 // "hear His voice"
      ' D5:0.75 E5:0.25 F5:2' +      // "praise the Lord!"
      ' D5:0.75 E5:0.25 F5:2' +      // "praise the Lord!"
      ' E5:0.5 D5:0.5 G5:1 G5:1' +   // "let the peo-ple"
      ' F5:1 E5:2' +                 // "re-joice"
      ' E5:1 G5:1 F5:1' +            // "and give Him the"
      ' D5:1 C5:1 B4:1' +            // "glo-ry, great things"
      ' E5:1 E5:1 D5:1' +            // "He hath"
      ' C5:2 -:1' },                 // "done"
    { wave: 'triangle', volume: 0.24, notes:
      'C3:1 G3:1 C3:1' +
      ' C3:1 G3:1 C3:1' +
      ' G2:1 D3:1 G2:1' +
      ' G2:1 D3:1 G2:1' +
      ' F2:1 C3:1 F2:1' +
      ' F2:1 C3:1 F2:1' +
      ' C3:1 G2:1 C3:1' +
      ' C3:1 G2:1 C3:1' +
      ' C3:1 G3:1 C3:1' +
      ' G2:1 D3:1 G2:1' +
      ' C3:1 G3:1 G2:1' +
      ' C3:1 C3:1 C3:1' },
    { wave: 'noiseHat', volume: 0.06, notes: 'x:1 -:1 x:1' },
  ],
});

// --- dungeon3: ASSURANCE refrain ("This is my story, this is my song,
//     praising my Savior all the day long"). 9/8, 36 beats. ---------------------
registerSong('dungeon3', {
  bpm: 120, loop: true,
  tracks: [
    { wave: 'square', volume: 0.2, notes:
      'G4:0.5 G4:0.5 G4:0.5' +              // "this is my"
      ' C5:1.5 G4:1.5 A4:0.5 A4:0.5 A4:0.5' + // "sto-ry, this is my"
      ' G4:3' +                             // "song"
      ' G4:0.5 G4:0.5 G4:0.5' +             // "prais-ing my"
      ' A4:1.5 C5:1.5 B4:0.5 B4:0.5 A4:0.5' + // "Sav-ior all the"
      ' B4:3' +                             // "day"
      ' B4:0.5 C5:0.5 D5:0.5' +             // "long" (run-up)
      ' C5:1.5 G4:1.5 A4:0.5 G4:0.5 A4:0.5' + // "prais-ing my Sav-ior"
      ' G4:3' +                             // "all the"
      ' C4:0.5 D4:0.5 E4:0.5' +             // (run) "day"
      ' F4:1.5 D4:1.5 C4:0.75 D4:0.25 B3:0.5' + // "long" (cadence run)
      ' C4:3' },                            // (hold)
    { wave: 'triangle', volume: 0.24, notes:
      'C3:1.5 G2:1.5 C3:1.5 G2:1.5 C3:1.5 G2:1.5' +
      ' G2:1.5 D3:1.5 G2:1.5 D3:1.5 G2:1.5 D3:1.5' +
      ' C3:1.5 G2:1.5 C3:1.5 G2:1.5 C3:1.5 G2:1.5' +
      ' G2:1.5 D3:1.5 G2:1.5 G2:1.5 C3:1.5 C3:1.5' },
    { wave: 'noiseHat', volume: 0.05, notes: 'x:1.5 -:1.5 x:1.5 x:1.5 -:1.5 x:1.5' },
  ],
});

// --- citadel: TO GOD BE THE GLORY verse, march ("To God be the glory,
//     great things He hath done; so loved He the world..."). 3/4, 48 beats. ----
registerSong('citadel', {
  bpm: 126, loop: true,
  tracks: [
    { wave: 'square', volume: 0.2, notes:
      'G4:2 A4:0.75 B4:0.25' +   // "God be the" (To-God pickup ends m16)
      ' C5:1 G4:1 C5:1' +        // "glo-ry, great"
      ' D5:1 G4:1 D5:1' +        // "things He"
      ' E5:2 E5:1' +             // "hath done"
      ' F#5:1 A4:1 F#5:1' +      // "done, so"
      ' E5:1 C5:1 E5:1' +        // "loved He the"
      ' E5:1 D5:1 A4:1' +        // "world that He"
      ' D5:2 G4:1' +             // "gave us His" (+pickup)
      ' G4:2 A4:0.75 B4:0.25' +  // "come to the" ("O" pickup)
      ' C5:1 G4:1 C5:1' +        // "Fa-ther, through"
      ' D5:1 G4:1 D5:1' +        // "Je-sus the"
      ' E5:2 E5:1' +             // "Son"
      ' E5:1 G5:1 F5:1' +        // "and give Him"
      ' D5:1 C5:1 B4:1' +        // "glo-ry great"
      ' E5:1 E5:1 D5:1' +        // "great things He hath"
      ' C5:2 G4:1' },            // "done" (+loop pickup)
    { wave: 'triangle', volume: 0.25, notes:
      'C3:1 G3:1 C3:1' +
      ' C3:1 G3:1 C3:1' +
      ' G2:1 D3:1 G2:1' +
      ' C3:1 G3:1 C3:1' +
      ' D3:1 A3:1 D3:1' +
      ' C3:1 G3:1 C3:1' +
      ' G2:1 D3:1 G2:1' +
      ' G2:2 C3:1' +
      ' C3:1 G3:1 C3:1' +
      ' C3:1 G3:1 C3:1' +
      ' G2:1 D3:1 G2:1' +
      ' C3:1 G3:1 C3:1' +
      ' C3:1 G3:1 C3:1' +
      ' C3:1 G2:1 C3:1' +
      ' C3:1 G3:1 G2:1' +
      ' C3:2 G2:1' },
    { wave: 'noiseSnare', volume: 0.06, notes: 'x:0.5 x:0.5 -:1 x:1' },
  ],
});

// --- shrine: ASSURANCE verse, glassy sine, no percussion. 36 beats. ----------
registerSong('shrine', {
  bpm: 110, loop: true,
  tracks: [
    { wave: 'sine', volume: 0.2, notes:
      'E4:0.5 D4:0.5 C4:0.5' +
      ' G4:1.5 G4:1.5 F4:0.5 G4:0.5 A4:0.5' +
      ' G4:3' +
      ' G4:0.5 E4:0.5 G4:0.5' +
      ' C5:1.5 B4:1 B4:0.5 A4:0.5 G4:0.5 F#4:0.5' +
      ' G4:3' +
      ' E4:0.5 D4:0.5 C4:0.5' +
      ' G4:1.5 G4:1.5 F4:0.5 G4:0.5 A4:0.5' +
      ' G4:3' +
      ' C4:0.5 D4:0.5 E4:0.5' +
      ' F4:1.5 D4:1.5 C4:0.5 D4:0.5 B3:0.5' +
      ' C4:3 ' },
    { wave: 'triangle', volume: 0.22, notes:
      'C3:1.5 G2:1.5 C3:1.5 G2:1.5 C3:1.5 G2:1.5' +
      ' G2:1.5 D3:1.5 G2:1.5 D3:1.5 G2:1.5 D3:1.5' +
      ' C3:1.5 G2:1.5 C3:1.5 G2:1.5 C3:1.5 G2:1.5' +
      ' G2:1.5 D3:1.5 G2:1.5 G2:1.5 C3:1.5 C3:1.5' },
  ],
});

// --- lake: ASSURANCE verse + refrain, the full tune. 72 beats. ---------------
registerSong('lake', {
  bpm: 124, loop: true,
  tracks: [
    { wave: 'sine', volume: 0.2, notes:
      // verse
      'E4:0.5 D4:0.5 C4:0.5' +
      ' G4:1.5 G4:1.5 F4:0.5 G4:0.5 A4:0.5' +
      ' G4:3' +
      ' G4:0.5 E4:0.5 G4:0.5' +
      ' C5:1.5 B4:1 B4:0.5 A4:0.5 G4:0.5 F#4:0.5' +
      ' G4:3' +
      ' E4:0.5 D4:0.5 C4:0.5' +
      ' G4:1.5 G4:1.5 F4:0.5 G4:0.5 A4:0.5' +
      ' G4:3' +
      ' C4:0.5 D4:0.5 E4:0.5' +
      ' F4:1.5 D4:1.5 C4:0.5 D4:0.5 B3:0.5' +
      ' C4:3 ' +
      // refrain: "This is my story, this is my song..."
      'G4:0.5 G4:0.5 G4:0.5' +
      ' C5:1.5 G4:1.5 A4:0.5 A4:0.5 A4:0.5' +
      ' G4:3' +
      ' G4:0.5 G4:0.5 G4:0.5' +
      ' A4:1.5 C5:1.5 B4:0.5 B4:0.5 A4:0.5' +
      ' B4:3' +
      ' B4:0.5 C5:0.5 D5:0.5' +
      ' C5:1.5 G4:1.5 A4:0.5 G4:0.5 A4:0.5' +
      ' G4:3' +
      ' C4:0.5 D4:0.5 E4:0.5' +
      ' F4:1.5 D4:1.5 C4:0.75 D4:0.25 B3:0.5' +
      ' C4:3 ' },
    { wave: 'triangle', volume: 0.22, notes:
      'C3:1.5 G2:1.5 C3:1.5 G2:1.5 C3:1.5 G2:1.5' +
      ' G2:1.5 D3:1.5 G2:1.5 D3:1.5 G2:1.5 D3:1.5' +
      ' C3:1.5 G2:1.5 C3:1.5 G2:1.5 C3:1.5 G2:1.5' +
      ' G2:1.5 D3:1.5 G2:1.5 G2:1.5 C3:1.5 C3:1.5' +
      ' C3:1.5 G2:1.5 C3:1.5 G2:1.5 C3:1.5 G2:1.5' +
      ' G2:1.5 D3:1.5 G2:1.5 D3:1.5 G2:1.5 D3:1.5' +
      ' C3:1.5 G2:1.5 C3:1.5 G2:1.5 C3:1.5 G2:1.5' +
      ' G2:1.5 D3:1.5 G2:1.5 G2:1.5 C3:1.5 C3:1.5' },
    { wave: 'noiseHat', volume: 0.04, notes:
      'x:1.5 -:1.5 x:1.5 x:1.5 -:1.5 x:1.5' +
      ' x:1.5 -:1.5 x:1.5 x:1.5 -:1.5 x:1.5' +
      ' x:1.5 -:1.5 x:1.5 x:1.5 -:1.5 x:1.5' +
      ' x:1.5 -:1.5 x:1.5 x:1.5 -:1.5 x:1.5' },
  ],
});

// --- boss: EIN FESTE BURG A-section ("A mighty fortress is our God, a
//     bulwark never failing"), gallop bass. 18 beats. ---------------------------
registerSong('boss', {
  bpm: 150, loop: true,
  tracks: [
    { wave: 'square', volume: 0.2, notes:
      'C5:1' +                              // "A" (pickup)
      ' C5:1 C5:1 G4:0.5 A4:0.5 B4:1' +     // "migh-ty for-tress"
      ' C5:0.5 B4:0.5 A4:1 G4:1 -:1' +      // "is our God" (hold)
      ' C5:1' +                             // "a" (pickup)
      ' B4:1 A4:1 G4:1 A4:1' +              // "bul-wark ne-ver"
      ' F4:0.5 E4:0.5 D4:1 C4:1 -:1' },     // "fail-ing"
    { wave: 'triangle', volume: 0.25, notes:
      'C2:1' +
      ' C2:0.5 C2:0.5 C2:1 C2:0.5 C2:0.5 C2:1' +
      ' G2:0.5 G2:0.5 G2:1 G2:0.5 G2:0.5 G2:1' +
      ' C2:1' +
      ' G2:0.5 G2:0.5 G2:1 G2:0.5 G2:0.5 G2:1' +
      ' F2:0.5 F2:0.5 F2:1 G2:0.5 G2:0.5 C3:1' },
    { wave: 'noiseSnare', volume: 0.07, notes: '-:0.5 x:0.5 x:1 x:1' },
  ],
});

// --- finalboss: EIN FESTE BURG complete form — A section, B section,
//     "prince of darkness" B-part, final phrase. 54 beats. ----------------------
registerSong('finalboss', {
  bpm: 162, loop: true,
  tracks: [
    { wave: 'sawtooth', volume: 0.18, notes:
      'C5:1' +                              // A: "A"
      ' C5:1 C5:1 G4:0.5 A4:0.5 B4:1' +     // "migh-ty for-tress"
      ' C5:0.5 B4:0.5 A4:1 G4:1 -:1' +      // "is our God"
      ' C5:1' +                             // B: "a"
      ' B4:1 A4:1 G4:1 A4:1' +              // "bul-wark ne-ver"
      ' F4:0.5 E4:0.5 D4:1 C4:1 -:1' +      // "fail-ing"
      ' C4:1' +                             // B': "and"
      ' G4:1 A4:1 G4:1 F#4:1' +             // "though this world"
      ' G4:1 -:1' +                         // "with"
      ' C4:1' +                             // "de-vils"
      ' G4:1 G4:1 A4:1 B4:1' +              // "filled, should"
      ' C5:1 -:1' +                         // "threat-en"
      ' B4:1' +                             // "to"
      ' C5:1 B4:1 A4:1 A4:1' +              // "un-do us"
      ' G4:1 -:1' +                         // (hold)
      ' A4:1' +                             // "we"
      ' A4:1 G4:1 A4:1 F4:1' +              // "will not fear, for"
      ' E4:1 -:1' +                         // "God hath willed"
      ' C5:1' +                             // "His"
      ' B4:1 A4:1 G4:1 A4:1' +              // "tri-uth per-suad-es"
      ' F4:0.5 E4:0.5 D4:1 C4:1' },         // "so" (final tonic, straight into loop)
    { wave: 'triangle', volume: 0.25, notes:
      'C2:1' +
      ' C2:0.5 C2:0.5 C2:1 C2:0.5 C2:0.5 C2:1' +
      ' G2:0.5 G2:0.5 G2:1 G2:0.5 G2:0.5 G2:1' +
      ' C2:1' +
      ' G2:0.5 G2:0.5 G2:1 G2:0.5 G2:0.5 G2:1' +
      ' F2:0.5 F2:0.5 F2:1 G2:0.5 G2:0.5 C3:1' +
      ' C2:1' +
      ' G2:0.5 G2:0.5 G2:1 G2:0.5 G2:0.5 G2:1' +
      ' G2:1 G2:1' +
      ' C2:1' +
      ' C2:0.5 C2:0.5 C2:1 C2:0.5 C2:0.5 C2:1' +
      ' C2:1 C2:1' +
      ' G2:1' +
      ' C2:0.5 C2:0.5 C2:1 C2:0.5 C2:0.5 C2:1' +
      ' G2:1 G2:1' +
      ' A2:1' +
      ' F2:0.5 F2:0.5 F2:1 F2:0.5 F2:0.5 F2:1' +
      ' E2:1 E2:1' +
      ' C2:1' +
      ' G2:0.5 G2:0.5 G2:1 G2:0.5 G2:0.5 G2:1' +
      ' F2:0.5 F2:0.5 F2:1 C3:0.5 G2:0.5' },
          { wave: 'noiseSnare', volume: 0.07, notes:
        'x:0.5 x:0.5 -:1 x:1 x:0.5 x:0.5 -:1 x:1 x:0.5 x:0.5 -:1 x:1 ' +
        'x:0.5 x:0.5 -:1 x:1 x:0.5 x:0.5 -:1 x:1 x:0.5 x:0.5 -:1 x:1 ' +
        'x:0.5 x:0.5 -:1 x:1 x:0.5 x:0.5 -:1 x:1 x:0.5 x:0.5 -:1 x:1 ' +
        'x:0.5 x:0.5 -:1 x:1 x:0.5 x:0.5 -:1 x:1 x:0.5 x:0.5 -:1 x:1 ' +
        'x:0.5 x:0.5 -:1 x:1 x:0.5 x:0.5 -:1 x:1 x:0.5 x:0.5 -:1 x:1 ' +
        'x:0.5 x:0.5 -:1 x:1 x:0.5 x:0.5 -:1 x:1 x:0.5 x:0.5 -:1 x:1 ' },
  ],
});

// --- victory: short PAULUS/LYRA-class hymn-anthem fanfare (original
//     melody in that style: rising triad, held tonic, closing cadence).
//     Non-loop, plays once. ------------------------------------------------------
registerSong('victory', {
  bpm: 140, loop: false,
  tracks: [
    { wave: 'square', volume: 0.22, notes:
      'G4:0.5 C5:0.5 E5:0.5 G5:0.5 C6:2' +  // rising triad, held high C
      ' A5:1 G5:1 E5:2' +                   // stepwise fall
      ' F5:1 E5:1 D5:1 G5:1' +              // subdominant turn
      ' E5:1 D5:1 C5:2' },                  // tonic close
    { wave: 'triangle', volume: 0.24, notes:
      'C3:0.5 C3:0.5 C3:1 G2:2' +
      ' A2:1 G2:1 C3:2' +
      ' F2:1 C3:1 G2:1 G3:1' +
      ' G2:1 G2:1 C3:2' },
    { wave: 'noiseHat', volume: 0.06, notes:
      'x:0.5 x:0.5 x:1 x:1 x:0.5 x:0.5 x:1 x:1 x:0.5 x:0.5 x:1 x:1 x:0.5 x:0.5 x:1 x:1' },
  ],
});

// --- gameover: slow lament, A minor. 8 bars. (unchanged) ---------------------
registerSong('gameover', {
  bpm: 66, loop: true,
  tracks: [
    { wave: 'sine', volume: 0.2, notes:
      'E5:2 C5:2' +            // bar 1
      ' B4:2 A4:2' +           // bar 2
      ' C5:2 B4:1 A4:1' +      // bar 3
      ' E4:4' +                // bar 4
      ' D5:2 B4:2' +           // bar 5
      ' C5:2 A4:2' +           // bar 6
      ' B4:2 G#4:2' +          // bar 7
      ' A4:4' },               // bar 8
    { wave: 'triangle', volume: 0.22, notes:
      'A2:4 E2:4 F2:4 E2:4 D2:4 A2:4 E2:4 A2:4' },
  ],
});

// --- fanfare: item-get jingle (non-loop, short) — re-timed faster. -----------
registerSong('fanfare', {
  bpm: 148, loop: false,
  tracks: [
    { wave: 'square', volume: 0.25, notes:
      'C5:0.5 E5:0.5 G5:0.5 C6:1.5 B5:0.5 C6:2.5' },
    { wave: 'triangle', volume: 0.22, notes:
      'C3:0.5 C3:0.5 C3:0.5 G2:1.5 G2:0.5 C3:2.5' },
  ],
});

// --- secret: discovery jingle (non-loop, short rising sparkle) — re-timed. ---
registerSong('secret', {
  bpm: 152, loop: false,
  tracks: [
    { wave: 'sine', volume: 0.25, notes:
      'D5:0.25 E5:0.25 F#5:0.25 A5:0.25 C#6:0.25 E6:1.75' },
    { wave: 'triangle', volume: 0.2, notes:
      'D3:1 E3:0.5 A2:1.5' },
  ],
});

// ----------------------------------------------------------------------------
// SFX  (types: sweep | blip | noise | chord — see docs/ARCHITECTURE.md)
// ----------------------------------------------------------------------------

registerSfx('sword',      { type: 'sweep', wave: 'square',   from: 700,  to: 220, dur: 0.09, vol: 0.3 });
registerSfx('hit',        { type: 'noise', from: 420,  to: 90,  dur: 0.08, vol: 0.25 });
registerSfx('enemyDie',   { type: 'sweep', wave: 'sawtooth', from: 520,  to: 50,  dur: 0.28, vol: 0.22 });
registerSfx('hurt',       { type: 'sweep', wave: 'square',   from: 260,  to: 90,  dur: 0.2,  vol: 0.28 });
registerSfx('pickup',     { type: 'blip',  wave: 'square',   freq: 880,  dur: 0.07, vol: 0.22 });
registerSfx('gem',        { type: 'chord', wave: 'square',   freqs: [1319, 1760],          dur: 0.12, stagger: 0.04, vol: 0.2 });
registerSfx('heart',      { type: 'chord', wave: 'sine',     freqs: [660, 880],            dur: 0.15, stagger: 0.06, vol: 0.22 });
registerSfx('key',        { type: 'chord', wave: 'square',   freqs: [988, 1319],           dur: 0.1,  stagger: 0.06, vol: 0.22 });
registerSfx('unlock',     { type: 'chord', wave: 'square',   freqs: [330, 523, 784],       dur: 0.14, stagger: 0.07, vol: 0.24 });
registerSfx('doorOpen',   { type: 'sweep', wave: 'triangle', from: 140,  to: 420, dur: 0.25, vol: 0.24 });
registerSfx('chest',      { type: 'chord', wave: 'square',   freqs: [392, 523, 659, 784],  dur: 0.35, stagger: 0.09, vol: 0.24 });
registerSfx('secret',     { type: 'chord', wave: 'sine',     freqs: [700, 1050, 1400],     dur: 0.3,  stagger: 0.08, vol: 0.22 });
registerSfx('bombPlace',  { type: 'blip',  wave: 'triangle', freq: 200,  dur: 0.09, vol: 0.25 });
registerSfx('explosion',  { type: 'noise', from: 900,  to: 50,  dur: 0.5,  vol: 0.3 });
registerSfx('arrow',      { type: 'sweep', wave: 'square',   from: 1300, to: 400, dur: 0.1,  vol: 0.18 });
registerSfx('push',       { type: 'noise', from: 240,  to: 110, dur: 0.16, vol: 0.18 });
registerSfx('plate',      { type: 'blip',  wave: 'square',   freq: 330,  dur: 0.08, vol: 0.22 });
registerSfx('switch',     { type: 'blip',  wave: 'square',   freq: 740,  dur: 0.09, vol: 0.24 });
registerSfx('torch',      { type: 'noise', from: 1200, to: 280, dur: 0.22, vol: 0.2 });
registerSfx('stairs',     { type: 'sweep', wave: 'triangle', from: 420,  to: 150, dur: 0.3,  vol: 0.22 });
registerSfx('blip',       { type: 'blip',  wave: 'square',   freq: 980,  dur: 0.04, vol: 0.18 });
registerSfx('menuMove',   { type: 'blip',  wave: 'square',   freq: 660,  dur: 0.05, vol: 0.16 });
registerSfx('menuSelect', { type: 'chord', wave: 'square',   freqs: [660, 990],            dur: 0.1,  stagger: 0.05, vol: 0.2 });
registerSfx('save',       { type: 'chord', wave: 'sine',     freqs: [523, 659, 784],       dur: 0.3,  stagger: 0.1,  vol: 0.22 });
registerSfx('fall',       { type: 'sweep', wave: 'sine',     from: 700,  to: 90,  dur: 0.4,  vol: 0.24 });
registerSfx('shardGet',   { type: 'chord', wave: 'sine',     freqs: [659, 831, 988, 1319], dur: 0.6,  stagger: 0.12, vol: 0.25 });
registerSfx('potion',     { type: 'sweep', wave: 'sine',     from: 280,  to: 900, dur: 0.3,  vol: 0.22 });
registerSfx('denied',     { type: 'blip',  wave: 'square',   freq: 140,  dur: 0.15, vol: 0.24 });
registerSfx('barrier',    { type: 'chord', wave: 'sawtooth', freqs: [220, 311, 415],       dur: 0.4,  stagger: 0.03, vol: 0.2 });
registerSfx('bossRoar',   { type: 'noise', from: 320,  to: 45,  dur: 0.7,  vol: 0.3 });
