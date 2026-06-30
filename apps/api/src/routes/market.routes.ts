import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { WebSocket } from 'ws';
import { CANDLE_INTERVALS } from '@trading/shared';
import { requireWsAuth } from '../auth/require-auth';
import type { MarketRegistry } from '../services/binance/market.registry';

export interface MarketRoutesOptions {
  registry: MarketRegistry;
}

/** Symbole demandé en query (?symbol=ETHUSDT), validé ; défaut BTCUSDT. */
function parseSymbol(request: FastifyRequest): string {
  const raw = (request.query as { symbol?: string }).symbol ?? '';
  return /^[A-Za-z0-9]{2,16}USDT$/i.test(raw) ? raw.toUpperCase() : 'BTCUSDT';
}

/** Intervalle demandé en query (?interval=1h), validé ; défaut 1m. */
function parseInterval(request: FastifyRequest): string {
  const raw = (request.query as { interval?: string }).interval ?? '';
  return (CANDLE_INTERVALS as readonly string[]).includes(raw) ? raw : '1m';
}

/** Route WebSocket : chaque client est branché sur le flux symbole + intervalle demandé. */
export function marketRoutes(app: FastifyInstance, options: MarketRoutesOptions): void {
  app.get(
    '/ws/market',
    { websocket: true, preValidation: requireWsAuth },
    (socket: WebSocket, request: FastifyRequest) => {
      options.registry.subscribe(parseSymbol(request), parseInterval(request), socket);
    },
  );
}
