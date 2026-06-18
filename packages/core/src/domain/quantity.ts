import { Decimal, type DecimalValue } from './decimal';

/** Quantité d'un actif de base (ex. BTC). Immuable, basée sur Decimal. */
export class Quantity {
  private constructor(readonly amount: Decimal) {}

  static of(value: DecimalValue | Quantity): Quantity {
    return value instanceof Quantity ? value : new Quantity(new Decimal(value));
  }

  static zero(): Quantity {
    return new Quantity(new Decimal(0));
  }

  /**
   * Arrondit **vers le bas** au multiple de `stepSize` (lot size), puis tronque à
   * `basePrecision` décimales. Garantit qu'on ne dépasse jamais la quantité visée.
   */
  floorToStep(stepSize: DecimalValue, basePrecision: number): Quantity {
    const step = new Decimal(stepSize);
    if (step.lte(0)) {
      throw new Error('Quantity.floorToStep: stepSize must be > 0');
    }
    const floored = this.amount.div(step).floor().times(step);
    return new Quantity(floored.toDecimalPlaces(basePrecision, Decimal.ROUND_DOWN));
  }

  plus(other: Quantity): Quantity {
    return new Quantity(this.amount.plus(other.amount));
  }

  minus(other: Quantity): Quantity {
    return new Quantity(this.amount.minus(other.amount));
  }

  isZero(): boolean {
    return this.amount.isZero();
  }

  isPositive(): boolean {
    return this.amount.gt(0);
  }

  gt(other: Quantity): boolean {
    return this.amount.gt(other.amount);
  }

  gte(other: Quantity): boolean {
    return this.amount.gte(other.amount);
  }

  lt(other: Quantity): boolean {
    return this.amount.lt(other.amount);
  }

  eq(other: Quantity): boolean {
    return this.amount.eq(other.amount);
  }

  toString(): string {
    return this.amount.toString();
  }

  toNumber(): number {
    return this.amount.toNumber();
  }
}
