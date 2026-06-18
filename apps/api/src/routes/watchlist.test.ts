import { beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app';
import { InMemoryWatchlistRepository } from '../testing/in-memory-watchlist.repository';
import { InMemoryUserRepository } from '../testing/in-memory-user.repository';

/**
 * Routes /api/watchlist. Le point sensible est `add` : il valide le symbole, puis
 * appelle `symbolExists` (Binance en prod). On injecte un faux `symbolExists` pour
 * couvrir : symbole connu (201), inconnu (422), et Binance injoignable (503).
 */
describe('routes watchlist', () => {
  let app: FastifyInstance;
  let watchlist: InMemoryWatchlistRepository;
  let token: string;

  const USER = 'usr_1';

  /** Construit l'app avec un comportement `symbolExists` paramétrable. */
  async function setup(symbolExists: (symbol: string) => Promise<boolean>) {
    watchlist = new InMemoryWatchlistRepository();
    app = buildApp({
      watchlistRepository: watchlist,
      userRepository: new InMemoryUserRepository([]),
      symbolExists,
    });
    await app.ready();
    token = app.jwt.sign({ sub: USER });
  }

  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeEach(async () => {
    await setup(() => Promise.resolve(true));
  });

  describe('GET /api/watchlist', () => {
    it('exige une authentification', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/watchlist' });
      expect(response.statusCode).toBe(401);
    });

    it('renvoie la liste de l’utilisateur', async () => {
      await watchlist.add(USER, 'BTCUSDT');
      const response = await app.inject({ method: 'GET', url: '/api/watchlist', headers: auth() });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(1);
      expect(body[0].symbol).toBe('BTCUSDT');
    });
  });

  describe('POST /api/watchlist', () => {
    it('ajoute un symbole connu (201) et renvoie la liste à jour', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/watchlist',
        headers: auth(),
        payload: { symbol: 'btcusdt' },
      });
      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body[0].symbol).toBe('BTCUSDT'); // normalisé en majuscules
    });

    it('met le symbole en majuscules avant de vérifier son existence', async () => {
      const seen: string[] = [];
      await setup((symbol) => {
        seen.push(symbol);
        return Promise.resolve(true);
      });
      await app.inject({
        method: 'POST',
        url: '/api/watchlist',
        headers: auth(),
        payload: { symbol: 'ethusdt' },
      });
      expect(seen).toEqual(['ETHUSDT']);
    });

    it('rejette un symbole invalide (400) sans appeler Binance', async () => {
      let called = false;
      await setup(() => {
        called = true;
        return Promise.resolve(true);
      });
      const response = await app.inject({
        method: 'POST',
        url: '/api/watchlist',
        headers: auth(),
        payload: { symbol: 'BTC-EUR' },
      });
      expect(response.statusCode).toBe(400);
      expect(called).toBe(false);
    });

    it('renvoie 422 pour un symbole inconnu de Binance', async () => {
      await setup(() => Promise.resolve(false));
      const response = await app.inject({
        method: 'POST',
        url: '/api/watchlist',
        headers: auth(),
        payload: { symbol: 'FOOUSDT' },
      });
      expect(response.statusCode).toBe(422);
    });

    it('renvoie 503 (pas un crash 500) si Binance est injoignable', async () => {
      await setup(() => Promise.reject(new Error('network down')));
      const response = await app.inject({
        method: 'POST',
        url: '/api/watchlist',
        headers: auth(),
        payload: { symbol: 'BTCUSDT' },
      });
      expect(response.statusCode).toBe(503);
    });

    it('n’ajoute pas de doublon (l’ajout deux fois ne crée qu’une entrée)', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/watchlist',
        headers: auth(),
        payload: { symbol: 'BTCUSDT' },
      });
      const response = await app.inject({
        method: 'POST',
        url: '/api/watchlist',
        headers: auth(),
        payload: { symbol: 'BTCUSDT' },
      });
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(1);
    });
  });

  describe('DELETE /api/watchlist/:symbol', () => {
    it('supprime (204) et normalise la casse du paramètre', async () => {
      await watchlist.add(USER, 'BTCUSDT');
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/watchlist/btcusdt',
        headers: auth(),
      });
      expect(response.statusCode).toBe(204);
      expect(await watchlist.listByUser(USER)).toHaveLength(0);
    });

    it('renvoie 204 même si le symbole n’existait pas (idempotent)', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/watchlist/XRPUSDT',
        headers: auth(),
      });
      expect(response.statusCode).toBe(204);
    });
  });
});
