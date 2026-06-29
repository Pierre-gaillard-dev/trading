import { describe, it, expect } from 'vitest';
import type { StrategyContext } from './strategy';
import { MaCrossoverStrategy } from './ma-crossover.strategy';

function ctx(closes: number[]): StrategyContext {
  return {
    candles: closes.map((c, i) => ({ openTime: i, open: c, high: c, low: c, close: c, volume: 1 })),
    position: null,
  };
}

describe('MaCrossoverStrategy', () => {
  // SMA pour des valeurs prévisibles : rapide 2 / lente 3 → minCandles = 4.
  const s = new MaCrossoverStrategy({ maType: 'SMA', fastPeriod: 2, slowPeriod: 3 });

  it('HOLD tant que candles.length < minCandles', () => {
    expect(s.decide(ctx([10, 10, 10]))).toBe('HOLD');
  });

  it('BUY quand la MA rapide croise AU-DESSUS de la lente', () => {
    expect(s.decide(ctx([10, 10, 10, 10, 20]))).toBe('BUY');
  });

  it('SELL quand la MA rapide croise EN-DESSOUS de la lente', () => {
    expect(s.decide(ctx([10, 10, 10, 10, 5]))).toBe('SELL');
  });

  it('HOLD sans croisement (série plate)', () => {
    expect(s.decide(ctx([10, 10, 10, 10, 10]))).toBe('HOLD');
  });

  it('lève sur des périodes invalides', () => {
    expect(() => new MaCrossoverStrategy({ fastPeriod: 0 })).toThrow('fastPeriod');
    expect(() => new MaCrossoverStrategy({ fastPeriod: 5, slowPeriod: 5 })).toThrow('slowPeriod');
  });
});
