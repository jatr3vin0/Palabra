// Story intro for a new game.
window.IntroScene = class IntroScene extends Phaser.Scene {
  constructor() { super('Intro'); }

  create() {
    this.cameras.main.setBackgroundColor('#06060f');
    this.pages = [
      ['Este cuento es un sueño.', 'Veo a un peregrino.', 'Lleva un peso en la espalda.'],
      ['El peso es su culpa.', 'Pesa mucho. Nadie lo quita.', 'Solo la cruz lo puede quitar.'],
      ['Un hombre le habla: Evangelista.', 'Deja esta ciudad hoy.', 'Hay una puerta angosta. Pasa.'],
      ['El Rey da un rollo sellado.', 'Tres sellos tiene el rollo.', 'Los enemigos los roban.'],
      ['Busca los tres sellos.', 'Cruza el río. La Ciudad Celestial', 'te espera. ¡Ve, peregrino!'],
    ];
    // A0 captions: the same pages in English, shown at immersion level 0 only.
    this.gloss = [
      ['This story is a dream.', 'I see a pilgrim.', 'He carries a weight on his back.'],
      ['The weight is his guilt.', 'It is heavy. No one removes it.', 'Only the cross can take it away.'],
      ['A man speaks to him: Evangelista.', 'Leave this city today.', 'There is a narrow gate. Go through.'],
      ['The King gives a sealed roll.', 'The roll has three seals.', 'The enemies steal them.'],
      ['Look for the three seals.', 'Cross the river. The Celestial City', 'waits for you. Go, pilgrim!'],
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
    this.glossObj = this.add.text(160, 202, '', {
      fontFamily: CONFIG.FONT, fontSize: '6px', color: '#8890b8', align: 'center',
      wordWrap: { width: 300 },
    }).setOrigin(0.5).setResolution(CONFIG.ZOOM * 2);
    this.show();

    const adv = () => this.advance();
    this.input.keyboard.on('keydown-ENTER', adv);
    this.input.keyboard.on('keydown-SPACE', adv);
    this.input.keyboard.on('keydown-Z', adv);
    this.input.on('pointerdown', adv);
  }

  show() {
    this.textObj.setText(this.pages[this.page].join('\n'));
    if (window.PALABRA_CTX && window.PALABRA_CTX.englishLevel === 0) this.glossObj.setText(this.gloss[this.page].join(' '));
    this.textObj.setAlpha(0);
    this.tweens.add({ targets: this.textObj, alpha: 1, duration: 400 });
    // voice-first: the narrator reads the story page — with a short beat
    // between pages (owner play-test 4) so it is not read flat line after line
    const page = this.page;
    const speak = () => {
      if (this.page !== page || !window.Palabra) return;
      window.Palabra.speak(this.pages[page].filter(Boolean).join(' '), 'narrator');
    };
    if (page === 0) speak();
    else this.time.delayedCall(350, speak);
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
