// Pause / inventory overlay: equip the X-button item, see your treasures, save.
window.PauseScene = class PauseScene extends Phaser.Scene {
  constructor() { super('Pause'); }

  create() {
    this.add.rectangle(160, 104, 320, 208, 0x05050c, 0.88);
    this.add.rectangle(160, 104, 260, 168, 0x10102a, 0.97).setStrokeStyle(1, 0x6868a8);
    this.txt(160, 32, 'PAUSA', '#ffe97f', 16, true);

    // --- equippable row ---
    this.txt(44, 48, 'Objeto X:', '#9999bb', 8);
    this.owned = EQUIPPABLES.filter((k) => GS.items[k] || (k === 'potion' && GS.potions > 0));
    this.sel = Math.max(0, this.owned.indexOf(GS.equipped));
    this.slotImgs = [];
    this.cursorBox = this.add.rectangle(0, 66, 20, 20, 0x000000, 0).setStrokeStyle(1, 0xffe97f);
    EQUIPPABLES.forEach((k, i) => {
      const x = 60 + i * 30;
      this.add.rectangle(x, 66, 18, 18, 0x222238).setStrokeStyle(1, 0x44446a);
      const has = GS.items[k] || (k === 'potion' && GS.potions > 0);
      if (has) this.add.image(x, 66, ART.tex(ITEMS[k].art, 0));
      if (k === 'potion' && GS.potions > 0) this.txt(x + 4, 70, 'x' + GS.potions, '#ffc0c0', 8);
    });
    this.refreshCursor();

    // --- passives ---
    let px = 60;
    this.txt(44, 86, 'equipo:', '#9999bb', 8);
    for (const k of ['sword', 'heroSword', 'boots', 'oakCharm']) {
      if (GS.items[k]) { this.add.image(px, 104, ART.tex(ITEMS[k].art, 0)); px += 24; }
    }

    // --- shards + acorns ---
    this.txt(44, 120, 'corona:', '#9999bb', 8);
    ['shardEmerald', 'shardRuby', 'shardSapphire'].forEach((sh, i) => {
      const img = this.add.image(64 + i * 20, 138, ART.tex(sh, 0)).setScale(1.2);
      if (GS.shards.indexOf(sh) < 0) img.setAlpha(0.15);
    });
    this.add.image(150, 138, ART.tex('acorn', 0));
    this.txt(158, 134, GS.acorns + '/12', '#ffd24a', 8);
    this.add.image(200, 138, ART.tex('gem', 0));
    this.txt(208, 134, String(GS.gems), '#bfefff', 8);

    // "Return to entrance" safety net — only inside a dungeon/shrine/cave,
    // where mapEntry points at this map's entrance room. Frees a player wedged
    // by a re-sealed door without making them die.
    const game = this.scene.get('Game');
    const inSubMap = game.mapId !== 'overworld' && game.mapEntry && game.mapEntry.map === game.mapId;
    if (inSubMap) this.txt(160, 150, 'R: volver a la entrada (si atascado)', '#ffd24a', 8, true);

    this.txt(160, 162, '< > elegir  S guardar  Q salir', '#8888aa', 8, true);
    this.txt(160, 174, 'ESC o ENTER: volver al juego', '#8888aa', 8, true);
    this.saveNote = this.txt(160, 188, '', '#9affb0', 8, true);
    // Parent control: music-only mute (voices stay). M key, or tap the row.
    this.musicRow = this.txt(160, 198, '', '#88c8e8', 8, true);
    this.refreshMusicRow();

    this.input.keyboard.on('keydown-LEFT', () => this.move(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.move(1));
    // Palabra mobile: tapping the pause card closes it — EXCEPT the music row,
    // which toggles the parent mute.
    this.input.on('pointerdown', (p) => {
      if (p.y > 194) this.toggleMusic();
      else if (p.y > 80) this.close();
    });
    this.input.keyboard.on('keydown-M', () => this.toggleMusic());
    this.input.keyboard.on('keydown-S', () => {
      const ok = this.scene.get('Game').autoSave();
      this.saveNote.setText(ok ? '¡Guardado!' : '¡No se pudo guardar!');
      AUDIO.sfx(ok ? 'save' : 'denied');
    });
    this.input.keyboard.on('keydown-Q', () => {
      this.scene.get('Game').autoSave();
      AUDIO.stopSong();
      this.scene.stop('Game');
      this.scene.stop('UI');
      this.scene.start('Title');
      this.scene.stop();
    });
    if (inSubMap) {
      this.input.keyboard.on('keydown-R', () => {
        AUDIO.sfx('menuSelect');
        this.scene.resume('Game');
        game.returnToEntrance();
        this.scene.stop();
      });
    }
    const close = () => this.close();
    this.input.keyboard.on('keydown-ESC', close);
    this.input.keyboard.on('keydown-ENTER', close);
    this.input.keyboard.on('keydown-P', close);
    AUDIO.sfx('menuSelect');
  }

  txt(x, y, str, color, size, center) {
    const t = this.add.text(x, y, str, {
      fontFamily: CONFIG.FONT, fontSize: (size || 8) + 'px', color: color || '#fff',
    }).setShadow(1, 1, '#000000', 0).setResolution(CONFIG.ZOOM * 2);
    if (center) t.setOrigin(0.5, 0.5);
    return t;
  }

  refreshCursor() {
    if (!this.owned.length) { this.cursorBox.setVisible(false); return; }
    const k = this.owned[this.sel];
    const i = EQUIPPABLES.indexOf(k);
    this.cursorBox.setX(60 + i * 30);
    GS.equipped = k;
  }

  move(d) {
    if (!this.owned.length) return;
    this.sel = (this.sel + d + this.owned.length) % this.owned.length;
    AUDIO.sfx('menuMove');
    this.refreshCursor();
  }

  refreshMusicRow() {
    this.musicRow.setText('M: música: ' + (AUDIO.musicMuted ? 'NO' : 'SÍ'));
  }

  toggleMusic() {
    AUDIO.setMusicMuted(!AUDIO.musicMuted);
    this.refreshMusicRow();
    if (window.GS) SAVE.write();
  }

  close() {
    AUDIO.sfx('menuSelect');
    const game = this.scene.get('Game');
    game.events.emit('hud');
    this.scene.resume('Game');
    this.scene.stop();
  }
};
