import type { WebSocket } from 'ws';
import { MarketHub } from './market.gateway';

/**
 * Gère un MarketHub par symbole, à la demande : on ouvre une connexion Binance
 * pour un symbole quand un premier client l'écoute, et on la ferme quand le
 * dernier client part. Permet au front de choisir quelle crypto afficher.
 */
export class MarketRegistry {
  private readonly hubs = new Map<string, MarketHub>();

  constructor(private readonly interval = '1m') {}

  subscribe(symbol: string, socket: WebSocket): void {
    const key = symbol.toUpperCase();
    let hub = this.hubs.get(key);
    if (!hub) {
      hub = new MarketHub({ symbol: key, interval: this.interval });
      this.hubs.set(key, hub);
      void hub.start();
    }
    const currentHub = hub;
    currentHub.addClient(socket);

    socket.on('close', () => {
      if (currentHub.clientCount === 0) {
        currentHub.stop();
        this.hubs.delete(key);
      }
    });
  }

  stopAll(): void {
    for (const hub of this.hubs.values()) {
      hub.stop();
    }
    this.hubs.clear();
  }
}
