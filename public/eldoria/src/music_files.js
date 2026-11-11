// ============================================================================
// THE PILGRIM'S PROGRESS — real-music file mapping (feat/eldoria-audio)
// ----------------------------------------------------------------------------
// Points every song key that starts a MUSIC loop at a real recorded track in
// assets/music/ (sources + licences in /home/team/shared/build/MUSIC-sources.md;
// all five are Kevin MacLeod recordings, CC-BY 4.0). The chiptune registerSong
// defs in audio_content.js stay INTACT as the per-key fallback: audio.js plays
// the file when its fetch/decode succeeds and falls back to the synth per
// track when it does not, so no key can ever go silent.
//
// Mapping (intensity classes per owner spec — title / overworld / interiors /
// boss / calm):
//   title, victory                      → move-forward.mp3   (title intensity)
//   meadows, forest, lake, desert,
//   mountains, swamp, wastes            → happy-alley.mp3    (overworld)
//   dungeon1, dungeon2, dungeon3,
//   citadel                             → funk-game-loop.mp3 (interiors)
//   boss, finalboss                     → le-grand-chase.mp3 (boss)
//   shrine, gameover                    → cheery-monday.mp3  (calm)
//   fanfare, secret                     → (jingles stay on the synth —
//                                          momentary stingers, no file)
// ============================================================================

// title + victory
registerMusicFile('title', 'assets/music/move-forward.mp3');
registerMusicFile('victory', 'assets/music/move-forward.mp3');

// overworld biomes
registerMusicFile('meadows', 'assets/music/happy-alley.mp3');
registerMusicFile('forest', 'assets/music/happy-alley.mp3');
registerMusicFile('lake', 'assets/music/happy-alley.mp3');
registerMusicFile('desert', 'assets/music/happy-alley.mp3');
registerMusicFile('mountains', 'assets/music/happy-alley.mp3');
registerMusicFile('swamp', 'assets/music/happy-alley.mp3');
registerMusicFile('wastes', 'assets/music/happy-alley.mp3');

// dungeons + citadel (interiors intensity)
registerMusicFile('dungeon1', 'assets/music/funk-game-loop.mp3');
registerMusicFile('dungeon2', 'assets/music/funk-game-loop.mp3');
registerMusicFile('dungeon3', 'assets/music/funk-game-loop.mp3');
registerMusicFile('citadel', 'assets/music/funk-game-loop.mp3');

// boss + final boss
registerMusicFile('boss', 'assets/music/le-grand-chase.mp3');
registerMusicFile('finalboss', 'assets/music/le-grand-chase.mp3');

// calm: shrine + game-over lament
registerMusicFile('shrine', 'assets/music/cheery-monday.mp3');
registerMusicFile('gameover', 'assets/music/cheery-monday.mp3');
