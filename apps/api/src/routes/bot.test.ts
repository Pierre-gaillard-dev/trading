import { beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Candle } from '@trading/shared';
import { buildApp } from '../app';
import { BotManager } from '../workers/bot-manager';
import { WorkerManager } from '../workers/worker-manager';
import type { CandleFeed } from '../services/binance/market.registry';
import { InMemoryCandleRepository } from '../testing/in-memory-candle.repository';
import { InMemoryPortfolioRepository } from '../testing/in-memory-portfolio.repository';
import { InMemoryBotConfigRepository } from '../testing/in-memory-bot-config.repository';
import { InMemoryUserRepository } from '../testing/in-memory-user.repository';

/** Faux flux de bougies : ne se connecte à rien (aucun réseau dans les tests). */
const noopFeed: CandleFeed = {
  attach: (_symbol: string, _interval: string, _onClosed: (candle: Candle) => void) => () => {},
};

/**
 * Routes /api/bots. On vérifie surtout la VALIDATION en deux temps du controller :
 * 1) le schéma zod (corps bien formé) ; 2) la stratégie doit exister (STRATEGY_KEYS).
 * Plus la propriété (un user ne peut pas arrêter le bot d'un autre).
 */
describe('routes bots', () => {
  let app: FastifyInstance;
  let portfolios: InMemoryPortfolioRepository;
  let token: string;
  let portfolioId: string;

  const USER = 'usr_1';

  beforeEach(async () => {
    portfolios = new InMemoryPortfolioRepository();
    const workers = new WorkerManager(noopFeed, new InMemoryCandleRepository());
    const botManager = new BotManager(workers, portfolios, new InMemoryBotConfigRepository());

    app = buildApp({
      portfolioRepository: portfolios,
      userRepository: new InMemoryUserRepository([]),
      botManager,
    });
    await app.ready();
    token = app.jwt.sign({ sub: USER });

    const pf = await portfolios.create(USER, {
      name: 'Bot PF',
      initialCash: '10000',
      feeRate: '0.001',
      slippageBps: 5,
    });
    portfolioId = pf.id;
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  const createBody = (over: Record<string, unknown> = {}) => ({
    portfolioId,
    symbol: 'BTCUSDT',
    interval: '1m',
    strategyKey: 'ma_crossover',
    ...over,
  });

  describe('POST /api/bots', () => {
    it('démarre un bot (201) sur un portefeuille possédé', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/bots',
        headers: auth(),
        payload: createBody(),
      });
      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({ symbol: 'BTCUSDT', interval: '1m', strategyKey: 'ma_crossover' });
      expect(body.id).toBeTruthy();
    });

    it('met le symbole en majuscules', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/bots',
        headers: auth(),
        payload: createBody({ symbol: 'ethusdt' }),
      });
      expect(JSON.parse(response.body).symbol).toBe('ETHUSDT');
    });

    it('rejette un corps invalide (400)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/bots',
        headers: auth(),
        payload: createBody({ interval: '5m' }),
      });
      expect(response.statusCode).toBe(400);
    });

    it('rejette une stratégie inconnue (400), même si le schéma l’accepte', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/bots',
        headers: auth(),
        payload: createBody({ strategyKey: 'stratégie_bidon' }),
      });
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toContain('stratégie_bidon');
    });

    it('renvoie 400 si le portefeuille n’appartient pas à l’utilisateur', async () => {
      const other = await portfolios.create('autre_user', {
        name: 'Autre',
        initialCash: '10000',
        feeRate: '0.001',
        slippageBps: 5,
      });
      const response = await app.inject({
        method: 'POST',
        url: '/api/bots',
        headers: auth(),
        payload: createBody({ portfolioId: other.id }),
      });
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toContain('introuvable');
    });

    it('exige une authentification', async () => {
      const response = await app.inject({ method: 'POST', url: '/api/bots', payload: createBody() });
      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/strategies', () => {
    it('renvoie la liste des stratégies disponibles', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/strategies', headers: auth() });
      expect(response.statusCode).toBe(200);
      const keys = JSON.parse(response.body);
      expect(keys).toContain('ma_crossover');
      expect(keys).toContain('buy_and_hold');
      expect(keys.length).toBeGreaterThanOrEqual(7);
    });

    it('exige une authentification', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/strategies' });
      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/bots', () => {
    it('liste uniquement les bots de l’utilisateur courant', async () => {
      await app.inject({ method: 'POST', url: '/api/bots', headers: auth(), payload: createBody() });

      const response = await app.inject({ method: 'GET', url: '/api/bots', headers: auth() });
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toHaveLength(1);

      // Un autre utilisateur ne voit aucun bot.
      const otherToken = app.jwt.sign({ sub: 'autre_user' });
      const otherResponse = await app.inject({
        method: 'GET',
        url: '/api/bots',
        headers: { Authorization: `Bearer ${otherToken}` },
      });
      expect(JSON.parse(otherResponse.body)).toHaveLength(0);
    });
  });

  describe('DELETE /api/bots/:id', () => {
    it('arrête un bot possédé (204)', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/bots',
        headers: auth(),
        payload: createBody(),
      });
      const { id } = JSON.parse(created.body);

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/bots/${id}`,
        headers: auth(),
      });
      expect(response.statusCode).toBe(204);
    });

    it('renvoie 404 pour un bot inexistant', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/bots/bot_999',
        headers: auth(),
      });
      expect(response.statusCode).toBe(404);
    });

    it('renvoie 404 si le bot appartient à un autre utilisateur', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/bots',
        headers: auth(),
        payload: createBody(),
      });
      const { id } = JSON.parse(created.body);

      const otherToken = app.jwt.sign({ sub: 'autre_user' });
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/bots/${id}`,
        headers: { Authorization: `Bearer ${otherToken}` },
      });
      expect(response.statusCode).toBe(404);
    });
  });
});
