// src/sprites/enemy_art.js — enemy, miniboss and boss sprite art for The Shattered Crown.
// Pure Canvas2D pixel art. Attaches ONLY via registerArt(); no other globals.
// Minibosses/bosses are authored on a 16x16 grid and rendered scaled
// (2x = 32x32, 3x = 48x48) for bold chunky-pixel silhouettes.
(function () {
  'use strict';

  // 1 texel rect helper
  function R(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }
  // wrap a 16x16 draw fn, rendering at integer scale s
  function big(draw, s) {
    return function (ctx, f) { ctx.save(); ctx.scale(s, s); draw(ctx, f); ctx.restore(); };
  }

  // ============================ slimes ============================
  function makeSlime(body, shade, eye) {
    return function (c, f) {
      var t = f ? 2 : 0; // squash on frame 1
      if (f) { R(c, 1, 10, 2, 4, body); R(c, 13, 10, 2, 4, body); }
      R(c, 5, 4 + t, 6, 2, body);
      R(c, 3, 6 + t, 10, 4, body);
      R(c, 2, 8 + t, 12, 6 - t, body);
      R(c, 2, 12, 12, 2, shade);
      R(c, 4, 5 + t, 3, 1, 'rgba(255,255,255,0.4)');
      R(c, 5, 8 + t, 2, 2, '#ffffff'); R(c, 9, 8 + t, 2, 2, '#ffffff');
      R(c, 6, 9 + t, 1, 1, eye); R(c, 9, 9 + t, 1, 1, eye);
    };
  }

  registerArt('slime', { w: 16, h: 16, frames: 2,
    draw: makeSlime('#3fae4a', '#2c7a34', '#143018') });

  registerArt('redSlime', { w: 16, h: 16, frames: 2,
    draw: makeSlime('#d4453a', '#962a22', '#400a08') });

  var iceSlimeBase = makeSlime('#9adcf0', '#5aa6c8', '#13334a');
  registerArt('iceSlime', { w: 16, h: 16, frames: 2, draw: function (c, f) {
    iceSlimeBase(c, f);
    var t = f ? 2 : 0;
    R(c, 7, 2 + t, 2, 3, '#e8fbff');   // ice crystal crest
    R(c, 4, 4 + t, 1, 2, '#cdeefb');
    R(c, 11, 4 + t, 1, 2, '#cdeefb');
  } });

  // ============================ bat ============================
  registerArt('bat', { w: 16, h: 16, frames: 2, draw: function (c, f) {
    var wing = '#5a3f8f', wing2 = '#7757b8', body = '#3c2a63';
    if (f === 0) {
      R(c, 0, 2, 4, 2, wing); R(c, 12, 2, 4, 2, wing);
      R(c, 1, 4, 4, 2, wing2); R(c, 11, 4, 4, 2, wing2);
    } else {
      R(c, 0, 8, 4, 2, wing); R(c, 12, 8, 4, 2, wing);
      R(c, 1, 6, 4, 2, wing2); R(c, 11, 6, 4, 2, wing2);
    }
    R(c, 5, 2, 1, 2, body); R(c, 10, 2, 1, 2, body);   // ears
    R(c, 6, 4, 4, 1, body); R(c, 5, 5, 6, 6, body);    // head + body
    R(c, 6, 6, 1, 1, '#ff5050'); R(c, 9, 6, 1, 1, '#ff5050'); // eyes
    R(c, 6, 11, 1, 1, '#ffffff'); R(c, 9, 11, 1, 1, '#ffffff'); // fangs
  } });

  // ============================ spitter (seed plant) ============================
  registerArt('spitter', { w: 16, h: 16, frames: 2, draw: function (c, f) {
    R(c, 4, 13, 8, 2, '#2e7d32');               // leaf base
    R(c, 2, 12, 4, 2, '#388e3c'); R(c, 10, 12, 4, 2, '#388e3c');
    R(c, 7, 9, 2, 5, '#4caf50');                // stem
    R(c, 4, 2, 8, 7, '#c2447d');                // bulb head
    R(c, 3, 4, 10, 4, '#c2447d');
    R(c, 4, 2, 8, 2, '#e06a9f');                // highlight
    if (f === 0) {
      R(c, 6, 6, 4, 2, '#5a1030');              // mouth closed-ish
    } else {
      R(c, 5, 5, 6, 3, '#5a1030');              // mouth wide, seed loaded
      R(c, 7, 6, 2, 1, '#f5f0c0');
    }
    R(c, 5, 4, 1, 1, '#ffffff'); R(c, 10, 4, 1, 1, '#ffffff'); // teeth glints
  } });

  // ============================ beetle ============================
  registerArt('beetle', { w: 16, h: 16, frames: 2, draw: function (c, f) {
    var l = f ? 1 : 0, leg = '#10222e';
    R(c, 2, 4 + l, 2, 1, leg); R(c, 12, 5 - l, 2, 1, leg);
    R(c, 2, 7 - l, 2, 1, leg); R(c, 12, 7 + l, 2, 1, leg);
    R(c, 2, 10 + l, 2, 1, leg); R(c, 12, 10 - l, 2, 1, leg);
    R(c, 4, 3, 8, 9, '#1f6f8b');                // shell
    R(c, 5, 2, 6, 2, '#2e8fae');
    R(c, 7, 3, 2, 9, '#16566c');                // wing seam
    R(c, 5, 4, 2, 2, '#bfeaf5');                // shine
    R(c, 5, 12, 6, 2, leg);                     // head (faces south)
    R(c, 7, 14, 2, 2, '#d8e8ee');               // ram horn
    R(c, 5, 12, 1, 1, '#ffd23e'); R(c, 10, 12, 1, 1, '#ffd23e'); // eyes
  } });

  // ============================ scarab ============================
  registerArt('scarab', { w: 16, h: 16, frames: 2, draw: function (c, f) {
    var l = f ? 1 : 0, leg = '#5a3a10';
    R(c, 2, 5 + l, 2, 1, leg); R(c, 12, 6 - l, 2, 1, leg);
    R(c, 2, 8 - l, 2, 1, leg); R(c, 12, 8 + l, 2, 1, leg);
    R(c, 2, 11 + l, 2, 1, leg); R(c, 12, 11 - l, 2, 1, leg);
    R(c, 4, 4, 8, 8, '#d9a521');                // golden shell
    R(c, 5, 3, 6, 1, '#d9a521');
    R(c, 7, 3, 2, 9, '#a87714');                // seam
    R(c, 5, 5, 2, 2, '#ffe9a8');                // shine
    R(c, 6, 12, 4, 2, '#3a2a08');               // head
    R(c, 6, 12, 1, 1, '#7fe3ff'); R(c, 9, 12, 1, 1, '#7fe3ff'); // eyes
    R(c, 5, 14, 1, 2, '#3a2a08'); R(c, 10, 14, 1, 2, '#3a2a08'); // pincers
  } });

  // ============================ skeletons ============================
  function skeletonBase(c, f) {
    var bone = '#e8e4d8', dim = '#b8b2a0';
    R(c, 5, 0, 6, 5, bone);                     // skull
    R(c, 6, 2, 1, 2, '#1c1c1c'); R(c, 9, 2, 1, 2, '#1c1c1c'); // sockets
    R(c, 6, 5, 4, 1, dim);                      // jaw
    R(c, 6, 6, 4, 5, bone);                     // ribcage
    R(c, 6, 7, 4, 1, dim); R(c, 6, 9, 4, 1, dim);
    R(c, 4, 7 + (f ? 1 : 0), 2, 1, bone);       // arms swing
    R(c, 10, 8 - (f ? 1 : 0), 2, 1, bone);
    R(c, 6, 11, 4, 1, dim);                     // pelvis
    R(c, 6, 12, 1, f ? 3 : 4, bone);            // legs alternate
    R(c, 9, 12, 1, f ? 4 : 3, bone);
  }

  registerArt('skeleton', { w: 16, h: 16, frames: 2, draw: skeletonBase });

  registerArt('skeletonArcher', { w: 16, h: 16, frames: 2, draw: function (c, f) {
    skeletonBase(c, f);
    R(c, 5, 0, 6, 2, '#3e6b3e');                // mossy hood band
    var wood = '#8a5a2b';
    R(c, 13, 3, 1, 2, wood); R(c, 14, 5, 1, 6, wood); R(c, 13, 11, 1, 2, wood); // bow
    R(c, 12, 4, 1, 8, '#d8d3c0');               // string
    if (f) R(c, 11, 7, 3, 1, '#f0ead8');        // bone arrow nocked
  } });

  // ============================ mummy ============================
  function mummyBase(c, f) {
    var wrap = '#cdbf9a', band = '#b3a378';
    R(c, 4, 1, 8, 14, wrap);                    // wrapped body
    for (var y = 2; y < 15; y += 2) R(c, 4, y, 8, 1, band);
    R(c, 6, 3, 4, 2, '#3a2f1a');                // face gap
    R(c, 7, 4, 1, 1, '#ffd23e');                // one glowing eye
    if (f) { R(c, 12, 6, 3, 2, wrap); R(c, 12, 7, 3, 1, band); } // reaching arm
    else { R(c, 1, 6, 3, 2, wrap); R(c, 1, 7, 3, 1, band); }
    R(c, f ? 3 : 12, 10, 1, 5, band);           // loose trailing strap
  }

  registerArt('mummy', { w: 16, h: 16, frames: 2, draw: mummyBase });

  // ============================ wolves ============================
  function makeWolf(body, dark, eye) {
    return function (c, f) {
      var l = f ? 1 : 0;
      R(c, 12, 4, 3, 2, dark); R(c, 14, 3, 2, 2, dark); // tail
      R(c, 2, 6, 11, 5, body);                  // torso (faces west)
      R(c, 2, 9, 11, 2, dark);                  // belly shade
      R(c, 1, 4, 5, 4, body);                   // head
      R(c, 0, 6, 2, 2, body);                   // snout
      R(c, 0, 7, 1, 1, dark);                   // nose
      R(c, 1, 2, 1, 2, dark); R(c, 4, 2, 1, 2, dark); // ears
      R(c, 2, 5, 1, 1, eye);
      R(c, 3, 11 + l, 1, 3 - l, body);          // legs trot
      R(c, 6, 12 - l, 1, 2 + l, body);
      R(c, 9, 11 + l, 1, 3 - l, body);
      R(c, 12, 12 - l, 1, 2 + l, body);
    };
  }

  registerArt('iceWolf', { w: 16, h: 16, frames: 2,
    draw: makeWolf('#9fb6c8', '#5d7383', '#ffd23e') });

  // ============================ frostWisp ============================
  registerArt('frostWisp', { w: 16, h: 16, frames: 2, draw: function (c, f) {
    var b = f ? 1 : 0;
    R(c, 5, 3 + b, 6, 7, '#bdefff');            // flame body
    R(c, 4, 5 + b, 8, 4, '#bdefff');
    R(c, 6, 1 + b, 2, 2, '#e8fbff');            // flicker tip
    if (f) R(c, 9, 2, 2, 2, '#e8fbff'); else R(c, 4, 2, 2, 2, '#e8fbff');
    R(c, 6, 5 + b, 4, 3, '#7fd4f0');            // inner glow
    R(c, 6, 6 + b, 1, 2, '#0d2c40'); R(c, 9, 6 + b, 1, 2, '#0d2c40'); // eyes
    R(c, 5, 11 + b, 2, 2, '#9fe2f8');           // trailing wisps
    R(c, 9, 12 - b, 2, 2, '#9fe2f8');
    R(c, 7, 14, 1, 1, '#9fe2f8');
  } });

  // ============================ knight ============================
  registerArt('knight', { w: 16, h: 16, frames: 2, draw: function (c, f) {
    var armor = '#8c98a6', dark = '#5a6573', steel = '#dfe7ee';
    R(c, 7, 0, 2, 1, '#c23a3a');                // plume
    R(c, 5, 1, 6, 4, armor);                    // helmet
    R(c, 5, 3, 6, 1, '#222c38');                // visor slit
    R(c, 4, 5, 8, 6, dark);                     // torso
    R(c, 5, 6, 6, 1, armor);                    // chest line
    R(c, 1, 5, 3, 6, '#46505c');                // tower shield
    R(c, 2, 7, 1, 2, '#ffd23e');                // emblem
    var s = f ? 1 : 0;
    R(c, 13, 2 + s, 1, 7, steel);               // sword
    R(c, 12, 9 + s, 3, 1, '#8a5a2b');           // hilt
    R(c, 5, 11, 2, f ? 3 : 4, '#323a44');       // legs march
    R(c, 9, 11, 2, f ? 4 : 3, '#323a44');
  } });

  // ============================ wizard ============================
  registerArt('wizard', { w: 16, h: 16, frames: 2, draw: function (c, f) {
    var robe = '#5a2d82', hem = '#46226a', hat = '#3c1d5c';
    R(c, 4, 6, 8, 8, robe);                     // robe
    R(c, 3, 12, 10, 2, hem);
    R(c, 5, 4, 6, 2, '#caa86a');                // face
    R(c, 6, 5, 1, 1, '#1c0f2e'); R(c, 9, 5, 1, 1, '#1c0f2e'); // eyes
    R(c, 3, 3, 10, 1, hat); R(c, 5, 1, 6, 2, hat); R(c, 7, 0, 2, 1, hat); // pointy hat
    R(c, 6, 9, 4, 1, '#ffd23e');                // belt buckle band
    R(c, 13, 4, 1, 10, '#8a5a2b');              // staff
    R(c, 12, 1, 3, 3, f ? '#ffe066' : '#d94f9e'); // orb glows when casting
    if (f) { R(c, 11, 0, 1, 1, '#fff6c8'); R(c, 15, 2, 1, 1, '#fff6c8'); }
  } });

  // ============================ eyeSentry ============================
  registerArt('eyeSentry', { w: 16, h: 16, frames: 2, draw: function (c, f) {
    R(c, 2, 2, 12, 12, '#6f7672');              // stone block
    R(c, 2, 2, 12, 2, '#8b938e');               // top bevel
    R(c, 2, 12, 12, 2, '#565c58');              // bottom bevel
    R(c, 4, 11, 3, 1, '#565c58'); R(c, 11, 4, 1, 3, '#565c58'); // cracks
    R(c, 5, 6, 6, 4, '#f3efe2');                // sclera
    R(c, f ? 8 : 6, 7, 2, 2, '#a01818');        // iris tracks
    R(c, f ? 8 : 6, 7, 1, 1, '#ff5050');
    if (f) { R(c, 5, 6, 6, 1, '#d8d2c0'); }     // narrowed lid when firing
  } });

  // ============================ minibosses (32x32) ============================
  var bigSlimeBase = makeSlime('#2f9e3c', '#1f6f2a', '#0c2410');
  registerArt('bigSlime', { w: 32, h: 32, frames: 2, draw: big(function (c, f) {
    bigSlimeBase(c, f);
    var t = f ? 2 : 0;
    R(c, 4, 7 + t, 1, 1, '#56c463');            // bubbles
    R(c, 11, 9 + t, 1, 1, '#56c463');
    R(c, 12, 7 + t, 1, 1, '#56c463');
    R(c, 6, 11 + t, 4, 1, '#0c2410');           // grumpy mouth
    R(c, 5, 7 + t, 2, 1, '#0c2410'); R(c, 9, 7 + t, 2, 1, '#0c2410'); // angry brows
  }, 2) });

  registerArt('mummyKnight', { w: 32, h: 32, frames: 2, draw: big(function (c, f) {
    mummyBase(c, f);
    R(c, 4, 0, 8, 3, '#7a8694');                // rusted helm
    R(c, 5, 2, 6, 1, '#222c38');                // visor slit
    R(c, 6, 3, 1, 1, '#ffd23e'); R(c, 9, 3, 1, 1, '#ffd23e'); // both eyes burn
    R(c, 3, 5, 2, 3, '#5a6573');                // pauldron
    var s = f ? 1 : 0;
    R(c, 13, 3 + s, 1, 8, '#cfd6dd');           // khopesh blade
    R(c, 14, 4 + s, 1, 3, '#cfd6dd');
    R(c, 12, 11 + s, 3, 1, '#8a5a2b');          // hilt
  }, 2) });

  var alphaWolfBase = makeWolf('#4a525e', '#2c333c', '#ff4040');
  registerArt('alphaWolf', { w: 32, h: 32, frames: 2, draw: big(function (c, f) {
    alphaWolfBase(c, f);
    R(c, 3, 4, 3, 1, '#c23a3a');                // scar across brow
    R(c, 1, 8, 1, 1, '#e8eef2');                // bared fang
    R(c, 5, 5, 4, 1, '#6b7a88');                // ruff of pale fur
    R(c, 7, 3, 3, 1, '#6b7a88');
  }, 2) });

  registerArt('bogLurker', { w: 32, h: 32, frames: 2, draw: big(function (c, f) {
    var b = f ? 1 : 0;
    R(c, 1, 9 + b, 2, 5, '#3a5c34');            // tentacles
    R(c, 13, 10 - b, 2, 4, '#3a5c34');
    R(c, 4, 12, 2, 3, '#3a5c34'); R(c, 10, 12, 2, 3, '#3a5c34');
    R(c, 3, 4 + b, 10, 9, '#4c7a44');           // body mound
    R(c, 4, 3 + b, 8, 2, '#4c7a44');
    R(c, 3, 11, 10, 2, '#33522e');              // murk line
    R(c, 5, 2 + b, 1, 2, '#6f9c5e');            // dripping slime
    R(c, 10, 3 - b, 1, 2, '#6f9c5e');
    R(c, 5, 6 + b, 2, 2, '#ffe14d');            // three glowing eyes
    R(c, 9, 6 + b, 2, 2, '#ffe14d');
    R(c, 7, 8 + b, 2, 2, '#ffe14d');
    R(c, 6, 7 + b, 1, 1, '#1c2814'); R(c, 10, 7 + b, 1, 1, '#1c2814');
    R(c, 8, 9 + b, 1, 1, '#1c2814');
    R(c, 6, 11 + b, 4, 1, '#1c2814');           // mouth
  }, 2) });

  // ============================ bosses (32x32, 3 frames) ============================
  // bramblehorn: f0 idle, f1 charge, f2 stunned
  registerArt('bramblehorn', { w: 32, h: 32, frames: 3, draw: big(function (c, f) {
    var shell = '#4e6b2e', shell2 = '#6a8c3e', dark = '#26380f', thorn = '#9fbe5c';
    var l = (f === 1) ? 1 : 0;
    R(c, 1, 5 + l, 2, 1, dark); R(c, 13, 6 - l, 2, 1, dark);  // legs
    R(c, 1, 8 - l, 2, 1, dark); R(c, 13, 8 + l, 2, 1, dark);
    R(c, 1, 11 + l, 2, 1, dark); R(c, 13, 11 - l, 2, 1, dark);
    R(c, 3, 2, 10, 10, shell);                  // bramble shell
    R(c, 4, 1, 8, 2, shell2);
    R(c, 7, 1, 2, 11, dark);                    // seam
    R(c, 4, 3, 1, 1, thorn); R(c, 11, 4, 1, 1, thorn);        // thorns
    R(c, 5, 7, 1, 1, thorn); R(c, 10, 8, 1, 1, thorn);
    R(c, 12, 2, 1, 1, thorn); R(c, 3, 9, 1, 1, thorn);
    R(c, 5, 12, 6, 2, dark);                    // head (faces south)
    R(c, 7, 14, 2, 2, '#e8dcc8');               // great horn
    if (f === 1) { R(c, 6, 14, 1, 2, '#e8dcc8'); R(c, 9, 14, 1, 2, '#e8dcc8'); } // horn flared
    if (f === 2) {                              // stunned: dizzy stars, dim eyes
      R(c, 5, 12, 1, 1, '#101a08'); R(c, 10, 12, 1, 1, '#101a08');
      R(c, 3, 0, 1, 1, '#ffe14d'); R(c, 8, 0, 1, 1, '#ffe14d'); R(c, 12, 0, 1, 1, '#ffe14d');
      R(c, 5, 1, 1, 1, '#fff6c8'); R(c, 10, 1, 1, 1, '#fff6c8');
    } else {
      var eye = (f === 1) ? '#ff5050' : '#ffd23e';
      R(c, 5, 12, 1, 1, eye); R(c, 10, 12, 1, 1, eye);
    }
    if (f === 1) { R(c, 2, 14, 2, 1, '#c8d8b0'); R(c, 12, 14, 2, 1, '#c8d8b0'); } // dust kick
  }, 2) });

  // sandWyrm: f0 submerged mound, f1 surfacing, f2 surfaced (maw open)
  registerArt('sandWyrm', { w: 32, h: 32, frames: 3, draw: big(function (c, f) {
    var sand = '#d9c27e', sand2 = '#b89b58', body = '#c9a23e', dark = '#6e5418';
    if (f === 0) {                              // shifting sand mound
      R(c, 4, 9, 8, 1, sand);
      R(c, 3, 10, 10, 3, sand);
      R(c, 2, 12, 12, 1, sand2);
      R(c, 1, 13, 14, 1, sand2);                // ripple ring
      R(c, 5, 10, 2, 1, '#f0e4bc');
    } else if (f === 1) {                       // head breaching
      R(c, 2, 12, 12, 2, sand);
      R(c, 1, 13, 14, 1, sand2);
      R(c, 5, 5, 6, 8, body);
      R(c, 5, 7, 6, 1, dark); R(c, 5, 10, 6, 1, dark); // segments
      R(c, 6, 5, 1, 2, '#ff5050'); R(c, 9, 5, 1, 2, '#ff5050'); // eyes
      R(c, 4, 11, 2, 2, sand); R(c, 10, 11, 2, 2, sand); // sand spray
      R(c, 3, 9, 1, 1, '#f0e4bc'); R(c, 12, 8, 1, 1, '#f0e4bc');
    } else {                                    // towering, maw open
      R(c, 2, 13, 12, 2, sand2);                // churned base
      R(c, 4, 1, 8, 5, body);                   // head
      R(c, 5, 2, 6, 3, '#3a1c08');              // open maw
      R(c, 5, 2, 1, 1, '#ffffff'); R(c, 10, 2, 1, 1, '#ffffff'); // teeth
      R(c, 7, 4, 2, 1, '#ffffff');
      R(c, 4, 2, 1, 1, '#ff5050'); R(c, 11, 2, 1, 1, '#ff5050'); // side eyes
      R(c, 5, 6, 6, 8, body);                   // neck
      R(c, 5, 7, 6, 1, dark); R(c, 5, 9, 6, 1, dark); R(c, 5, 11, 6, 1, dark);
      R(c, 6, 6, 1, 6, '#e0c068');              // belly sheen
    }
  }, 2) });

  // frostRevenant: f0 idle drift, f1 ice attack, f2 teleport fade
  registerArt('frostRevenant', { w: 32, h: 32, frames: 3, draw: big(function (c, f) {
    var fade = (f === 2);
    var robe = fade ? 'rgba(184,220,236,0.5)' : '#b8dcec';
    var shade = fade ? 'rgba(141,184,208,0.5)' : '#8db8d0';
    var deep = '#5880a0', glow = '#4dffff';
    R(c, 4, 4, 8, 8, robe);                     // ghostly robe (no legs)
    R(c, 3, 6, 10, 4, robe);
    R(c, 4, 12, 2, 2, shade); R(c, 7, 12, 2, 3, shade); R(c, 10, 12, 2, 2, shade); // tatters
    R(c, 4, 2, 8, 2, deep);                     // brow band
    R(c, 4, 0, 1, 2, '#e8fbff'); R(c, 7, 0, 2, 2, '#e8fbff'); R(c, 11, 0, 1, 2, '#e8fbff'); // ice crown
    R(c, 5, 4, 6, 4, fade ? 'rgba(40,63,88,0.5)' : '#283f58'); // hollow face
    R(c, 6, 5, 1, 2, glow); R(c, 9, 5, 1, 2, glow); // burning eyes
    if (f === 1) {                              // arms raised w/ shards
      R(c, 1, 3, 3, 2, robe); R(c, 12, 3, 3, 2, robe);
      R(c, 0, 1, 2, 3, '#e8fbff'); R(c, 14, 1, 2, 3, '#e8fbff');
      R(c, 1, 0, 1, 1, glow); R(c, 14, 0, 1, 1, glow);
    } else {
      R(c, 2, 7, 2, 3, robe); R(c, 12, 7, 2, 3, robe);
    }
    if (fade) { R(c, 2, 2, 1, 1, '#e8fbff'); R(c, 13, 10, 1, 1, '#e8fbff'); R(c, 8, 15, 1, 1, '#e8fbff'); }
  }, 2) });

  // morgrath phase 1 (sorcerer): f0 idle, f1 casting, f2 hurt flinch
  registerArt('morgrath', { w: 32, h: 32, frames: 3, draw: big(function (c, f) {
    var robe = '#2c1a3e', trim = '#7a2a8a', glow = '#ff3d6e';
    var hurt = (f === 2);
    R(c, 4, 5, 8, 9, robe);                     // robe
    R(c, 3, 12, 10, 2, '#1c1028');              // hem
    R(c, 4, 5, 8, 1, trim);                     // collar
    R(c, 7, 6, 2, 7, trim);                     // sash
    R(c, 5, 2, 6, 3, robe);                     // hood
    R(c, 4, 1, 1, 2, robe); R(c, 11, 1, 1, 2, robe); // hood points
    R(c, 6, 3, 4, 2, '#cdd2c0');                // pale face
    R(c, 6, 4, 1, 1, hurt ? '#ffffff' : glow); R(c, 9, 4, 1, 1, hurt ? '#ffffff' : glow);
    if (f === 1) {                              // both hands up, twin orbs
      R(c, 1, 3, 3, 2, robe); R(c, 12, 3, 3, 2, robe);
      R(c, 0, 1, 2, 2, glow); R(c, 14, 1, 2, 2, glow);
      R(c, 1, 0, 1, 1, '#ffb0c8'); R(c, 14, 0, 1, 1, '#ffb0c8');
    } else {
      R(c, 12, 6, 2, 2, robe);                  // staff hand
      R(c, 13, 3, 1, 11, '#3a2a4a');            // dark staff
      R(c, 12, 1, 3, 2, hurt ? '#5a4a6a' : glow); // staff gem
    }
    if (hurt) { R(c, 4, 7, 1, 1, glow); R(c, 11, 9, 1, 1, glow); R(c, 7, 11, 1, 1, glow); } // cracking magic
  }, 2) });

  // morgrath2 (48x48 demon form): f0 looming, f1 wings spread, f2 claw charge
  registerArt('morgrath2', { w: 48, h: 48, frames: 3, draw: big(function (c, f) {
    var hide = '#5a1620', hide2 = '#7e2230', dark = '#2c0a10';
    var horn = '#e8d8c0', glow = '#ffd23e', wing = '#3a0e16';
    if (f === 1) {                              // wings spread wide
      R(c, 0, 2, 4, 9, wing); R(c, 12, 2, 4, 9, wing);
      R(c, 0, 2, 1, 11, '#1c060a'); R(c, 15, 2, 1, 11, '#1c060a');
      R(c, 1, 11, 1, 2, wing); R(c, 14, 11, 1, 2, wing); // wing tips
    } else {
      R(c, 1, 4, 3, 7, wing); R(c, 12, 4, 3, 7, wing); // folded
    }
    R(c, 4, 4, 8, 9, hide);                     // hulking body
    R(c, 5, 6, 6, 5, hide2);                    // chest
    R(c, 7, 6, 2, 5, dark);                     // chest crack...
    R(c, 7, 8, 2, 1, glow);                     // ...leaking light
    R(c, 5, 1, 6, 4, hide);                     // head
    R(c, 3, 0, 2, 2, horn); R(c, 11, 0, 2, 2, horn); // horns
    R(c, 4, 1, 1, 2, horn); R(c, 11, 1, 1, 2, horn);
    R(c, 6, 2, 1, 1, glow); R(c, 9, 2, 1, 1, glow); // burning eyes
    R(c, 6, 4, 4, 1, dark);                     // maw
    R(c, 6, 4, 1, 1, '#ffffff'); R(c, 9, 4, 1, 1, '#ffffff'); // fangs
    if (f === 2) {                              // claws swept forward low
      R(c, 2, 11, 3, 2, hide); R(c, 11, 11, 3, 2, hide);
      R(c, 1, 12, 2, 1, horn); R(c, 13, 12, 2, 1, horn);
    } else {
      R(c, 2, 6, 2, 4, hide); R(c, 12, 6, 2, 4, hide); // arms
      R(c, 2, 10, 2, 1, horn); R(c, 12, 10, 2, 1, horn); // claws
    }
    R(c, 5, 13, 2, 3, dark); R(c, 9, 13, 2, 3, dark); // legs
    if (f === 1) { R(c, 5, 0, 1, 1, '#ff8030'); R(c, 10, 0, 1, 1, '#ff8030'); } // embers
  }, 3) });
})();
