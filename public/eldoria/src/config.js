// Global game configuration constants.
// Loaded first; everything reads from window.CONFIG.
window.CONFIG = {
  TILE: 16,            // tile size in pixels (art is authored at 16x16)
  ROOM_W: 20,          // room width in tiles
  ROOM_H: 12,          // room height in tiles
  ZOOM: 3,             // render scale (window is 960x576 + HUD)
  HUD_H: 48,           // HUD bar height in *scaled* pixels at top of window
  WORLD_COLS: 10,      // overworld grid is 10 columns ...
  WORLD_ROWS: 8,       // ... by 8 rows of rooms
  START: { map: 'overworld', room: '4,3', x: 10, y: 8 }, // new-game spawn (Willow Village)
  PLAYER: {
    SPEED: 85,         // px/sec
    BOOTS_SPEED: 115,  // with Power Boots
    START_HEARTS: 3,
    MAX_HEARTS: 12,
    INVULN_MS: 900,    // i-frames after taking damage
    SWORD_MS: 220,     // swing duration
  },
  CAPS: { gems: 999, arrows: 30, bombs: 12, potions: 4 },
  SAVE_PREFIX: 'shattered-crown-slot-',
  SAVE_SLOTS: 3,
  FONT: 'PressStart',  // pixel font loaded in index.html; latin-only — keep game strings ASCII
};
