import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import type { MarketHub } from '../services/binance/market.gateway';

export interface MarketRoutesOptions {
  hub: MarketHub;
}

/** Route WebSocket : chaque client front qui se connecte est branché sur le hub. */
export function marketRoutes(app: FastifyInstance, options: MarketRoutesOptions): void {
  app.get('/ws/market', { websocket: true }, (socket: WebSocket) => {
    options.hub.addClient(socket);
  });
}
