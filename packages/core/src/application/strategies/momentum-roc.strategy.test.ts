import { describe, it, expect } from 'vitest';
import type { StrategyContext } from './strategy';
import { MomentumRocStrategy } from './momentum-roc.strategy';

function ctx(closes: number[]): StrategyContext {
  return {
    candles: closes.map((c, i) => ({ openTime: i, open: c, high: c, low: c, close: c, volume: 1 })),
    position: null,
  };
}

describe('MomentumRocStrategy', () => {
  const s = new MomentumRocStrategy({ period: 2, buyThreshold: 0, sellThreshold: 0 }); // minCandles = 4

  it('HOLD tant que candles.length < minCandles', () => {
    expect(s.decide(ctx([10, 10, 11]))).toBe('HOLD');
  });

  it('BUY quand le ROC franchit le seuil d’achat à la hausse', () => {
    // ROC@2 passe de −10 à +10 (croise 0 vers le haut).
    expect(s.decide(ctx([10, 10, 9, 11]))).toBe('BUY');
  });

  it('SELL quand le ROC franchit le seuil de vente à la baisse', () => {
    expect(s.decide(ctx([10, 10, 11, 9]))).toBe('SELL');
  });

  it('lève sur des paramètres invalides', () => {
    expect(() => new MomentumRocStrategy({ period: 0 })).toThrow('period');
    expect(() => new MomentumRocStrategy({ buyThreshold: 0, sellThreshold: 5 })).toThrow('sellThreshold');
  });
});
