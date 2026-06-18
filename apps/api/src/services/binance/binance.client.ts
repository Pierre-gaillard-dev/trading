import type { Candle } from '@trading/shared';

const REST_BASE = 'https://api.binance.com';
const WS_BASE = 'wss://stream.binance.com:9443';

/** Transforme une bougie brute Binance (tableau) en notre type Candle. */
function toCandle(entry: unknown): Candle {
  const k = entry as [number, string, string, string, string, string];
  return {
    time: Math.floor(k[0] / 1000), // ms -> secondes
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  };
}

/** URL REST des bougies (klines). */
export function buildKlinesUrl(symbol: string, interval: string, limit: number): string {
  return `${REST_BASE}/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${String(limit)}`;
}

/** Récupère l'historique récent des bougies via l'API REST de Binance. */
export async function fetchRecentCandles(
  symbol: string,
  interval: string,
  limit: number,
): Promise<Candle[]> {
  const response = await fetch(buildKlinesUrl(symbol, interval, limit));
  if (!response.ok) {
    throw new Error(`Binance klines: HTTP ${String(response.status)}`);
  }
  const raw = (await response.json()) as unknown[];
  return raw.map(toCandle);
}

/** URL du flux combiné Binance : trades (prix) + bougies (kline). */
export function buildStreamUrl(symbol: string, interval: string): string {
  const s = symbol.toLowerCase();
  return `${WS_BASE}/stream?streams=${s}@trade/${s}@kline_${interval}`;
}

export type BinanceEvent =
  | { kind: 'price'; price: number }
  | { kind: 'candle'; candle: Candle }
  | null;

/** Décode un message du flux combiné en évènement « prix » ou « bougie ». */
export function parseStreamMessage(raw: string): BinanceEvent {
  const message = JSON.parse(raw) as { data?: unknown };
  const data = message.data;
  if (data === null || typeof data !== 'object') {
    return null;
  }
  const payload = data as Record<string, unknown>;

  if (payload.e === 'trade' && typeof payload.p === 'string') {
    return { kind: 'price', price: Number(payload.p) };
  }

  if (payload.e === 'kline' && typeof payload.k === 'object' && payload.k !== null) {
    const k = payload.k as Record<string, unknown>;
    return {
      kind: 'candle',
      candle: {
        time: Math.floor(Number(k.t) / 1000),
        open: Number(k.o),
        high: Number(k.h),
        low: Number(k.l),
        close: Number(k.c),
        volume: Number(k.v),
      },
    };
  }

  return null;
}
