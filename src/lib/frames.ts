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
};

export type ScriptureRound = {
  word: string;
  en: string;
  /** RV1909 text with a ___ gap; the gap is what the balloons fill. */
  verse: string;
  reference: string;
  say: string;
  /** Balloons: the answer first, wrong words after — engine shuffles. */
  balloons: string[];
};

export type FrameKind = "shooter" | "scripture";

export type FrameDef = {
  id: string;
  kind: FrameKind;
  /** The villager who opens this frame in the village. */
  villager: { name: string; emoji: string };
  place: string;
  englishLevel: 0 | 1 | 2 | 3;
  xp: number;
  /** Spoken when the villager opens the frame. */
  greeting: { es: string; en: string };
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
  // ─── Plaza: Capitán Rico's jet word-shooter ───────────────────────────────
  [PLAZA_FRAME_ID]: {
    id: PLAZA_FRAME_ID,
    kind: "shooter",
    villager: { name: "Capitán Rico", emoji: "✈️" },
    place: "La plaza",
    englishLevel: 0,
    xp: 10,
    greeting: {
      es: "¡Hola! Soy el Capitán Rico. Mi jet dispara palabras del cielo. ¡Escucha y toca la palabra buena!",
      en: "Hi! I'm Captain Rico. My jet shoots words from the sky. Listen and tap the right word!",
    },
    praise: PRAISE,
    gentle: GENTLE,
    farewell: { es: "¡Buen trabajo, piloto! ¡Hasta luego!", en: "Good work, pilot! See you later!" },
    rounds: [
      {
        word: "hola",
        en: "hello",
        say: "¡Hola! La palabra es… hola.",
        caption: "La palabra es… hola.",
        options: ["hola", "adiós", "gracias", "luz"],
      },
      {
        word: "gracias",
        en: "thank you",
        say: "Mamá dice… gracias, cuando recibe un regalo.",
        caption: "Mamá dice… gracias.",
        options: ["gracias", "hola", "noche", "padre"],
      },
      {
        word: "madre",
        en: "mother",
        say: "La madre de Ana cocina. La palabra es… madre.",
        caption: "La palabra es… madre.",
        options: ["madre", "padre", "hola", "tierra"],
      },
      {
        word: "cielo",
        en: "sky; los cielos = the heavens",
        say: "Mira arriba: el cielo. ¡Mi jet vuela en el cielo!",
        caption: "Mi jet vuela en el cielo.",
        options: ["cielo", "tierra", "día", "hola"],
      },
      {
        word: "Dios",
        en: "God",
        say: "En el principio creó ___ los cielos y la tierra. ¿Quién creó? ¡Dios!",
        caption: "En el principio creó ___ los cielos y la tierra.",
        missing: "En el principio creó ___ los cielos y la tierra.",
        options: ["Dios", "hola", "jardín", "noche"],
      },
      {
        word: "tierra",
        en: "earth, land",
        say: "Dios hizo los cielos y la ___… ¡la tierra!",
        caption: "Dios hizo los cielos y la ___.",
        missing: "En el principio creó Dios los cielos y la ___.",
        options: ["tierra", "luz", "gracias", "padre"],
      },
    ] satisfies ShooterRound[],
  },

  // ─── Family home: Doña Rosa's scripture balloon-pop ───────────────────────
  [CASA_FRAME_ID]: {
    id: CASA_FRAME_ID,
    kind: "scripture",
    villager: { name: "Doña Rosa", emoji: "🏡" },
    place: "La casa de la familia",
    englishLevel: 0,
    xp: 10,
    greeting: {
      es: "¡Hola, cariño! Soy Doña Rosa. Hoy hablamos de la Palabra: «En el principio creó Dios los cielos y la tierra». Revienta los globos que no van, y guarda el bueno.",
      en: "Hello, dear! I'm Doña Rosa. Today we talk about the Word: “In the beginning God created the heavens and the earth.” Pop the balloons that don't belong, and keep the right one.",
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
        word: "cielos",
        en: "sky; los cielos = the heavens",
        verse: "En el principio creó Dios los ___ y la tierra.",
        reference: "Génesis 1:1 (RV1909)",
        say: "«En el principio creó Dios los… cielos… y la tierra.»",
        balloons: ["cielos", "días", "hermanos", "hijos", "tardes"],
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
