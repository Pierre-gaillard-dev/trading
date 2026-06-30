import { invariant } from '../../domain/invariant';
import { roc } from '../indicators/roc';
import { lastTwoNumbers } from './support';
import type { Signal, Strategy, StrategyContext } from './strategy';

export interface MomentumRocParams {
  period?: number;
  buyThreshold?: number;
  sellThreshold?: number;
}

/** Momentum (Rate of Change) : BUY quand le ROC franchit le seuil d'achat à la hausse. */
export class MomentumRocStrategy implements Strategy {
  readonly key = 'momentum_roc';
  readonly minCandles: number;
  private readonly period: number;
  private readonly buyThreshold: number;
  private readonly sellThreshold: number;

  constructor(params: MomentumRocParams = {}) {
    this.period = params.period ?? 12;
    this.buyThreshold = params.buyThreshold ?? 0;
    this.sellThreshold = params.sellThreshold ?? 0;
    invariant(Number.isInteger(this.period) && this.period > 0, 'momentum_roc: period doit être un entier > 0');
    invariant(
      this.sellThreshold <= this.buyThreshold,
      'momentum_roc: sellThreshold doit être <= buyThreshold',
    );
    this.minCandles = this.period + 2;
  }

  decide(context: StrategyContext): Signal {
    const closes = context.candles.map((candle) => candle.close);
    if (closes.length < this.minCandles) {
      return 'HOLD';
    }
    const values = lastTwoNumbers(roc(closes, this.period));
    if (values === null) {
      return 'HOLD';
    }
    const [prev, now] = values;
    if (prev <= this.buyThreshold && now > this.buyThreshold) {
      return 'BUY';
    }
    if (prev >= this.sellThreshold && now < this.sellThreshold) {
      return 'SELL';
    }
    return 'HOLD';
  }
}
