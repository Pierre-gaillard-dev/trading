import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Candle } from '@trading/shared';
import { SeededRandom } from '@trading/core';
import { BotManager } from './bot-manager';
import { WorkerManager } from './worker-manager';
import type { CandleFeed } from '../services/binance/market.registry';
import { InMemoryCandleRepository } from '../testing/in-memory-candle.repository';
import { InMemoryPortfolioRepository } from '../testing/in-memory-portfolio.repository';
import { InMemoryBotConfigRepository } from '../testing/in-memory-bot-config.repository';
import type { NewBotConfig } from '../repositories/bot-config.repository';

/** Flux factice : ne se connecte à rien. */
const noopFeed: CandleFeed = {
  attach: (_s: string, _i: string, _cb: (c: Candle) => void) => () => {},
};

const USER = 'usr_1';

/**
 * Tests UNITAIRES de BotManager (orchestration en mémoire + persistance des configs).
 * On couvre surtout `restore()` : la relance des bots persistés au démarrage du serveur,
 * avec ses cas limites (config orpheline, dédoublonnage, repository en panne).
 */
describe('BotManager', () => {
  let portfolios: InMemoryPortfolioRepository;
  let configs: InMemoryBotConfigRepository;
  let workers: WorkerManager;
  let manager: BotManager;

  beforeEach(() => {
    portfolios = new InMemoryPortfolioRepository();
    configs = new InMemoryBotConfigRepository();
    workers = new WorkerManager(noopFeed, new InMemoryCandleRepository());
    manager = new BotManager(workers, portfolios, configs, new SeededRandom(1));
  });

  /** Crée un portefeuille pour USER et renvoie son id. */
  async function aPortfolio(userId = USER): Promise<string> {
    const pf = await portfolios.create(userId, {
      name: 'PF',
      initialCash: '10000',
      feeRate: '0.001',
      slippageBps: 5,
    });
    return pf.id;
  }

  const config = (over: Partial<NewBotConfig> & { portfolioId: string }): NewBotConfig => ({
    userId: USER,
    symbol: 'BTCUSDT',
    interval: '1m',
    strategies: [{ strategyKey: 'ma_crossover', weight: 1, params: {} }],
    buyFraction: 0.1,
    invert: false,
    ...over,
  });

  describe('start', () => {
    it('persiste la config, démarre le worker et renvoie le bot', async () => {
      const startSpy = vi.spyOn(workers, 'start');
      const portfolioId = await aPortfolio();

      const bot = await manager.start({
        userId: USER,
        portfolioId,
        symbol: 'BTCUSDT',
        interval: '1m',
        strategies: [{ strategyKey: 'ma_crossover', weight: 1 }],
      });

      expect(bot).toMatchObject({ portfolioId, symbol: 'BTCUSDT', interval: '1m' });
      expect(bot.id).toBeTruthy();
      expect(startSpy).toHaveBeenCalledOnce();
      expect(await configs.listAll()).toHaveLength(1); // config persistée
      expect(manager.list(USER)).toHaveLength(1);
    });

    it('rejette si le portefeuille est introuvable (et ne persiste aucune config)', async () => {
      await expect(
        manager.start({
          userId: USER,
          portfolioId: 'pf_inconnu',
          symbol: 'BTCUSDT',
          interval: '1m',
          strategies: [{ strategyKey: 'ma_crossover', weight: 1 }],
        }),
      ).rejects.toThrow('Portefeuille introuvable');
      expect(await configs.listAll()).toHaveLength(0);
    });

    it('applique la fraction d’achat par défaut quand buyFraction est absent', async () => {
      const portfolioId = await aPortfolio();
      await manager.start({
        userId: USER,
        portfolioId,
        symbol: 'BTCUSDT',
        interval: '1m',
        strategies: [{ strategyKey: 'ma_crossover', weight: 1 }],
      });
      const [persisted] = await configs.listAll();
      expect(persisted.buyFraction).toBe(0.1); // DEFAULT_BUY_FRACTION
    });

    it('persiste et expose le flag invert (inversion de l’ensemble)', async () => {
      const portfolioId = await aPortfolio();
      const bot = await manager.start({
        userId: USER,
        portfolioId,
        symbol: 'BTCUSDT',
        interval: '1m',
        strategies: [{ strategyKey: 'ma_crossover', weight: 1 }],
        invert: true,
      });
      expect(bot.invert).toBe(true);
      const [persisted] = await configs.listAll();
      expect(persisted.invert).toBe(true);
    });

    it('invert vaut false par défaut quand il est absent', async () => {
      const portfolioId = await aPortfolio();
      const bot = await manager.start({
        userId: USER,
        portfolioId,
        symbol: 'BTCUSDT',
        interval: '1m',
        strategies: [{ strategyKey: 'ma_crossover', weight: 1 }],
      });
      expect(bot.invert).toBe(false);
    });
  });

  describe('restore', () => {
    it('relance tous les bots persistés', async () => {
      const portfolioId = await aPortfolio();
      await configs.create(config({ portfolioId }));
      await configs.create(config({ portfolioId, symbol: 'ETHUSDT' }));

      await manager.restore();

      expect(manager.list(USER)).toHaveLength(2);
      expect(workers.runningCount).toBe(2);
    });

    it('ignore une config dont le portefeuille n’existe plus (orpheline)', async () => {
      await configs.create(config({ portfolioId: 'pf_supprime' }));

      await manager.restore();

      expect(manager.list(USER)).toHaveLength(0);
      expect(workers.runningCount).toBe(0);
    });

    it('ne relance pas deux fois le même bot (idempotent)', async () => {
      const portfolioId = await aPortfolio();
      await configs.create(config({ portfolioId }));

      await manager.restore();
      await manager.restore();

      expect(manager.list(USER)).toHaveLength(1);
      expect(workers.runningCount).toBe(1);
    });

    it('ne plante pas si le repository de configs est en panne', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(configs, 'listAll').mockRejectedValue(new Error('DB down'));

      await expect(manager.restore()).resolves.toBeUndefined();
      expect(manager.list(USER)).toHaveLength(0);
      expect(console.warn).toHaveBeenCalled();
    });

    it('ignore une config dont les params de stratégie sont invalides (log + continue les autres)', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const portfolioId = await aPortfolio();
      // params invalides → createStrategy lève (RSI exige period > 1) → ce bot est ignoré.
      await configs.create(
        config({
          portfolioId,
          strategies: [{ strategyKey: 'rsi', weight: 1, params: { period: 0 } }],
        }),
      );
      // un bot sain qui doit, lui, démarrer malgré l'échec du précédent.
      await configs.create(config({ portfolioId }));

      await manager.restore();

      expect(manager.list(USER)).toHaveLength(1);
      expect(console.warn).toHaveBeenCalled();
    });

    it('recharge les positions existantes du portefeuille dans le bot relancé', async () => {
      const portfolioId = await aPortfolio();
      await portfolios.upsertPosition(portfolioId, 'BTCUSDT', '0.5', '40000');
      await configs.create(config({ portfolioId }));

      // Ne doit pas lever (les positions seedées doivent être des SeedPosition valides).
      await expect(manager.restore()).resolves.toBeUndefined();
      expect(manager.list(USER)).toHaveLength(1);
    });
  });

  describe('stop', () => {
    it('arrête le worker, retire le bot et supprime la config (true)', async () => {
      const stopSpy = vi.spyOn(workers, 'stop');
      const portfolioId = await aPortfolio();
      const bot = await manager.start({
        userId: USER,
        portfolioId,
        symbol: 'BTCUSDT',
        interval: '1m',
        strategies: [{ strategyKey: 'ma_crossover', weight: 1 }],
      });

      const result = await manager.stop(USER, bot.id);

      expect(result).toBe(true);
      expect(stopSpy).toHaveBeenCalledWith(bot.id);
      expect(manager.list(USER)).toHaveLength(0);
      expect(await configs.listAll()).toHaveLength(0);
    });

    it('renvoie false pour un bot inconnu', async () => {
      expect(await manager.stop(USER, 'bot_inconnu')).toBe(false);
    });

    it('renvoie false et ne touche pas au bot d’un autre utilisateur', async () => {
      const portfolioId = await aPortfolio();
      const bot = await manager.start({
        userId: USER,
        portfolioId,
        symbol: 'BTCUSDT',
        interval: '1m',
        strategies: [{ strategyKey: 'ma_crossover', weight: 1 }],
      });

      const result = await manager.stop('autre_user', bot.id);

      expect(result).toBe(false);
      expect(manager.list(USER)).toHaveLength(1); // toujours là
    });
  });

  describe('list', () => {
    it('ne renvoie que les bots de l’utilisateur courant', async () => {
      const mine = await aPortfolio(USER);
      const other = await aPortfolio('autre_user');
      await configs.create(config({ portfolioId: mine, userId: USER }));
      await configs.create(config({ portfolioId: other, userId: 'autre_user' }));
      await manager.restore();

      expect(manager.list(USER)).toHaveLength(1);
      expect(manager.list('autre_user')).toHaveLength(1);
      expect(manager.list('personne')).toHaveLength(0);
    });
  });
});
