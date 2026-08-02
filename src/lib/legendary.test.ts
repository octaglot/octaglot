import { describe, it, expect } from 'vitest';
import { LEGENDARY_KINDS } from './legendaryKinds';

describe('LEGENDARY_KINDS', () => {
  it('leaves out the types solvable by recognition', () => {
    for (const banned of ['flashcard', 'choice', 'match', 'wordBank']) {
      expect(LEGENDARY_KINDS).not.toContain(banned);
    }
  });

  it('includes the four types that demand production', () => {
    expect([...LEGENDARY_KINDS].sort()).toEqual(['blank', 'listen', 'order', 'typeTr']);
  });
});
