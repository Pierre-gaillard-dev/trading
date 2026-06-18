import {
  Portfolio,
  TradingBot,
  FixedFractionSizing,
  createEnsemble,
  type EnsembleEntry,
  type RandomSource,
  type StrategyKey,
  type SymbolSpec,
  type RiskParams,
  type SeedPosition,
} from '@trading/core';
import type { PortfolioRepository } from '../repositories/portfolio.repository';
import type {
  BotConfigRecord,
  BotConfigRepository,
  BotStrategyConfig,
} from '../repositories/bot-config.repository';
import { BotRunner } from './bot-runner';
import type { WorkerManager } from './worker-manager';

/** SymbolSpec par défaut (raisonnable). À terme, récupérée de Binance exchangeInfo. */
function defaultSymbolSpec(symbol: string): SymbolSpec {
  return { symbol, basePrecision: 8, quotePrecision: 2, stepSize: '0.00001', minNotional: '10' };
}

/** Clé stable identifiant un trade décidé par l'ensemble pondéré. */
const ENSEMBLE_KEY = 'ensemble';

export interface CreateBotInput {
  userId: string;
  portfolioId: string;
  symbol: string;
  interval: string;
  /** Stratégies pondérées qui composent le bot (au moins une). */
  strategies: BotStrategyConfig[];
  /** Part du cash investie à chaque achat (0–1). Défaut 0,10. */
  buyFraction?: number;
  risk?: RiskParams;
}

const DEFAULT_BUY_FRACTION = 0.1;

export interface RunningBot {
  id: string;
  portfolioId: string;
  symbol: string;
  interval: string;
  strategies: { strategyKey: string; weight: number }[];
}

/** Démarre/arrête les bots, les persiste, et les relance au démarrage du serveur. */
export class BotManager {
  private readonly bots = new Map<string, RunningBot & { userId: string }>();

  constructor(
    private readonly workers: WorkerManager,
    private readonly portfolios: PortfolioRepository,
    private readonly botConfigs: BotConfigRepository,
    private readonly random: RandomSource,
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
      strategies: input.strategies,
      buyFraction: input.buyFraction ?? DEFAULT_BUY_FRACTION,
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
          strategies: bot.strategies,
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

    const portfolio = new Portfolio({
      cash: record.cash,
      feeRate: record.feeRate,
      slippageBps: record.slippageBps,
      positions,
    });
    const entries: EnsembleEntry[] = config.strategies.map((s) => ({
      key: s.strategyKey as StrategyKey,
      weight: s.weight,
      params: s.params,
    }));
    const bot = new TradingBot({
      symbol: config.symbol,
      spec: defaultSymbolSpec(config.symbol),
      strategy: createEnsemble(entries, this.random),
      sizing: new FixedFractionSizing(config.buyFraction),
      portfolio,
    });

    const runner = new BotRunner({
      id: config.id,
      portfolioId: config.portfolioId,
      symbol: config.symbol,
      interval: config.interval,
      strategyKey: ENSEMBLE_KEY,
      portfolio,
      bot,
      portfolios: this.portfolios,
    });
    this.workers.start(runner);

    const strategies = config.strategies.map((s) => ({
      strategyKey: s.strategyKey,
      weight: s.weight,
    }));
    const running: RunningBot = {
      id: config.id,
      portfolioId: config.portfolioId,
      symbol: config.symbol,
      interval: config.interval,
      strategies,
    };
    this.bots.set(config.id, { ...running, userId: config.userId });
    return running;
  }
}
