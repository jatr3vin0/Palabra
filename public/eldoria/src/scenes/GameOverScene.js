// Defeat screen: continue from the last save, or back to title.
window.GameOverScene = class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  create() {
    this.cameras.main.setBackgroundColor('#0a0508');
    AUDIO.playSong('gameover');
    this.add.text(160, 70, 'GAME OVER', {
      fontFamily: CONFIG.FONT, fontSize: '16px', color: '#c03040',
    }).setShadow(2, 2, '#000000', 0).setOrigin(0.5).setResolution(CONFIG.ZOOM * 2);

    this.add.text(160, 110, "Don't give up, hero!", {
      fontFamily: CONFIG.FONT, fontSize: '8px', color: '#aaaacc',
    }).setOrigin(0.5).setResolution(CONFIG.ZOOM * 2);

    this.sel = 0;
    this.opts = ['Continue from last save', 'Back to title'];
    this.optTexts = this.opts.map((o, i) => this.add.text(160, 140 + i * 16, o, {
      fontFamily: CONFIG.FONT, fontSize: '8px', color: '#fff',
    }).setShadow(1, 1, '#000000', 0).setOrigin(0.5).setResolution(CONFIG.ZOOM * 2));
    this.refresh();

    this.input.keyboard.on('keydown-UP', () => { this.sel = 1 - this.sel; AUDIO.sfx('menuMove'); this.refresh(); });
    this.input.keyboard.on('keydown-DOWN', () => { this.sel = 1 - this.sel; AUDIO.sfx('menuMove'); this.refresh(); });
    const go = () => this.choose();
    this.input.keyboard.on('keydown-ENTER', go);
    this.input.keyboard.on('keydown-SPACE', go);
  }

  refresh() {
    this.optTexts.forEach((t, i) => t.setColor(i === this.sel ? '#ffe97f' : '#8888aa'));
  }

  choose() {
    AUDIO.sfx('menuSelect');
    AUDIO.stopSong();
    if (this.sel === 0) {
      const slot = GS ? GS.slot : 0;
      SAVE.start(slot);
      GS.hearts = Math.max(Math.min(3, GS.maxHearts), Math.ceil(GS.maxHearts / 2));
      this.scene.start('Game');
    } else {
      this.scene.start('Title');
    }
  }
};
