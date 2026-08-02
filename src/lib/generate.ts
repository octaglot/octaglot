import {
  getDistractorWords,
  getLessonSentences,
  getLessonWords,
  getUnitSentences,
  getUnitWords,
  getWordsByIds,
} from './db';
import { LEGENDARY_KINDS } from './legendaryKinds';
import { shuffle, pick } from './rand';
import type { Exercise, Sentence, Word } from './types';

/* Randomness moved to `rand.ts`; it is re-exported here because Exercises.tsx
   imports `shuffle` from this file. */
export { shuffle, pick };

/** "Don't go!" -> ["Don't", 'go!'] - splits a sentence for the word bank. */
export function splitWords(en: string): string[] {
  return en.trim().split(/\s+/);
}

/** Drops punctuation and case differences so answers can be compared. */
export function normalize(s: string): string {
  return s
    .toLocaleLowerCase('tr')
    .replace(/[.,!?;:'"’”“()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Is the user's Turkish answer acceptable? Secondary senses count too. */
export function checkTurkish(input: string, word: Word): boolean {
  const given = normalize(input);
  if (!given) return false;
  const accepted = [word.tr, ...(word.alts?.split('|') ?? [])]
    .flatMap((t) => t.split(','))
    .map((t) => normalize(t))
    .filter(Boolean);
  return accepted.some((a) => a === given);
}

/* Distractors in the word bank must be words of the same level that do not
   appear in the sentence - not a random pile of letters. */
function bankFor(sentence: Sentence, pool: string[]): string[] {
  const answer = splitWords(sentence.en);
  const lower = new Set(answer.map((w) => normalize(w)));
  const extras = shuffle(pool.filter((w) => !lower.has(normalize(w)))).slice(0, Math.min(4, Math.max(2, 8 - answer.length)));
  return shuffle([...answer, ...extras]);
}

export type LessonPlan = {
  exercises: Exercise[];
  words: Word[];
};

/**
 * Builds the exercise list for one lesson.
 * The order is deliberate: first introduce the words (flashcard + multiple
 * choice), then recognition (matching), and production last (translation,
 * listening, ordering).
 */
export async function buildLesson(lessonId: number, unitId: number, count = 16): Promise<LessonPlan> {
  const [words, sentences] = await Promise.all([getLessonWords(lessonId), getLessonSentences(lessonId)]);
  if (!words.length || !sentences.length) return { exercises: [], words };

  const distractors = await getDistractorWords(unitId, words.map((w) => w.id), 16);
  const tokenPool = [...new Set(sentences.flatMap((s) => splitWords(s.en)))];

  const ex: Exercise[] = [];

  // 1. Introduce the new words - one card each.
  for (const w of shuffle(words).slice(0, 4)) {
    ex.push({ kind: 'flashcard', word: w });
  }

  // 2. Multiple choice recognition
  for (const w of shuffle(words).slice(0, 3)) {
    const options = shuffle([w, ...shuffle(distractors).slice(0, 3)]);
    ex.push({ kind: 'choice', word: w, options, ask: Math.random() < 0.5 ? 'en2tr' : 'tr2en' });
  }

  // 3. Matching - a single screen of five pairs.
  // A lesson averages 4-5 words; if that falls short, the set is filled with
  // words already learned from the same unit (which doubles as review).
  const matchPairs = [...words];
  for (const d of distractors) {
    if (matchPairs.length >= 5) break;
    if (!matchPairs.some((w) => w.id === d.id)) matchPairs.push(d);
  }
  if (matchPairs.length >= 4) {
    ex.push({ kind: 'match', pairs: shuffle(matchPairs).slice(0, 5) });
  }

  // 4. Sentence work
  const shortSentences = sentences.filter((s) => s.n >= 2 && s.n <= 7);
  const usable = shortSentences.length >= 6 ? shortSentences : sentences;

  for (const s of shuffle(usable).slice(0, 4)) {
    ex.push({ kind: 'wordBank', sentence: s, bank: bankFor(s, tokenPool), answer: splitWords(s.en) });
  }

  for (const s of shuffle(usable).slice(0, 2)) {
    ex.push({ kind: 'typeTr', sentence: s });
  }

  for (const s of shuffle(usable).slice(0, 2)) {
    ex.push({ kind: 'listen', sentence: s, bank: bankFor(s, tokenPool), answer: splitWords(s.en) });
  }

  // 5. Fill in the blank - one of the target words is hidden.
  const lessonForms = new Set(words.map((w) => w.en));
  for (const s of shuffle(usable)) {
    const tokens = splitWords(s.en);
    const idx = tokens.findIndex((t) => lessonForms.has(normalize(t)));
    if (idx === -1) continue;
    const missing = tokens[idx];
    const wrong = shuffle(tokenPool.filter((t) => normalize(t) !== normalize(missing))).slice(0, 3);
    ex.push({ kind: 'blank', sentence: s, missing, options: shuffle([missing, ...wrong]) });
    if (ex.filter((e) => e.kind === 'blank').length >= 2) break;
  }

  // 6. Sentence ordering
  for (const s of shuffle(usable.filter((x) => x.n >= 3)).slice(0, 2)) {
    ex.push({ kind: 'order', sentence: s });
  }

  // Keep the cards up front and shuffle the rest, so the lesson differs each run.
  const cards = ex.filter((e) => e.kind === 'flashcard');
  const rest = shuffle(ex.filter((e) => e.kind !== 'flashcard'));
  return { exercises: [...cards, ...rest].slice(0, count), words };
}

/** Review lesson: builds a mixed exercise set from words that are due. */
export async function buildReview(wordIds: number[], count = 12): Promise<LessonPlan> {
  const words = await getWordsByIds(wordIds);
  if (words.length < 4) return { exercises: [], words };

  const unitId = Math.max(...words.map((w) => w.unit_id));
  const distractors = await getDistractorWords(unitId, words.map((w) => w.id), 16);

  const ex: Exercise[] = [];
  for (const w of shuffle(words)) {
    const options = shuffle([w, ...shuffle(distractors).slice(0, 3)]);
    ex.push({ kind: 'choice', word: w, options, ask: Math.random() < 0.5 ? 'en2tr' : 'tr2en' });
  }
  if (words.length >= 5) ex.push({ kind: 'match', pairs: shuffle(words).slice(0, 5) });

  return { exercises: shuffle(ex).slice(0, count), words };
}

/**
 * Legendary round: production-only exercises drawn from the whole unit.
 * It stands apart from `buildLesson` because its pool is the unit rather than
 * a lesson, and its order is not "introduce then test" - legendary has no
 * introduction stage.
 */
export async function buildLegendary(unitId: number, count = 16): Promise<LessonPlan> {
  const [words, sentences] = await Promise.all([getUnitWords(unitId), getUnitSentences(unitId)]);
  if (!words.length || !sentences.length) return { exercises: [], words };

  const tokenPool = [...new Set(sentences.flatMap((s) => splitWords(s.en)))];
  const usable = sentences.filter((s) => s.n >= 2 && s.n <= 9);
  const pool = usable.length >= 8 ? usable : sentences;

  const ex: Exercise[] = [];

  for (const s of shuffle(pool).slice(0, 6)) {
    ex.push({ kind: 'typeTr', sentence: s });
  }

  for (const s of shuffle(pool).slice(0, 4)) {
    ex.push({ kind: 'listen', sentence: s, bank: bankFor(s, tokenPool), answer: splitWords(s.en) });
  }

  for (const s of shuffle(pool.filter((x) => x.n >= 3)).slice(0, 3)) {
    ex.push({ kind: 'order', sentence: s });
  }

  const forms = new Set(words.map((w) => w.en));
  for (const s of shuffle(pool)) {
    const tokens = splitWords(s.en);
    const idx = tokens.findIndex((t) => forms.has(normalize(t)));
    if (idx === -1) continue;
    const missing = tokens[idx];
    const wrong = shuffle(tokenPool.filter((t) => normalize(t) !== normalize(missing))).slice(0, 3);
    ex.push({ kind: 'blank', sentence: s, missing, options: shuffle([missing, ...wrong]) });
    if (ex.filter((e) => e.kind === 'blank').length >= 3) break;
  }

  // Safety net: any type that is not allowed gets filtered out here.
  const allowed = new Set<string>(LEGENDARY_KINDS);
  return { exercises: shuffle(ex.filter((e) => allowed.has(e.kind))).slice(0, count), words };
}
