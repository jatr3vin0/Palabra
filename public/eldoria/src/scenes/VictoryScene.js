// The ending: Morgrath is defeated, the crown reforged. Credits + stats.
window.VictoryScene = class VictoryScene extends Phaser.Scene {
  constructor() { super('Victory'); }

  create() {
    this.cameras.main.setBackgroundColor('#0b0b20');
    AUDIO.playSong('victory');

    const crown = this.add.image(160, 60, ART.tex('crown', 0)).setScale(0.5).setAlpha(0);
    this.tweens.add({ targets: crown, scale: 4, alpha: 1, duration: 2000, ease: 'Sine.easeOut' });
    for (let i = 0; i < 10; i++) {
      this.time.delayedCall(400 + i * 350, () => {
        const s = this.add.image(160 + (Math.random() - 0.5) * 90, 60 + (Math.random() - 0.5) * 50, ART.tex('sparkle', 0));
        this.tweens.add({ targets: s, alpha: 0, scale: 2, duration: 600, onComplete: () => s.destroy() });
      });
    }

    const lines = [
      ['MORGRATH FALLS!', 26, '#ffe97f', 16],
      ['The Crown of Eldoria shines anew.', 104, '#e8e8ff', 8],
      ['Light returns to the meadows,', 118, '#bbbbdd', 8],
      ['the forest, the peaks, the sands.', 130, '#bbbbdd', 8],
      ['YOU ARE THE HERO OF ELDORIA!', 150, '#7fe9a0', 8],
    ];
    lines.forEach(([str, y, color, size], i) => {
      const t = this.add.text(160, y, str, {
        fontFamily: CONFIG.FONT, fontSize: size + 'px', color,
      }).setShadow(1, 1, '#000000', 0).setOrigin(0.5).setAlpha(0).setResolution(CONFIG.ZOOM * 2);
      this.tweens.add({ targets: t, alpha: 1, delay: 1200 + i * 800, duration: 600 });
    });

    const m = Math.floor((GS.playMs || 0) / 60000);
    const stats = `time ${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}  ` +
      `acorns ${GS.acorns}/12  hearts ${GS.maxHearts}`;
    const st = this.add.text(160, 168, stats, {
      fontFamily: CONFIG.FONT, fontSize: '8px', color: '#8888aa',
    }).setOrigin(0.5).setAlpha(0).setResolution(CONFIG.ZOOM * 2);
    this.tweens.add({ targets: st, alpha: 1, delay: 5600, duration: 600 });

    const hint = this.add.text(160, 192, 'ENTER: title (your save lives on!)', {
      fontFamily: CONFIG.FONT, fontSize: '8px', color: '#666688',
    }).setOrigin(0.5).setAlpha(0).setResolution(CONFIG.ZOOM * 2);
    this.tweens.add({ targets: hint, alpha: 1, delay: 6500, duration: 600 });

    // park the save back in the village for post-game exploring
    GS.checkpoint = Object.assign({}, CONFIG.START);
    SAVE.write();

    this.time.delayedCall(2500, () => {
      this.input.keyboard.on('keydown-ENTER', () => {
        AUDIO.stopSong();
        AUDIO.sfx('menuSelect');
        this.scene.start('Title');
      });
    });
  }
};
