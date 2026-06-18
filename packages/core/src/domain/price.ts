import { Decimal, type DecimalValue } from './decimal';
import { Money } from './money';
import { Quantity } from './quantity';
import type { OrderSide } from './order';

/** Prix d'un actif (quote par unité de base, ex. USDT/BTC). Immuable. */
export class Price {
  private constructor(readonly amount: Decimal) {}

  static of(value: DecimalValue | Price): Price {
    return value instanceof Price ? value : new Price(new Decimal(value));
  }

  /** Notionnel = prix × quantité (en Money/quote). */
  times(quantity: Quantity): Money {
    return Money.of(this.amount.times(quantity.amount));
  }

  /**
   * Applique le slippage **en défaveur** du trader et arrondit au pas de cotation.
   * BUY → prix majoré, SELL → prix minoré (cf. docs/trading-engine.md §2.1).
   */
  withSlippage(slippageBps: number, side: OrderSide, quotePrecision: number): Price {
    const delta = new Decimal(slippageBps).div(10000);
    const factor = side === 'BUY' ? new Decimal(1).plus(delta) : new Decimal(1).minus(delta);
    return new Price(this.amount.times(factor).toDecimalPlaces(quotePrecision, Decimal.ROUND_HALF_UP));
  }

  gt(other: Price): boolean {
    return this.amount.gt(other.amount);
  }

  gte(other: Price): boolean {
    return this.amount.gte(other.amount);
  }

  lt(other: Price): boolean {
    return this.amount.lt(other.amount);
  }

  lte(other: Price): boolean {
    return this.amount.lte(other.amount);
  }

  eq(other: Price): boolean {
    return this.amount.eq(other.amount);
  }

  toString(): string {
    return this.amount.toString();
  }

  toNumber(): number {
    return this.amount.toNumber();
  }
}
