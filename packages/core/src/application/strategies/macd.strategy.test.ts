import { describe, it, expect } from 'vitest';
import type { StrategyContext } from './strategy';
import { MacdStrategy } from './macd.strategy';

function ctx(closes: number[]): StrategyContext {
  return {
    candles: closes.map((c, i) => ({ openTime: i, open: c, high: c, low: c, close: c, volume: 1 })),
    position: null,
  };
}

describe('MacdStrategy', () => {
  // fast 2 / slow 3 / signal 2 → minCandles = 3 + 2 + 1 = 6.
  const s = new MacdStrategy({ fastPeriod: 2, slowPeriod: 3, signalPeriod: 2 });

  it('HOLD tant que candles.length < minCandles', () => {
    expect(s.decide(ctx([10, 9, 8, 7, 6]))).toBe('HOLD');
  });

  it('série plate → HOLD (ligne et signal nuls, pas de croisement)', () => {
    expect(s.decide(ctx([10, 10, 10, 10, 10, 10]))).toBe('HOLD');
  });

  it('BUY quand la ligne MACD croise au-dessus du signal (reprise)', () => {
    expect(s.decide(ctx([10, 9, 8, 7, 6, 5, 6]))).toBe('BUY');
  });

  it('SELL quand la ligne MACD croise sous le signal (retournement)', () => {
    expect(s.decide(ctx([5, 6, 7, 8, 9, 10, 9]))).toBe('SELL');
  });

  it('requirePositive bloque l’achat si la ligne MACD est négative', () => {
    // Même reprise, mais la ligne MACD est encore < 0 au croisement → pas d'achat.
    const filtered = new MacdStrategy({ fastPeriod: 2, slowPeriod: 3, signalPeriod: 2, requirePositive: true });
    expect(filtered.decide(ctx([10, 9, 8, 7, 6, 5, 6]))).toBe('HOLD');
  });

  it('lève sur des périodes invalides', () => {
    expect(() => new MacdStrategy({ fastPeriod: 26, slowPeriod: 12 })).toThrow('slowPeriod');
    expect(() => new MacdStrategy({ signalPeriod: 0 })).toThrow('signalPeriod');
  });
});
