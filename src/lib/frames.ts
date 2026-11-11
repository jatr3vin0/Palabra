/**
 * The scene schema the frame engine plays, plus the two hand-authored demo
 * frames for Unit 1. All Spanish text is written for the ear (A0 learners),
 * and scripture is quoted literally from Reina-Valera 1909 (public domain).
 *
 * Each frame carries `englishLevel: 0–3` (progressive immersion): the engine
 * compares it with the learner's immersion level and fades English captions
 * and glosses accordingly — see glossMode() below.
 */

export type ShooterRound = {
  /** The word this round teaches — key for miss tracking. */
  word: string;
  en: string;
  /** Spoken prompt; the target word is said inside it, then once more alone. */
  say: string;
  /** Caption shown while `say` is spoken (Spanish-first, English via gloss). */
  caption: string;
  /** Balloons: the answer first, distractors after — engine shuffles. */
  options: string[];
  /** Missing-word variant: the sentence is shown with ___ where the word goes. */
  missing?: string;
  /** True when this round re-serves a word missed in another frame. */
  isReplay?: boolean;
  /**
   * Wave tag for the shooter template (session waves 1–5; wave 5 is the
   * adaptive-replay wave, built at runtime from progress.misses). Untagged
   * rounds play as one single wave.
   */
  wave?: number;
};

export type ScriptureRound = {
  /**
   * The miss/replay KEY — the canonical vocab id (e.g. "cielo", never the
   * verse's inflected form). The ruling (GAME-ROADMAP §ruling 3): the KEY
   * migrates, the verse text keeps "los cielos".
   */
  word: string;
  /**
   * Display text for the answer balloon + the verse gap when it differs from
   * the KEY (e.g. "cielos" — the RV1909 plural in the verse). Defaults to
   * word.
   */
  label?: string;
  en: string;
  /** RV1909 text with a ___ gap; the gap is what the balloons fill. */
  verse: string;
  reference: string;
  say: string;
  /** Balloons: the answer first, wrong words after — engine shuffles. */
  balloons: string[];
};

export type FrameKind = "shooter" | "scripture" | "phaser";

/** Mini-game template params — see GAME-ROADMAP.md: { mechanic, contentBinding, speed, difficulty, masteryThreshold }. */
export type FrameParams = {
  /** Descent/spawn tempo multiplier: child 0.6×, standard 1.0×, adult 1.4×. */
  speed: number;
  /** Enemies per wave formation (bigger = more decoys on screen). */
  difficulty: number;
  /** Correct hits required to clear a wave. */
  masteryThreshold: number;
};

export type FrameDef = {
  id: string;
  kind: FrameKind;
  /**
   * The arcade mechanic the frame's Phaser island runs ("shooter-word" for
   * game #1). Frames without one play the legacy React exercise body.
   */
  mechanic?: string;
  /** Template params for the mechanic; the level picker scales them per tier. */
  params?: FrameParams;
  /** The villager who opens this frame in the village. */
  villager: { name: string; emoji: string };
  place: string;
  englishLevel: 0 | 1 | 2 | 3;
  xp: number;
  /** Voice-cast keys (see voiceCast.ts) — speech is per character. */
  voice?: string;
  /** Voice for round content (scripture frames use the narrator row). */
  roundVoice?: string;
  /** Spoken when the villager opens the frame. */
  greeting: { es: string; en: string };
  /**
   * Spoken + shown BEFORE the first round, kid-simple (quality bar: every
   * game explains itself before ¡Jugar! — owner play-test 2, item 6).
   */
  howto: { es: string[]; en: string[] };
  /** Spoken on a right answer. */
  praise: string[];
  /** Spoken on a wrong answer, followed by a re-speak — never a quiz screen. */
  gentle: string[];
  farewell: { es: string; en: string };
  rounds: ShooterRound[] | ScriptureRound[];
};

export const PLAZA_FRAME_ID = "plaza-rico-shooter";
export const CASA_FRAME_ID = "casa-rosa-verse";

/** Génesis 1:1, Reina-Valera 1909, quoted literally. */
export const GENESIS_1_1 = "En el principio creó Dios los cielos y la tierra.";

const PRAISE = ["¡Muy bien!", "¡Exacto!", "¡Eso es!", "¡Perfecto!"];
const GENTLE = ["Casi. Escucha otra vez.", "Mmm, no era esa. Otra vez, despacito.", "¡Ánimo! Escucha de nuevo."];

export const frames: Record<string, FrameDef> = {
  // ─── Plaza: Capitán Rico's jet word-shooter — Phaser template (game #1) ────
  // Wave bindings (Unit 1): 1–2 saludos (a0-u01-l1), 3 cortesía (a0-u01-l3),
  // 4 «En el principio» story words (a0-u01-l8), 5 adaptive replay (runtime).
  [PLAZA_FRAME_ID]: {
    id: PLAZA_FRAME_ID,
    kind: "phaser",
    mechanic: "shooter-word",
    params: { speed: 1.0, difficulty: 5, masteryThreshold: 3 },
    villager: { name: "Capitán Rico", emoji: "✈️" },
    place: "La plaza",
    englishLevel: 0,
    xp: 10,
    voice: "villagerM",
    greeting: {
      es: "¡Hola! Soy el Capitán Rico. ¡A volar!",
      en: "Hi! I'm Captain Rico. Let's fly!",
    },
    howto: {
      es: ["Mira el cielo. Bajan palabras.", "Escucha y toca la que oíste."],
      en: ["Look up. Words fall.", "Listen and tap the word you heard."],
    },
    praise: PRAISE,
    gentle: GENTLE,
    farewell: { es: "¡Buen trabajo, piloto! ¡Hasta luego!", en: "Good work, pilot! See you later!" },
    rounds: [
      // ── Wave 1 · saludos (a0-u01-l1) ──
      {
        word: "hola",
        en: "hello",
        say: "¡Hola! Yo saludo así: ¡hola!",
        caption: "Rico saluda: hola",
        options: ["hola", "adiós", "gracias"],
        wave: 1,
      },
      {
        word: "adiós",
        en: "goodbye",
        say: "Cuando me voy, digo… adiós.",
        caption: "Rico se va: adiós",
        options: ["adiós", "hola", "hasta luego"],
        wave: 1,
      },
      {
        word: "buenos días",
        en: "good morning",
        say: "De mañana digo… buenos días.",
        caption: "De mañana: buenos días",
        options: ["buenos días", "buenas noches", "adiós"],
        wave: 1,
      },
      {
        word: "buenas tardes",
        en: "good afternoon",
        say: "Después de comer digo… buenas tardes.",
        caption: "Después de comer: buenas tardes",
        options: ["buenas tardes", "buenos días", "buenas noches"],
        wave: 1,
      },
      // ── Wave 2 · saludos (a0-u01-l1) ──
      {
        word: "buenas noches",
        en: "good evening / good night",
        say: "En la noche digo… buenas noches.",
        caption: "En la noche: buenas noches",
        options: ["buenas noches", "buenas tardes", "hola"],
        wave: 2,
      },
      {
        word: "hasta luego",
        en: "see you later",
        say: "Nos vemos pronto: ¡hasta luego!",
        caption: "Nos vemos pronto: hasta luego",
        options: ["hasta luego", "adiós", "buenas noches"],
        wave: 2,
      },
      {
        word: "hasta mañana",
        en: "see you tomorrow",
        say: "Vuelvo mañana: ¡hasta mañana!",
        caption: "Vuelvo mañana: hasta mañana",
        options: ["hasta mañana", "hasta luego", "buenas tardes"],
        wave: 2,
      },
      // ── Wave 3 · cortesía (a0-u01-l3) ──
      {
        word: "por favor",
        en: "please",
        say: "Pido con cariño: por favor.",
        caption: "Pido con cariño: por favor",
        options: ["por favor", "gracias", "perdón"],
        wave: 3,
      },
      {
        word: "gracias",
        en: "thank you",
        say: "Mamá recibe un regalo y dice… gracias.",
        caption: "Con un regalo: gracias",
        options: ["gracias", "de nada", "por favor"],
        wave: 3,
      },
      {
        word: "de nada",
        en: "you're welcome",
        say: "—Gracias. —¡De nada!",
        caption: "La respuesta amable: de nada",
        options: ["de nada", "gracias", "lo siento"],
        wave: 3,
      },
      {
        word: "perdón",
        en: "sorry / pardon me",
        say: "Pisó mi pie: ¡perdón!",
        caption: "Cuando me equivoco: perdón",
        options: ["perdón", "gracias", "de nada"],
        wave: 3,
      },
      {
        word: "lo siento",
        en: "I am sorry",
        say: "Si alguien está triste, digo… lo siento.",
        caption: "Cuando algo duele: lo siento",
        options: ["lo siento", "perdón", "de nada"],
        wave: 3,
      },
      // ── Wave 4 · «En el principio» (a0-u01-l8, Génesis 1) ──
      {
        word: "Dios",
        en: "God",
        say: "En el principio creó… Dios… los cielos y la tierra.",
        caption: "Génesis 1: Dios crea",
        missing: "En el principio creó ___ los cielos y la tierra.",
        options: ["Dios", "hombre", "luz"],
        wave: 4,
      },
      {
        word: "principio",
        en: "beginning",
        say: "Todo empieza en el… principio.",
        caption: "Génesis 1: el principio",
        missing: "En el ___ creó Dios los cielos y la tierra.",
        options: ["principio", "día", "noche"],
        wave: 4,
      },
      {
        word: "luz",
        en: "light",
        say: "Y Dios dijo: sea la… luz.",
        caption: "Génesis 1: la primera luz",
        missing: "Y dijo Dios: Sea la ___.",
        options: ["luz", "tinieblas", "tierra"],
        wave: 4,
      },
      {
        word: "tinieblas",
        en: "darkness",
        say: "Antes de la luz había… tinieblas.",
        caption: "Génesis 1: las tinieblas",
        options: ["tinieblas", "luz", "cielo"],
        wave: 4,
      },
      {
        word: "cielo",
        en: "sky; los cielos = the heavens",
        say: "Arriba está el… cielo. ¡Mi jet vuela en el cielo!",
        caption: "Arriba: el cielo",
        options: ["cielo", "tierra", "luz"],
        wave: 4,
      },
      {
        word: "tierra",
        en: "earth, land",
        say: "Dios hizo los cielos y la… tierra.",
        caption: "Génesis 1: la tierra",
        missing: "En el principio creó Dios los cielos y la ___.",
        options: ["tierra", "cielo", "hombre"],
        wave: 4,
      },
      {
        word: "creó",
        en: "he created",
        say: "Dios hizo todo: Dios… creó.",
        caption: "Génesis 1: Dios creó",
        missing: "En el principio ___ Dios los cielos y la tierra.",
        options: ["creó", "vio", "era"],
        wave: 4,
      },
      {
        word: "hombre",
        en: "man, human being",
        say: "Dios creó al… hombre. ¡Tú y yo somos su obra!",
        caption: "Génesis 1: el hombre",
        options: ["hombre", "Dios", "tierra"],
        wave: 4,
      },
      // ── Wave 5 · adaptive replay — built at runtime from progress.misses ──
    ] satisfies ShooterRound[],
  },

  // ─── Ana's home: the scripture balloon-pop (gate NPC villager_ana) ────────
  // (Attribution per CONTENT-gate-dialogue.md: this frame belongs to Ana —
  // two gate NPCs total, no third name.)
  [CASA_FRAME_ID]: {
    id: CASA_FRAME_ID,
    kind: "scripture",
    villager: { name: "Ana", emoji: "🏡" },
    place: "La casa de Ana",
    englishLevel: 0,
    xp: 10,
    voice: "villagerF",
    roundVoice: "scripture",
    greeting: {
      es: "¡Hola, cariño! Soy Ana. Hoy jugamos con la Palabra.",
      en: "Hi, dear! I'm Ana. Today we play with the Word.",
    },
    howto: {
      es: ["Revienta los globos que no van.", "Al final, toca el bueno."],
      en: ["Pop the balloons that are wrong.", "Then tap the right one."],
    },
    praise: PRAISE,
    gentle: GENTLE,
    farewell: {
      es: "¡Dios te bendiga! «En el principio creó Dios los cielos y la tierra.» ¡Hasta mañana!",
      en: "God bless you! “In the beginning God created the heavens and the earth.” See you tomorrow!",
    },
    rounds: [
      {
        word: "tierra",
        en: "earth, land",
        verse: "En el principio creó Dios los cielos y la ___.",
        reference: "Génesis 1:1 (RV1909)",
        say: "«En el principio creó Dios los cielos y la… tierra.»",
        balloons: ["tierra", "casa", "llave", "mañana", "gracias"],
      },
      {
        word: "Dios",
        en: "God",
        verse: "En el principio creó ___ los cielos y la tierra.",
        reference: "Génesis 1:1 (RV1909)",
        say: "«En el principio creó… Dios… los cielos y la tierra.»",
        balloons: ["Dios", "noche", "hombre", "jardín", "padre"],
      },
      {
        word: "cielo",
        label: "cielos",
        en: "sky; los cielos = the heavens",
        verse: "En el principio creó Dios los ___ y la tierra.",
        reference: "Génesis 1:1 (RV1909)",
        say: "«En el principio creó Dios los… cielos… y la tierra.»",
        balloons: ["cielo", "días", "hermanos", "hijos", "tardes"],
      },
    ] satisfies ScriptureRound[],
  },
};

export const frameList: FrameDef[] = Object.values(frames);

/** Frames the hub shows as playable; used for unlock logic and the hub art. */
export const playableFrames = [PLAZA_FRAME_ID, CASA_FRAME_ID];

export function getFrame(id: string): FrameDef | undefined {
  return frames[id];
}

export type GlossMode = "full" | "faded" | "none";

/**
 * Progressive immersion: the learner's level rises as frames are completed.
 * full  — English caption/gloss shown plainly (learner level 0).
 * faded — English available only behind a tap (learner level 1, easy frames).
 * none  — pure Spanish (learner level 2+).
 */
export function glossMode(learnerLevel: number, frame: FrameDef): GlossMode {
  if (learnerLevel >= 2) return "none";
  if (learnerLevel === 0) return "full";
  return frame.englishLevel <= 1 ? "faded" : "none";
}
