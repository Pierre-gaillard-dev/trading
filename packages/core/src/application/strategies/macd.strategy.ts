import { invariant } from '../../domain/invariant';
import { macd } from '../indicators/macd';
import { crossesAbove, crossesBelow } from '../indicators/crossover';
import { lastTwoNumbers } from './support';
import type { Signal, Strategy, StrategyContext } from './strategy';

export interface MacdParams {
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  /** Si vrai, n'achète que si la ligne MACD est positive (filtre de tendance). */
  requirePositive?: boolean;
}

/** MACD : BUY quand la ligne MACD croise au-dessus de sa ligne de signal. */
export class MacdStrategy implements Strategy {
  readonly key = 'macd';
  readonly minCandles: number;
  private readonly fastPeriod: number;
  private readonly slowPeriod: number;
  private readonly signalPeriod: number;
  private readonly requirePositive: boolean;

  constructor(params: MacdParams = {}) {
    this.fastPeriod = params.fastPeriod ?? 12;
    this.slowPeriod = params.slowPeriod ?? 26;
    this.signalPeriod = params.signalPeriod ?? 9;
    this.requirePositive = params.requirePositive ?? false;
    invariant(
      Number.isInteger(this.fastPeriod) && this.fastPeriod > 0,
      'macd: fastPeriod doit être un entier > 0',
    );
    invariant(
      Number.isInteger(this.slowPeriod) && this.slowPeriod > this.fastPeriod,
      'macd: slowPeriod doit être un entier > fastPeriod',
    );
    invariant(
      Number.isInteger(this.signalPeriod) && this.signalPeriod > 0,
      'macd: signalPeriod doit être un entier > 0',
    );
    this.minCandles = this.slowPeriod + this.signalPeriod + 1;
  }

  decide(context: StrategyContext): Signal {
    const closes = context.candles.map((candle) => candle.close);
    if (closes.length < this.minCandles) {
      return 'HOLD';
    }
    const { macd: macdLine, signal } = macd(
      closes,
      this.fastPeriod,
      this.slowPeriod,
      this.signalPeriod,
    );
    const line = lastTwoNumbers(macdLine);
    const sig = lastTwoNumbers(signal);
    if (line === null || sig === null) {
      return 'HOLD';
    }
    if (crossesAbove(line[0], line[1], sig[0], sig[1]) && (!this.requirePositive || line[1] > 0)) {
      return 'BUY';
    }
    if (crossesBelow(line[0], line[1], sig[0], sig[1])) {
      return 'SELL';
    }
    return 'HOLD';
  }
}
