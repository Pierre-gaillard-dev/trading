import { describe, it, expect } from 'vitest';
import { stddev } from './stddev';

describe('stddev (population, ÷ N)', () => {
  it('calcule l’écart-type population sur la fenêtre glissante', () => {
    // period 2 : [2,4] → mean 3, var (1+1)/2 = 1, σ = 1 ; [4,4] → 0.
    expect(stddev([2, 4, 4, 4], 2)).toEqual([null, 1, 0, 0]);
  });

  it('renvoie `null` tant que la fenêtre est incomplète', () => {
    const out = stddev([1, 2, 3], 3);
    expect(out[0]).toBeNull();
    expect(out[1]).toBeNull();
    expect(out[2]).toBeCloseTo(Math.sqrt(((1 - 2) ** 2 + 0 + (3 - 2) ** 2) / 3), 10);
  });

  it('série constante → σ = 0', () => {
    expect(stddev([7, 7, 7], 2)).toEqual([null, 0, 0]);
  });

  it('lève si period ≤ 1 ou non entier', () => {
    expect(() => stddev([1, 2, 3], 1)).toThrow('period');
    expect(() => stddev([1, 2, 3], 2.5)).toThrow('period');
  });
});
