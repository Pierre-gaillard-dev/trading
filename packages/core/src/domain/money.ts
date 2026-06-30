import { Decimal, type DecimalValue } from './decimal';

/**
 * Montant monétaire (devise de cotation, ex. USDT). Immuable, basé sur Decimal.
 * Jamais de `float` pour l'argent : c'est tout l'intérêt de ce value object.
 */
export class Money {
  private constructor(readonly amount: Decimal) {}

  static of(value: DecimalValue | Money): Money {
    return value instanceof Money ? value : new Money(new Decimal(value));
  }

  static zero(): Money {
    return new Money(new Decimal(0));
  }

  plus(other: Money): Money {
    return new Money(this.amount.plus(other.amount));
  }

  minus(other: Money): Money {
    return new Money(this.amount.minus(other.amount));
  }

  times(factor: DecimalValue): Money {
    return new Money(this.amount.times(factor));
  }

  round(decimalPlaces: number, mode: Decimal.Rounding): Money {
    return new Money(this.amount.toDecimalPlaces(decimalPlaces, mode));
  }

  isNegative(): boolean {
    return this.amount.lt(0);
  }

  isZero(): boolean {
    return this.amount.isZero();
  }

  gt(other: Money): boolean {
    return this.amount.gt(other.amount);
  }

  gte(other: Money): boolean {
    return this.amount.gte(other.amount);
  }

  lt(other: Money): boolean {
    return this.amount.lt(other.amount);
  }

  lte(other: Money): boolean {
    return this.amount.lte(other.amount);
  }

  eq(other: Money): boolean {
    return this.amount.eq(other.amount);
  }

  toString(): string {
    return this.amount.toString();
  }

  toNumber(): number {
    return this.amount.toNumber();
  }
}
