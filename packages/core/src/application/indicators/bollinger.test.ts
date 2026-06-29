import { describe, it, expect } from 'vitest';
import { bollinger } from './bollinger';

describe('bollinger (middle = SMA, bandes = middle ± k·σ)', () => {
  it('calcule middle / upper / lower sur des valeurs connues', () => {
    // period 2, k 2 sur [2,4,4,4] : middle = SMA2 = [_,3,4,4], σ = [_,1,0,0].
    const b = bollinger([2, 4, 4, 4], 2, 2);
    expect(b.middle).toEqual([null, 3, 4, 4]);
    expect(b.upper).toEqual([null, 5, 4, 4]); // 3 + 2·1 = 5 ; 4 + 0 = 4
    expect(b.lower).toEqual([null, 1, 4, 4]); // 3 − 2·1 = 1
  });

  it('série constante → bandes collées sur la moyenne (σ = 0)', () => {
    const b = bollinger([10, 10, 10], 2, 2);
    expect(b.upper).toEqual([null, 10, 10]);
    expect(b.lower).toEqual([null, 10, 10]);
  });

  it('fenêtre incomplète → null', () => {
    const b = bollinger([1, 2], 3, 2);
    expect(b.middle).toEqual([null, null]);
    expect(b.upper).toEqual([null, null]);
  });
});
