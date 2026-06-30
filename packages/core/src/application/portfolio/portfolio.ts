import { type DecimalValue } from '../../domain/decimal';
import { Money } from '../../domain/money';
import { Price } from '../../domain/price';
import { Quantity } from '../../domain/quantity';
import type { OrderSide } from '../../domain/order';
import type { Position } from '../../domain/position';
import type { SymbolSpec } from '../../domain/symbol-spec';
import { ExecutionEngine, type ExecutionResult, type Fill } from '../execution/execution-engine';

export interface SeedPosition {
  symbol: string;
  quantity: DecimalValue;
  avgEntryPrice: DecimalValue;
}

export interface PortfolioConfig {
  /** Cash initial — l'argent (fictif) que tu mets dans le portefeuille. */
  cash: Money | DecimalValue;
  /** Frais proportionnels par trade (défaut 0.001 = 0,1 %). */
  feeRate?: DecimalValue;
  /** Slippage en points de base (défaut 5 = 0,05 %). */
  slippageBps?: number;
  /** Positions de départ (ex. pour reconstruire un portefeuille existant). */
  positions?: SeedPosition[];
}

export interface ExecuteOrderInput {
  symbol: string;
  side: OrderSide;
  quantity: Quantity;
  marketPrice: Price;
  spec: SymbolSpec;
}

/**
 * Portefeuille fictif : détient le cash et les positions, et exécute les ordres
 * via l'ExecutionEngine (frais + slippage). Sert de source de vérité au bot pour
 * savoir combien il peut engager (`getCash`).
 */
export class Portfolio {
  private readonly initialCash: Money;
  private readonly feeRate: DecimalValue;
  private readonly slippageBps: number;
  private readonly positions = new Map<string, Position>();
  private readonly engine = new ExecutionEngine();
  private cash: Money;

  constructor(config: PortfolioConfig) {
    this.initialCash = Money.of(config.cash);
    this.cash = this.initialCash;
    this.feeRate = config.feeRate ?? 0.001;
    this.slippageBps = config.slippageBps ?? 5;
    for (const seed of config.positions ?? []) {
      this.positions.set(seed.symbol, {
        symbol: seed.symbol,
        quantity: Quantity.of(seed.quantity),
        avgEntryPrice: Price.of(seed.avgEntryPrice),
      });
    }
  }

  getCash(): Money {
    return this.cash;
  }

  getInitialCash(): Money {
    return this.initialCash;
  }

  getFeeRate(): DecimalValue {
    return this.feeRate;
  }

  getSlippageBps(): number {
    return this.slippageBps;
  }

  getPosition(symbol: string): Position | null {
    return this.positions.get(symbol) ?? null;
  }

  getPositions(): Position[] {
    return [...this.positions.values()];
  }

  /** Exécute un ordre marché ; applique le résultat au portefeuille s'il est rempli. */
  execute(input: ExecuteOrderInput): ExecutionResult {
    const current = this.positions.get(input.symbol) ?? null;
    const result = this.engine.execute({
      side: input.side,
      quantity: input.quantity,
      marketPrice: input.marketPrice,
      cash: this.cash,
      positionQty: current?.quantity ?? Quantity.zero(),
      spec: input.spec,
      feeRate: this.feeRate,
      slippageBps: this.slippageBps,
    });
    if (result.status === 'FILLED') {
      this.applyFill(input.symbol, current, result);
    }
    return result;
  }

  /** Valeur totale (mark-to-market) = cash + Σ(quantité × prix courant). */
  equity(priceBySymbol: Map<string, Price>): Money {
    let total = this.cash;
    for (const position of this.positions.values()) {
      const price = priceBySymbol.get(position.symbol) ?? position.avgEntryPrice;
      total = total.plus(price.times(position.quantity));
    }
    return total;
  }

  /** PnL latent = Σ quantité × (prix courant − prix d'entrée moyen). */
  unrealizedPnl(priceBySymbol: Map<string, Price>): Money {
    let pnl = Money.zero();
    for (const position of this.positions.values()) {
      const price = priceBySymbol.get(position.symbol) ?? position.avgEntryPrice;
      const diff = price.amount.minus(position.avgEntryPrice.amount);
      pnl = pnl.plus(Money.of(diff.times(position.quantity.amount)));
    }
    return pnl;
  }

  /** PnL total = equity courante − cash initial. */
  totalPnl(priceBySymbol: Map<string, Price>): Money {
    return this.equity(priceBySymbol).minus(this.initialCash);
  }

  private applyFill(symbol: string, current: Position | null, fill: Fill): void {
    this.cash = fill.cashAfter;
    if (fill.positionQtyAfter.isZero()) {
      this.positions.delete(symbol);
      return;
    }
    this.positions.set(symbol, {
      symbol,
      quantity: fill.positionQtyAfter,
      avgEntryPrice: this.nextAvgEntryPrice(current, fill),
    });
  }

  private nextAvgEntryPrice(current: Position | null, fill: Fill): Price {
    // Une vente ne modifie pas le prix d'entrée moyen (v1 : pas de short).
    if (fill.side === 'SELL') {
      return current?.avgEntryPrice ?? fill.execPrice;
    }
    // Premier achat : le prix d'entrée = prix d'exécution.
    if (current === null) {
      return fill.execPrice;
    }
    // Achat additionnel (pyramidage) : moyenne pondérée par les quantités.
    const total = current.quantity.amount.plus(fill.quantity.amount);
    const weighted = current.quantity.amount
      .times(current.avgEntryPrice.amount)
      .plus(fill.quantity.amount.times(fill.execPrice.amount))
      .div(total);
    return Price.of(weighted);
  }
}
