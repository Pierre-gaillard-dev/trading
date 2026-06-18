import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { WebSocket } from 'ws';
import type { MarketRegistry } from '../services/binance/market.registry';

export interface MarketRoutesOptions {
  registry: MarketRegistry;
}

/** Symbole demandé en query (?symbol=ETHUSDT), validé ; défaut BTCUSDT. */
function parseSymbol(request: FastifyRequest): string {
  const raw = (request.query as { symbol?: string }).symbol ?? '';
  return /^[A-Za-z0-9]{2,16}USDT$/i.test(raw) ? raw.toUpperCase() : 'BTCUSDT';
}

/** Route WebSocket : chaque client est branché sur le hub du symbole demandé. */
export function marketRoutes(app: FastifyInstance, options: MarketRoutesOptions): void {
  app.get('/ws/market', { websocket: true }, (socket: WebSocket, request: FastifyRequest) => {
    options.registry.subscribe(parseSymbol(request), socket);
  });
}
