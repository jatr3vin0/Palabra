// ============================================================================
// THE SHATTERED CROWN — music + sound effects (data only)
// ----------------------------------------------------------------------------
// Registers every documented song key via registerSong() and every documented
// sfx key via registerSfx() (engine-provided globals; see docs/ARCHITECTURE.md).
//
// Song format:  { bpm, loop, tracks: [{ wave, volume, notes }] }
//   notes = space-separated NAME:BEATS tokens. NAME = note (C4, Eb3, F#5...),
//   '-' = rest, 'x' = percussion tick. Tracks loop independently; the longest
//   track defines the loop length, so percussion patterns are kept to lengths
//   that divide the melody length exactly.
// Volume caps: melody <= .3, bass <= .25, percussion <= .08.
// ============================================================================

// ----------------------------------------------------------------------------
// SONGS
// ----------------------------------------------------------------------------

// --- title: noble + mysterious, A minor, slow. 8 bars of 4/4. -------------
registerSong('title', {
  bpm: 84, loop: true,
  tracks: [
    { wave: 'sine', volume: 0.22, notes:
      'A4:2 C5:1 E5:1' +        // bar 1
      ' D5:3 C5:1' +            // bar 2
      ' B4:2 G4:1 B4:1' +       // bar 3
      ' A4:4' +                 // bar 4
      ' A4:2 C5:1 E5:1' +       // bar 5
      ' F5:3 E5:1' +            // bar 6
      ' D5:2 C5:1 B4:1' +       // bar 7
      ' A4:4' },                // bar 8
    { wave: 'triangle', volume: 0.22, notes:
      'A2:4 D3:4 G2:4 A2:4 A2:4 F2:4 G2:4 A2:4' },
  ],
});

// --- meadows: bright + adventurous, C major. 16 bars. ----------------------
registerSong('meadows', {
  bpm: 124, loop: true,
  tracks: [
    { wave: 'square', volume: 0.2, notes:
      'C5:1 G4:0.5 G4:0.5 C5:1 E5:1' +      // bar 1
      ' G5:2 E5:1 C5:1' +                   // bar 2
      ' D5:1 E5:0.5 D5:0.5 C5:1 A4:1' +     // bar 3
      ' G4:3 -:1' +                         // bar 4
      ' C5:1 G4:0.5 G4:0.5 C5:1 E5:1' +     // bar 5
      ' G5:2 A5:1 G5:1' +                   // bar 6
      ' E5:1 G5:0.5 E5:0.5 D5:1 B4:1' +     // bar 7
      ' C5:3 -:1' +                         // bar 8
      ' A4:1 C5:1 F5:1 E5:1' +              // bar 9
      ' D5:2 G5:2' +                        // bar 10
      ' E5:1 D5:1 C5:1 A4:1' +              // bar 11
      ' D5:3 G4:1' +                        // bar 12
      ' A4:1 C5:1 F5:1 E5:1' +              // bar 13
      ' D5:2 G5:2' +                        // bar 14
      ' E5:1 G5:1 D5:1 B4:1' +              // bar 15
      ' C5:3 -:1' },                        // bar 16
    { wave: 'triangle', volume: 0.24, notes:
      'C3:2 G2:2 C3:2 E3:2 F2:2 G2:2 C3:2 G2:2' +
      ' C3:2 G2:2 C3:2 E3:2 F2:2 G2:2 C3:4' +
      ' F2:2 C3:2 G2:2 B2:2 A2:2 E3:2 G2:4' +
      ' F2:2 C3:2 G2:2 B2:2 A2:2 G2:2 C3:4' },
    { wave: 'noiseHat', volume: 0.06, notes: 'x:1 -:0.5 x:0.5 x:1 x:1' },
  ],
});

// --- forest: playful, leafy minor. 8 bars. ----------------------------------
registerSong('forest', {
  bpm: 105, loop: true,
  tracks: [
    { wave: 'square', volume: 0.2, notes:
      'E4:1 G4:1 A4:1 B4:1' +     // bar 1
      ' C5:2 B4:1 A4:1' +         // bar 2
      ' B4:1 G4:1 E4:1 G4:1' +    // bar 3
      ' A4:3 -:1' +               // bar 4
      ' E4:1 G4:1 A4:1 B4:1' +    // bar 5
      ' D5:2 C5:1 B4:1' +         // bar 6
      ' A4:1 G4:1 F#4:1 D4:1' +   // bar 7
      ' E4:3 -:1' },              // bar 8
    { wave: 'triangle', volume: 0.24, notes:
      'E2:4 C3:4 G2:4 A2:4 E2:4 C3:4 A2:2 B2:2 E2:4' },
    { wave: 'noiseHat', volume: 0.05, notes: '-:1 x:1 -:1 x:1' },
  ],
});

// --- desert: sun-baked phrygian sway. 8 bars. -------------------------------
registerSong('desert', {
  bpm: 102, loop: true,
  tracks: [
    { wave: 'square', volume: 0.2, notes:
      'D5:1 Eb5:0.5 D5:0.5 C5:1 D5:1' +    // bar 1
      ' F5:2 Eb5:1 D5:1' +                 // bar 2
      ' C5:1 D5:1 Eb5:1 C5:1' +            // bar 3
      ' D5:3 -:1' +                        // bar 4
      ' D5:1 Eb5:0.5 D5:0.5 C5:1 D5:1' +   // bar 5
      ' G5:2 F5:1 Eb5:1' +                 // bar 6
      ' D5:1 C5:1 Bb4:1 C5:1' +            // bar 7
      ' D5:3 -:1' },                       // bar 8
    { wave: 'triangle', volume: 0.24, notes:
      'D3:2 A2:2 Bb2:2 A2:2 C3:2 Bb2:2 D3:4' +
      ' D3:2 A2:2 Eb3:2 D3:2 C3:2 Bb2:2 D3:4' },
    { wave: 'noiseHat', volume: 0.06, notes: 'x:0.5 x:0.5 -:0.5 x:0.5 x:1 -:1' },
  ],
});

// --- mountains: stoic, wide intervals, slow march. 8 bars. ------------------
registerSong('mountains', {
  bpm: 92, loop: true,
  tracks: [
    { wave: 'square', volume: 0.2, notes:
      'C5:2 G4:2' +              // bar 1
      ' Bb4:2 C5:2' +            // bar 2
      ' Eb5:2 D5:2' +            // bar 3
      ' C5:4' +                  // bar 4
      ' C5:2 G4:2' +             // bar 5
      ' Bb4:2 C5:2' +            // bar 6
      ' F5:2 Eb5:1 D5:1' +       // bar 7
      ' C5:4' },                 // bar 8
    { wave: 'triangle', volume: 0.25, notes:
      'C3:2 G2:2 C3:2 G2:2 Ab2:2 Eb3:2 C3:2 G2:2' +
      ' C3:2 G2:2 C3:2 G2:2 F2:2 G2:2 C3:4' },
    { wave: 'noiseSnare', volume: 0.06, notes: '-:1 x:1 -:1 x:1' },
  ],
});

// --- swamp: eerie waltz (3/4), chromatic wobble. 16 bars of 3. --------------
registerSong('swamp', {
  bpm: 88, loop: true,
  tracks: [
    { wave: 'sine', volume: 0.2, notes:
      'A4:1 C5:1 E5:1' +         // bar 1
      ' Eb5:2 D5:1' +            // bar 2
      ' C5:1 A4:1 F4:1' +        // bar 3
      ' E4:3' +                  // bar 4
      ' A4:1 C5:1 E5:1' +        // bar 5
      ' F5:2 E5:1' +             // bar 6
      ' D5:1 C5:1 B4:1' +        // bar 7
      ' A4:3' +                  // bar 8
      ' E5:1 F5:1 E5:1' +        // bar 9
      ' D5:2 C5:1' +             // bar 10
      ' B4:1 C5:1 B4:1' +        // bar 11
      ' G#4:3' +                 // bar 12
      ' A4:1 C5:1 E5:1' +        // bar 13
      ' F5:2 D5:1' +             // bar 14
      ' C5:1 B4:1 G#4:1' +       // bar 15
      ' A4:3' },                 // bar 16
    { wave: 'triangle', volume: 0.24, notes:
      'A2:1 E3:1 E3:1 A2:1 E3:1 E3:1 F2:1 C3:1 C3:1 E2:1 B2:1 B2:1' +
      ' A2:1 E3:1 E3:1 D2:1 A2:1 A2:1 E2:1 B2:1 B2:1 A2:1 E3:1 E3:1' +
      ' F2:1 C3:1 C3:1 G2:1 D3:1 D3:1 E2:1 B2:1 B2:1 E2:1 B2:1 B2:1' +
      ' A2:1 E3:1 E3:1 D2:1 A2:1 A2:1 E2:1 B2:1 B2:1 A2:1 E3:1 E3:1' },
    { wave: 'noiseHat', volume: 0.05, notes: '-:1 x:1 x:1' },
  ],
});

// --- lake: calm, glassy F major. 8 bars, no percussion. ---------------------
registerSong('lake', {
  bpm: 90, loop: true,
  tracks: [
    { wave: 'sine', volume: 0.2, notes:
      'A4:2 C5:1 D5:1' +         // bar 1
      ' C5:2 A4:2' +             // bar 2
      ' F4:1 G4:1 A4:1 C5:1' +   // bar 3
      ' G4:4' +                  // bar 4
      ' A4:2 C5:1 D5:1' +        // bar 5
      ' E5:2 D5:1 C5:1' +        // bar 6
      ' D5:1 C5:1 A4:1 G4:1' +   // bar 7
      ' F4:4' },                 // bar 8
    { wave: 'triangle', volume: 0.22, notes:
      'F2:4 C3:4 Bb2:4 C3:4 F2:4 A2:4 Bb2:2 C3:2 F2:4' },
  ],
});

// --- wastes: bleak, tense, tritone stabs. 8 bars. ---------------------------
registerSong('wastes', {
  bpm: 100, loop: true,
  tracks: [
    { wave: 'sawtooth', volume: 0.18, notes:
      'B4:1.5 B4:0.5 D5:2' +      // bar 1
      ' C5:1.5 C5:0.5 B4:2' +     // bar 2
      ' F#4:1.5 F#4:0.5 A4:2' +   // bar 3
      ' B4:2 F5:2' +              // bar 4 (tritone cry)
      ' B4:1.5 B4:0.5 D5:2' +     // bar 5
      ' E5:1.5 E5:0.5 D5:2' +     // bar 6
      ' C5:1 B4:1 A4:1 F4:1' +    // bar 7
      ' B4:4' },                  // bar 8
    { wave: 'triangle', volume: 0.25, notes:
      'B2:4 C3:4 G2:4 F#2:4 B2:4 C3:4 G2:2 F#2:2 B2:4' },
    { wave: 'noiseSnare', volume: 0.05, notes: '-:1 x:1 -:1.5 x:0.5' },
  ],
});

// --- dungeon1: Vinewood Temple — mossy mystery. 8 bars. ---------------------
registerSong('dungeon1', {
  bpm: 100, loop: true,
  tracks: [
    { wave: 'square', volume: 0.18, notes:
      'E4:1 G4:1 B4:1 G4:1' +      // bar 1
      ' A4:1 C5:1 A4:1 F#4:1' +    // bar 2
      ' G4:1 B4:1 E5:1 B4:1' +     // bar 3
      ' Bb4:2 B4:2' +              // bar 4 (chromatic creep)
      ' E4:1 G4:1 B4:1 G4:1' +     // bar 5
      ' C5:1 E5:1 C5:1 A4:1' +     // bar 6
      ' B4:1 G4:1 F#4:1 D#4:1' +   // bar 7
      ' E4:4' },                   // bar 8
    { wave: 'triangle', volume: 0.24, notes:
      'E2:4 D2:4 C3:4 B2:4 E2:4 A2:4 B2:4 E2:4' },
    { wave: 'noiseHat', volume: 0.05, notes: 'x:1 -:1 x:1 -:1' },
  ],
});

// --- dungeon2: Sandstone Ruins — dusty, percussive. 8 bars. -----------------
registerSong('dungeon2', {
  bpm: 112, loop: true,
  tracks: [
    { wave: 'square', volume: 0.18, notes:
      'D4:0.5 D4:0.5 F4:1 Eb4:1 D4:1' +    // bar 1
      ' G4:1.5 F4:0.5 Eb4:2' +             // bar 2
      ' D4:0.5 D4:0.5 F4:1 G4:1 Ab4:1' +   // bar 3
      ' F4:1 Eb4:1 D4:2' +                 // bar 4
      ' D4:0.5 D4:0.5 F4:1 Eb4:1 D4:1' +   // bar 5
      ' Bb4:1.5 A4:0.5 G4:2' +             // bar 6
      ' F4:1 G4:1 Eb4:1 C4:1' +            // bar 7
      ' D4:4' },                           // bar 8
    { wave: 'triangle', volume: 0.24, notes:
      'D2:4 Eb2:4 D2:4 Bb2:2 C3:2 D2:4 G2:4 Eb2:2 C2:2 D2:4' },
    { wave: 'noiseSnare', volume: 0.06, notes: 'x:1 -:0.5 x:0.5 x:1 x:0.5 x:0.5' },
  ],
});

// --- dungeon3: Glacier Hollow — sparse, icy bells. 8 bars. ------------------
registerSong('dungeon3', {
  bpm: 96, loop: true,
  tracks: [
    { wave: 'sine', volume: 0.2, notes:
      'E5:1 C5:1 A4:2' +           // bar 1
      ' D5:1 B4:1 G#4:2' +         // bar 2
      ' C5:1 A4:1 E4:2' +          // bar 3
      ' B4:2 -:2' +                // bar 4
      ' E5:1 C5:1 A4:2' +          // bar 5
      ' F5:1 D5:1 B4:2' +          // bar 6
      ' E5:1 B4:1 G#4:1 B4:1' +    // bar 7
      ' A4:3 -:1' },               // bar 8
    { wave: 'triangle', volume: 0.22, notes:
      'A2:4 E2:4 F2:4 E2:4 A2:4 D2:4 E2:4 A2:4' },
    { wave: 'noiseHat', volume: 0.04, notes: 'x:1 -:1.5 x:0.5 -:1' },
  ],
});

// --- citadel: ominous low phrygian dirge. 8 bars. ---------------------------
registerSong('citadel', {
  bpm: 92, loop: true,
  tracks: [
    { wave: 'sawtooth', volume: 0.18, notes:
      'C4:1.5 C4:0.5 Db4:2' +           // bar 1
      ' C4:1.5 C4:0.5 G4:2' +           // bar 2
      ' Ab4:1.5 G4:0.5 F4:1 Eb4:1' +    // bar 3
      ' F4:1 Eb4:1 Db4:2' +             // bar 4
      ' C4:1.5 C4:0.5 Db4:2' +          // bar 5
      ' C4:1.5 C4:0.5 Ab4:2' +          // bar 6
      ' G4:1 F4:1 Eb4:1 Db4:1' +        // bar 7
      ' C4:4' },                        // bar 8
    { wave: 'triangle', volume: 0.25, notes:
      'C2:4 Db2:4 Ab2:4 G2:4 C2:4 Db2:4 F2:2 G2:2 C2:4' },
    { wave: 'noiseSnare', volume: 0.05, notes: '-:2 x:1 -:1' },
  ],
});

// --- shrine: sunken, sacred dorian calm. 8 bars, no percussion. -------------
registerSong('shrine', {
  bpm: 80, loop: true,
  tracks: [
    { wave: 'sine', volume: 0.2, notes:
      'D5:2 A4:1 C5:1' +           // bar 1
      ' B4:2 A4:2' +               // bar 2
      ' G4:1 A4:1 C5:1 A4:1' +     // bar 3
      ' D5:4' +                    // bar 4
      ' D5:2 A4:1 C5:1' +          // bar 5
      ' E5:2 D5:2' +               // bar 6
      ' C5:1 A4:1 G4:1 E4:1' +     // bar 7
      ' D4:4' },                   // bar 8
    { wave: 'triangle', volume: 0.22, notes:
      'D2:4 G2:4 A2:4 D2:4 D2:4 C3:4 A2:4 D2:4' },
  ],
});

// --- boss: driving riff, fast. 8 bars. --------------------------------------
registerSong('boss', {
  bpm: 150, loop: true,
  tracks: [
    { wave: 'square', volume: 0.2, notes:
      'E4:0.5 E4:0.5 G4:0.5 E4:0.5 Bb4:0.5 A4:0.5 G4:0.5 E4:0.5' +      // bar 1
      ' E4:0.5 E4:0.5 G4:0.5 E4:0.5 C5:0.5 B4:0.5 G4:0.5 E4:0.5' +      // bar 2
      ' F4:0.5 F4:0.5 A4:0.5 F4:0.5 C5:0.5 B4:0.5 A4:0.5 F4:0.5' +      // bar 3
      ' G4:0.5 G4:0.5 B4:0.5 D5:0.5 C#5:0.5 C5:0.5 B4:0.5 G4:0.5' +     // bar 4
      ' E4:0.5 E4:0.5 G4:0.5 E4:0.5 Bb4:0.5 A4:0.5 G4:0.5 E4:0.5' +     // bar 5
      ' E5:1 D5:0.5 C5:0.5 B4:1 G4:1' +                                 // bar 6
      ' F4:0.5 F4:0.5 A4:0.5 C5:0.5 E5:1 D5:1' +                        // bar 7
      ' B4:1 C5:1 B4:0.5 A4:0.5 G4:0.5 F#4:0.5' },                      // bar 8
    { wave: 'triangle', volume: 0.25, notes:
      'E2:0.5 E2:0.5 E2:1 E2:0.5 E2:0.5 E2:1' +     // bar 1 gallop
      ' E2:0.5 E2:0.5 E2:1 E2:0.5 E2:0.5 E2:1' +    // bar 2
      ' F2:0.5 F2:0.5 F2:1 F2:0.5 F2:0.5 F2:1' +    // bar 3
      ' G2:0.5 G2:0.5 G2:1 G2:0.5 G2:0.5 G2:1' +    // bar 4
      ' E2:0.5 E2:0.5 E2:1 E2:0.5 E2:0.5 E2:1' +    // bar 5
      ' A2:0.5 A2:0.5 A2:1 A2:0.5 A2:0.5 A2:1' +    // bar 6
      ' F2:0.5 F2:0.5 F2:1 F2:0.5 F2:0.5 F2:1' +    // bar 7
      ' B2:0.5 B2:0.5 B2:1 B2:0.5 B2:0.5 B2:1' },   // bar 8
    { wave: 'noiseSnare', volume: 0.07, notes: '-:1 x:1 -:1 x:1' },
  ],
});

// --- finalboss: faster, dissonant diminished chaos. 8 bars. -----------------
registerSong('finalboss', {
  bpm: 160, loop: true,
  tracks: [
    { wave: 'sawtooth', volume: 0.18, notes:
      'C5:0.5 C5:0.5 B4:0.5 C5:0.5 Eb5:0.5 D5:0.5 C5:0.5 B4:0.5' +        // bar 1
      ' C5:0.5 C5:0.5 B4:0.5 C5:0.5 F#5:0.5 F5:0.5 Eb5:0.5 C5:0.5' +      // bar 2
      ' Ab4:0.5 Ab4:0.5 G4:0.5 Ab4:0.5 C5:0.5 B4:0.5 Ab4:0.5 G4:0.5' +    // bar 3
      ' G4:0.5 Ab4:0.5 B4:0.5 D5:0.5 F5:1 Eb5:1' +                        // bar 4
      ' C5:0.5 C5:0.5 B4:0.5 C5:0.5 Eb5:0.5 D5:0.5 C5:0.5 B4:0.5' +       // bar 5
      ' G5:1 F#5:0.5 F5:0.5 Eb5:1 D5:1' +                                 // bar 6
      ' Ab4:0.5 Ab4:0.5 G4:0.5 Ab4:0.5 Db5:0.5 C5:0.5 B4:0.5 Ab4:0.5' +   // bar 7
      ' G4:1 B4:1 D5:1 F5:1' },                                           // bar 8 (dim climb)
    { wave: 'triangle', volume: 0.25, notes:
      'C2:0.5 C2:0.5 C2:1 C2:0.5 C2:0.5 C2:1' +        // bar 1 gallop
      ' C2:0.5 C2:0.5 C2:1 C2:0.5 C2:0.5 C2:1' +       // bar 2
      ' Ab2:0.5 Ab2:0.5 Ab2:1 Ab2:0.5 Ab2:0.5 Ab2:1' + // bar 3
      ' G2:0.5 G2:0.5 G2:1 G2:0.5 G2:0.5 G2:1' +       // bar 4
      ' C2:0.5 C2:0.5 C2:1 C2:0.5 C2:0.5 C2:1' +       // bar 5
      ' Eb2:0.5 Eb2:0.5 Eb2:1 Eb2:0.5 Eb2:0.5 Eb2:1' + // bar 6
      ' Ab2:0.5 Ab2:0.5 Ab2:1 Ab2:0.5 Ab2:0.5 Ab2:1' + // bar 7
      ' G2:0.5 G2:0.5 G2:1 G2:0.5 G2:0.5 G2:1' },      // bar 8
    { wave: 'noiseSnare', volume: 0.07, notes: 'x:0.5 -:0.5 x:0.5 -:0.5 x:0.5 -:0.5 x:0.5 x:0.5' },
  ],
});

// --- victory: triumphant C major march. 8 bars. -----------------------------
registerSong('victory', {
  bpm: 120, loop: true,
  tracks: [
    { wave: 'square', volume: 0.22, notes:
      'C5:1.5 G4:0.5 C5:1 E5:1' +    // bar 1
      ' G5:2 E5:1 G5:1' +            // bar 2
      ' A5:1 G5:1 F5:1 D5:1' +       // bar 3
      ' G5:4' +                      // bar 4
      ' C5:1.5 G4:0.5 C5:1 E5:1' +   // bar 5
      ' F5:2 A5:1 F5:1' +            // bar 6
      ' E5:1 G5:1 D5:1 B4:1' +       // bar 7
      ' C5:4' },                     // bar 8
    { wave: 'triangle', volume: 0.25, notes:
      'C3:2 G2:2 C3:2 E3:2 F2:2 D3:2 G2:4' +
      ' C3:2 G2:2 F2:2 F2:2 C3:2 G2:2 C3:4' },
    { wave: 'noiseHat', volume: 0.06, notes: 'x:1 -:1 x:1 x:1' },
  ],
});

// --- gameover: slow lament, A minor. 8 bars. --------------------------------
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

// --- fanfare: item-get jingle (non-loop, short). ----------------------------
registerSong('fanfare', {
  bpm: 130, loop: false,
  tracks: [
    { wave: 'square', volume: 0.25, notes:
      'C5:0.5 E5:0.5 G5:0.5 C6:1.5 B5:0.5 C6:2.5' },
    { wave: 'triangle', volume: 0.22, notes:
      'C3:0.5 C3:0.5 C3:0.5 G2:1.5 G2:0.5 C3:2.5' },
  ],
});

// --- secret: discovery jingle (non-loop, short rising sparkle). -------------
registerSong('secret', {
  bpm: 140, loop: false,
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
