// Bakes all procedural art into textures, then heads to the title screen.
window.BootScene = class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    ART.generate(this);
    const missing = [];
    for (const reg of ['ENEMY_TYPES', 'BOSSES', 'DIALOGUE', 'WORLD']) {
      const o = window[reg];
      if (!o || (reg === 'WORLD' && !Object.keys(o.maps.overworld.rooms).length)) missing.push(reg);
    }
    if (missing.length) console.warn('content not fully loaded:', missing.join(', '));
    this.scene.start('Title');
  }
};
