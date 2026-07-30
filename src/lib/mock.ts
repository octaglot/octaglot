/* Tarayıcıda geliştirme desteği.
   Uygulama normalde Tauri penceresinde çalışır ve SQLite'a oradan erişir.
   Sadece tasarımı hızlıca gözden geçirmek için `npm run dev` ile tarayıcıda
   açıldığında Tauri API'leri yoktur; bu dosya o durumda gerçek içerikten
   üretilmiş bir fikstürle aynı sorgu arayüzünü taklit eder.
   Üretim paketinde bu yol hiç çalışmaz. */

import fixture from './fixture.json';
import type { Lesson, Sentence, Unit, Word } from './types';

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const data = fixture as unknown as {
  units: Unit[];
  lessons: Lesson[];
  words: Word[];
  sentences: Sentence[];
};

// Tarayıcıda ilerleme sadece bellekte tutulur.
const memory = {
  profile: {
    name: 'Öğrenci',
    xp: 0,
    gems: 20,
    hearts: 5,
    hearts_refilled_at: null as string | null,
    streak: 0,
    last_active: null as string | null,
    daily_goal: 50,
  },
  progress: [] as { lesson_id: number; best_accuracy: number; times_done: number }[],
  xpToday: 0,
  srs: new Map<number, { strength: number; due: string; lapses: number }>(),
};

export const mockContent = {
  units: () => data.units,
  lessons: () => data.lessons,
  lessonWords: (id: number) => data.words.filter((w) => w.lesson_id === id),
  lessonSentences: (id: number) => data.sentences.filter((s) => s.lesson_id === id).sort((a, b) => a.n - b.n),
  distractors: (unitId: number, exclude: number[], limit: number) =>
    data.words
      .filter((w) => w.unit_id <= unitId && !exclude.includes(w.id))
      .sort(() => Math.random() - 0.5)
      .slice(0, limit),
  byIds: (ids: number[]) => data.words.filter((w) => ids.includes(w.id)),
  byLessons: (lessonIds: number[]) => data.words.filter((w) => lessonIds.includes(w.lesson_id)),
};

export const mockUser = memory;
