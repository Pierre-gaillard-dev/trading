import { describe, it, expect } from 'vitest';
import { SeededRandom } from '../../random/seeded-random';
import { createStrategy, createEnsemble, STRATEGY_KEYS } from './index';

describe('registre des stratégies', () => {
  it('createStrategy fabrique chaque clé connue avec ses paramètres par défaut', () => {
    for (const key of STRATEGY_KEYS) {
      expect(createStrategy(key).key).toBe(key);
    }
  });

  it('createStrategy transmet les paramètres (lève si invalides)', () => {
    expect(() => createStrategy('rsi', { period: 1 })).toThrow();
  });

  describe('createEnsemble', () => {
    const random = () => new SeededRandom(1);

    it('construit un ensemble pondéré à partir de clés', () => {
      const e = createEnsemble([{ key: 'ma_crossover', weight: 1 }], random());
      expect(e.key).toBe('ensemble');
    });

    it('minCandles = max des membres', () => {
      const e = createEnsemble(
        [
          { key: 'ma_crossover', weight: 1, params: { slowPeriod: 50, fastPeriod: 10 } },
          { key: 'rsi', weight: 1, params: { period: 14 } },
        ],
        random(),
      );
      expect(e.minCandles).toBe(51); // ma_crossover slow 50 + 1
    });

    it('accepte le drapeau invert (inversion de la décision finale)', () => {
      const e = createEnsemble([{ key: 'rsi', weight: 1 }], random(), true);
      expect(e.key).toBe('ensemble');
    });
  });
});
