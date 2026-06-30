import { describe, it, expect } from 'vitest';
import type { Candle } from '../../domain/candle';
import type { StrategyContext } from './strategy';
import { CandleStreakStrategy } from './candle-streak.strategy';

type Dir = 'r' | 'g' | 'f';
function candle(dir: Dir, i: number): Candle {
  const base = 100;
  if (dir === 'r') return { openTime: i, open: base + 1, high: base + 1, low: base, close: base, volume: 1 };
  if (dir === 'g') return { openTime: i, open: base, high: base + 1, low: base, close: base + 1, volume: 1 };
  return { openTime: i, open: base, high: base, low: base, close: base, volume: 1 }; // flat
}
function ctx(dirs: Dir[]): StrategyContext {
  return { candles: dirs.map((d, i) => candle(d, i)), position: null };
}

describe('CandleStreakStrategy', () => {
  const s = new CandleStreakStrategy({ redToBuy: 3, greenToSell: 3 }); // minCandles = 3

  it('renvoie HOLD tant que candles.length < minCandles', () => {
    expect(s.decide(ctx(['r', 'r']))).toBe('HOLD');
  });

  it('BUY après redToBuy bougies rouges consécutives', () => {
    expect(s.decide(ctx(['g', 'r', 'r', 'r']))).toBe('BUY');
  });

  it('HOLD si la série de rouges est trop courte', () => {
    expect(s.decide(ctx(['g', 'g', 'r', 'r']))).toBe('HOLD');
  });

  it('SELL après greenToSell bougies vertes consécutives', () => {
    expect(s.decide(ctx(['r', 'g', 'g', 'g']))).toBe('SELL');
  });

  it('une bougie neutre casse la série', () => {
    expect(s.decide(ctx(['r', 'f', 'r', 'r']))).toBe('HOLD');
  });

  it('une dernière bougie neutre → HOLD', () => {
    expect(s.decide(ctx(['r', 'r', 'r', 'f']))).toBe('HOLD');
  });

  it('lève sur des paramètres invalides', () => {
    expect(() => new CandleStreakStrategy({ redToBuy: 0 })).toThrow('redToBuy');
    expect(() => new CandleStreakStrategy({ greenToSell: 1.5 })).toThrow('greenToSell');
  });
});
