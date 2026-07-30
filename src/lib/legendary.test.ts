import { describe, it, expect } from 'vitest';
import { LEGENDARY_KINDS } from './legendaryKinds';

describe('LEGENDARY_KINDS', () => {
  it('tanımayla çözülen tipleri dışarıda bırakır', () => {
    for (const banned of ['flashcard', 'choice', 'match', 'wordBank']) {
      expect(LEGENDARY_KINDS).not.toContain(banned);
    }
  });

  it('üretim gerektiren dört tipi içerir', () => {
    expect([...LEGENDARY_KINDS].sort()).toEqual(['blank', 'listen', 'order', 'typeTr']);
  });
});
