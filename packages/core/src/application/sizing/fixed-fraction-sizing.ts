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
    const budget = cash.amount.times(this.fraction);
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
