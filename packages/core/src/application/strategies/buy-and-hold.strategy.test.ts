import { describe, it, expect } from 'vitest';
import type { Candle } from '../../domain/candle';
import { Price } from '../../domain/price';
import { Quantity } from '../../domain/quantity';
import type { Position } from '../../domain/position';
import type { StrategyContext } from './strategy';
import { BuyAndHoldStrategy } from './buy-and-hold.strategy';

const candle: Candle = { openTime: 0, open: 100, high: 100, low: 100, close: 100, volume: 1 };
const HELD: Position = { symbol: 'BTCUSDT', quantity: Quantity.of('1'), avgEntryPrice: Price.of('100') };

describe('BuyAndHoldStrategy', () => {
  it('achète une fois quand on est à plat', () => {
    const ctx: StrategyContext = { candles: [candle], position: null };
    expect(new BuyAndHoldStrategy().decide(ctx)).toBe('BUY');
  });

  it('ne vend jamais une fois en position', () => {
    const ctx: StrategyContext = { candles: [candle], position: HELD };
    expect(new BuyAndHoldStrategy().decide(ctx)).toBe('HOLD');
  });

  it('minCandles vaut 1', () => {
    expect(new BuyAndHoldStrategy().minCandles).toBe(1);
  });
});
