export type VocabEntry = { es: string; en: string; note?: string };
export type Pair = { es: string; en: string };

export type Exercise =
  | {
      type: "multiple_choice";
      id: string;
      instruction: string;
      prompt: string;
      choices: string[];
      answer: string;
    }
  | {
      type: "translate";
      id: string;
      instruction: string;
      prompt: string;
      answer: string;
      accepted: string[];
    }
  | {
      type: "listen_type";
      id: string;
      instruction: string;
      audioText: string;
      answer: string;
      accepted: string[];
    }
  | {
      type: "order_words";
      id: string;
      instruction: string;
      prompt: string;
      words: string[];
      answer: string;
    }
  | { type: "match_pairs"; id: string; instruction: string; pairs: Pair[] }
  | {
      type: "fill_blank";
      id: string;
      instruction: string;
      sentence: string;
      choices: string[];
      answer: string;
    }
  | {
      type: "speak";
      id: string;
      instruction: string;
      target: string;
      translation: string;
      minScore?: number;
    };

export type Lesson = {
  id: string;
  title: string;
  goal: string;
  xp?: number;
  exercises: Exercise[];
};

export type Unit = {
  unitId: string;
  cefr: string;
  title: string;
  subtitle: string;
  theme: string;
  storyThread: string;
  vocab: VocabEntry[];
  lessons: Lesson[];
  checkpoint: Lesson;
};

export type ExerciseResult =
  | { kind: "value"; correct: boolean; show?: string }
  | { kind: "pairs"; mismatches: number }
  | { kind: "speak"; score: number; transcript: string };
