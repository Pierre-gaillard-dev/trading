import {
  Portfolio,
  TradingBot,
  FixedFractionSizing,
  createStrategy,
  type StrategyKey,
  type SymbolSpec,
  type RiskParams,
  type SeedPosition,
} from '@trading/core';
import type { PortfolioRepository } from '../repositories/portfolio.repository';
import type { BotConfigRecord, BotConfigRepository } from '../repositories/bot-config.repository';
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

/** Démarre/arrête les bots, les persiste, et les relance au démarrage du serveur. */
export class BotManager {
  private readonly bots = new Map<string, RunningBot & { userId: string }>();

  constructor(
    private readonly workers: WorkerManager,
    private readonly portfolios: PortfolioRepository,
    private readonly botConfigs: BotConfigRepository,
  ) {}

  async start(input: CreateBotInput): Promise<RunningBot> {
    const portfolio = await this.portfolios.findById(input.userId, input.portfolioId);
    if (portfolio === null) {
      throw new Error('Portefeuille introuvable.');
    }
    const config = await this.botConfigs.create({
      userId: input.userId,
      portfolioId: input.portfolioId,
      symbol: input.symbol,
      interval: input.interval,
      strategyKey: input.strategyKey,
      params: input.params ?? {},
    });
    const running = await this.run(config);
    if (running === null) {
      throw new Error('Démarrage du bot impossible.');
    }
    return running;
  }

  /** Relance tous les bots persistés (appelé au démarrage du serveur). */
  async restore(): Promise<void> {
    let configs: BotConfigRecord[];
    try {
      configs = await this.botConfigs.listAll();
    } catch (error) {
      console.warn('[bots] restauration impossible :', (error as Error).message);
      return;
    }
    for (const config of configs) {
      try {
        await this.run(config);
      } catch (error) {
        console.warn(`[bots] ${config.id} non relancé :`, (error as Error).message);
      }
    }
    if (configs.length > 0) {
      console.log(`[bots] ${String(this.bots.size)} bot(s) relancé(s).`);
    }
  }

  stop(userId: string, id: string): Promise<boolean> {
    const bot = this.bots.get(id);
    const owned = bot !== undefined && bot.userId === userId;
    if (owned) {
      this.workers.stop(id);
      this.bots.delete(id);
    }
    // Supprime la config en base (ne supprime que si elle appartient à l'utilisateur).
    return this.botConfigs.remove(userId, id).then(() => owned);
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

  /** Construit un bot à partir d'une config et le branche au flux. */
  private async run(config: BotConfigRecord): Promise<RunningBot | null> {
    if (this.bots.has(config.id)) {
      return null;
    }
    const record = await this.portfolios.findById(config.userId, config.portfolioId);
    if (record === null) {
      return null;
    }

    const positionRecords = await this.portfolios.listPositions(config.portfolioId);
    const positions: SeedPosition[] = positionRecords.map((p) => ({
      symbol: p.symbol,
      quantity: p.quantity,
      avgEntryPrice: p.avgEntryPrice,
    }));

    const strategyKey = config.strategyKey as StrategyKey;
    const portfolio = new Portfolio({
      cash: record.cash,
      feeRate: record.feeRate,
      slippageBps: record.slippageBps,
      positions,
    });
    const bot = new TradingBot({
      symbol: config.symbol,
      spec: defaultSymbolSpec(config.symbol),
      strategy: createStrategy(strategyKey, config.params),
      sizing: new FixedFractionSizing(0.95),
      portfolio,
    });

    const runner = new BotRunner({
      id: config.id,
      portfolioId: config.portfolioId,
      symbol: config.symbol,
      interval: config.interval,
      strategyKey,
      portfolio,
      bot,
      portfolios: this.portfolios,
    });
    this.workers.start(runner);

    const running: RunningBot = {
      id: config.id,
      portfolioId: config.portfolioId,
      symbol: config.symbol,
      interval: config.interval,
      strategyKey,
    };
    this.bots.set(config.id, { ...running, userId: config.userId });
    return running;
  }
}
