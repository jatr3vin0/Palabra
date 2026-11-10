// The Shattered Crown — actor art: player hero, NPCs, drop shadow.
// Content file: classic script, data + registerArt() calls only.
// Every sprite is 16x16 procedural canvas pixels (1px = 1 texel).
//
// player frame layout (per docs/ARCHITECTURE.md):
//   0-1 walk-down, 2-3 walk-up, 4-5 walk-left, 6-7 walk-right,
//   8 swing-down, 9 swing-up, 10 swing-left, 11 swing-right, 12 item-raise
// NPC keys (frames: 2, idle bob): elder, shopkeep, kid, villager, farmer,
//   guard, fisher, hermit, nomad, witch, fairy, squirrel
// 'shadow': 1 frame, soft translucent ellipse.
(function () {
  'use strict';

  // chunky-pixel rect helper
  function px(ctx, x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  }

  // draw `fn` mirrored horizontally (left-facing art -> right-facing)
  function flip(ctx, fn, step, pose) {
    ctx.save();
    ctx.translate(16, 0);
    ctx.scale(-1, 1);
    fn(ctx, step, pose);
    ctx.restore();
  }

  // ======================================================== player (hero)
  var HERO = {
    skin: '#f2c79a',
    hair: '#8a5a2b',
    cap: '#2f9e44',
    capDark: '#1f7a33',
    tunic: '#2f9e44',
    belt: '#5e3c1c',
    buckle: '#e8c84a',
    boot: '#5a3a1e',
    eye: '#26262e',
  };

  function heroBody(ctx) {
    px(ctx, 4, 8, 8, 3, HERO.tunic);
    px(ctx, 4, 11, 8, 1, HERO.belt);
    px(ctx, 7, 11, 2, 1, HERO.buckle);
  }

  // facing down/up: two boots side by side; walking lifts one per step
  function heroLegsFront(ctx, step, planted) {
    if (planted) {
      px(ctx, 5, 12, 2, 3, HERO.boot);
      px(ctx, 9, 12, 2, 3, HERO.boot);
    } else if (step === 0) {
      px(ctx, 5, 12, 2, 2, HERO.boot); // left boot lifted
      px(ctx, 9, 12, 2, 3, HERO.boot);
    } else {
      px(ctx, 5, 12, 2, 3, HERO.boot);
      px(ctx, 9, 12, 2, 2, HERO.boot); // right boot lifted
    }
  }

  function heroDown(ctx, step, pose) {
    heroLegsFront(ctx, step, pose !== 'walk');
    heroBody(ctx);
    // arms
    if (pose === 'raise') {
      px(ctx, 3, 2, 1, 6, HERO.skin);  // both arms straight up
      px(ctx, 12, 2, 1, 6, HERO.skin);
    } else if (pose === 'swing') {
      px(ctx, 3, 8, 1, 3, HERO.skin);
      px(ctx, 12, 9, 1, 5, HERO.skin); // sword arm thrust downward
    } else {
      px(ctx, 3, 8 + step, 1, 3, HERO.skin);
      px(ctx, 12, 9 - step, 1, 3, HERO.skin);
    }
    // head: face, hair fringe, green cap
    px(ctx, 4, 4, 8, 4, HERO.skin);
    px(ctx, 4, 3, 8, 1, HERO.hair);
    px(ctx, 4, 1, 8, 2, HERO.cap);
    // eyes
    px(ctx, 6, 5, 1, 2, HERO.eye);
    px(ctx, 9, 5, 1, 2, HERO.eye);
    if (pose === 'raise') px(ctx, 7, 7, 2, 1, '#b06848'); // happy mouth
  }

  function heroUp(ctx, step, pose) {
    heroLegsFront(ctx, step, pose !== 'walk');
    heroBody(ctx);
    // arms
    if (pose === 'swing') {
      px(ctx, 3, 8, 1, 3, HERO.skin);
      px(ctx, 12, 1, 1, 7, HERO.skin); // sword arm raised high
    } else {
      px(ctx, 3, 9 - step, 1, 3, HERO.skin);
      px(ctx, 12, 8 + step, 1, 3, HERO.skin);
    }
    // back of head + cap with tail hanging down
    px(ctx, 4, 3, 8, 5, HERO.hair);
    px(ctx, 4, 1, 8, 2, HERO.cap);
    px(ctx, 7, 3, 2, 3, HERO.capDark); // cap tail
  }

  // authored facing LEFT; right frames are this flipped
  function heroLeft(ctx, step, pose) {
    // legs: front boot (x5) and back boot (x8)
    if (pose !== 'walk') {
      px(ctx, 5, 12, 2, 3, HERO.boot);
      px(ctx, 8, 12, 2, 3, HERO.boot);
    } else if (step === 0) {
      px(ctx, 5, 12, 2, 3, HERO.boot);
      px(ctx, 8, 12, 2, 2, HERO.boot); // back boot lifted
    } else {
      px(ctx, 5, 12, 2, 2, HERO.boot); // front boot lifted
      px(ctx, 8, 12, 2, 3, HERO.boot);
    }
    heroBody(ctx);
    // arm
    if (pose === 'swing') {
      px(ctx, 0, 9, 5, 1, HERO.skin);  // arm extended toward facing
      px(ctx, 0, 8, 1, 2, HERO.skin);  // fist
    } else {
      px(ctx, 6, 9, 1, 3, HERO.skin);
    }
    // head: face, back hair, fringe, cap + flopping tail
    px(ctx, 4, 4, 6, 4, HERO.skin);
    px(ctx, 10, 4, 2, 4, HERO.hair);
    px(ctx, 4, 3, 8, 1, HERO.hair);
    px(ctx, 4, 1, 8, 2, HERO.cap);
    px(ctx, 11, 3, 2, 2, HERO.capDark); // cap tail at the back
    px(ctx, 3, 5, 1, 1, HERO.skin);     // little nose
    px(ctx, 5, 5, 1, 2, HERO.eye);      // eye
  }

  registerArt('player', {
    w: 16, h: 16, frames: 13,
    draw: function (ctx, f) {
      switch (f) {
        case 0: heroDown(ctx, 0, 'walk'); break;
        case 1: heroDown(ctx, 1, 'walk'); break;
        case 2: heroUp(ctx, 0, 'walk'); break;
        case 3: heroUp(ctx, 1, 'walk'); break;
        case 4: heroLeft(ctx, 0, 'walk'); break;
        case 5: heroLeft(ctx, 1, 'walk'); break;
        case 6: flip(ctx, heroLeft, 0, 'walk'); break;
        case 7: flip(ctx, heroLeft, 1, 'walk'); break;
        case 8: heroDown(ctx, 0, 'swing'); break;
        case 9: heroUp(ctx, 0, 'swing'); break;
        case 10: heroLeft(ctx, 0, 'swing'); break;
        case 11: flip(ctx, heroLeft, 0, 'swing'); break;
        case 12: heroDown(ctx, 0, 'raise'); break;
      }
    },
  });

  // ============================================================== NPCs
  // Shared down-facing villager body. Frame 1 dips the upper body 1px
  // (idle bob); feet/hem stay planted. Returns the bob offset.
  // opts: skin, hair (null = none), sideHair (px length of face-framing
  // hair), shirt+pants+shoes OR robe (+hem) for full-length outfits,
  // sleeve (arm color override).
  function npcBase(ctx, f, o) {
    var b = f ? 1 : 0;
    if (o.robe) {
      px(ctx, 4, 7 + b, 8, 8 - b, o.robe);     // robe falls to the feet
      if (o.hem) px(ctx, 3, 13, 10, 2, o.hem); // flared hem
    } else {
      px(ctx, 5, 11, 2, 3, o.pants);
      px(ctx, 9, 11, 2, 3, o.pants);
      px(ctx, 5, 14, 2, 1, o.shoes || '#3a2a1a');
      px(ctx, 9, 14, 2, 1, o.shoes || '#3a2a1a');
      px(ctx, 4, 7 + b, 8, 4, o.shirt);
    }
    // arms: sleeve + hand
    var sleeve = o.sleeve || o.robe || o.shirt;
    px(ctx, 3, 8 + b, 1, 2, sleeve);
    px(ctx, 12, 8 + b, 1, 2, sleeve);
    px(ctx, 3, 10 + b, 1, 1, o.skin);
    px(ctx, 12, 10 + b, 1, 1, o.skin);
    // head
    px(ctx, 5, 2 + b, 6, 5, o.skin);
    if (o.hair) px(ctx, 4, 1 + b, 8, 2, o.hair);
    if (o.sideHair) {
      px(ctx, 4, 3 + b, 1, o.sideHair, o.hair);
      px(ctx, 11, 3 + b, 1, o.sideHair, o.hair);
    }
    // eyes
    var eye = o.eye || '#26262e';
    px(ctx, 6, 4 + b, 1, 1, eye);
    px(ctx, 9, 4 + b, 1, 1, eye);
    return b;
  }

  // elder — Elder Rowan: gray hair, big beard, tan robe, walking staff
  registerArt('elder', {
    w: 16, h: 16, frames: 2,
    draw: function (ctx, f) {
      var b = npcBase(ctx, f, {
        skin: '#e8bd92', hair: '#d8d8d8',
        robe: '#8a7a5a', hem: '#6e6048',
      });
      px(ctx, 5, 6 + b, 6, 2, '#d8d8d8');       // beard
      px(ctx, 14, 2 + b, 1, 13 - b, '#7a4a21'); // staff
      px(ctx, 13, 1 + b, 2, 2, '#a06a32');      // staff knob
    },
  });

  // shopkeep — Mira: hair bun, red blouse, cream apron
  registerArt('shopkeep', {
    w: 16, h: 16, frames: 2,
    draw: function (ctx, f) {
      var b = npcBase(ctx, f, {
        skin: '#f2c79a', hair: '#7a3a1e',
        shirt: '#b8434a', pants: '#5a4632', shoes: '#3a2a1a',
      });
      px(ctx, 7, 0 + b, 3, 2, '#7a3a1e');  // hair bun
      px(ctx, 5, 8 + b, 6, 5, '#efe2c4');  // apron
      px(ctx, 5, 8 + b, 6, 1, '#d8c8a4');  // apron trim
    },
  });

  // kid — Pip: half-pint, messy hair with a cowlick, sunny shirt
  registerArt('kid', {
    w: 16, h: 16, frames: 2,
    draw: function (ctx, f) {
      var b = f ? 1 : 0;
      px(ctx, 6, 13, 1, 1, '#f2c79a');     // legs
      px(ctx, 9, 13, 1, 1, '#f2c79a');
      px(ctx, 6, 14, 1, 1, '#8a3a2a');     // little red shoes
      px(ctx, 9, 14, 1, 1, '#8a3a2a');
      px(ctx, 5, 10 + b, 6, 3, '#e8b53a'); // shirt
      px(ctx, 4, 11 + b, 1, 2, '#f2c79a'); // arms
      px(ctx, 11, 11 + b, 1, 2, '#f2c79a');
      px(ctx, 5, 5 + b, 6, 5, '#f2c79a');  // big kid head
      px(ctx, 4, 4 + b, 8, 2, '#a3622a');  // messy hair
      px(ctx, 7, 3 + b, 2, 1, '#a3622a');  // cowlick
      px(ctx, 6, 7 + b, 1, 1, '#26262e');  // eyes
      px(ctx, 9, 7 + b, 1, 1, '#26262e');
    },
  });

  // villager — Ana: long brown hair, blue dress, white collar
  registerArt('villager', {
    w: 16, h: 16, frames: 2,
    draw: function (ctx, f) {
      var b = npcBase(ctx, f, {
        skin: '#f2c79a', hair: '#5e3a1e', sideHair: 5,
        robe: '#4a7ec4', hem: '#3a64a0',
      });
      px(ctx, 6, 7 + b, 4, 1, '#e8e8f0');  // collar
    },
  });

  // farmer — Joss: wide straw hat, tan shirt, blue overalls
  registerArt('farmer', {
    w: 16, h: 16, frames: 2,
    draw: function (ctx, f) {
      var b = npcBase(ctx, f, {
        skin: '#e0a878', hair: null,
        shirt: '#c2a36b', pants: '#3a5a8a', shoes: '#5a3a1e',
      });
      px(ctx, 6, 8 + b, 4, 3, '#3a5a8a');  // overall bib
      px(ctx, 5, 7 + b, 1, 2, '#3a5a8a');  // straps
      px(ctx, 10, 7 + b, 1, 2, '#3a5a8a');
      px(ctx, 3, 3 + b, 10, 1, '#d8b84a'); // straw hat brim
      px(ctx, 5, 1 + b, 6, 2, '#e4c95e');  // hat crown
    },
  });

  // guard — Tomas: plumed helmet, steel armor, tall spear
  registerArt('guard', {
    w: 16, h: 16, frames: 2,
    draw: function (ctx, f) {
      var b = npcBase(ctx, f, {
        skin: '#e8bd92', hair: null,
        shirt: '#8a96a8', pants: '#4a5260', shoes: '#2e3440',
      });
      px(ctx, 4, 10 + b, 8, 1, '#5a6478');      // armor belt
      px(ctx, 4, 1 + b, 8, 3, '#aab4c2');       // helmet
      px(ctx, 4, 4 + b, 1, 1, '#aab4c2');       // cheek guards
      px(ctx, 11, 4 + b, 1, 1, '#aab4c2');
      px(ctx, 7, 0 + b, 2, 1, '#c43a3a');       // plume
      px(ctx, 14, 3 + b, 1, 11 - b, '#8a5a2b'); // spear shaft
      px(ctx, 14, 1 + b, 1, 2, '#d8dee8');      // spear tip
    },
  });

  // fisher — Finn: bucket hat, blue waders, prize fish under one arm
  registerArt('fisher', {
    w: 16, h: 16, frames: 2,
    draw: function (ctx, f) {
      var b = npcBase(ctx, f, {
        skin: '#e8b888', hair: '#4a3220',
        shirt: '#c2b49a', pants: '#2a6a8a', shoes: '#1e4a60',
      });
      px(ctx, 5, 8 + b, 6, 3, '#2a6a8a');  // wader bib
      px(ctx, 4, 3 + b, 8, 1, '#5a7a4a');  // bucket hat brim
      px(ctx, 5, 1 + b, 6, 2, '#688a56');  // hat crown
      px(ctx, 11, 9 + b, 4, 2, '#9ac4d8'); // fish body
      px(ctx, 15, 8 + b, 1, 1, '#9ac4d8'); // tail fins
      px(ctx, 15, 11 + b, 1, 1, '#9ac4d8');
      px(ctx, 11, 9 + b, 1, 1, '#26323a'); // fish eye
    },
  });

  // hermit — Aldous: hunched hooded cloak, glowy kind eyes, white beard
  registerArt('hermit', {
    w: 16, h: 16, frames: 2,
    draw: function (ctx, f) {
      var b = f ? 1 : 0;
      px(ctx, 3, 6 + b, 10, 9 - b, '#6e6456'); // wide hunched cloak
      px(ctx, 4, 2 + b, 8, 4, '#6e6456');      // hood
      px(ctx, 5, 1 + b, 6, 1, '#6e6456');      // hood top
      px(ctx, 6, 4 + b, 4, 3, '#2e2922');      // hood shadow
      px(ctx, 6, 5 + b, 1, 1, '#f0e8d0');      // eyes in the dark
      px(ctx, 9, 5 + b, 1, 1, '#f0e8d0');
      px(ctx, 6, 7 + b, 4, 2, '#cfc8b8');      // beard spilling out
      px(ctx, 4, 10 + b, 8, 1, '#8a7a5a');     // rope belt
      px(ctx, 5, 14, 2, 1, '#4a4038');         // feet peeking out
      px(ctx, 9, 14, 2, 1, '#4a4038');
    },
  });

  // nomad — Zara: jeweled turban, sand robe, red sash
  registerArt('nomad', {
    w: 16, h: 16, frames: 2,
    draw: function (ctx, f) {
      var b = npcBase(ctx, f, {
        skin: '#b07a44', hair: null,
        robe: '#d8b878', hem: '#c4a460',
      });
      px(ctx, 4, 9 + b, 8, 1, '#b03a3a');  // sash
      px(ctx, 4, 1 + b, 8, 3, '#7a4ab8');  // turban
      px(ctx, 12, 3 + b, 1, 3, '#7a4ab8'); // turban tail
      px(ctx, 7, 1 + b, 2, 1, '#e8c84a');  // jewel
    },
  });

  // witch — Morla: pointed hat with gold band, pale-green skin, dark robe
  registerArt('witch', {
    w: 16, h: 16, frames: 2,
    draw: function (ctx, f) {
      var b = npcBase(ctx, f, {
        skin: '#b8d8a0', hair: '#9a9aa8', sideHair: 4,
        robe: '#3a2452', hem: '#2c1b40',
      });
      px(ctx, 3, 3 + b, 10, 1, '#4a2a72'); // hat brim
      px(ctx, 5, 2 + b, 6, 1, '#caa83a');  // gold band
      px(ctx, 6, 1 + b, 4, 1, '#5a3488');  // cone
      px(ctx, 7, 0 + b, 2, 1, '#5a3488');  // point
    },
  });

  // fairy — Aria: tiny glowing sprite, flapping wings, twinkles
  registerArt('fairy', {
    w: 16, h: 16, frames: 2,
    draw: function (ctx, f) {
      var b = f ? 1 : 0;
      ctx.fillStyle = 'rgba(170,235,255,0.25)'; // soft glow
      ctx.beginPath();
      ctx.arc(8, 7, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(200,245,255,0.30)';
      ctx.beginPath();
      ctx.arc(8, 7, 4, 0, Math.PI * 2);
      ctx.fill();
      // wings flap between frames
      ctx.fillStyle = 'rgba(225,248,255,0.85)';
      if (!f) {
        ctx.fillRect(4, 3, 2, 4);
        ctx.fillRect(10, 3, 2, 4);
      } else {
        ctx.fillRect(3, 5, 2, 4);
        ctx.fillRect(11, 5, 2, 4);
      }
      px(ctx, 7, 3 + b, 2, 1, '#e8c84a');  // golden hair
      px(ctx, 7, 4 + b, 2, 2, '#ffe8d8');  // head
      px(ctx, 7, 6 + b, 2, 3, '#ff9ec4');  // dress
      // twinkles
      if (!f) {
        px(ctx, 3, 10, 1, 1, '#eaffff');
        px(ctx, 12, 2, 1, 1, '#eaffff');
      } else {
        px(ctx, 2, 4, 1, 1, '#eaffff');
        px(ctx, 13, 10, 1, 1, '#eaffff');
      }
    },
  });

  // squirrel — Nutwick the Squirrel King: big tail, tiny crown, acorn
  registerArt('squirrel', {
    w: 16, h: 16, frames: 2,
    draw: function (ctx, f) {
      var b = f ? 1 : 0;
      var fur = '#a8642a', dark = '#854c1c', belly = '#ead6b2';
      px(ctx, 2, 6, 3, 7, dark);            // big tail
      px(ctx, 2 + b, 4 + b, 4, 2, '#b9743a'); // tail tip sways
      px(ctx, 7, 9 + b, 6, 4, fur);         // body
      px(ctx, 8, 10 + b, 3, 3, belly);      // belly
      px(ctx, 7, 4 + b, 6, 5, fur);         // head
      px(ctx, 7, 3 + b, 1, 2, fur);         // ears
      px(ctx, 12, 3 + b, 1, 2, fur);
      px(ctx, 8, 7 + b, 3, 2, belly);       // muzzle
      px(ctx, 9, 7 + b, 1, 1, '#3a2a1a');   // nose
      px(ctx, 8, 5 + b, 1, 1, '#26262e');   // eyes
      px(ctx, 11, 5 + b, 1, 1, '#26262e');
      px(ctx, 8, 2 + b, 4, 1, '#e8c84a');   // crown band
      px(ctx, 8, 1 + b, 1, 1, '#e8c84a');   // crown points
      px(ctx, 11, 1 + b, 1, 1, '#e8c84a');
      px(ctx, 9, 1 + b, 1, 1, '#c43a3a');   // crown jewel
      px(ctx, 9, 10 + b, 2, 2, '#8a5a2b');  // acorn in paws
      px(ctx, 9, 10 + b, 2, 1, '#5e3c1c');  // acorn cap
      px(ctx, 7, 13, 2, 1, dark);           // feet
      px(ctx, 11, 13, 2, 1, dark);
    },
  });

  // ============================================================== shadow
  // Soft translucent ellipse drawn under actors.
  registerArt('shadow', {
    w: 16, h: 16, frames: 1,
    draw: function (ctx) {
      ctx.fillStyle = 'rgba(0,0,0,0.10)';
      ctx.beginPath();
      ctx.ellipse(8, 12, 6.5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.beginPath();
      ctx.ellipse(8, 12, 5, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.beginPath();
      ctx.ellipse(8, 12, 3.5, 1.7, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  });
})();
