import { getDistractorWords, getLessonSentences, getLessonWords, getWordsByIds } from './db';
import type { Exercise, Sentence, Word } from './types';

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

/** "Don't go!" → ["Don't", 'go!'] — kelime bankası için cümleyi böler. */
export function splitWords(en: string): string[] {
  return en.trim().split(/\s+/);
}

/** Karşılaştırma için noktalama ve büyük/küçük harf farkını yok sayar. */
export function normalize(s: string): string {
  return s
    .toLocaleLowerCase('tr')
    .replace(/[.,!?;:'"’”“()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Kullanıcının Türkçe cevabı kabul edilir mi? Kelimenin alt anlamları da geçerli. */
export function checkTurkish(input: string, word: Word): boolean {
  const given = normalize(input);
  if (!given) return false;
  const accepted = [word.tr, ...(word.alts?.split('|') ?? [])]
    .flatMap((t) => t.split(','))
    .map((t) => normalize(t))
    .filter(Boolean);
  return accepted.some((a) => a === given);
}

/* Kelime bankasındaki çeldiriciler cümlede geçmeyen ama aynı seviyeden
   kelimeler olmalı — rastgele harf yığını değil. */
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
 * Bir dersin alıştırma listesini kurar.
 * Sıralama bilinçli: önce kelime tanıtımı (kart + çoktan seçmeli), sonra
 * tanıma (eşleştirme), en sonda üretim (çeviri, dinleme, sıralama).
 */
export async function buildLesson(lessonId: number, unitId: number, count = 16): Promise<LessonPlan> {
  const [words, sentences] = await Promise.all([getLessonWords(lessonId), getLessonSentences(lessonId)]);
  if (!words.length || !sentences.length) return { exercises: [], words };

  const distractors = await getDistractorWords(unitId, words.map((w) => w.id), 16);
  const tokenPool = [...new Set(sentences.flatMap((s) => splitWords(s.en)))];

  const ex: Exercise[] = [];

  // 1. Yeni kelimeleri tanıt — her biri için bir kart.
  for (const w of shuffle(words).slice(0, 4)) {
    ex.push({ kind: 'flashcard', word: w });
  }

  // 2. Çoktan seçmeli tanıma
  for (const w of shuffle(words).slice(0, 3)) {
    const options = shuffle([w, ...shuffle(distractors).slice(0, 3)]);
    ex.push({ kind: 'choice', word: w, options, ask: Math.random() < 0.5 ? 'en2tr' : 'tr2en' });
  }

  // 3. Eşleştirme — beş çiftlik tek ekran.
  // Bir derse ortalama 4-5 kelime düşüyor; eksik kalırsa aynı üniteden daha
  // önce öğrenilmiş kelimelerle tamamlanıyor (tekrar etkisi de oluyor).
  const matchPairs = [...words];
  for (const d of distractors) {
    if (matchPairs.length >= 5) break;
    if (!matchPairs.some((w) => w.id === d.id)) matchPairs.push(d);
  }
  if (matchPairs.length >= 4) {
    ex.push({ kind: 'match', pairs: shuffle(matchPairs).slice(0, 5) });
  }

  // 4. Cümle çalışmaları
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

  // 5. Boşluk doldurma — cümledeki hedef kelimelerden biri gizlenir.
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

  // 6. Cümle sıralama
  for (const s of shuffle(usable.filter((x) => x.n >= 3)).slice(0, 2)) {
    ex.push({ kind: 'order', sentence: s });
  }

  // Kartlar hep başta kalsın, gerisi karışsın — ders her seferinde farklı olsun.
  const cards = ex.filter((e) => e.kind === 'flashcard');
  const rest = shuffle(ex.filter((e) => e.kind !== 'flashcard'));
  return { exercises: [...cards, ...rest].slice(0, count), words };
}

/** Tekrar dersi: vadesi gelmiş kelimelerden karma alıştırma kurar. */
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

export { pick };
