import { useEffect, useState } from 'react';
import { marketMessageSchema, type Candle } from '@trading/shared';

export interface MarketState {
  price: number | null;
  candles: Candle[];
  connected: boolean;
}

/** Ajoute ou remplace la dernière bougie (Binance met à jour la bougie en cours). */
function upsert(candles: Candle[], candle: Candle): Candle[] {
  const last = candles.at(-1);
  if (last && last.time === candle.time) {
    return [...candles.slice(0, -1), candle];
  }
  return [...candles, candle];
}

/** Se connecte au flux /ws/market du symbole donné. Se reconnecte si `symbol` change. */
export function useMarket(symbol: string): MarketState {
  const [price, setPrice] = useState<number | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // On repart de zéro à chaque changement de symbole.
    setPrice(null);
    setCandles([]);
    setConnected(false);

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let closedByUs = false;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(
        `${protocol}://${window.location.host}/ws/market?symbol=${encodeURIComponent(symbol)}`,
      );
      socket = ws;

      ws.onopen = () => {
        setConnected(true);
      };
      ws.onclose = () => {
        setConnected(false);
        if (!closedByUs) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
      ws.onmessage = (event) => {
        const parsed = marketMessageSchema.safeParse(JSON.parse(event.data as string));
        if (!parsed.success) {
          return;
        }
        const message = parsed.data;
        // On ignore les messages d'un autre symbole (sécurité).
        if (message.symbol !== symbol) {
          return;
        }
        if (message.type === 'snapshot') {
          setPrice(message.price);
          setCandles(message.candles);
        } else if (message.type === 'price') {
          setPrice(message.price);
        } else {
          setCandles((previous) => upsert(previous, message.candle));
        }
      };
    };

    connect();

    return () => {
      closedByUs = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, [symbol]);

  return { price, candles, connected };
}
