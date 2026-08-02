import { describe, it, expect } from 'vitest';
import { dailyQuests, nextProgress, questText, isComplete, QUEST_COUNT } from './quests';

describe('dailyQuests', () => {
  it('gives the same quests on the same day', () => {
    expect(dailyQuests('2026-07-30')).toEqual(dailyQuests('2026-07-30'));
  });

  it('generates three quests', () => {
    expect(dailyQuests('2026-07-30')).toHaveLength(QUEST_COUNT);
  });

  it('never picks the same type twice', () => {
    for (const day of ['2026-07-30', '2026-08-01', '2026-12-31', '2027-01-01']) {
      const kinds = dailyQuests(day).map((q) => q.kind);
      expect(new Set(kinds).size).toBe(QUEST_COUNT);
    }
  });

  it('numbers the slots 0, 1 and 2', () => {
    expect(dailyQuests('2026-07-30').map((q) => q.idx)).toEqual([0, 1, 2]);
  });

  it('changes from one day to the next', () => {
    const days = ['2026-07-30', '2026-07-31', '2026-08-01', '2026-08-02', '2026-08-03'];
    const sets = days.map((d) => dailyQuests(d).map((q) => `${q.kind}:${q.target}`).join('|'));
    expect(new Set(sets).size).toBeGreaterThan(1);
  });
});

describe('nextProgress', () => {
  it('xp ve ders toplar', () => {
    expect(nextProgress('xp', 20, 15, 50)).toBe(35);
    expect(nextProgress('lessons', 1, 1, 3)).toBe(2);
  });

  it('keeps the highest value for combo and storm', () => {
    expect(nextProgress('combo', 8, 5, 12)).toBe(8);
    expect(nextProgress('storm', 100, 350, 500)).toBe(350);
  });

  it('never goes past the target', () => {
    expect(nextProgress('xp', 45, 100, 50)).toBe(50);
    expect(nextProgress('storm', 0, 9999, 500)).toBe(500);
  });
});

describe('isComplete', () => {
  it('is complete once the target is reached', () => {
    expect(isComplete({ idx: 0, kind: 'xp', target: 50, progress: 50, claimed: false })).toBe(true);
    expect(isComplete({ idx: 0, kind: 'xp', target: 50, progress: 49, claimed: false })).toBe(false);
  });
});

describe('questText', () => {
  it('hedefi metne koyar', () => {
    expect(questText('xp', 50)).toContain('50');
    expect(questText('lessons', 3)).toContain('3');
  });
});
