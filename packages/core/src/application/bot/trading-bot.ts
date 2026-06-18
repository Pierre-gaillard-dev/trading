import { Price } from '../../domain/price';
import type { Candle } from '../../domain/candle';
import type { SymbolSpec } from '../../domain/symbol-spec';
import type { Strategy } from '../strategies/strategy';
import type { SizingPolicy } from '../sizing/sizing-policy';
import type { Portfolio } from '../portfolio/portfolio';
import type { Fill } from '../execution/execution-engine';

/** Gestion du risque au niveau du bot (optionnelle), prioritaire sur la stratégie. */
export interface RiskParams {
  stopLossPct?: number | null;
  takeProfitPct?: number | null;
}

export interface TradingBotConfig {
  symbol: string;
  spec: SymbolSpec;
  strategy: Strategy;
  sizing: SizingPolicy;
  portfolio: Portfolio;
  risk?: RiskParams;
}

/**
 * Le « cerveau » d'un bot (pur, déterministe) : à chaque bougie clôturée, il
 * applique le risque (SL/TP) puis la stratégie, dimensionne via la SizingPolicy
 * et exécute sur le portefeuille. Renvoie le Fill produit, ou null si rien.
 */
export class TradingBot {
  constructor(private readonly config: TradingBotConfig) {}

  /** `candles` = l'historique se terminant par la bougie qui vient de clôturer. */
  onClosedCandle(candles: readonly Candle[]): Fill | null {
    const { symbol, strategy, portfolio } = this.config;
    const last = candles.at(-1);
    if (last === undefined || candles.length < strategy.minCandles) {
      return null;
    }
    const marketPrice = Price.of(last.close);
    const position = portfolio.getPosition(symbol);

    // 1) Risque (SL/TP) prioritaire si on est en position.
    if (position !== null) {
      const entry = position.avgEntryPrice.toNumber();
      const { stopLossPct, takeProfitPct } = this.config.risk ?? {};
      if (typeof stopLossPct === 'number' && last.close <= entry * (1 - stopLossPct)) {
        return this.closePosition(marketPrice);
      }
      if (typeof takeProfitPct === 'number' && last.close >= entry * (1 + takeProfitPct)) {
        return this.closePosition(marketPrice);
      }
    }

    // 2) Stratégie.
    const signal = strategy.decide({ candles, position });
    if (signal === 'BUY' && position === null) {
      return this.openPosition(marketPrice);
    }
    if (signal === 'SELL' && position !== null) {
      return this.closePosition(marketPrice);
    }
    return null;
  }

  private openPosition(marketPrice: Price): Fill | null {
    const { symbol, spec, sizing, portfolio } = this.config;
    const execPrice = marketPrice.withSlippage(portfolio.getSlippageBps(), 'BUY', spec.quotePrecision);
    const quantity = sizing.sizeForBuy({
      cash: portfolio.getCash(),
      execPrice,
      feeRate: portfolio.getFeeRate(),
      spec,
    });
    if (quantity.isZero()) {
      return null;
    }
    const result = portfolio.execute({ symbol, side: 'BUY', quantity, marketPrice, spec });
    return result.status === 'FILLED' ? result : null;
  }

  private closePosition(marketPrice: Price): Fill | null {
    const { symbol, spec, portfolio } = this.config;
    const position = portfolio.getPosition(symbol);
    if (position === null) {
      return null;
    }
    const result = portfolio.execute({
      symbol,
      side: 'SELL',
      quantity: position.quantity,
      marketPrice,
      spec,
    });
    return result.status === 'FILLED' ? result : null;
  }
}
