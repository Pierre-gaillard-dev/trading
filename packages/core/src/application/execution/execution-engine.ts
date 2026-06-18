import { Decimal, type DecimalValue } from '../../domain/decimal';
import { Money } from '../../domain/money';
import { Price } from '../../domain/price';
import { Quantity } from '../../domain/quantity';
import type { OrderSide, RejectReason } from '../../domain/order';
import type { SymbolSpec } from '../../domain/symbol-spec';

export interface ExecutionInput {
  readonly side: OrderSide;
  readonly quantity: Quantity;
  readonly marketPrice: Price;
  /** Cash disponible (quote). */
  readonly cash: Money;
  /** Quantité de base actuellement détenue. */
  readonly positionQty: Quantity;
  readonly spec: SymbolSpec;
  /** Frais proportionnels (ex. 0.001 pour 0,1 %). */
  readonly feeRate: DecimalValue;
  /** Slippage en points de base (ex. 5 pour 0,05 %). */
  readonly slippageBps: number;
}

export interface Fill {
  readonly status: 'FILLED';
  readonly side: OrderSide;
  readonly quantity: Quantity;
  readonly execPrice: Price;
  readonly notional: Money;
  readonly fee: Money;
  readonly cashAfter: Money;
  readonly positionQtyAfter: Quantity;
}

export interface Rejection {
  readonly status: 'REJECTED';
  readonly reason: RejectReason;
}

export type ExecutionResult = Fill | Rejection;

/**
 * Moteur d'exécution simulé. **Sans état** : reçoit l'état courant (cash, position)
 * et renvoie un Fill (avec le nouvel état) ou un rejet motivé. Pur et déterministe
 * (cf. docs/trading-engine.md §2 & §5).
 */
export class ExecutionEngine {
  execute(input: ExecutionInput): ExecutionResult {
    const { side, quantity, marketPrice, cash, positionQty, spec } = input;

    if (!quantity.isPositive()) {
      return { status: 'REJECTED', reason: 'NON_POSITIVE_QUANTITY' };
    }

    const execPrice = marketPrice.withSlippage(input.slippageBps, side, spec.quotePrecision);
    const notional = execPrice.times(quantity).round(spec.quotePrecision, Decimal.ROUND_HALF_UP);

    if (notional.lt(Money.of(spec.minNotional))) {
      return { status: 'REJECTED', reason: 'BELOW_MIN_NOTIONAL' };
    }

    // Frais arrondis vers le haut (l'exchange ne s'arrondit jamais en sa défaveur).
    const fee = notional.times(input.feeRate).round(spec.quotePrecision, Decimal.ROUND_UP);

    if (side === 'BUY') {
      const cost = notional.plus(fee);
      if (cost.gt(cash)) {
        return { status: 'REJECTED', reason: 'INSUFFICIENT_FUNDS' };
      }
      return {
        status: 'FILLED',
        side,
        quantity,
        execPrice,
        notional,
        fee,
        cashAfter: cash.minus(cost),
        positionQtyAfter: positionQty.plus(quantity),
      };
    }

    // SELL
    if (quantity.gt(positionQty)) {
      return { status: 'REJECTED', reason: 'INSUFFICIENT_POSITION' };
    }
    const proceeds = notional.minus(fee);
    return {
      status: 'FILLED',
      side,
      quantity,
      execPrice,
      notional,
      fee,
      cashAfter: cash.plus(proceeds),
      positionQtyAfter: positionQty.minus(quantity),
    };
  }
}
