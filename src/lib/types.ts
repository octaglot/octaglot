export type Unit = {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  cefr: 'A1' | 'A2' | 'B1';
};

export type Lesson = {
  id: number;
  unit_id: number;
  idx: number;
  word_count: number;
  sentence_count: number;
};

export type Word = {
  id: number;
  en: string;
  tr: string;
  alts: string | null;
  pos: string | null;
  unit_id: number;
  lesson_id: number;
  rank: number | null;
};

export type Sentence = {
  id: number;
  en: string;
  tr: string;
  tokens: string;
  n: number;
  unit_id: number;
  lesson_id: number;
};

/* Alıştırma türleri — Duolingo'nun ders içi çeşitliliğini karşılar. */
export type Exercise =
  | { kind: 'wordBank'; sentence: Sentence; bank: string[]; answer: string[] }
  | { kind: 'typeTr'; sentence: Sentence }
  | { kind: 'choice'; word: Word; options: Word[]; ask: 'en2tr' | 'tr2en' }
  | { kind: 'match'; pairs: Word[] }
  | { kind: 'listen'; sentence: Sentence; bank: string[]; answer: string[] }
  | { kind: 'blank'; sentence: Sentence; missing: string; options: string[] }
  | { kind: 'order'; sentence: Sentence }
  | { kind: 'flashcard'; word: Word };

export type ExerciseKind = Exercise['kind'];

/* Ders kipi. Efsane, bitmiş bir dersin zorlaştırılmış hâli: can yerine üç hata
   hakkı, yalnızca üretim gerektiren alıştırmalar, ünite genelinden sorular. */
export type LessonMode = 'normal' | 'legendary';
