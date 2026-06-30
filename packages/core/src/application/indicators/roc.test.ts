import { describe, it, expect } from 'vitest';
import { roc } from './roc';

describe('roc (rate of change, en %)', () => {
  it('ROC = (close − close_{t-period}) / close_{t-period} × 100', () => {
    // period 1 : @1 = (11-10)/10·100 = 10 ; @2 = (12-11)/11·100 ≈ 9.0909.
    const out = roc([10, 11, 12], 1);
    expect(out[0]).toBeNull();
    expect(out[1]).toBe(10);
    expect(out[2]).toBeCloseTo(9.0909, 4);
  });

  it('gère un rendement négatif', () => {
    expect(roc([100, 90], 1)[1]).toBe(-10);
  });

  it('renvoie `null` si la valeur de référence est 0 (évite ±Infinity)', () => {
    expect(roc([0, 5], 1)[1]).toBeNull();
  });

  it('renvoie `null` tant que i < period', () => {
    expect(roc([1, 2, 3], 2)[1]).toBeNull();
  });

  it('lève si period ≤ 0 ou non entier', () => {
    expect(() => roc([1, 2, 3], 0)).toThrow('period');
    expect(() => roc([1, 2, 3], 1.2)).toThrow('period');
  });
});
