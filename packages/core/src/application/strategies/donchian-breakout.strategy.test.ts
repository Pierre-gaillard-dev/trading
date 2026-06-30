import { describe, it, expect } from 'vitest';
import type { Candle } from '../../domain/candle';
import type { StrategyContext } from './strategy';
import { DonchianBreakoutStrategy } from './donchian-breakout.strategy';

function c(high: number, low: number, close: number, i: number): Candle {
  return { openTime: i, open: close, high, low, close, volume: 1 };
}
const ctx = (candles: Candle[]): StrategyContext => ({ candles, position: null });

describe('DonchianBreakoutStrategy', () => {
  // entry 2 / exit 2 → minCandles = 3 ; le canal se calcule sur les bougies PRÉCÉDENTES.
  const s = new DonchianBreakoutStrategy({ entryPeriod: 2, exitPeriod: 2 });

  it('HOLD tant que candles.length < minCandles', () => {
    expect(s.decide(ctx([c(10, 10, 10, 0), c(10, 10, 10, 1)]))).toBe('HOLD');
  });

  it('BUY quand la clôture casse au-dessus du plus haut des N précédentes', () => {
    // prior highs (c1,c2) = 11,12 → upper 12 ; dernière clôture 20 > 12.
    const candles = [c(10, 10, 10, 0), c(11, 11, 11, 1), c(12, 12, 12, 2), c(20, 20, 20, 3)];
    expect(s.decide(ctx(candles))).toBe('BUY');
  });

  it('SELL quand la clôture casse sous le plus bas des N précédentes', () => {
    const candles = [c(10, 10, 10, 0), c(10, 10, 10, 1), c(10, 10, 10, 2), c(5, 5, 5, 3)];
    expect(s.decide(ctx(candles))).toBe('SELL');
  });

  it('HOLD à l’intérieur du canal', () => {
    const candles = [c(10, 10, 10, 0), c(10, 10, 10, 1), c(10, 10, 10, 2), c(10, 10, 10, 3)];
    expect(s.decide(ctx(candles))).toBe('HOLD');
  });

  it('lève sur des périodes invalides', () => {
    expect(() => new DonchianBreakoutStrategy({ entryPeriod: 0 })).toThrow('entryPeriod');
    expect(() => new DonchianBreakoutStrategy({ exitPeriod: 1.5 })).toThrow('exitPeriod');
  });
});
