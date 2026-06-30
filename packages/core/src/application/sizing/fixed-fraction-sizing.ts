import { Decimal } from '../../domain/decimal';
import { invariant } from '../../domain/invariant';
import { Money } from '../../domain/money';
import { Quantity } from '../../domain/quantity';
import type { SizingInput, SizingPolicy } from './sizing-policy';

/**
 * Engage une fraction fixe du cash disponible à chaque achat.
 * qty = floorToStep( (cash·fraction) / (execPrice·(1+feeRate)) ).
 * Renvoie 0 si la quantité résultante est sous le minNotional.
 */
export class FixedFractionSizing implements SizingPolicy {
  private readonly fraction: Decimal;

  constructor(fraction: Decimal.Value = 0.95) {
    this.fraction = new Decimal(fraction);
    invariant(
      this.fraction.gt(0) && this.fraction.lte(1),
      'FixedFractionSizing: fraction doit être dans (0, 1]',
    );
  }

  sizeForBuy({ cash, execPrice, feeRate, spec }: SizingInput): Quantity {
    // Le moteur arrondit le notional (HALF_UP) et les frais (UP) à la précision
    // quote ; le sizing, lui, estime sans arrondi. On retranche une petite marge
    // (2 unités de précision quote) pour que le coût réel ne dépasse jamais le
    // budget, même quand on investit 100 % du cash.
    const margin = new Decimal(10).pow(-spec.quotePrecision).times(2);
    const budget = cash.amount.times(this.fraction).minus(margin);
    if (budget.lte(0)) {
      return Quantity.zero();
    }
    const unitCost = execPrice.amount.times(new Decimal(1).plus(feeRate));
    if (unitCost.lte(0)) {
      return Quantity.zero();
    }

    const rawQty = budget.div(unitCost);
    const qty = Quantity.of(rawQty).floorToStep(spec.stepSize, spec.basePrecision);

    if (qty.isZero()) {
      return Quantity.zero();
    }
    if (execPrice.times(qty).lt(Money.of(spec.minNotional))) {
      return Quantity.zero();
    }
    return qty;
  }
}
