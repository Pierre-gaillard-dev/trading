import { invariant } from '../../domain/invariant';
import { rsi } from '../indicators/rsi';
import { lastTwoNumbers } from './support';
import type { Signal, Strategy, StrategyContext } from './strategy';

export interface RsiParams {
  period?: number;
  oversold?: number;
  overbought?: number;
}

/** RSI : BUY au franchissement sous le seuil de survente, SELL au-dessus du surachat. */
export class RsiStrategy implements Strategy {
  readonly key = 'rsi';
  readonly minCandles: number;
  private readonly period: number;
  private readonly oversold: number;
  private readonly overbought: number;

  constructor(params: RsiParams = {}) {
    this.period = params.period ?? 14;
    this.oversold = params.oversold ?? 30;
    this.overbought = params.overbought ?? 70;
    invariant(
      Number.isInteger(this.period) && this.period > 1,
      'rsi: period doit être un entier > 1',
    );
    invariant(
      0 < this.oversold && this.oversold < this.overbought && this.overbought < 100,
      'rsi: il faut 0 < oversold < overbought < 100',
    );
    this.minCandles = this.period + 1;
  }

  decide(context: StrategyContext): Signal {
    const closes = context.candles.map((candle) => candle.close);
    if (closes.length < this.minCandles) {
      return 'HOLD';
    }
    const values = lastTwoNumbers(rsi(closes, this.period));
    if (values === null) {
      return 'HOLD';
    }
    const [prev, now] = values;
    if (prev >= this.oversold && now < this.oversold) {
      return 'BUY';
    }
    if (prev <= this.overbought && now > this.overbought) {
      return 'SELL';
    }
    return 'HOLD';
  }
}
