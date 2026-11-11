// Title screen with the three save slots (start / continue / erase).
window.TitleScene = class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    this.cameras.main.setBackgroundColor('#0b0b18');
    this.sel = 0;
    this.eraseArmed = -1;

    // decorative crown + shards
    this.add.image(160, 38, ART.tex('crown', 0)).setScale(3);
    this.add.image(120, 56, ART.tex('shardEmerald', 0)).setScale(1.5);
    this.add.image(160, 60, ART.tex('shardRuby', 0)).setScale(1.5);
    this.add.image(200, 56, ART.tex('shardSapphire', 0)).setScale(1.5);

    // Palabra branding (owner rule: original identity, Eldoria badge gone)
    this.text(160, 76, 'PALABRA', '#ffe97f', 16, true);
    this.text(160, 92, 'aprende español jugando', '#9999bb', 8, true);

    this.slotTexts = [];
    this.cursor = this.text(70, 0, '>', '#ffe97f', 8);
    this.refreshSlots();

    this.text(160, 196, 'TOCA o FLECHAS para elegir', '#666688', 8, true);

    this.input.keyboard.on('keydown', () => this.firstGesture());
    this.input.keyboard.on('keydown-UP', () => this.move(-1));
    this.input.keyboard.on('keydown-DOWN', () => this.move(1));
    this.input.keyboard.on('keydown-ENTER', () => this.choose());
    this.input.keyboard.on('keydown-SPACE', () => this.choose());
    this.input.keyboard.on('keydown-E', () => this.erase());
    this.input.keyboard.on('keydown-M', () => AUDIO.toggleMute());
    // touch: tap a save slot row to select + start it
    this.input.on('pointerdown', (p) => {
      this.firstGesture();
      const row = Math.floor((p.y - 104) / 22);
      if (row >= 0 && row < CONFIG.SAVE_SLOTS) {
        if (this.sel !== row) { this.sel = row; AUDIO.sfx('menuMove'); this.refreshSlots(); }
        else this.choose();
      }
    });

    // music starts once the first keypress unlocks audio
    AUDIO.playSong('title');
  }

  // The narrator welcomes the learner (voice-first: menus speak too). Runs on
  // the first gesture so the browser allows the audio through.
  firstGesture() {
    AUDIO.init();
    if (this._spoke) return;
    this._spoke = true;
    if (window.Palabra) {
      window.Palabra.speak('Palabra. Elige una casilla para empezar tu aventura.', 'narrator');
    }
  }

  text(x, y, str, color, size, center) {
    const t = this.add.text(x, y, str, {
      fontFamily: CONFIG.FONT, fontSize: (size || 8) + 'px', color: color || '#fff',
    }).setShadow(1, 1, '#000000', 0).setResolution(CONFIG.ZOOM * 2);
    if (center) t.setOrigin(0.5, 0.5);
    return t;
  }

  fmtTime(ms) {
    const m = Math.floor(ms / 60000);
    return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
  }

  refreshSlots() {
    for (const t of this.slotTexts) t.destroy();
    this.slotTexts = [];
    const add = (o) => { this.slotTexts.push(o); return o; };
    const slots = SAVE.slots();
    slots.forEach((s, i) => {
      const y = 112 + i * 22;
      const color = s.exists ? '#ffffff' : '#8a8aa8';
      add(this.text(82, y - 5, `Casilla ${i + 1}`, color, 8));
      if (s.exists) {
        add(this.add.image(148, y, ART.tex('heart', 0)).setScale(0.6));
        add(this.text(156, y - 5, 'x' + s.hearts, '#ff9090', 8));
        ['shardEmerald', 'shardRuby', 'shardSapphire'].forEach((sh, j) => {
          const img = add(this.add.image(192 + j * 12, y, ART.tex(sh, 0)).setScale(0.6));
          if (j >= s.shards) img.setAlpha(0.18);
        });
        add(this.text(232, y - 5, this.fmtTime(s.playMs), '#9999bb', 8));
        if (s.done) add(this.add.image(288, y, ART.tex('crown', 0)).setScale(0.7));
      } else {
        add(this.text(148, y - 5, '- nueva aventura -', color, 8));
      }
    });
    this.cursor.setY(112 + this.sel * 22 - 6);
  }

  move(d) {
    AUDIO.init();
    this.sel = (this.sel + d + CONFIG.SAVE_SLOTS) % CONFIG.SAVE_SLOTS;
    this.eraseArmed = -1;
    AUDIO.sfx('menuMove');
    this.refreshSlots();
    // Menu voice (owner play-test 4): on a move, speak ONLY the highlighted
    // item — never the whole list — so the menu feels like a game.
    const s = SAVE.slots()[this.sel];
    if (window.Palabra) {
      window.Palabra.speak(
        'Casilla ' + (this.sel + 1) + '. ' + (s && s.exists ? 'Aventura guardada.' : 'Nueva aventura.'),
        'narrator',
      );
    }
  }

  choose() {
    AUDIO.init();
    AUDIO.sfx('menuSelect');
    const existing = SAVE.load(this.sel);
    SAVE.start(this.sel);
    // Apply the saved music-mute and tell the app so its header button agrees.
    AUDIO.setMusicMuted(!!GS.musicMuted);
    AUDIO.stopSong();
    if (existing) {
      GS.hearts = Math.max(GS.hearts, Math.min(3, GS.maxHearts));
      this.scene.start('Game');
    } else {
      SAVE.write();
      this.scene.start('Intro');
    }
  }

  erase() {
    AUDIO.init();
    if (!SAVE.load(this.sel)) return;
    if (this.eraseArmed === this.sel) {
      SAVE.erase(this.sel);
      this.eraseArmed = -1;
      AUDIO.sfx('explosion');
      this.refreshSlots();
    } else {
      this.eraseArmed = this.sel;
      AUDIO.sfx('denied');
      const t = this.text(160, 184, '¡Toca E otra vez para borrar!', '#ff8080', 8, true);
      this.time.delayedCall(2000, () => { t.destroy(); if (this.eraseArmed === this.sel) this.eraseArmed = -1; });
    }
  }
};
