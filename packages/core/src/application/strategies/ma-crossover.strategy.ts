import { invariant } from '../../domain/invariant';
import { sma } from '../indicators/sma';
import { ema } from '../indicators/ema';
import { crossesAbove, crossesBelow } from '../indicators/crossover';
import { lastTwoNumbers } from './support';
import type { Signal, Strategy, StrategyContext } from './strategy';

export type MaType = 'SMA' | 'EMA';

export interface MaCrossoverParams {
  maType?: MaType;
  fastPeriod?: number;
  slowPeriod?: number;
}

/** Croisement de moyennes mobiles : BUY quand la courte croise au-dessus de la longue. */
export class MaCrossoverStrategy implements Strategy {
  readonly key = 'ma_crossover';
  readonly minCandles: number;
  private readonly maType: MaType;
  private readonly fastPeriod: number;
  private readonly slowPeriod: number;

  constructor(params: MaCrossoverParams = {}) {
    this.maType = params.maType ?? 'EMA';
    this.fastPeriod = params.fastPeriod ?? 9;
    this.slowPeriod = params.slowPeriod ?? 21;
    invariant(
      Number.isInteger(this.fastPeriod) && this.fastPeriod > 0,
      'ma_crossover: fastPeriod doit être un entier > 0',
    );
    invariant(
      Number.isInteger(this.slowPeriod) && this.slowPeriod > this.fastPeriod,
      'ma_crossover: slowPeriod doit être un entier > fastPeriod',
    );
    this.minCandles = this.slowPeriod + 1;
  }

  decide(context: StrategyContext): Signal {
    const closes = context.candles.map((candle) => candle.close);
    if (closes.length < this.minCandles) {
      return 'HOLD';
    }
    const movingAverage = this.maType === 'SMA' ? sma : ema;
    const fast = lastTwoNumbers(movingAverage(closes, this.fastPeriod));
    const slow = lastTwoNumbers(movingAverage(closes, this.slowPeriod));
    if (fast === null || slow === null) {
      return 'HOLD';
    }
    if (crossesAbove(fast[0], fast[1], slow[0], slow[1])) {
      return 'BUY';
    }
    if (crossesBelow(fast[0], fast[1], slow[0], slow[1])) {
      return 'SELL';
    }
    return 'HOLD';
  }
}
