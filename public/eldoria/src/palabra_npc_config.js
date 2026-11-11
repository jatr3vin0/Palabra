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
      vocab: ['Dios', 'cielos', 'tierra'],
      masteryThreshold: 3,
    },
    reward: { gems: 15 },
    doneFlag: 'mission_ana_balloons_done',
  },
};
