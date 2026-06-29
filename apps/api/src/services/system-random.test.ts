import { describe, it, expect } from 'vitest';
import { SystemRandom } from './system-random';

describe('SystemRandom', () => {
  it('implémente le port RandomSource : next() renvoie un nombre dans [0, 1)', () => {
    const random = new SystemRandom();
    for (let i = 0; i < 100; i++) {
      const v = random.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
