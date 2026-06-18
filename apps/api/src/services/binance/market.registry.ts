import type { WebSocket } from 'ws';
import type { Candle } from '@trading/shared';
import type { CandleRepository } from '../../repositories/candle.repository';
import { MarketHub } from './market.gateway';

/** Source de bougies clôturées à laquelle un worker peut s'abonner. */
export interface CandleFeed {
  attach(symbol: string, interval: string, onClosedCandle: (candle: Candle) => void): () => void;
}

/**
 * Gère un MarketHub par (symbole, intervalle), à la demande : on ouvre une
 * connexion Binance quand un consommateur l'écoute (dashboard ou worker), et on
 * la ferme quand le dernier part. Les bougies sont persistées via le repository.
 */
export class MarketRegistry implements CandleFeed {
  private readonly hubs = new Map<string, MarketHub>();

  constructor(private readonly candleRepository?: CandleRepository) {}

  /** Branche un client dashboard (WebSocket) sur le flux symbole + intervalle. */
  subscribe(symbol: string, interval: string, socket: WebSocket): void {
    const { hub, key } = this.hubFor(symbol, interval);
    hub.addClient(socket);
    socket.on('close', () => {
      this.disposeIfIdle(key, hub);
    });
  }

  /** Branche un worker (in-process) sur les bougies clôturées. Renvoie une fonction de détachement. */
  attach(symbol: string, interval: string, onClosedCandle: (candle: Candle) => void): () => void {
    const { hub, key } = this.hubFor(symbol, interval);
    const unsubscribe = hub.onClosedCandle(onClosedCandle);
    return () => {
      unsubscribe();
      this.disposeIfIdle(key, hub);
    };
  }

  stopAll(): void {
    for (const hub of this.hubs.values()) {
      hub.stop();
    }
    this.hubs.clear();
  }

  private hubFor(symbol: string, interval: string): { hub: MarketHub; key: string } {
    const sym = symbol.toUpperCase();
    const key = `${sym}|${interval}`;
    let hub = this.hubs.get(key);
    if (!hub) {
      hub = new MarketHub({ symbol: sym, interval, candleRepository: this.candleRepository });
      this.hubs.set(key, hub);
      void hub.start();
    }
    return { hub, key };
  }

  private disposeIfIdle(key: string, hub: MarketHub): void {
    if (hub.isIdle()) {
      hub.stop();
      this.hubs.delete(key);
    }
  }
}
