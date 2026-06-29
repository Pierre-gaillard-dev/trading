import { beforeEach, describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import type { Candle } from '@trading/shared';
import { backtestRoutes } from './backtest.routes';
import type { CandleFetcher } from '../controllers/backtest.controller';

/** Historique factice : série haussière déterministe (aucun réseau). */
const rising: CandleFetcher = (_symbol, _interval, limit) =>
  Promise.resolve(
    Array.from({ length: limit }, (_, i): Candle => {
      const close = 100 + i;
      return { time: i * 3600, open: close, high: close + 1, low: close - 1, close, volume: 1 };
    }),
  );

function build(fetchCandles: CandleFetcher = rising): FastifyInstance {
  const app = Fastify({ logger: false });
  void app.register(fastifyJwt, { secret: 'test-secret' });
  void app.register(backtestRoutes, { fetchCandles });
  return app;
}

const validBody = {
  symbol: 'BTCUSDT',
  interval: '1h',
  strategies: [{ strategyKey: 'buy_and_hold', weight: 1 }],
  initialCash: '10000',
  candles: 60,
};

describe('routes backtest', () => {
  let app: FastifyInstance;
  let token: string;

  beforeEach(async () => {
    app = build();
    await app.ready();
    token = app.jwt.sign({ sub: 'usr_1' });
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('exige une authentification', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/backtest', payload: validBody });
    expect(r.statusCode).toBe(401);
  });

  it('rejoue la stratégie et renvoie un résultat chiffré (200)', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/backtest', headers: auth(), payload: validBody });
    expect(r.statusCode).toBe(200);
    const body = JSON.parse(r.body);
    expect(body.candleCount).toBe(60);
    expect(body).toHaveProperty('pnlPct');
    expect(body).toHaveProperty('buyHoldPnlPct');
    expect(Array.isArray(body.equityCurve)).toBe(true);
  });

  it('accepte le drapeau invert', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/api/backtest',
      headers: auth(),
      payload: { ...validBody, invert: true },
    });
    expect(r.statusCode).toBe(200);
  });

  it('rejette une stratégie inconnue (400)', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/api/backtest',
      headers: auth(),
      payload: { ...validBody, strategies: [{ strategyKey: 'bidon', weight: 1 }] },
    });
    expect(r.statusCode).toBe(400);
    expect(JSON.parse(r.body).error).toContain('bidon');
  });

  it('rejette un corps invalide (intervalle non listé) → 400', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/api/backtest',
      headers: auth(),
      payload: { ...validBody, interval: '5m' },
    });
    expect(r.statusCode).toBe(400);
  });

  it('renvoie 404 si aucune bougie n’est disponible', async () => {
    const empty = build(() => Promise.resolve([]));
    await empty.ready();
    const r = await empty.inject({
      method: 'POST',
      url: '/api/backtest',
      headers: { Authorization: `Bearer ${empty.jwt.sign({ sub: 'u' })}` },
      payload: validBody,
    });
    expect(r.statusCode).toBe(404);
  });

  it('renvoie 503 si la source d’historique est injoignable', async () => {
    const down = build(() => Promise.reject(new Error('Binance down')));
    await down.ready();
    const r = await down.inject({
      method: 'POST',
      url: '/api/backtest',
      headers: { Authorization: `Bearer ${down.jwt.sign({ sub: 'u' })}` },
      payload: validBody,
    });
    expect(r.statusCode).toBe(503);
  });
});
