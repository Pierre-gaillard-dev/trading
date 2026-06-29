import { describe, it, expect } from 'vitest';
import type { Candle } from '../../domain/candle';
import type { StrategyContext } from './strategy';
import { RsiStrategy } from './rsi.strategy';

function ctx(closes: number[]): StrategyContext {
  return {
    candles: closes.map((c, i) => ({ openTime: i, open: c, high: c, low: c, close: c, volume: 1 })),
    position: null,
  };
}

describe('RsiStrategy', () => {
  const s = new RsiStrategy({ period: 2, oversold: 30, overbought: 70 }); // minCandles = 3

  it('HOLD tant que candles.length < minCandles', () => {
    expect(s.decide(ctx([10, 20]))).toBe('HOLD');
  });

  it('BUY au franchissement SOUS le seuil de survente', () => {
    // chute brutale en fin de série → RSI passe sous 30.
    expect(s.decide(ctx([10, 20, 30, 1]))).toBe('BUY');
  });

  it('SELL au franchissement AU-DESSUS du seuil de surachat', () => {
    // forte reprise → RSI passe au-dessus de 70.
    expect(s.decide(ctx([30, 1, 2, 40]))).toBe('SELL');
  });

  it('HOLD sans franchissement de seuil', () => {
    // RSI reste à 100 (hausse puis plat) : aucun franchissement de 30 ni 70 entre les 2 derniers points.
    expect(s.decide(ctx([10, 11, 11, 11]))).toBe('HOLD');
  });

  it('lève sur des paramètres invalides', () => {
    expect(() => new RsiStrategy({ period: 1 })).toThrow('period');
    expect(() => new RsiStrategy({ oversold: 70, overbought: 30 })).toThrow('oversold');
  });
});
