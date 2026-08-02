import { shuffle } from './rand';
import type { Word } from './types';

/* Matching Storm: as many word pairs as possible in 60 seconds.
   Arcade, not a lesson - which is why it costs no hearts. The answers are
   still written back into spaced repetition (see StormScreen), so the mode is
   an accelerator for review rather than a copy of it. */

export const STORM_SECONDS = 60;
export const STORM_SLOTS = 5;
export const STORM_PENALTY = 2; // seconds lost on a wrong answer
export const STORM_XP_RUNS = 3; // rounds per day that award XP
export const STORM_MAX_XP = 40;
export const STORM_COMBO_CAP = 5;

/** Pool order: words that are due come first, each group shuffled internally. */
export function stormPool(words: Word[], dueIds: number[]): Word[] {
  const due = new Set(dueIds);
  return [...shuffle(words.filter((w) => due.has(w.id))), ...shuffle(words.filter((w) => !due.has(w.id)))];
}

/**
 * Draws `n` fresh words from the pool.
 * `onStage` is what is currently on screen, `seen` is what has already come up
 * this round. When the pool runs dry, `seen` is cleared and it wraps around, so
 * a 60-second round never runs out of cards. `seen` is mutated in place on
 * purpose - there should not be a second rule the caller has to remember.
 */
export function stormDraw(pool: Word[], onStage: number[], seen: Set<number>, n: number): Word[] {
  const stage = new Set(onStage);
  const free = () => pool.filter((w) => !stage.has(w.id) && !seen.has(w.id));
  let candidates = free();
  if (candidates.length < n) {
    seen.clear();
    candidates = free();
  }
  return candidates.slice(0, n);
}

/** Score for a correct answer. The combo caps at five so the final score
    does not run away. */
export function stormPoints(combo: number): number {
  return 10 * Math.min(STORM_COMBO_CAP, Math.max(1, combo));
}

/**
 * XP for the round. The day's first `STORM_XP_RUNS` rounds award XP; after
 * that you play for the score. A 60-second mode handing out unlimited XP would
 * make the daily goal (50 XP by default) meaningless; lessons have to stay the
 * main path through the game.
 * `runsToday` is the number of rounds BEFORE this one.
 */
export function stormXp(score: number, runsToday: number): number {
  if (runsToday >= STORM_XP_RUNS) return 0;
  return Math.min(STORM_MAX_XP, Math.floor(score / 25));
}
