// ── Palabra gate-slice data ──────────────────────────────────────────────────
// NPC configs + the mission registry v1, as plain JSON-shaped data on window
// registries (content-file rule: window.* only, never engine logic). Adding an
// NPC or a mission is a content edit, not code.
//
// Voice casting is by CHARACTER KEY; the actual voiceId/speed/pitch numbers
// live in one place — the Palabra app's voiceCast module (src/lib/voiceCast.ts)
// — so the app and the adventure can never drift apart. Adding a voice or
// re-casting a character is a one-table edit in the app.

// npc id -> display name + character voice key. `name` is used for mission
// banners and captions; `voice` selects the per-character kokoro voice.
window.PALABRA_NPCS = {
  kid_pip:      { name: 'Pip',          voice: 'hero',      title: 'niño del pueblo' },
  villager_ana: { name: 'Ana',          voice: 'villagerF', title: 'vecina del pueblo' },
  elder_rowan:  { name: 'Evangelista',   voice: 'elder',     title: 'evangelista' },
  shopkeep_mira:{ name: 'Mira',         voice: 'villagerF', title: 'tienda' },
  farmer_joss:  { name: 'Joss',         voice: 'villagerM', title: 'granjero' },
  guard_tomas:  { name: 'Tomás',        voice: 'villagerM', title: 'guardia' },
  nutwick:      { name: 'Nutwick',      voice: 'elder',     title: 'duende del roble' },
  fisher_finn:  { name: 'Finn',         voice: 'villagerM', title: 'pescador del lago' },
  hermit_aldous:{ name: 'Aldous',       voice: 'elder',     title: 'ermitaño de la montaña' },
  nomad_zara:   { name: 'Zara',         voice: 'villagerF', title: 'nómada del desierto' },
  witch_morla:  { name: 'Morla',        voice: 'villain',   title: 'bruja del pantano' },
  fairy_aria:   { name: 'Aria',         voice: 'heroine',   title: 'hada de los estanques' },
};

// Signposts read in the NARRATOR voice (scripture/announcer type).
window.PALABRA_SIGN_VOICE = 'narrator';

// ── Mission registry v1 ─────────────────────────────────────────────────────
// Any NPC / event can launch any mini-game BY GAME ID. Parameters carried on
// every launch: game id (frameId), curriculum content binding, difficulty tier,
// Spanish proficiency (CEFR + unit + vocabulary) and the mastery threshold.
// Completion is recorded twice, on purpose:
//   • Eldoria flags (`doneFlag`) gate the world-side dialogue variants;
//   • Palabra's learner record (storage.ts: XP, coins, misses, mastery) stays
//     the authoritative learning record.
window.PALABRA_MISSIONS = {
  mission_pip_jet: {
    id: 'mission_pip_jet',
    npc: 'kid_pip',
    game: 'Capitán Rico: Sky Words',
    frameId: 'plaza-rico-shooter',       // the mini-game (frame engine) id
    contentBinding: 'a0-u01-l1',         // Unit 1, lesson 1: saludos
    difficulty: 'child',                 // session tier preselected on launch
    proficiency: {
      cefr: 'A0',
      unit: 'u01',
      vocab: ['hola', 'adiós', 'gracias', 'buenos días'],
      masteryThreshold: 3,               // correct hits per wave
    },
    reward: { gems: 15 },
    doneFlag: 'mission_pip_jet_done',
  },
  mission_ana_balloons: {
    id: 'mission_ana_balloons',
    npc: 'villager_ana',
    game: 'Globos de la Palabra',
    frameId: 'casa-rosa-verse',
    contentBinding: 'a0-u01-l8',         // Unit 1, lesson 8: «En el principio»
    difficulty: 'child',
    proficiency: {
      cefr: 'A0',
      unit: 'u01',
      vocab: ['Dios', 'cielo', 'tierra'],  // round KEY migrated cielos→cielo (ruling 3; verse text keeps "los cielos")
      masteryThreshold: 3,
    },
    reward: { gems: 15 },
    doneFlag: 'mission_ana_balloons_done',
  },
  // Second missions (imported-pack connection, pack1 = a0-u03 "La casa y la
  // tienda"): same NPC offers its second mission once the gate one is done
  // (INTEGRATION §3 — two gate NPCs total, dialogue variant gated on
  // flagsAll/flagsNone). The binding is the PACK id; the resolver in
  // src/content/packs/a0-packs.ts accepts it (and the pack's own lesson-level
  // field) — that reconciliation lives there, documented.
  mission_pip_jet2: {
    id: 'mission_pip_jet2',
    npc: 'kid_pip',
    game: 'Capitán Rico: Sky Words',
    frameId: 'plaza-rico-shooter',       // same jet, new pack
    contentBinding: 'a0-u03',            // pack 1: casa / mesa / silla / cama…
    difficulty: 'child',
    proficiency: {
      cefr: 'A0',
      unit: 'u03',
      vocab: ['casa', 'mesa', 'silla', 'cama'],
      masteryThreshold: 3,
    },
    reward: { gems: 15 },
    doneFlag: 'mission_pip_jet2_done',
  },
  mission_ana_balloons2: {
    id: 'mission_ana_balloons2',
    npc: 'villager_ana',
    game: 'Globos de la Palabra',
    frameId: 'casa-rosa-verse',
    contentBinding: 'a0-u03',            // scripture: Josué 24:15 (RV1909), teaches casa
    difficulty: 'child',
    proficiency: {
      cefr: 'A0',
      unit: 'u03',
      vocab: ['casa', 'mesa', 'pared', 'verde'],
      masteryThreshold: 3,
    },
    reward: { gems: 15 },
    doneFlag: 'mission_ana_balloons2_done',
  },
  // Game #7 (sokoban, R7-6): Mira's warehouse — reserved key goes ACTIVE as
  // registry data now that the frame exists (almacen-palabra).
  mission_mira_almacen: {
    id: 'mission_mira_almacen',
    npc: 'shopkeep_mira',
    game: 'Empuja la Palabra',
    frameId: 'almacen-palabra',          // sokoban template (game #7, R7-6)
    contentBinding: 'a0-u05',            // pool a0-u05 (R7-2 CONFIRMED)
    difficulty: 'child',
    proficiency: {
      cefr: 'A0',
      unit: 'u05',
      vocab: ['campo', 'planta', 'árbol', 'río'],  // wave 1 of the pack
      masteryThreshold: 3,               // pairs per board (R3+ anchor)
    },
    reward: { gems: 15 },
    doneFlag: 'mission_mira_almacen_done',
  },
  // Game #3 (road-cross): guard Tomás's street — reserved placeholder
  // camino-road-cross reconciled to the canonical frame id at landing.
  mission_tomas_calle: {
    id: 'mission_tomas_calle',
    npc: 'guard_tomas',
    game: 'Cruza la Calle',
    frameId: 'camino-road-cross',        // road-cross template (game #3)
    contentBinding: 'a0-u05',            // pool a0-u05 (plan §3)
    difficulty: 'child',
    proficiency: {
      cefr: 'A0',
      unit: 'u05',
      vocab: ['campo', 'planta', 'árbol', 'río'],  // wave 1 of the pack
      masteryThreshold: 3,               // crossings per round (R3+ anchor)
    },
    reward: { gems: 15 },
    doneFlag: 'mission_tomas_calle_done',
  },
  // Game #4 (breakout-word): farmer Joss's spelling wall — a0-u04 + the
  // a0-u01-l4 cut madre/padre (GAMES-2-4-bindings #4).
  mission_joss_ladrillos: {
    id: 'mission_joss_ladrillos',
    npc: 'farmer_joss',
    game: 'Ladrillos del Alfabeto',
    frameId: 'ladrillos-alfabeto',       // breakout template (game #4)
    contentBinding: 'a0-u04',            // pool a0-u04 + l4 cut (plan §2)
    difficulty: 'child',
    proficiency: {
      cefr: 'A0',
      unit: 'u04',
      vocab: ['pan', 'agua', 'sal', 'miel'],  // wave 1 of the pack
      masteryThreshold: 3,               // words per round (R3+ anchor)
    },
    reward: { gems: 15 },
    doneFlag: 'mission_joss_ladrillos_done',
  },
};
