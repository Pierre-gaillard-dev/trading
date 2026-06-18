import type { DecimalValue } from '../../domain/decimal';
import type { Money } from '../../domain/money';
import type { Price } from '../../domain/price';
import type { Quantity } from '../../domain/quantity';
import type { SymbolSpec } from '../../domain/symbol-spec';

export interface SizingInput {
  /** Cash disponible (quote). */
  readonly cash: Money;
  /** Prix d'exécution estimé (slippage déjà appliqué). */
  readonly execPrice: Price;
  /** Frais proportionnels (ex. 0.001). */
  readonly feeRate: DecimalValue;
  readonly spec: SymbolSpec;
}

/**
 * Port : décide *combien* acheter. La stratégie dit *quoi* (BUY/SELL/HOLD),
 * la SizingPolicy dit *combien* à partir du cash disponible.
 */
export interface SizingPolicy {
  /** Quantité à acheter, déjà arrondie au stepSize, ou 0 si impossible. */
  sizeForBuy(input: SizingInput): Quantity;
}
