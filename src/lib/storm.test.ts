import { describe, it, expect } from 'vitest';
import { stormPool, stormDraw, stormPoints, stormXp, STORM_MAX_XP } from './storm';
import type { Word } from './types';

const word = (id: number): Word => ({
  id,
  en: `w${id}`,
  tr: `k${id}`,
  alts: null,
  pos: null,
  unit_id: 1,
  lesson_id: 1,
  rank: id,
});

describe('stormPool', () => {
  it('puts words that are due first', () => {
    const pool = stormPool([word(1), word(2), word(3), word(4)], [3, 4]);
    expect(pool.slice(0, 2).map((w) => w.id).sort()).toEqual([3, 4]);
  });

  it('drops no word and repeats none', () => {
    const pool = stormPool([word(1), word(2), word(3)], [2]);
    expect(pool.map((w) => w.id).sort()).toEqual([1, 2, 3]);
  });

  it('returns empty for empty input', () => {
    expect(stormPool([], [])).toEqual([]);
  });
});

describe('stormDraw', () => {
  it('skips words on stage and already seen', () => {
    const pool = [word(1), word(2), word(3), word(4)];
    const drawn = stormDraw(pool, [1], new Set([2]), 2);
    expect(drawn.map((w) => w.id)).toEqual([3, 4]);
  });

  it('clears seen and wraps around when the pool runs dry', () => {
    const pool = [word(1), word(2), word(3)];
    const seen = new Set([1, 2, 3]);
    const drawn = stormDraw(pool, [], seen, 2);
    expect(drawn).toHaveLength(2);
    expect(seen.size).toBe(0);
  });

  it('returns fewer when the pool has fewer left after those on stage', () => {
    const pool = [word(1), word(2)];
    expect(stormDraw(pool, [1, 2], new Set(), 3)).toEqual([]);
  });
});

describe('stormPoints', () => {
  it('scores 10 for the first correct answer', () => {
    expect(stormPoints(1)).toBe(10);
  });

  it('caps the combo at five', () => {
    expect(stormPoints(5)).toBe(50);
    expect(stormPoints(9)).toBe(50);
  });
});

describe('stormXp', () => {
  it('awards a twenty-fifth of the score', () => {
    expect(stormXp(250, 0)).toBe(10);
  });

  it('does not exceed the cap', () => {
    expect(stormXp(100000, 0)).toBe(STORM_MAX_XP);
  });

  it('awards no XP after the third round of the day', () => {
    expect(stormXp(500, 3)).toBe(0);
    expect(stormXp(500, 2)).toBeGreaterThan(0);
  });
});
