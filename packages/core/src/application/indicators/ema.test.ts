import { describe, it, expect } from 'vitest';
import { ema } from './ema';

describe('ema', () => {
  it('seed = SMA des `period` premières valeurs, puis lissage k = 2/(period+1)', () => {
    // period 3, k = 0.5. seed@2 = (1+2+3)/3 = 2 ; @3 = 4·.5 + 2·.5 = 3 ; @4 = 5·.5 + 3·.5 = 4.
    expect(ema([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });

  it('renvoie `null` tant que i < period - 1', () => {
    const out = ema([10, 20, 30, 40], 2);
    expect(out[0]).toBeNull();
    expect(out[1]).toBe(15); // (10+20)/2
  });

  it('série plus courte que period → que des null', () => {
    expect(ema([1, 2], 3)).toEqual([null, null]);
  });

  it('série constante → EMA constante', () => {
    expect(ema([5, 5, 5, 5], 2)).toEqual([null, 5, 5, 5]);
  });

  it('lève si period non entier ou ≤ 0', () => {
    expect(() => ema([1, 2, 3], 0)).toThrow('period');
    expect(() => ema([1, 2, 3], 1.5)).toThrow('period');
  });
});
