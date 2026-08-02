import type { ExerciseKind } from './types';

/* Its own file: `generate.ts` pulls in the Tauri plugin through `db.ts` and
   will not load under a Node test, so this constant list has to stand apart.

   What sets legendary apart is that it demands production: the word bank,
   multiple choice, matching and flashcards are left out because they can be
   solved by recognition. */
export const LEGENDARY_KINDS: ExerciseKind[] = ['typeTr', 'listen', 'blank', 'order'];
