// HUD (hearts/gems/ammo/keys/equipped), dialogue box, item-get banner,
// saved toast and the boss health bar. Runs in parallel with GameScene.
window.UIScene = class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }

  create() {
    this.gameScene = this.scene.get('Game');
    this.hudItems = [];
    this.dialogue = null;
    this.bannerGroup = null;

    // event-driven (a sub-frame keypress is invisible to JustDown polling)
    this.advancePressed = false;
    const adv = (e) => { if (!e || !e.repeat) this.advancePressed = true; };
    this.input.keyboard.on('keydown-SPACE', adv);
    this.input.keyboard.on('keydown-Z', adv);
    this.input.keyboard.on('keydown-ENTER', adv);
    // Palabra mobile: tapping anywhere on the dialogue advances it.
    this.input.on('pointerdown', () => { if (this.dialogue) this.advancePressed = true; });

    // static HUD chrome
    this.add.rectangle(0, 0, 320, 16, 0x10101c).setOrigin(0, 0).setDepth(0);
    this.add.rectangle(0, 16, 320, 1, 0x2c2c44).setOrigin(0, 0).setDepth(0);

    this.bossBar = this.add.graphics().setDepth(5);

    this.redrawHud();
    this.gameScene.events.on('hud', this.redrawHud, this);
    this.game.events.on('ui:banner', this.showBanner, this);
    this.game.events.on('ui:dialogue', this.showDialogue, this);
    this.game.events.on('ui:saved', this.savedToast, this);
    this.events.on('shutdown', () => {
      this.gameScene.events.off('hud', this.redrawHud, this);
      this.game.events.off('ui:banner', this.showBanner, this);
      this.game.events.off('ui:dialogue', this.showDialogue, this);
      this.game.events.off('ui:saved', this.savedToast, this);
    });
  }

  text(x, y, str, color, size) {
    return this.add.text(x, y, str, {
      fontFamily: CONFIG.FONT, fontSize: (size || 8) + 'px', color: color || '#fff',
    }).setShadow(1, 1, '#000000', 0).setResolution(CONFIG.ZOOM * 2).setDepth(10);
  }

  redrawHud() {
    for (const o of this.hudItems) o.destroy();
    this.hudItems = [];
    if (!GS) return;
    const add = (o) => { this.hudItems.push(o); return o; };

    // hearts
    for (let i = 0; i < GS.maxHearts; i++) {
      const art = GS.hearts >= i + 1 ? 'heart' : GS.hearts >= i + 0.5 ? 'heartHalf' : 'heartEmpty';
      add(this.add.image(8 + i * 9, 8, ART.tex(art, 0)).setScale(0.5).setDepth(10));
    }
    // gems
    add(this.add.image(122, 8, ART.tex('gem', 0)).setScale(0.55).setDepth(10));
    add(this.text(128, 4, String(GS.gems), '#bfefff'));
    // arrows + bombs
    if (GS.items.bow) {
      add(this.add.image(158, 8, ART.tex('arrow', 0)).setScale(0.55).setDepth(10));
      add(this.text(164, 4, String(GS.arrows), '#e8d8aa'));
    }
    if (GS.items.bombBag) {
      add(this.add.image(188, 8, ART.tex('bombPickup', 0)).setScale(0.55).setDepth(10));
      add(this.text(194, 4, String(GS.bombs), '#cfe8cf'));
    }
    // potions
    if (GS.potions > 0) {
      add(this.add.image(216, 8, ART.tex('potion', 0)).setScale(0.55).setDepth(10));
      add(this.text(222, 4, String(GS.potions), '#ffc0c0'));
    }
    // dungeon keys
    const gs = this.gameScene;
    if (gs && gs.mapId && gs.mapId !== 'overworld' && gs.mapId !== 'interiors') {
      const n = (GS.keys[gs.mapId] || 0);
      add(this.add.image(244, 8, ART.tex('smallKey', 0)).setScale(0.55).setDepth(10));
      add(this.text(250, 4, 'x' + n, '#ffe97f'));
      if (Flags.get('bosskey_' + gs.mapId)) add(this.add.image(268, 8, ART.tex('bossKey', 0)).setScale(0.55).setDepth(10));
    }
    // shards mini-display
    const shardArts = ['shardEmerald', 'shardRuby', 'shardSapphire'];
    shardArts.forEach((sh, i) => {
      const img = add(this.add.image(282 + i * 8, 8, ART.tex(sh, 0)).setScale(0.45).setDepth(10));
      if (GS.shards.indexOf(sh) < 0) img.setAlpha(0.18);
    });
    // equipped item box
    add(this.add.rectangle(310, 8, 15, 15, 0x222238).setStrokeStyle(1, 0x4a4a6a).setDepth(9));
    if (GS.equipped && (GS.items[GS.equipped] || (GS.equipped === 'potion' && GS.potions > 0))) {
      add(this.add.image(310, 8, ART.tex(ITEMS[GS.equipped].art, 0)).setScale(0.7).setDepth(10));
    }
  }

  update() {
    // boss bar
    this.bossBar.clear();
    const b = this.gameScene && this.gameScene.boss;
    if (b && b.maxHp) {
      const w = 200, x = (320 - w) / 2, y = 202;
      this.bossBar.fillStyle(0x000000, 0.7).fillRect(x - 2, y - 2, w + 4, 7);
      this.bossBar.fillStyle(0x8a1020, 1).fillRect(x, y, w, 3);
      this.bossBar.fillStyle(0xff3050, 1).fillRect(x, y, Math.max(0, w * (b.hp / b.maxHp)), 3);
    }

    // dialogue typewriter + advance
    const advance = this.advancePressed;
    this.advancePressed = false;
    if (this.dialogue) {
      const d = this.dialogue;
      const full = d.pages[d.page].join('\n');
      if (d.shown < full.length) {
        d.tick += this.game.loop.delta;
        while (d.tick > 18 && d.shown < full.length) {
          d.tick -= 18;
          d.shown++;
          // the kokoro voice is speaking this same line: the typewriter blip
          // would sit under the voice, so it only plays without speech
          if (!window.PALABRA_VOICE_ON && d.shown % 3 === 0) AUDIO.sfx('blip');
        }
        d.textObj.setText(full.slice(0, d.shown));
      }
      d.arrow.setVisible(d.shown >= full.length && Math.floor(this.time.now / 350) % 2 === 0);
      if (advance) {
        if (d.shown < full.length) {
          d.shown = full.length;
          d.textObj.setText(full);
        } else if (d.page < d.pages.length - 1) {
          d.page++; d.shown = 0; d.tick = 0;
          this.speakPage();   // voice leads the page turn; no menu sfx over it
        } else {
          this.closeDialogue();
        }
      }
    }
  }

  showDialogue(payload) {
    if (this.dialogue) this.closeDialogue(true);
    const pages = (payload && payload.pages && payload.pages.length) ? payload.pages : [['...']];
    const g = this.add.container(0, 0).setDepth(20);
    const box = this.add.rectangle(160, 180, 308, 62, 0x101024, 0.95).setStrokeStyle(1, 0x8888cc);
    const txt = this.text(12, 156, '', '#ffffff', 8);
    txt.setWordWrapWidth(296);
    txt.setLineSpacing(3);
    // English caption gloss (progressive immersion: only at learner level 0)
    let glossObj = null;
    if (payload && payload.gloss && window.PALABRA_CTX.englishLevel === 0) {
      glossObj = this.text(12, 214, '', '#8890b8', 6);
      glossObj.setWordWrapWidth(296);
      glossObj.setLineSpacing(2);
      g.add(glossObj);
    }
    // blinking "press to continue" arrow
    const arrow = this.add.triangle(302, 206, 0, 0, 8, 0, 4, 6, 0xffe97f).setDepth(21).setVisible(false);
    g.add([box, txt, arrow]);
    this.dialogue = {
      pages, page: 0, shown: 0, tick: 0, group: g, textObj: txt, arrow,
      gloss: payload && payload.gloss ? payload.gloss : null, glossObj,
      speaker: payload && payload.speaker ? payload.speaker : null,
    };
    this.speakPage();
  }

  // Voice-first: every dialogue page is SPOKEN through the app's kokoro
  // pipeline in the speaker's own voice, with the chiptune ducked beneath it.
  speakPage() {
    const d = this.dialogue;
    if (!d) return;
    if (d.glossObj) {
      d.glossObj.setText(d.gloss && d.gloss[d.page] ? d.gloss[d.page].join(' ') : '');
    }
    if (!window.PALABRA_VOICE_ON || !window.Palabra) return;
    const voice = d.speaker ? d.speaker.voice : (window.PALABRA_SIGN_VOICE || 'narrator');
    window.Palabra.speak(d.pages[d.page].join(' '), voice);
  }

  closeDialogue(silent) {
    if (!this.dialogue) return;
    this.dialogue.group.destroy(true);
    this.dialogue = null;
    if (!silent) {
      // the voice replaced the menu sfx as the page-close cue
      this.game.events.emit('dialogue:done');
    }
  }

  showBanner(info) {
    if (this.bannerGroup) this.bannerGroup.destroy(true);
    const g = this.add.container(0, 0).setDepth(25);
    const box = this.add.rectangle(160, 100, 300, 58, 0x101028, 0.96).setStrokeStyle(1, 0xd8b84a);
    const img = this.add.image(160, 86, ART.tex(info.art, 0)).setScale(2);
    const name = this.text(0, 102, info.name, '#ffe97f', 8);
    name.setX(160 - name.width / 2);
    const desc = this.text(0, 116, info.desc || '', '#cccccc', 8);
    desc.setX(160 - desc.width / 2);
    g.add([box, img, name, desc]);
    this.bannerGroup = g;
    this.tweens.add({ targets: img, y: 82, duration: 300, yoyo: true, repeat: 2 });
    this.time.delayedCall(2050, () => { if (this.bannerGroup === g) { g.destroy(true); this.bannerGroup = null; } });
  }

  savedToast() {
    const t = this.text(0, 20, '¡Guardado!', '#9affb0', 8);
    t.setX(316 - t.width);
    this.tweens.add({ targets: t, alpha: 0, duration: 1400, onComplete: () => t.destroy() });
  }
};
