import { WebSocket } from 'ws';
import type { Candle, MarketMessage } from '@trading/shared';
import { buildStreamUrl, fetchRecentCandles, parseStreamMessage } from './binance.client';

export interface MarketHubOptions {
  symbol: string;
  interval: string;
  historyLimit?: number;
}

/**
 * Relais de données de marché : UNE connexion à Binance, partagée par tous les
 * clients front. Garde le dernier prix + l'historique des bougies en mémoire,
 * et diffuse les mises à jour. Résilient : si Binance est injoignable, le serveur
 * continue de tourner et tente de se reconnecter.
 */
export class MarketHub {
  private readonly clients = new Set<WebSocket>();
  private readonly symbol: string;
  private readonly interval: string;
  private readonly historyLimit: number;

  private candles: Candle[] = [];
  private lastPrice: number | null = null;
  private binance: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(options: MarketHubOptions) {
    this.symbol = options.symbol;
    this.interval = options.interval;
    this.historyLimit = options.historyLimit ?? 500;
  }

  async start(): Promise<void> {
    try {
      this.candles = await fetchRecentCandles(this.symbol, this.interval, this.historyLimit);
      this.lastPrice = this.candles.at(-1)?.close ?? null;
      // Les clients déjà connectés (avant la fin du backfill) reçoivent l'historique.
      this.broadcastSnapshot();
    } catch (error) {
      console.warn('[market] backfill REST échoué :', (error as Error).message);
    }
    this.connect();
  }

  get clientCount(): number {
    return this.clients.size;
  }

  stop(): void {
    this.stopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.binance?.close();
  }

  /** Abonne un client front : envoie le snapshot puis le branche sur les mises à jour. */
  addClient(socket: WebSocket): void {
    this.clients.add(socket);
    this.send(socket, this.snapshot());
    socket.on('close', () => {
      this.clients.delete(socket);
    });
  }

  private snapshot(): MarketMessage {
    return {
      type: 'snapshot',
      symbol: this.symbol,
      interval: this.interval,
      price: this.lastPrice,
      candles: this.candles,
    };
  }

  private broadcastSnapshot(): void {
    this.broadcast(this.snapshot());
  }

  private connect(): void {
    if (this.stopped) {
      return;
    }
    const ws = new WebSocket(buildStreamUrl(this.symbol, this.interval));
    this.binance = ws;
    ws.on('message', (raw: Buffer) => {
      this.handleMessage(raw.toString());
    });
    ws.on('error', (error: Error) => {
      console.warn('[market] WS Binance erreur :', error.message);
    });
    ws.on('close', () => {
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  private handleMessage(raw: string): void {
    const event = parseStreamMessage(raw);
    if (event === null) {
      return;
    }
    if (event.kind === 'price') {
      this.lastPrice = event.price;
      this.broadcast({ type: 'price', symbol: this.symbol, price: event.price });
      return;
    }
    this.upsertCandle(event.candle);
    this.broadcast({ type: 'candle', symbol: this.symbol, candle: event.candle });
  }

  private upsertCandle(candle: Candle): void {
    const last = this.candles.at(-1);
    if (last && last.time === candle.time) {
      this.candles[this.candles.length - 1] = candle;
    } else {
      this.candles.push(candle);
      if (this.candles.length > this.historyLimit) {
        this.candles.shift();
      }
    }
  }

  private broadcast(message: MarketMessage): void {
    for (const client of this.clients) {
      this.send(client, message);
    }
  }

  private send(socket: WebSocket, message: MarketMessage): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }
}
