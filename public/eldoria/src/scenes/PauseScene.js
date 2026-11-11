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
    this.txt(44, 120, 'rollo:', '#9999bb', 8);
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
    if (inSubMap) this.rHint = true;

    // --- audio settings: three sliders (música / voces / efectos) ----------
    // Music+effects set the world buses; voices crosses the bridge so the app
    // meters the kokoro gain. Tap-position or keys 1/2/3 + ←/→. Persisted in
    // the world save AND (through palabra:audioState) the app profile.
    this.sliderDefs = [
      { key: 'music', label: 'Música' },
      { key: 'voice', label: 'Voces' },
      { key: 'sfx', label: 'Efectos' },
    ];
    this.sliderSel = -1;
    this.sliderUI = this.sliderDefs.map((d, i) => {
      const y = 150 + i * 12;
      const lab = this.txt(36, y, d.label, '#9999bb', 8, true);
      this.add.rectangle(160, y, 180, 10, 0x222238).setStrokeStyle(1, 0x44446a);
      const fill = this.add.rectangle(70, y, 180, 10, 0x68b8e8).setOrigin(0, 0.5);
      const pct = this.txt(280, y, '', '#bfefff', 8, true);
      return { d, lab, fill, pct, y };
    });
    this.refreshSliders();

    this.hintText = this.txt(160, 188, this.rHint
      ? 'R entrada · S guardar · Q salir · ESC volver'
      : 'S guardar · Q salir · ESC volver', '#8888aa', 8, true);
    // Parent control: music-only mute (voices stay). M key, or tap the row.
    this.musicRow = this.txt(160, 198, '', '#88c8e8', 8, true);
    this.refreshMusicRow();

    this.input.keyboard.on('keydown-LEFT', () => this.nav(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.nav(1));
    this.input.keyboard.on('keydown-ONE', () => this.selSlider(0));
    this.input.keyboard.on('keydown-TWO', () => this.selSlider(1));
    this.input.keyboard.on('keydown-THREE', () => this.selSlider(2));
    // Palabra mobile: tapping the pause card closes it — EXCEPT the audio rows,
    // which set slider values, and the music row, which toggles the parent mute.
    this.input.on('pointerdown', (p) => {
      if (p.y > 194) this.toggleMusic();
      else if (p.y >= 144 && p.y < 180) {
        const row = Math.min(2, Math.max(0, Math.floor((p.y - 144) / 12)));
        this.setSliderFromTap(row, p.x);
      }
      else if (p.y > 80) this.close();
    });
    this.input.on('pointermove', (p) => {
      if (p.isDown && p.y >= 144 && p.y < 180) {
        const row = Math.min(2, Math.max(0, Math.floor((p.y - 144) / 12)));
        this.setSliderFromTap(row, p.x);
      }
    });
    this.input.keyboard.on('keydown-M', () => this.toggleMusic());
    this.input.keyboard.on('keydown-S', () => {
      const ok = this.scene.get('Game').autoSave();
      this.hintText.setText(ok ? '¡Guardado!' : '¡No se pudo guardar!');
      AUDIO.sfx(ok ? 'save' : 'denied');
      // Readable⇒heard (owner rule): the save result speaks itself.
      if (window.Palabra) window.Palabra.speak(ok ? '¡Guardado!' : '¡No se pudo guardar!', 'narrator');
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
    // Readable⇒heard (owner rule): the pause card announces itself — title,
    // then the equipped X-item (the menu voice re-names it on every move).
    if (window.Palabra) {
      window.Palabra.speak('PAUSA', 'narrator');
      const k = this.owned[this.sel];
      const nm = k && ITEMS[k] ? ITEMS[k].name : null;
      if (nm) this.time.delayedCall(900, () => { if (window.Palabra) window.Palabra.speak(nm, 'narrator'); });
    }
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
    // Menu voice (owner play-test 4): speak ONLY the highlighted item's name.
    const k = this.owned[this.sel];
    const nm = ITEMS[k] && ITEMS[k].name;
    if (nm && window.Palabra) window.Palabra.speak(nm, 'narrator');
  }

  // ←/→: adjust the selected slider, or move the equip cursor when none is
  // selected (keys 1/2/3 select; the same key deselects).
  nav(d) {
    if (this.sliderSel >= 0) {
      const def = this.sliderDefs[this.sliderSel];
      const cur = AUDIO[def.key + 'Vol'];
      this.setSlider(this.sliderSel, cur + d * 0.05);
      return;
    }
    this.move(d);
  }

  selSlider(i) {
    this.sliderSel = this.sliderSel === i ? -1 : i;
    AUDIO.sfx('menuMove');
    this.refreshSliders();
    // Menu voice: a newly selected slider says its name (música/voces/efectos).
    if (this.sliderSel >= 0 && window.Palabra) {
      window.Palabra.speak(this.sliderDefs[this.sliderSel].label, 'narrator');
    }
  }

  setSliderFromTap(row, x) {
    this.sliderSel = row;
    // bar spans x 70..250 (180 wide, centered at 160)
    this.setSlider(row, (x - 70) / 180);
  }

  setSlider(row, v) {
    const def = this.sliderDefs[row];
    const val = Math.max(0, Math.min(1, v));
    AUDIO.setVolumes({ [def.key]: val });
    if (window.GS) SAVE.write();
    this.refreshSliders();
    // Tell the app: it meters the kokoro gain (voices) and persists the panel
    // values into the profile so the header sliders agree.
    if (window.Palabra) {
      window.Palabra.post({
        type: 'palabra:audioState',
        music: AUDIO.musicVol, sfx: AUDIO.sfxVol, voice: AUDIO.voiceVol, muted: !!AUDIO.musicMuted,
      });
    }
  }

  refreshSliders() {
    this.sliderUI.forEach((ui, i) => {
      const v = Math.max(0, Math.min(1, AUDIO[ui.d.key + 'Vol'] != null ? AUDIO[ui.d.key + 'Vol'] : 1));
      ui.fill.width = Math.max(180 * v, 1);
      ui.pct.setText(Math.round(v * 100) + '%');
      ui.lab.setColor(this.sliderSel === i ? '#ffe97f' : '#9999bb');
    });
  }

  refreshMusicRow() {
    this.musicRow.setText('M: música: ' + (AUDIO.musicMuted ? 'NO' : 'SÍ'));
  }

  toggleMusic() {
    AUDIO.setMusicMuted(!AUDIO.musicMuted);
    this.refreshMusicRow();
    if (window.GS) SAVE.write();
    // Readable⇒heard (owner rule): the music row speaks its new state.
    if (window.Palabra) window.Palabra.speak('Música: ' + (AUDIO.musicMuted ? 'NO' : 'SÍ'), 'narrator');
  }

  close() {
    AUDIO.sfx('menuSelect');
    const game = this.scene.get('Game');
    game.events.emit('hud');
    this.scene.resume('Game');
    this.scene.stop();
  }
};
