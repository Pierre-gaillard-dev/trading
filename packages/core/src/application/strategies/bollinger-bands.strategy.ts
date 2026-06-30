import { invariant } from '../../domain/invariant';
import { bollinger } from '../indicators/bollinger';
import { crossesAbove, crossesBelow } from '../indicators/crossover';
import { lastTwoNumbers } from './support';
import type { Signal, Strategy, StrategyContext } from './strategy';

export type BollingerMode = 'reversion' | 'breakout';

export interface BollingerParams {
  period?: number;
  k?: number;
  mode?: BollingerMode;
}

/**
 * Bandes de Bollinger.
 * - `reversion` (défaut) : BUY au franchissement de la bande basse, SELL de la haute.
 * - `breakout` : signaux inversés (cassure).
 */
export class BollingerBandsStrategy implements Strategy {
  readonly key = 'bollinger_bands';
  readonly minCandles: number;
  private readonly period: number;
  private readonly k: number;
  private readonly mode: BollingerMode;

  constructor(params: BollingerParams = {}) {
    this.period = params.period ?? 20;
    this.k = params.k ?? 2;
    this.mode = params.mode ?? 'reversion';
    invariant(Number.isInteger(this.period) && this.period > 1, 'bollinger: period doit être un entier > 1');
    invariant(this.k > 0, 'bollinger: k doit être > 0');
    this.minCandles = this.period + 1;
  }

  decide(context: StrategyContext): Signal {
    const closes = context.candles.map((candle) => candle.close);
    if (closes.length < this.minCandles) {
      return 'HOLD';
    }
    const { upper, lower } = bollinger(closes, this.period, this.k);
    const close = lastTwoNumbers(closes);
    const up = lastTwoNumbers(upper);
    const low = lastTwoNumbers(lower);
    if (close === null || up === null || low === null) {
      return 'HOLD';
    }
    const touchLow = crossesBelow(close[0], close[1], low[0], low[1]);
    const touchHigh = crossesAbove(close[0], close[1], up[0], up[1]);

    if (this.mode === 'breakout') {
      return touchHigh ? 'BUY' : touchLow ? 'SELL' : 'HOLD';
    }
    return touchLow ? 'BUY' : touchHigh ? 'SELL' : 'HOLD';
  }
}
