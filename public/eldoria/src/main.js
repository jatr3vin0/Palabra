// Boot the game — but only after the pixel font is ready, or every text
// object would bake the fallback font into its texture.
window.addEventListener('load', () => {
  // ?fps=N on the boot URL caps the world's frame rate (Phaser fps target) —
  // genuinely useful on low-end devices / software-rendered VMs where a 60Hz
  // RAF loop pegs the main thread. Default (no param): untouched.
  const fpsParam = (() => {
    const n = parseInt(new URLSearchParams(window.location.search).get('fps'), 10);
    return Number.isInteger(n) && n >= 1 && n <= 60 ? n : null;
  })();
  const boot = () => {
    window.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      width: CONFIG.ROOM_W * CONFIG.TILE,                       // 320
      height: CONFIG.ROOM_H * CONFIG.TILE + CONFIG.HUD_H / CONFIG.ZOOM, // 208
      backgroundColor: '#000000',
      pixelArt: true,
      // Palabra mobile: scale to the #game box (CSS sizes it to the viewport,
      // capped at 960px wide = the old 3x zoom on desktop). FIT + autoCenter
      // keeps it playable on phones, tablets and computers.
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      fps: fpsParam ? { target: fpsParam } : undefined,
      scene: [BootScene, TitleScene, IntroScene, GameScene, UIScene, PauseScene, GameOverScene, VictoryScene],
    });
  };
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('8px ' + CONFIG.FONT),
      document.fonts.load('16px ' + CONFIG.FONT),
    ]).catch(() => {}).then(boot);
  } else {
    boot();
  }
});
