import {
  Portfolio,
  TradingBot,
  FixedFractionSizing,
  createStrategy,
  type StrategyKey,
  type SymbolSpec,
  type RiskParams,
} from '@trading/core';
import type { PortfolioRepository } from '../repositories/portfolio.repository';
import { BotRunner } from './bot-runner';
import type { WorkerManager } from './worker-manager';

/** SymbolSpec par défaut (raisonnable). À terme, récupérée de Binance exchangeInfo. */
function defaultSymbolSpec(symbol: string): SymbolSpec {
  return { symbol, basePrecision: 8, quotePrecision: 2, stepSize: '0.00001', minNotional: '10' };
}

export interface CreateBotInput {
  userId: string;
  portfolioId: string;
  symbol: string;
  interval: string;
  strategyKey: StrategyKey;
  params?: unknown;
  risk?: RiskParams;
}

export interface RunningBot {
  id: string;
  portfolioId: string;
  symbol: string;
  interval: string;
  strategyKey: StrategyKey;
}

/** Démarre/arrête les bots (en mémoire) et les branche au WorkerManager. */
export class BotManager {
  private readonly bots = new Map<string, RunningBot & { userId: string }>();
  private sequence = 0;

  constructor(
    private readonly workers: WorkerManager,
    private readonly portfolios: PortfolioRepository,
  ) {}

  async start(input: CreateBotInput): Promise<RunningBot> {
    const portfolioRecord = await this.portfolios.findById(input.userId, input.portfolioId);
    if (portfolioRecord === null) {
      throw new Error('Portefeuille introuvable.');
    }

    const portfolio = new Portfolio({
      cash: portfolioRecord.cash,
      feeRate: portfolioRecord.feeRate,
      slippageBps: portfolioRecord.slippageBps,
    });
    const bot = new TradingBot({
      symbol: input.symbol,
      spec: defaultSymbolSpec(input.symbol),
      strategy: createStrategy(input.strategyKey, input.params),
      sizing: new FixedFractionSizing(0.95),
      portfolio,
      risk: input.risk,
    });

    this.sequence += 1;
    const id = `bot_${String(this.sequence)}`;
    const runner = new BotRunner({
      id,
      portfolioId: input.portfolioId,
      symbol: input.symbol,
      interval: input.interval,
      portfolio,
      bot,
      portfolios: this.portfolios,
    });
    this.workers.start(runner);

    const running: RunningBot = {
      id,
      portfolioId: input.portfolioId,
      symbol: input.symbol,
      interval: input.interval,
      strategyKey: input.strategyKey,
    };
    this.bots.set(id, { ...running, userId: input.userId });
    return running;
  }

  stop(userId: string, id: string): boolean {
    const bot = this.bots.get(id);
    if (!bot || bot.userId !== userId) {
      return false;
    }
    this.workers.stop(id);
    this.bots.delete(id);
    return true;
  }

  list(userId: string): RunningBot[] {
    const result: RunningBot[] = [];
    for (const bot of this.bots.values()) {
      if (bot.userId === userId) {
        result.push({
          id: bot.id,
          portfolioId: bot.portfolioId,
          symbol: bot.symbol,
          interval: bot.interval,
          strategyKey: bot.strategyKey,
        });
      }
    }
    return result;
  }
}
