import { describe, it, expect } from 'vitest';
import type { Candle } from '../../domain/candle';
import type { StrategyContext } from './strategy';
import { BollingerBandsStrategy } from './bollinger-bands.strategy';

function ctx(closes: number[]): StrategyContext {
  return {
    candles: closes.map((c, i) => ({ openTime: i, open: c, high: c, low: c, close: c, volume: 1 })),
    position: null,
  };
}

describe('BollingerBandsStrategy', () => {
  // period 3 / k 1 → minCandles = 4.
  const reversion = new BollingerBandsStrategy({ period: 3, k: 1, mode: 'reversion' });

  it('HOLD tant que candles.length < minCandles', () => {
    expect(reversion.decide(ctx([100, 101, 100]))).toBe('HOLD');
  });

  it('reversion : BUY quand la clôture franchit sous la bande basse', () => {
    expect(reversion.decide(ctx([100, 101, 100, 101, 99]))).toBe('BUY');
  });

  it('reversion : SELL quand la clôture franchit au-dessus de la bande haute', () => {
    expect(reversion.decide(ctx([100, 99, 100, 99, 101]))).toBe('SELL');
  });

  it('breakout : signaux inversés (BUY sur cassure haute)', () => {
    const breakout = new BollingerBandsStrategy({ period: 3, k: 1, mode: 'breakout' });
    expect(breakout.decide(ctx([100, 99, 100, 99, 101]))).toBe('BUY');
  });

  it('lève sur des paramètres invalides', () => {
    expect(() => new BollingerBandsStrategy({ period: 1 })).toThrow('period');
    expect(() => new BollingerBandsStrategy({ k: 0 })).toThrow('k');
  });
});
