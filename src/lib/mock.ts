/* Browser development support.
   The app normally runs inside a Tauri window and reaches SQLite from there.
   When it is opened in a browser with `npm run dev` just to review the design,
   the Tauri APIs are absent; in that case this file mimics the same query
   interface over a fixture generated from the real content.
   This path never runs in a production build. */

import fixture from './fixture.json';
import type { Lesson, Sentence, Unit, Word } from './types';

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const data = fixture as unknown as {
  units: Unit[];
  lessons: Lesson[];
  words: Word[];
  sentences: Sentence[];
};

// In the browser, progress is held in memory only.
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
  unitWords: (unitId: number) => data.words.filter((w) => w.unit_id === unitId),
  unitSentences: (unitId: number) => data.sentences.filter((s) => s.unit_id === unitId).sort((a, b) => a.n - b.n),
};

export const mockUser = memory;
