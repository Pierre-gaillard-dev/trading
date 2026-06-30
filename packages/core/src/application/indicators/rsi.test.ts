import { describe, it, expect } from 'vitest';
import { rsi } from './rsi';

describe('rsi (lissage de Wilder)', () => {
  it('hausse continue → RSI = 100 (aucune perte)', () => {
    expect(rsi([1, 2, 3, 4, 5], 2)).toEqual([null, null, 100, 100, 100]);
  });

  it('baisse continue → RSI = 0 (aucun gain)', () => {
    expect(rsi([5, 4, 3, 2, 1], 2)).toEqual([null, null, 0, 0, 0]);
  });

  it('valeurs connues sur une série mixte', () => {
    // period 2, [10,11,10,11] : @2 gains/pertes 1/1 → RS 1 → 50 ;
    // @3 Wilder avgGain .75 / avgLoss .25 → RS 3 → 75.
    const out = rsi([10, 11, 10, 11], 2);
    expect(out[2]).toBe(50);
    expect(out[3]).toBe(75);
  });

  it('renvoie `null` tant que i < period (et si série ≤ period)', () => {
    expect(rsi([1, 2], 2)).toEqual([null, null]);
  });

  it('lève si period ≤ 1 ou non entier', () => {
    expect(() => rsi([1, 2, 3], 1)).toThrow('period');
    expect(() => rsi([1, 2, 3], 3.3)).toThrow('period');
  });
});
