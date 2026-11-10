// Story intro for a new game.
window.IntroScene = class IntroScene extends Phaser.Scene {
  constructor() { super('Intro'); }

  create() {
    this.cameras.main.setBackgroundColor('#06060f');
    this.pages = [
      ['Hace mucho tiempo, la CORONA', 'mantenía la tierra en paz.', ''],
      ['Pero el hechicero MORGRATH', 'la rompió en tres gemas', 'y las escondió en templos...'],
      ['Monstruos entraron al pueblo.', 'El cielo se puso gris.', ''],
      ['El anciano Rowan te eligió,', 'un niño de la Aldea Sauce,', 'para buscar las gemas.'],
      ['¡Recupera la corona!', '¡Vence a Morgrath!', '¡Sé valiente!'],
    ];
    this.page = 0;
    this.textObj = this.add.text(160, 90, '', {
      fontFamily: CONFIG.FONT, fontSize: '8px', color: '#e8e8ff', align: 'center',
      lineSpacing: 8,
    }).setShadow(1, 1, '#000000', 0).setOrigin(0.5).setResolution(CONFIG.ZOOM * 2);
    this.hint = this.add.text(160, 180, '- TOCA o ENTER -', {
      fontFamily: CONFIG.FONT, fontSize: '8px', color: '#666688',
    }).setOrigin(0.5).setResolution(CONFIG.ZOOM * 2);
    this.tweens.add({ targets: this.hint, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
    this.show();

    const adv = () => this.advance();
    this.input.keyboard.on('keydown-ENTER', adv);
    this.input.keyboard.on('keydown-SPACE', adv);
    this.input.keyboard.on('keydown-Z', adv);
    this.input.on('pointerdown', adv);
  }

  show() {
    this.textObj.setText(this.pages[this.page].join('\n'));
    this.textObj.setAlpha(0);
    this.tweens.add({ targets: this.textObj, alpha: 1, duration: 400 });
    // voice-first: the narrator reads the story page
    if (window.Palabra) {
      window.Palabra.speak(this.pages[this.page].filter(Boolean).join(' '), 'narrator');
    }
  }

  advance() {
    AUDIO.init();
    if (this.page < this.pages.length - 1) {
      this.page++;
      this.show();
    } else {
      AUDIO.sfx('menuSelect');
      this.scene.start('Game');
    }
  }
};
