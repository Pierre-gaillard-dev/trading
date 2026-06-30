import { describe, it, expect, beforeEach } from 'vitest';
import type { Portfolio, TradingBot, Candle as CoreCandle } from '@trading/core';
import type { Candle } from '@trading/shared';
import { BotRunner } from './bot-runner';
import { InMemoryPortfolioRepository } from '../testing/in-memory-portfolio.repository';

/**
 * `BotRunner` fait le pont entre le flux de bougies (shared) et le moteur (core),
 * PUIS persiste l'état. On fournit un faux `bot` et un faux `portfolio` (le moteur
 * est testé à part dans `core`) pour isoler la logique de pont + persistance :
 *  - conversion shared → core (temps en ms) ;
 *  - garde-fou « course DB » : la bougie clôturée doit être la dernière du contexte ;
 *  - écriture du cash, de la position et du trade quand il y a exécution.
 */

const market = (time: number, close = 1.5): Candle => ({
  time,
  open: 1,
  high: 2,
  low: 0.5,
  close,
  volume: 10,
});

/** Fill minimal renvoyé par le faux moteur (les montants exposent juste `.toString()`). */
function fill(side: 'BUY' | 'SELL') {
  return {
    side,
    quantity: { toString: () => '0.1' },
    execPrice: { toString: () => '40000' },
    fee: { toString: () => '4' },
  };
}

interface FakeBot {
  lastContext: CoreCandle[] | null;
  nextFill: ReturnType<typeof fill> | null;
}

/** Construit un BotRunner branché sur un faux bot/portfolio et un repo en mémoire. */
function makeRunner(options: {
  nextFill: ReturnType<typeof fill> | null;
  position: { quantity: { toString: () => string }; avgEntryPrice: { toString: () => string } } | null;
  portfolios: InMemoryPortfolioRepository;
  portfolioId: string;
}) {
  const fakeBot: FakeBot = { lastContext: null, nextFill: options.nextFill };

  const bot = {
    onClosedCandle(context: CoreCandle[]) {
      fakeBot.lastContext = context;
      return fakeBot.nextFill;
    },
  } as unknown as TradingBot;

  const portfolio = {
    getCash: () => ({ toString: () => '9500' }),
    getPosition: (_symbol: string) => options.position,
  } as unknown as Portfolio;

  const runner = new BotRunner({
    id: 'bot_1',
    portfolioId: options.portfolioId,
    symbol: 'BTCUSDT',
    interval: '1m',
    strategyKey: 'rsi',
    portfolio,
    bot,
    portfolios: options.portfolios,
  });

  return { runner, fakeBot };
}

describe('BotRunner.onClosedCandle', () => {
  let portfolios: InMemoryPortfolioRepository;
  let portfolioId: string;

  beforeEach(async () => {
    portfolios = new InMemoryPortfolioRepository();
    const pf = await portfolios.create('usr_1', {
      name: 'PF',
      initialCash: '10000',
      feeRate: '0.001',
      slippageBps: 5,
    });
    portfolioId = pf.id;
  });

  describe('conversion et garde-fou « course DB »', () => {
    it('convertit les bougies en format core (temps en millisecondes)', async () => {
      const { runner, fakeBot } = makeRunner({ nextFill: null, position: null, portfolios, portfolioId });
      await runner.onClosedCandle(market(3), [market(1), market(2)]);

      expect(fakeBot.lastContext?.map((c) => c.openTime)).toEqual([1000, 2000, 3000]);
    });

    it('ajoute la bougie clôturée si l’historique ne la contient pas encore', async () => {
      const { runner, fakeBot } = makeRunner({ nextFill: null, position: null, portfolios, portfolioId });
      await runner.onClosedCandle(market(3), [market(1), market(2)]);
      expect(fakeBot.lastContext).toHaveLength(3);
    });

    it('ne duplique pas la bougie clôturée si elle est déjà la dernière de l’historique', async () => {
      const { runner, fakeBot } = makeRunner({ nextFill: null, position: null, portfolios, portfolioId });
      await runner.onClosedCandle(market(3), [market(1), market(2), market(3)]);
      expect(fakeBot.lastContext).toHaveLength(3);
      expect(fakeBot.lastContext?.at(-1)?.openTime).toBe(3000);
    });
  });

  describe('sans exécution (HOLD)', () => {
    it('ne persiste rien quand le moteur ne renvoie pas de fill', async () => {
      const { runner } = makeRunner({ nextFill: null, position: null, portfolios, portfolioId });
      await runner.onClosedCandle(market(1), [market(1)]);

      const pf = await portfolios.findById('usr_1', portfolioId);
      expect(pf?.cash).toBe('10000'); // inchangé
      expect(await portfolios.listTrades(portfolioId)).toHaveLength(0);
    });
  });

  describe('avec exécution (fill)', () => {
    it('persiste le cash, la position et le trade lors d’un BUY', async () => {
      const { runner } = makeRunner({
        nextFill: fill('BUY'),
        position: { quantity: { toString: () => '0.1' }, avgEntryPrice: { toString: () => '40000' } },
        portfolios,
        portfolioId,
      });
      await runner.onClosedCandle(market(5), [market(4)]);

      const pf = await portfolios.findById('usr_1', portfolioId);
      expect(pf?.cash).toBe('9500');

      const positions = await portfolios.listPositions(portfolioId);
      expect(positions).toEqual([{ symbol: 'BTCUSDT', quantity: '0.1', avgEntryPrice: '40000' }]);

      const trades = await portfolios.listTrades(portfolioId);
      expect(trades).toHaveLength(1);
      expect(trades[0]).toMatchObject({
        symbol: 'BTCUSDT',
        side: 'BUY',
        strategyKey: 'rsi', // la stratégie déclencheuse est enregistrée
        quantity: '0.1',
        price: '40000',
        fee: '4',
        candleTime: 5, // temps en SECONDES (celui de la bougie shared)
      });
    });

    it('supprime la position quand le portefeuille n’en détient plus (SELL total)', async () => {
      // Position pré-existante puis fermée : getPosition renvoie null après le SELL.
      await portfolios.upsertPosition(portfolioId, 'BTCUSDT', '0.1', '40000');
      const { runner } = makeRunner({
        nextFill: fill('SELL'),
        position: null,
        portfolios,
        portfolioId,
      });
      await runner.onClosedCandle(market(6), [market(5)]);

      expect(await portfolios.listPositions(portfolioId)).toHaveLength(0);
      const trades = await portfolios.listTrades(portfolioId);
      expect(trades[0]).toMatchObject({ side: 'SELL', strategyKey: 'rsi' });
    });
  });
});
