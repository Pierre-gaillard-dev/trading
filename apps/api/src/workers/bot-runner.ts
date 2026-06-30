import type { Portfolio, TradingBot, Candle as CoreCandle } from '@trading/core';
import type { Candle as MarketCandle } from '@trading/shared';
import type { PortfolioRepository } from '../repositories/portfolio.repository';
import type { Worker } from './worker';

export interface BotRunnerDeps {
  id: string;
  portfolioId: string;
  symbol: string;
  interval: string;
  strategyKey: string;
  portfolio: Portfolio;
  bot: TradingBot;
  portfolios: PortfolioRepository;
}

function toCore(candle: MarketCandle): CoreCandle {
  return {
    openTime: candle.time * 1000,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  };
}

/**
 * Fait tourner un TradingBot (core) comme un Worker : à chaque bougie clôturée,
 * il décide/exécute en mémoire, puis **persiste** le nouvel état (cash, position, trade).
 */
export class BotRunner implements Worker {
  readonly id: string;
  readonly symbol: string;
  readonly interval: string;

  constructor(private readonly deps: BotRunnerDeps) {
    this.id = deps.id;
    this.symbol = deps.symbol;
    this.interval = deps.interval;
  }

  async onClosedCandle(candle: MarketCandle, history: MarketCandle[]): Promise<void> {
    const candles = history.map(toCore);
    // On garantit que la bougie qui vient de clôturer est bien la dernière (course DB).
    const closed = toCore(candle);
    if (candles.at(-1)?.openTime !== closed.openTime) {
      candles.push(closed);
    }

    const fill = this.deps.bot.onClosedCandle(candles);
    if (fill === null) {
      return;
    }

    const { portfolioId, portfolio, symbol, portfolios } = this.deps;
    await portfolios.updateCash(portfolioId, portfolio.getCash().toString());

    const position = portfolio.getPosition(symbol);
    if (position === null) {
      await portfolios.removePosition(portfolioId, symbol);
    } else {
      await portfolios.upsertPosition(
        portfolioId,
        symbol,
        position.quantity.toString(),
        position.avgEntryPrice.toString(),
      );
    }

    await portfolios.addTrade({
      portfolioId,
      symbol,
      side: fill.side,
      strategyKey: this.deps.strategyKey,
      quantity: fill.quantity.toString(),
      price: fill.execPrice.toString(),
      fee: fill.fee.toString(),
      candleTime: candle.time,
    });
  }
}
