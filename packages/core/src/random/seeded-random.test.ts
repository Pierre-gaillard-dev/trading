import { describe, it, expect } from 'vitest';
import { SeededRandom } from './seeded-random';

describe('SeededRandom', () => {
  it('même graine → même séquence (reproductible)', () => {
    const a = new SeededRandom(42);
    const b = new SeededRandom(42);
    const seqA = [a.next(), a.next(), a.next()];
    const seqB = [b.next(), b.next(), b.next()];
    expect(seqA).toEqual(seqB);
  });

  it('graines différentes → séquences différentes', () => {
    expect(new SeededRandom(1).next()).not.toBe(new SeededRandom(2).next());
  });

  it('chaque tirage est dans [0, 1)', () => {
    const r = new SeededRandom(123);
    for (let i = 0; i < 100; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('fonctionne avec la graine par défaut', () => {
    expect(typeof new SeededRandom().next()).toBe('number');
  });
});
