// Dialogue content — Spanish (learner-facing), English captions as `gloss`.
// Shape contract (dialogue.js): DIALOGUE.<npc> = variants, first match wins;
// every `if`/`set`/`give`/`mission` key is engine logic — never edit those
// here without the engine open. `lines` are SPOKEN by kokoro per page;
// `gloss` is the English caption shown only at immersion level 0.
// (W2 sweep, playtest-2 content pack: BLOCKS A+B of DIALOGUE-sweep-playtest2.
// Pip and Ana keep their gate-slice blocks — already Spanish, missions bound.)

// ---------------------------------------------------------------------------
// Evangelista (elder_rowan) — quest giver, Ciudad de Destrucción (elder_house)
// W3 reskin: the Bunyan story layer. Conditions/keys byte-identical, order
// unchanged — display text only (Burden → Roll of the King → the narrow gate).
// ---------------------------------------------------------------------------
DIALOGUE.elder_rowan = [
  { if: { flagsAll: ['game_complete'] }, lines: [
      ['¡A casa llegaste, peregrino!', '¡Gracias por tu historia!'],
      ['Descansa. La Ciudad Celestial', 'te espera. Tú llegaste.'] ],
    gloss: [
      ['You made it home, pilgrim!', 'Thank you for your story!'],
      ['Rest. The Celestial City', 'awaits. You arrived.'] ] },
  { if: { shardsMin: 3 }, lines: [
      ['¡Los tres sellos! ¡Lo lograste!', 'El Rollo del Rey está entero.'],
      ['El sello abre la barrera.', 'Ve al noreste: el Valle de', 'la Humillación.'],
      ['Apollyon espera en su fortaleza.', '¡Cree en ti! ¡Ve, valiente!'] ],
    gloss: [
      ['The three seals! You did it!', 'The King\'s Roll is whole.'],
      ['The seal opens the barrier.', 'Go northeast: the Valley of', 'Humiliation.'],
      ['Apollyon waits in his fortress.', 'Believe in yourself! Go, brave one!'] ] },
  { if: { flagsAll: ['d3_complete'], flagsNone: ['d2_complete'] }, lines: [
      ['¡El sello de zafiro! ¡Bien!', 'Y el calzado del evangelio...', '¡qué rápido vas!'],
      ['Falta uno: la Mina de Demas,', 'al sureste, lejos.'],
      ['Un ojo de piedra cierra la puerta.', 'Tu arco lo despierta.'] ],
    gloss: [
      ['The sapphire seal! Good!', 'And the footwear of the gospel...', 'how fast you go!'],
      ['One left: the Mine of Demas,', 'far to the southeast.'],
      ['A stone eye seals the door.', 'Your bow wakes it.'] ] },
  { if: { flagsAll: ['d2_complete'], flagsNone: ['d3_complete'] }, lines: [
      ['¡El sello de rubí! ¡Muy bien!', 'Y bombas. ¡Bum!'],
      ['Falta uno: el Castillo de', 'la Duda, al norte, tras el paso.'],
      ['Una roca rota tapa la cueva.', 'Eso pide una bomba. ¡Bum!'] ],
    gloss: [
      ['The ruby seal! Very good!', 'And bombs. Boom!'],
      ['One left: the Castle of Doubt,', 'north, past the pass.'],
      ['A cracked rock blocks the cave.', 'That calls for a bomb. Boom!'] ] },
  { if: { flagsAll: ['d1_complete'] }, lines: [
      ['¡El sello de esmeralda! ¡Bien!', 'Y un buen arco en tu espalda.'],
      ['Faltan dos sellos, peregrino.', 'Mina al sureste, castillo al norte.'],
      ['Ese ojo de piedra de la mina...', 'dicen que el arco lo despierta.'] ],
    gloss: [
      ['The emerald seal! Good!', 'And a fine bow on your back.'],
      ['Two seals are left, pilgrim.', 'Mine southeast, castle north.'],
      ['That stone eye in the mine...', 'they say a bow wakes it.'] ] },
  { if: { flagsNone: ['npc_elder_met'] },
    set: { flag: 'npc_elder_met' },
    give: { gems: 30, once: 'elder_gift1' },
    lines: [
      ['¡Ah! ¡Despertaste por fin!', 'Llevas un peso en la espalda,', 'peregrino. Lo sé.'],
      ['El Rollo del Rey tiene tres', 'sellos. Ladrones los robaron.'],
      ['Toma estas gemas para el viaje.', 'La Puerta Angosta te espera.', 'Ve al oeste. ¡Ve, peregrino!'] ],
    gloss: [
      ['Ah! You are awake at last!', 'You carry a weight on your', 'back, pilgrim. I know.'],
      ['The King\'s Roll has three', 'seals. Thieves stole them.'],
      ['Take these gems for the journey.', 'The Narrow Gate awaits you.', 'Go west. Go, pilgrim!'] ] },
  { lines: [
      ['La Puerta Angosta está al oeste,', 'tras el bosque. Toca la puerta.'],
      ['Corta la hierba alta y tendrás', 'corazones. Truco de Evangelista.'] ],
    gloss: [
      ['The Narrow Gate is west,', 'past the forest. Knock. They open.'],
      ['Cut tall grass and you get', 'hearts. Evangelista\'s trick.'] ] },
];

// ---------------------------------------------------------------------------
// Mira — village shopkeeper
// ---------------------------------------------------------------------------
DIALOGUE.shopkeep_mira = [
  { if: { flagsAll: ['game_complete'] }, lines: [
      ['¡El héroe compra AQUÍ!', 'La mejor publicidad del mundo.'] ],
    gloss: [
      ['The hero shops HERE!', 'Best advertising in the world.'] ] },
  { if: { shardsMin: 1 }, lines: [
      ['¡Un cazador de pedazos!', 'Compra. Los héroes se rompen.'],
      ['Las pociones curan del todo.', 'Los héroes listos llevan cuatro.'] ],
    gloss: [
      ['A real shard hunter!', 'Stock up. Heroes break.'],
      ['Potions heal you fully.', 'Smart heroes carry four.'] ] },
  { lines: [
      ['¡Bienvenido a mi tienda!', 'Párate junto a un objeto', 'y toca el botón de acción.'],
      ['Las pociones curan del todo.', 'Los héroes listos llevan cuatro.'],
      ['La linterna alumbra lo oscuro.', 'A las cuevas les gusta el negro.'] ],
    gloss: [
      ['Welcome to my shop!', 'Stand by an item', 'and tap the action button.'],
      ['Potions heal you fully.', 'Smart heroes carry four.'],
      ['The lantern lights dark places.', 'Caves love the dark.'] ] },
];

// ---------------------------------------------------------------------------
// kid_pip — Pip, village child at spawn (4,3 @12,8). Gate content (A0,
// curriculum-author embed). Voice: hero (child). English lines are caption
// glosses only — never spoken. Handoff variant carries the mission binding.
// ---------------------------------------------------------------------------
DIALOGUE.kid_pip = [
  // 1) REPEAT MEETING — after the jet game is won
  { if: { flagsAll: ['mission_pip_jet_done'] }, lines: [
      ['¡Guau! ¡Tú ganaste! ¡Bravo!',
       'El jet está feliz. Yo también.'],
      ['Tú dijiste "hola" y "gracias".',
       '¡Muy bien! ¡Muy bien!'],
      ['¿Otra vez? ¡Sí, otra vez!',
       'Toca el jet y jugamos.'] ],
    gloss: [
      ['Whoa! You won! Bravo!', 'The jet is happy. Me too.'],
      ['You said "hola" and "gracias".', 'Very good! Very good!'],
      ['Again? Yes, again!', 'Touch the jet and we play.'] ] },
  // 2) MISSION HANDOFF — met, game not yet won → launches plaza-rico-shooter
  // (sets NO flag: a child who backs out is re-offered the game next talk)
  { if: { flagsAll: ['npc_pip_met'], flagsNone: ['mission_pip_jet_done'] }, mission: 'mission_pip_jet', lines: [
      ['¡Mi amigo es Capitán Rico!',
       'Él tiene un jet. ¡Un jet azul!'],
      ['El jet dice palabras. ¡Mira!',
       'Toca la palabra buena. ¡Rápido!'],
      ['¿Vamos? ¡Vamos a la plaza!',
       '¡Tú puedes, piloto!'] ],
    gloss: [
      ['My friend is Captain Rico!', 'He has a jet. A blue jet!'],
      ['The jet says words. Look!', 'Touch the good word. Fast!'],
      ['Shall we go? Let\'s go to the plaza!', 'You can do it, pilot!'] ] },
  // 3) GREETING — first meeting (default, always last)
  { set: { flag: 'npc_pip_met' }, lines: [
      ['¡Hola! ¡Hola! ¡Tú eres nuevo!',
       'Yo soy Pip. Yo vivo aquí.'],
      ['Mira el árbol. Mira la casa.',
       'Este es mi pueblo. ¡Es bonito!'],
      ['¿Quieres jugar? ¡Yo sé un juego!',
       'Habla conmigo otra vez. ¡Sí!'] ],
    gloss: [
      ['Hi! Hi! You are new!', 'I\'m Pip. I live here.'],
      ['Look at the tree. Look at the house.', 'This is my village. It\'s pretty!'],
      ['Want to play? I know a game!', 'Talk to me again. Yes!'] ] },
];

// ---------------------------------------------------------------------------
// villager_ana — Ana, kind adult villager (5,3 @6,8). Gate content (A0).
// Voice: villagerF. Handoff variant carries the mission binding.
// ---------------------------------------------------------------------------
DIALOGUE.villager_ana = [
  // 1) REPEAT MEETING — after the balloon game is won
  { if: { flagsAll: ['mission_ana_balloons_done'] }, lines: [
      ['¡Qué bien lo hiciste!',
       'Dios te bendiga, cariño.'],
      ['Tú dijiste "En el principio".',
       '¡Muy bien! ¡Muy bien!'],
      ['Vuelve cuando quieras.',
       'Yo estoy aquí. ¡Siempre!'] ],
    gloss: [
      ['How well you did it!', 'God bless you, dear.'],
      ['You said "En el principio".', 'Very good! Very good!'],
      ['Come back whenever you want.', 'I am here. Always!'] ] },
  // 2) MISSION HANDOFF — met, game not yet won → launches casa-rosa-verse
  { if: { flagsAll: ['npc_ana_met'], flagsNone: ['mission_ana_balloons_done'] }, mission: 'mission_ana_balloons', lines: [
      ['Mira este libro. Es la Biblia.',
       'Aquí está la Palabra de Dios.'],
      ['Hay globos de colores.',
       'Toca el globo bueno.'],
      ['El globo dice "tierra".',
       '¡Pum! ¡Muy bien, cariño!'] ],
    gloss: [
      ['Look at this book. It\'s the Bible.', 'Here is the Word of God.'],
      ['There are colored balloons.', 'Touch the good balloon.'],
      ['The balloon says "tierra".', 'Pop! Very good, dear!'] ] },
  // 3) GREETING — first meeting (default, always last)
  { set: { flag: 'npc_ana_met' }, lines: [
      ['Buenos días, cariño.',
       'Yo soy Ana. Yo vivo aquí.'],
      ['El pueblo es tranquilo.',
       'Hay flores y hay sol.'],
      ['Ven a mi casa, por favor.',
       'Yo tengo un libro. ¡Mira!'] ],
    gloss: [
      ['Good morning, dear.', 'I\'m Ana. I live here.'],
      ['The village is peaceful.', 'There are flowers and there is sun.'],
      ['Come to my house, please.', 'I have a book. Look!'] ] },
];

// ---------------------------------------------------------------------------
// Joss — farmer, south meadows
// ---------------------------------------------------------------------------
DIALOGUE.farmer_joss = [
  { if: { flagsAll: ['game_complete'] }, lines: [
      ['Mis plantas crecen tranquilas.', 'La mejor cosecha en años. ¡Gracias!'] ],
    gloss: [
      ['My plants grow in peace.', 'Best harvest in years. Thank you!'] ] },
  { if: { items: ['bombBag'] }, lines: [
      ['¿Bombas? Hay una roca rota', 'junto al cruce de caminos.', '¡Bum primero, preguntas después!'] ],
    gloss: [
      ['Bombs? There is a cracked rock', 'by the crossroads.', 'Boom first, ask later!'] ] },
  { lines: [
      ['Los slimes saltan en mis plantas.', 'Dales un golpe por mí, ¿sí?'],
      ['Las rocas rotas guardan secretos.', 'Vi una cerca del cruce.'] ],
    gloss: [
      ['Slimes bounce on my crops.', 'Give them a bonk for me, yes?'],
      ['Cracked rocks hide secrets.', 'I saw one near the crossroads.'] ] },
];

// ---------------------------------------------------------------------------
// Tomás — village guard, north road
// ---------------------------------------------------------------------------
DIALOGUE.guard_tomas = [
  { if: { flagsAll: ['game_complete'] }, lines: [
      ['¡Todo tranquilo! Por fin.', 'Ahora cuido mariposas.'] ],
    gloss: [
      ['All quiet! Finally.', 'Now I guard butterflies.'] ] },
  { if: { items: ['boots'] }, lines: [
      ['¡Botas de poder! Mírate.', 'El paso ya no te frena.'] ],
    gloss: [
      ['Power Boots! Look at you.', 'The pass will not slow you now.'] ] },
  { if: { items: ['bombBag'] }, lines: [
      ['¿Vas al norte? El Hueco del', 'Glaciar tiene una roca rota.', '¡Qué suerte que llevas bombas!'] ],
    gloss: [
      ['Going north? Glacier Hollow', 'has a cracked rock.', 'Lucky you carry bombs!'] ] },
  { if: { flagsAll: ['d1_complete'] }, lines: [
      ['El paso de montaña está al norte.', 'Hay hielo y hay lobos.', 'Lleva corazones antes de subir.'] ],
    gloss: [
      ['The mountain pass is north.', 'There is ice and there are wolves.', 'Pack hearts before you climb.'] ] },
  { lines: [
      ['¡Alto! Es broma. ¡Hola!', 'El paso del norte es peligroso.', 'Lobos, hielo y rocas gruñonas.'],
      ['Empieza por el bosque, al oeste.', 'Evangelista sabe el camino.'] ],
    gloss: [
      ['Halt! Just kidding. Hello!', 'The north pass is dangerous.', 'Wolves, ice, grumpy rocks.'],
      ['Start with the forest, west.', 'Evangelista knows the way.'] ] },
];

// ---------------------------------------------------------------------------
// Finn — fisher at the lake
// ---------------------------------------------------------------------------
DIALOGUE.fisher_finn = [
  { if: { flagsAll: ['game_complete'] }, lines: [
      ['Hasta los peces están felices.', 'Pero no pican. Nunca pican.'] ],
    gloss: [
      ['Even the fish are happy.', 'But they do not bite. They never do.'] ] },
  { if: { flagsAll: ['d1_complete'] }, lines: [
      ['¡Buen arco! No es para pescar.', 'Un estanque de hadas, al noreste.', 'Las hadas te curan gratis.'],
      ['Y entre tú y yo:', 'los arbustos del sur esconden', 'unas escaleras secretas.'] ],
    gloss: [
      ['Nice bow! Not for fishing.', 'A fairy pond, northeast.', 'Fairies heal you for free.'],
      ['And between you and me:', 'the bushes to the south hide', 'some secret stairs.'] ] },
  { lines: [
      ['Shhh. Los peces te oyen.', 'Me oyen desde hace años.', 'Cero peces. Cero.'],
      ['Un estanque de hadas, al noreste.', 'La mejor cura gratis de Eldoria.'] ],
    gloss: [
      ['Shhh. The fish can hear you.', 'They have heard me for years.', 'Zero fish. Zero.'],
      ['A fairy pond, northeast.', 'The best free healing in Eldoria.'] ] },
];

// ---------------------------------------------------------------------------
// Aldous — mountain hermit
// ---------------------------------------------------------------------------
DIALOGUE.hermit_aldous = [
  { if: { flagsAll: ['d3_complete'] }, lines: [
      ['¡Limpiaste el Hueco! ¡Ja!', 'Cincuenta años esperando aquí', 'a alguien interesante.'] ],
    gloss: [
      ['You cleared the Hollow! Ha!', 'Fifty years waiting up here', 'for someone interesting.'] ] },
  { if: { items: ['bombBag'] }, lines: [
      ['¡Bombas! Ahora hablas mi idioma.', 'El Hueco del Glaciar está al oeste,', 'tras una gran roca rota.'],
      ['Pon una bomba y apártate.', '¡Bum! Ya hay una puerta.'],
      ['En el hielo resbalas hasta chocar.', 'Planea cada empujón.'] ],
    gloss: [
      ['Bombs! Now you speak my language.', 'Glacier Hollow is west of here,', 'behind a big cracked rock.'],
      ['Set a bomb and step back.', 'Boom! There is a doorway.'],
      ['On ice you slide until you hit.', 'Plan every push.'] ] },
  { lines: [
      ['¡Un visitante! ¿AQUÍ arriba?', 'La cueva del oeste es el Hueco', 'del Glaciar, con roca rota.'],
      ['Sin bomba no hay entrada.', 'Las ruinas del desierto dan bombas.'],
      ['En el hielo resbalas y chocas.', 'Apúntate antes de empujar.'] ],
    gloss: [
      ['A visitor! Up HERE?', 'The west cave is Glacier', 'Hollow, with a cracked rock.'],
      ['No bomb, no entry.', 'The desert ruins give bombs.'],
      ['On ice you slide and bump.', 'Aim yourself before you push.'] ] },
];

// ---------------------------------------------------------------------------
// Zara — desert nomad
// ---------------------------------------------------------------------------
DIALOGUE.nomad_zara = [
  { if: { flagsAll: ['d2_complete'] }, lines: [
      ['Despertaste las ruinas y ganaste.', 'Las arenas cantarán por ti.'],
      ['Al sureste, una roca rota', 'esconde una cueva vieja.'] ],
    gloss: [
      ['You woke the ruins and won.', 'The sands will sing about you.'],
      ['To the southeast, a cracked rock', 'hides an old cave.'] ] },
  { if: { items: ['bow'] }, lines: [
      ['Las ruinas del sureste, cerradas.', 'Un ojo de piedra mira la puerta.'],
      ['Los ojos parpadean con flechas.', 'Tienes arco. Guíñale un ojo.'] ],
    gloss: [
      ['The southeast ruins, still sealed.', 'A stone eye watches the door.'],
      ['Eyes blink when arrows fly.', 'You have a bow. Wink at it.'] ] },
  { lines: [
      ['Bienvenido, caminante de arena.', '¿Té? Las ruinas del sureste', 'esconden un pedazo.'],
      ['Un ojo de piedra guarda la entrada.', 'Solo una flecha lo despierta.', '¿Sin arco? Hay uno en el templo.'] ],
    gloss: [
      ['Welcome, sand-walker.', 'Tea? The southeast ruins', 'hide a shard.'],
      ['A stone eye guards the way in.', 'Only an arrow wakes it.', 'No bow? The temple has one.'] ] },
];

// ---------------------------------------------------------------------------
// Morla — swamp witch
// ---------------------------------------------------------------------------
DIALOGUE.witch_morla = [
  { if: { flagsAll: ['has_heroSword'] }, lines: [
      ['Así que la espada te eligió.', 'Mi rana me debe tres moscas.'],
      ['Úsala con orgullo, pequeño.', 'Ahora corta el doble.'] ],
    gloss: [
      ['So the blade chose you.', 'My frog owes me three flies.'],
      ['Swing it proudly, little one.', 'Now it cuts twice as deep.'] ] },
  { lines: [
      ['Je, je. ¿Perdido?', '¿O buscas algo... más?'],
      ['Al suroeste, unas piedras viejas', 'se hunden. Debajo hay una espada,', 'y corta el doble.'],
      ['Solo la luz de una linterna', 'despierta esas piedras.', 'Trae valor. Y calcetines secos.'] ],
    gloss: [
      ['Hee hee. Lost, are we?', 'Or looking for something... more?'],
      ['Southwest, some old stones', 'sink. Under them is a blade,', 'and it cuts twice as deep.'],
      ['Only lantern light', 'wakes those stones.', 'Bring courage. And dry socks.'] ] },
];

// ---------------------------------------------------------------------------
// Aria — fairy of the healing ponds
// ---------------------------------------------------------------------------
DIALOGUE.fairy_aria = [
  { if: { flagsAll: ['game_complete'] }, lines: [
      ['La luz volvió.', 'Descansa, héroe amable.'] ],
    gloss: [
      ['The light has returned.', 'Rest now, gentle hero.'] ] },
  { if: { shardsMin: 3 }, lines: [
      ['Los pedazos cantan en tu bolsa.', 'Sé valiente un poco más.', 'Estamos contigo.'] ],
    gloss: [
      ['The shards sing in your bag.', 'Be brave a little longer.', 'We are with you.'] ] },
  { lines: [
      ['Descansa aquí, pequeño.', 'El agua cura tus heridas.'],
      ['Todo corazón valiente', 'necesita una pausa.', 'Hasta el tuyo.'] ],
    gloss: [
      ['Rest here, little one.', 'The water mends your hurts.'],
      ['Every brave heart', 'needs a pause.', 'Even yours.'] ] },
];

// ---------------------------------------------------------------------------
// Nutwick — Squirrel King (engine grants rewards at 4/8/12)
// ---------------------------------------------------------------------------
DIALOGUE.nutwick = [
  { if: { flagsAll: ['nutwick_r3'] }, lines: [
      ['¡Amigo de las ardillas!', 'Ese amuleto te queda bien.', 'Sigue así, amigo mío.'] ],
    gloss: [
      ['Friend of the squirrels!', 'That charm suits you.', 'Keep it up, my friend.'] ] },
  { if: { acornsMin: 12 }, lines: [
      ['¡DOCE BELLOTAS DORADAS!', '¡La docena real completa!'],
      ['Toma el Amuleto de Roble, héroe.', 'Suaviza cada golpe.', 'Magia de ardilla. Muy rara.'] ],
    gloss: [
      ['TWELVE GOLDEN ACORNS!', 'The full royal dozen!'],
      ['Take the Oak Charm, hero.', 'It softens every blow.', 'Squirrel magic. Very rare.'] ] },
  { if: { flagsAll: ['nutwick_r2'] }, lines: [
      ['Faltan cuatro bellotas, amigo.', 'Si traes las doce, mi mejor', 'tesoro es tuyo.'] ],
    gloss: [
      ['Four acorns left, friend.', 'Bring all twelve and my best', 'treasure is yours.'] ] },
  { if: { acornsMin: 8 }, lines: [
      ['¡OCHO! ¡Qué gran buscador!', 'Toma el corazón del roble viejo.'],
      ['Faltan cuatro por ahí.', '¡Olfatea más fuerte!'] ],
    gloss: [
      ['EIGHT! What a finder!', 'Take the heart of the old oak.'],
      ['Four more are out there.', 'Sniff harder!'] ] },
  { if: { flagsAll: ['nutwick_r1'] }, lines: [
      ['Ocho bellotas dan un regalo real.', '¡Sigue buscando, sigue subiendo!'] ],
    gloss: [
      ['Eight acorns earn a royal gift.', 'Keep hunting, keep climbing!'] ] },
  { if: { acornsMin: 4 }, lines: [
      ['¡CUATRO bellotas doradas!', '¡Gemas para ti, por ley de ardilla!'],
      ['Más bellotas, más premios.', 'Ocho es el próximo número.'] ],
    gloss: [
      ['FOUR golden acorns!', 'Gems for you, by squirrel law!'],
      ['More acorns, more rewards.', 'Eight is the next number.'] ] },
  { if: { acornsMin: 1 }, lines: [
      ['¡Oho! ¡Llevas bellotas doradas!', '¡Tráeme CUATRO y te premio!'],
      ['Están tras arbustos, en cuevas', 'y en islas. Las ardillas ven todo.'] ],
    gloss: [
      ['Oho! You carry golden acorns!', 'Bring me FOUR and I reward you!'],
      ['They hide behind bushes, in caves', 'and on islands. Squirrels see all.'] ] },
  { lines: [
      ['¡Soy NUTWICK, Rey de las Ardillas!', '¡Inclínate! O saluda. Saludar vale.'],
      ['Doce bellotas doradas están ocultas', 'por toda la tierra. Tráemelas', 'y tendrás premios reales.'] ],
    gloss: [
      ['I am NUTWICK, King of Squirrels!', 'Bow! Or nod. Nodding is fine.'],
      ['Twelve golden acorns are hidden', 'across the land. Bring them to me', 'and you get royal rewards.'] ] },
];

// ---------------------------------------------------------------------------
// Signposts (BLOCK B) — read in the NARRATOR voice. W3: Bunyan region names
// (Ciudad de Destrucción, Puerta Angosta, Beulah, Vanity Fair, Apollyon...).
// Shop/farm/oasis unchanged (Mira/Joss not renamed in this build).
// ---------------------------------------------------------------------------
DIALOGUE.signs = {
  sign_village_square: ['Ciudad de Destrucción'],
  sign_village_shop:   ['La tienda de Mira', 'Pociones y flechas. ¡Bienvenido!'],
  sign_farm:           ['Granja de Joss', 'No cortes mis plantas, por favor.'],
  sign_crossroads:     ['Oeste: Puerta Angosta. Este: lago.', 'Norte: Colina de la Dificultad.', 'Sur: pantano y desierto.'],
  sign_forest_edge:    ['Camino de la Puerta Angosta.', 'Toca la puerta. Te abren.'],
  sign_d1_entrance:    ['La Casa del Intérprete', 'Mucho que ver. Y que saltar.'],
  sign_lake:           ['Tierra de Beulah'],
  sign_desert_edge:    ['Feria de las Vanidades'],
  sign_d2_entrance:    ['La Mina de Demas'],
  sign_oasis:          ['El Oasis', 'Agua fresca para héroes cansados.'],
  sign_mountain_pass:  ['La Colina de la Dificultad'],
  sign_d3_entrance:    ['El Castillo de la Duda'],
  sign_swamp:          ['El Pantano del Desaliento'],
  sign_shrine:         ['Dos gigantes duermen bajo el barro.', 'Solo la linterna los despierta.'],
  sign_barrier:        ['El sello del Rollo cierra el paso.', 'Tres sellos lo abren.'],
  sign_citadel:        ['FORTALEZA DE APOLLYON'],
};
