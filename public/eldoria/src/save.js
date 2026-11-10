// Save system: 3 localStorage slots. window.GS is the live game state (plain
// JSON-able data). Content never touches this directly — the engine flags
// chests/doors/secrets by id.
window.GS = null;

window.SAVE = {
  key(slot) { return CONFIG.SAVE_PREFIX + slot; },

  blank(slot) {
    return {
      version: 1,
      slot,
      hearts: CONFIG.PLAYER.START_HEARTS,
      maxHearts: CONFIG.PLAYER.START_HEARTS,
      gems: 0, arrows: 0, bombs: 0, potions: 0,
      items: { sword: true },        // item key -> true
      equipped: null,                // 'bow' | 'bombBag' | 'lantern' | 'potion'
      shards: [],                    // 'shardEmerald' | 'shardRuby' | 'shardSapphire'
      acorns: 0,
      keys: {},                      // mapId -> small key count
      flags: {},                     // string -> true
      checkpoint: Object.assign({}, CONFIG.START),
      playMs: 0,
      savedAt: 0,
    };
  },

  load(slot) {
    try {
      const raw = localStorage.getItem(this.key(slot));
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.version !== 1) return null;
      // backfill anything a future patch might add
      return Object.assign(this.blank(slot), data, { slot });
    } catch (e) {
      console.error('save load failed', e);
      return null;
    }
  },

  start(slot) {
    window.GS = this.load(slot) || this.blank(slot);
    return window.GS;
  },

  write() {
    if (!window.GS) return false;
    try {
      GS.savedAt = Date.now();
      localStorage.setItem(this.key(GS.slot), JSON.stringify(GS));
      return true;
    } catch (e) {
      console.error('save write failed', e);
      return false;
    }
  },

  erase(slot) {
    try { localStorage.removeItem(this.key(slot)); } catch (e) {}
  },

  slots() {
    const out = [];
    for (let s = 0; s < CONFIG.SAVE_SLOTS; s++) {
      const d = this.load(s);
      out.push(d ? {
        slot: s, exists: true, hearts: d.maxHearts, shards: d.shards.length,
        acorns: d.acorns, playMs: d.playMs, done: !!d.flags.game_complete,
      } : { slot: s, exists: false });
    }
    return out;
  },
};

// Flag helpers used everywhere in the engine.
window.Flags = {
  get(n) { return !!(GS && GS.flags[n]); },
  set(n) { if (GS && n) GS.flags[n] = true; },
  clear(n) { if (GS) delete GS.flags[n]; },
};
