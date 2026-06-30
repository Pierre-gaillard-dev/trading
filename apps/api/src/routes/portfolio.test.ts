import { beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app';
import { InMemoryPortfolioRepository } from '../testing/in-memory-portfolio.repository';
import { InMemoryUserRepository } from '../testing/in-memory-user.repository';

/**
 * Tests des routes /api/portfolios (controller + validation + propriété + codes HTTP).
 * On injecte un repository en mémoire et on signe un vrai JWT pour s'authentifier
 * (on ne teste PAS l'auth elle-même, juste qu'une route protégée renvoie 401 sans jeton).
 */
describe('routes portfolios', () => {
  let app: FastifyInstance;
  let portfolios: InMemoryPortfolioRepository;
  let token: string;

  const USER = 'usr_1';

  beforeEach(async () => {
    portfolios = new InMemoryPortfolioRepository();
    app = buildApp({
      portfolioRepository: portfolios,
      userRepository: new InMemoryUserRepository([]),
    });
    await app.ready();
    token = app.jwt.sign({ sub: USER });
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  describe('GET /api/portfolios', () => {
    it('exige une authentification (401 sans jeton)', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/portfolios' });
      expect(response.statusCode).toBe(401);
    });

    it('renvoie la liste (vide au départ)', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/portfolios', headers: auth() });
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual([]);
    });

    it('ne renvoie que les portefeuilles de l’utilisateur courant', async () => {
      await portfolios.create('autre_user', {
        name: 'Pas à moi',
        initialCash: '5000',
        feeRate: '0.001',
        slippageBps: 5,
      });
      await portfolios.create(USER, {
        name: 'À moi',
        initialCash: '10000',
        feeRate: '0.001',
        slippageBps: 5,
      });

      const response = await app.inject({ method: 'GET', url: '/api/portfolios', headers: auth() });
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(1);
      expect(body[0].name).toBe('À moi');
    });
  });

  describe('POST /api/portfolios', () => {
    it('crée un portefeuille (201) et applique les valeurs par défaut feeRate/slippageBps', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/portfolios',
        headers: auth(),
        payload: { name: 'Crypto', initialCash: '10000' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.feeRate).toBe('0.001'); // défaut
      expect(body.slippageBps).toBe(5); // défaut
      expect(body.cash).toBe('10000'); // cash initialisé au capital
    });

    it('respecte feeRate / slippageBps fournis', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/portfolios',
        headers: auth(),
        payload: { name: 'Crypto', initialCash: '10000', feeRate: '0.002', slippageBps: 10 },
      });
      const body = JSON.parse(response.body);
      expect(body.feeRate).toBe('0.002');
      expect(body.slippageBps).toBe(10);
    });

    it('rejette un corps invalide (400) avec le détail des erreurs', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/portfolios',
        headers: auth(),
        payload: { name: '', initialCash: '0' },
      });
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('details');
    });

    it('exige une authentification', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/portfolios',
        payload: { name: 'Crypto', initialCash: '10000' },
      });
      expect(response.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/portfolios/:id', () => {
    it('supprime et renvoie 204', async () => {
      const created = await portfolios.create(USER, {
        name: 'À supprimer',
        initialCash: '10000',
        feeRate: '0.001',
        slippageBps: 5,
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/portfolios/${created.id}`,
        headers: auth(),
      });
      expect(response.statusCode).toBe(204);
      expect(await portfolios.findById(USER, created.id)).toBeNull();
    });

    // À SIGNALER : suppression idempotente. DELETE sur un id inexistant renvoie 204
    // (pas de 404). C'est un choix d'API ; à confirmer si c'est volontaire.
    it('renvoie 204 même pour un id inexistant (idempotent, à confirmer)', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/portfolios/inexistant',
        headers: auth(),
      });
      expect(response.statusCode).toBe(204);
    });
  });

  describe('GET /api/portfolios/:id/trades', () => {
    it('renvoie 404 si le portefeuille n’appartient pas à l’utilisateur', async () => {
      const other = await portfolios.create('autre_user', {
        name: 'Autre',
        initialCash: '10000',
        feeRate: '0.001',
        slippageBps: 5,
      });
      const response = await app.inject({
        method: 'GET',
        url: `/api/portfolios/${other.id}/trades`,
        headers: auth(),
      });
      expect(response.statusCode).toBe(404);
    });

    it('renvoie les trades du portefeuille, filtrés par symbole', async () => {
      const pf = await portfolios.create(USER, {
        name: 'Trading',
        initialCash: '10000',
        feeRate: '0.001',
        slippageBps: 5,
      });
      await portfolios.addTrade({
        portfolioId: pf.id,
        symbol: 'BTCUSDT',
        side: 'BUY',
        strategyKey: 'rsi',
        quantity: '0.1',
        price: '40000',
        fee: '4',
        candleTime: 1,
      });
      await portfolios.addTrade({
        portfolioId: pf.id,
        symbol: 'ETHUSDT',
        side: 'BUY',
        strategyKey: 'rsi',
        quantity: '1',
        price: '2000',
        fee: '2',
        candleTime: 2,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/portfolios/${pf.id}/trades?symbol=BTCUSDT`,
        headers: auth(),
      });
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(1);
      expect(body[0].symbol).toBe('BTCUSDT');
    });
  });

  describe('GET /api/portfolios/:id/positions', () => {
    it('renvoie 404 pour un portefeuille non possédé', async () => {
      const other = await portfolios.create('autre_user', {
        name: 'Autre',
        initialCash: '10000',
        feeRate: '0.001',
        slippageBps: 5,
      });
      const response = await app.inject({
        method: 'GET',
        url: `/api/portfolios/${other.id}/positions`,
        headers: auth(),
      });
      expect(response.statusCode).toBe(404);
    });

    it('renvoie les positions du portefeuille possédé', async () => {
      const pf = await portfolios.create(USER, {
        name: 'Trading',
        initialCash: '10000',
        feeRate: '0.001',
        slippageBps: 5,
      });
      await portfolios.upsertPosition(pf.id, 'BTCUSDT', '0.5', '40000');

      const response = await app.inject({
        method: 'GET',
        url: `/api/portfolios/${pf.id}/positions`,
        headers: auth(),
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual([{ symbol: 'BTCUSDT', quantity: '0.5', avgEntryPrice: '40000' }]);
    });
  });
});
