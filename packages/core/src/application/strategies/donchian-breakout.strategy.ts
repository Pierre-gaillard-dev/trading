import { invariant } from '../../domain/invariant';
import type { Candle } from '../../domain/candle';
import type { Signal, Strategy, StrategyContext } from './strategy';

export interface DonchianParams {
  entryPeriod?: number;
  exitPeriod?: number;
}

/** Cassure de canal de Donchian : BUY si on clôture au-dessus du plus haut des N précédentes. */
export class DonchianBreakoutStrategy implements Strategy {
  readonly key = 'donchian_breakout';
  readonly minCandles: number;
  private readonly entryPeriod: number;
  private readonly exitPeriod: number;

  constructor(params: DonchianParams = {}) {
    this.entryPeriod = params.entryPeriod ?? 20;
    this.exitPeriod = params.exitPeriod ?? 10;
    invariant(Number.isInteger(this.entryPeriod) && this.entryPeriod > 0, 'donchian: entryPeriod doit être un entier > 0');
    invariant(Number.isInteger(this.exitPeriod) && this.exitPeriod > 0, 'donchian: exitPeriod doit être un entier > 0');
    this.minCandles = Math.max(this.entryPeriod, this.exitPeriod) + 1;
  }

  decide(context: StrategyContext): Signal {
    const candles = context.candles;
    if (candles.length < this.minCandles) {
      return 'HOLD';
    }
    // On exclut la bougie courante : le canal se calcule sur les bougies PRÉCÉDENTES.
    const prior = candles.slice(0, -1);
    const upper = highest(prior.slice(-this.entryPeriod), (c) => c.high);
    const lower = lowest(prior.slice(-this.exitPeriod), (c) => c.low);
    const close = candles[candles.length - 1].close;

    if (close > upper) {
      return 'BUY';
    }
    if (close < lower) {
      return 'SELL';
    }
    return 'HOLD';
  }
}

function highest(candles: readonly Candle[], pick: (candle: Candle) => number): number {
  return candles.reduce((max, candle) => Math.max(max, pick(candle)), -Infinity);
}

function lowest(candles: readonly Candle[], pick: (candle: Candle) => number): number {
  return candles.reduce((min, candle) => Math.min(min, pick(candle)), Infinity);
}
