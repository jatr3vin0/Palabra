// The Shattered Crown — dialogue content.
// Attaches ONLY to the engine-defined DIALOGUE registry.
// Format (docs/ARCHITECTURE.md): DIALOGUE.<npc_id> = [ variants... ],
// each variant { if:{...}, lines:[ page, page ], set?, give? }.
// First matching variant wins; the default (no `if`) is always LAST.
// Lines: max ~38 chars; pages: 1-3 lines; variants: 1-3 pages.

// ---------------------------------------------------------------------------
// Elder Rowan — quest giver, Willow Village (elder_house)
// ---------------------------------------------------------------------------
DIALOGUE.elder_rowan = [
  { if: { flagsAll: ['game_complete'] }, lines: [
      ['The crown is whole again!', 'Eldoria is safe, thanks to you.'],
      ['Rest now, hero of Willow.', 'You have earned a nap. A big one.'] ] },
  { if: { shardsMin: 3 }, lines: [
      ['Three shards! You truly did it!', 'They hum with old magic.'],
      ['Go northeast to the Ashen Wastes.', 'The shards will melt the barrier.'],
      ['Morgrath waits in his citadel.', 'We believe in you. Go!'] ] },
  { if: { flagsAll: ['d3_complete'], flagsNone: ['d2_complete'] }, lines: [
      ['The Sapphire Shard! Wonderful!', 'Those boots look fast, too.'],
      ['One shard left, in the Sandstone', 'Ruins far to the southeast.'],
      ['A stone eye seals the entrance.', 'Your bow will wake it.'] ] },
  { if: { flagsAll: ['d2_complete'], flagsNone: ['d3_complete'] }, lines: [
      ['The Ruby Shard! Splendid work!', 'And bombs! Mind my curtains.'],
      ['One shard left: Glacier Hollow,', 'north past the mountain pass.'],
      ['A cracked boulder blocks the cave.', 'Sounds like a job for a bomb!'] ] },
  { if: { flagsAll: ['d1_complete'] }, lines: [
      ['The Emerald Shard! Marvelous!', 'And a fine bow on your back.'],
      ['Two shards remain, brave one.', 'Sandstone Ruins, far southeast.', 'Glacier Hollow, high up north.'],
      ['That stone eye at the ruins?', 'I hear arrows wake it up.'] ] },
  { if: { flagsNone: ['npc_elder_met'] },
    set: { flag: 'npc_elder_met' },
    give: { gems: 30, once: 'elder_gift1' },
    lines: [
      ['Ah, you are awake at last!', 'Morgrath shattered our crown', 'into three shards, child.'],
      ['You are the one the oak chose.', 'Take these gems for supplies.'],
      ['Start west: Vinewood Temple', 'sleeps deep in the forest.', 'Be brave, little sprout!'] ] },
  { lines: [
      ['The Vinewood Temple lies west,', 'deep in the forest.'],
      ['Cut tall grass if you need hearts.', 'Old elder trick. Works every time.'] ] },
];

// ---------------------------------------------------------------------------
// Mira — village shopkeeper
// ---------------------------------------------------------------------------
DIALOGUE.shopkeep_mira = [
  { if: { flagsAll: ['game_complete'] }, lines: [
      ['The hero shops HERE, folks!', 'Best advertising I ever had.'] ] },
  { if: { shardsMin: 1 }, lines: [
      ['A real shard hunter in my shop!', 'Stock up. Heroes break easily.'],
      ['Potions save lives, you know.', 'Mostly yours.'] ] },
  { lines: [
      ['Welcome to my little shop!', 'Stand by an item and press', 'the action button to buy.'],
      ['Potions heal you all the way.', 'Smart heroes carry four.'],
      ['Lanterns light up dark places.', 'Dungeons love the dark. Hint hint.'] ] },
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
      ['Crops grow tall in peace.', 'Best harvest in years. Thanks!'] ] },
  { if: { items: ['bombBag'] }, lines: [
      ['Bombs, eh? Heard a cracked rock', 'sits up by the crossroads.', 'Boom first, ask questions later.'] ] },
  { lines: [
      ['Slimes keep bouncing on my crops.', 'Give them a bonk for me, will you?'],
      ['Cracked boulders hide secrets.', 'Saw one near the crossroads once.'] ] },
];

// ---------------------------------------------------------------------------
// Tomas — village guard, north road (warns about the mountain pass)
// ---------------------------------------------------------------------------
DIALOGUE.guard_tomas = [
  { if: { flagsAll: ['game_complete'] }, lines: [
      ['All quiet! Finally.', 'Now I guard mostly butterflies.'] ] },
  { if: { items: ['boots'] }, lines: [
      ['Power Boots! Look at you.', 'The pass will not slow you now.'] ] },
  { if: { items: ['bombBag'] }, lines: [
      ['Heading north? Glacier Hollow is', 'sealed by a cracked boulder.', 'Good thing you carry bombs!'] ] },
  { if: { flagsAll: ['d1_complete'] }, lines: [
      ['The mountain pass is north, but', 'it is icy and full of wolves.', 'Pack hearts before you climb.'] ] },
  { lines: [
      ['Halt! Just kidding. Hello!', 'The north pass is dangerous.', 'Wolves, ice, grumpy rocks.'],
      ['Start with the forest, west.', 'Elder Rowan knows the way.'] ] },
];

// ---------------------------------------------------------------------------
// Finn — fisher at the lake
// ---------------------------------------------------------------------------
DIALOGUE.fisher_finn = [
  { if: { flagsAll: ['game_complete'] }, lines: [
      ['Even the fish seem happier.', 'Still not biting, though.'] ] },
  { if: { flagsAll: ['d1_complete'] }, lines: [
      ['Nice bow! Not for fishing though.', 'A fairy pond hides northeast.', 'Fairies fix you right up.'],
      ['And between us? Bushes south of', 'here hide stairs to a secret.'] ] },
  { lines: [
      ['Shhh. The fish can hear you.', 'They have heard me for years.', 'Zero fish so far.'],
      ['A fairy pond lies northeast.', 'Best free healing in Eldoria.'] ] },
];

// ---------------------------------------------------------------------------
// Aldous — mountain hermit (hints bombs for the D3 boulder + ice tips)
// ---------------------------------------------------------------------------
DIALOGUE.hermit_aldous = [
  { if: { flagsAll: ['d3_complete'] }, lines: [
      ['You cleared the Hollow! Ha!', 'Fifty years I waited up here', 'for someone interesting.'] ] },
  { if: { items: ['bombBag'] }, lines: [
      ['Bombs! Now you are talking.', 'Glacier Hollow hides west of here', 'behind a big cracked boulder.'],
      ['Set a bomb against it and step', 'back. Boom. Doorway.'],
      ['Ice tip: you slide until you', 'hit something. Plan each push.'] ] },
  { lines: [
      ['A visitor! Up HERE? Wild.', 'The cave west is Glacier Hollow,', 'sealed by a cracked boulder.'],
      ['No bomb, no entry. The desert', 'ruins hold bombs, so they say.'],
      ['On ice you slide till you bump.', 'Aim yourself like a curling stone.'] ] },
];

// ---------------------------------------------------------------------------
// Zara — desert nomad (hints the eye switch needs the bow)
// ---------------------------------------------------------------------------
DIALOGUE.nomad_zara = [
  { if: { flagsAll: ['d2_complete'] }, lines: [
      ['You woke the ruins and won.', 'The sands will sing about you.'],
      ['Far southeast a cracked boulder', 'hides an old cave. Just saying.'] ] },
  { if: { items: ['bow'] }, lines: [
      ['The ruins southeast stay sealed.', 'A stone eye watches the door.'],
      ['Eyes blink when arrows fly.', 'You have a bow. Wink at it.'] ] },
  { lines: [
      ['Welcome, sand-walker. Tea?', 'The ruins southeast hide a shard.'],
      ['A stone eye guards the way in.', 'Only an arrow wakes it.', 'No bow? The forest temple has one.'] ] },
];

// ---------------------------------------------------------------------------
// Morla — swamp witch (hints the Sunken Shrine)
// ---------------------------------------------------------------------------
DIALOGUE.witch_morla = [
  { if: { flagsAll: ['has_heroSword'] }, lines: [
      ['So the blade chose you after all.', 'My frog owes me three flies.'],
      ['Swing it proudly, little hero.', 'It bites twice as hard.'] ] },
  { lines: [
      ['Hee hee. Lost, are we?', 'Or looking for something... more?'],
      ['Southwest of here, old stones', 'drown. Beneath them sleeps a blade', 'that cuts twice as deep.'],
      ['Only lantern-light wakes those', 'stones. Bring courage.', 'And dry socks.'] ] },
];

// ---------------------------------------------------------------------------
// Aria — fairy of the healing ponds (gentle)
// ---------------------------------------------------------------------------
DIALOGUE.fairy_aria = [
  { if: { flagsAll: ['game_complete'] }, lines: [
      ['The light has returned.', 'Rest now, gentle hero.'] ] },
  { if: { shardsMin: 3 }, lines: [
      ['The shards sing in your pack.', 'Be brave a little longer.', 'We are all with you.'] ] },
  { lines: [
      ['Rest here, little one.', 'The water will mend your hurts.'],
      ['Every brave heart needs a pause.', 'Even yours.'] ] },
];

// ---------------------------------------------------------------------------
// Nutwick — Squirrel King (acorn quest; engine grants rewards at 4/8/12
// and sets nutwick_r1/r2/r3)
// ---------------------------------------------------------------------------
DIALOGUE.nutwick = [
  { if: { flagsAll: ['nutwick_r3'] }, lines: [
      ['Friend of Squirrels! That charm', 'suits you. Stay nutty.'] ] },
  { if: { acornsMin: 12 }, lines: [
      ['TWELVE GOLDEN ACORNS!', 'The full royal dozen!'],
      ['Take the Oak Charm, hero.', 'It softens every blow.', 'Squirrel magic. Very rare.'] ] },
  { if: { flagsAll: ['nutwick_r2'] }, lines: [
      ['Four acorns left, friend.', 'Find all twelve and my greatest', 'treasure is yours.'] ] },
  { if: { acornsMin: 8 }, lines: [
      ['EIGHT! You magnificent finder!', 'Take this heart of the old oak.'],
      ['Four more remain out there.', 'Sniff harder!'] ] },
  { if: { flagsAll: ['nutwick_r1'] }, lines: [
      ['Eight acorns earns a royal gift.', 'Keep hunting, keep climbing!'] ] },
  { if: { acornsMin: 4 }, lines: [
      ['FOUR golden acorns! Gems for you,', 'as squirrel law demands!'],
      ['More acorns, more rewards.', 'Eight is the next magic number.'] ] },
  { if: { acornsMin: 1 }, lines: [
      ['Oho! You carry golden acorns!', 'Bring me FOUR and be rewarded!'],
      ['They hide behind bushes, in caves,', 'on islands. Squirrels see all.'] ] },
  { lines: [
      ['I am NUTWICK, King of Squirrels!', 'Bow! Or nod. Nodding is fine.'],
      ['Twelve golden acorns lie hidden', 'across the land. Bring them to me', 'for royal rewards!'] ] },
];

// ---------------------------------------------------------------------------
// Signs — one page, 1-2 punchy lines each
// ---------------------------------------------------------------------------
DIALOGUE.signs = {
  sign_village_square: ['Aldea Sauce', 'Pueblo pequeño y tranquilo.'],
  sign_village_shop:   ['La tienda de Mira', 'Pociones y flechas. ¡Bienvenido!'],
  sign_farm:           ["Joss's Farm", 'Please do not bonk the crops.'],
  sign_crossroads:     ['W: Forest   E: Lake', 'N: Mountains   S: Farms, Desert'],
  sign_forest_edge:    ['Vinewood Forest ahead.', 'Beware of plants that spit.'],
  sign_d1_entrance:    ['Vinewood Temple', 'Trespassers will be sproinged.'],
  sign_lake:           ['Lake Aria', 'No swimming. The fish bite back.'],
  sign_desert_edge:    ['Sandstone Desert', 'Hot sand, cold mummies. Enjoy!'],
  sign_d2_entrance:    ['Sandstone Ruins', 'The eye opens for a true shot.'],
  sign_oasis:          ['The Oasis', 'Cool water for weary heroes.'],
  sign_mountain_pass:  ['Frostpeak Pass', 'Ice, wolves, regret. Turn back?'],
  sign_d3_entrance:    ['Glacier Hollow', 'Sealed tight. Try a big boom.'],
  sign_swamp:          ['Murkmire Swamp', 'Squelchy. Bring spare socks.'],
  sign_shrine:         ['Old stones dream below the mire.', 'Only lantern-light wakes them.'],
  sign_barrier:        ["Morgrath's barrier of dread.", 'Three shards shall shatter it.'],
  sign_citadel:        ['DARK CITADEL', 'Turn back. Final warning. -M'],
};
