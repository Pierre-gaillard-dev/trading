import type { Candle } from '@trading/shared';

// Domaine "public data" de Binance : mêmes endpoints market data, sans auth,
// souvent accessible là où api.binance.com / stream.binance.com sont bloqués.
const REST_BASE = 'https://data-api.binance.vision';
const WS_BASE = 'wss://data-stream.binance.vision';

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
export function buildKlinesUrl(
  symbol: string,
  interval: string,
  limit: number,
  endTime?: number,
): string {
  const base = `${REST_BASE}/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${String(limit)}`;
  return endTime === undefined ? base : `${base}&endTime=${String(endTime)}`;
}

/** Nombre max de bougies par requête REST Binance. */
const MAX_PER_REQUEST = 1000;
/** Garde-fou : nombre max de bougies récupérables pour un backtest. */
const MAX_HISTORY = 10_000;

/** URL REST des infos d'un symbole (sert à vérifier qu'il existe). */
export function buildExchangeInfoUrl(symbol: string): string {
  return `${REST_BASE}/api/v3/exchangeInfo?symbol=${symbol.toUpperCase()}`;
}

/** Vrai si le symbole existe sur Binance (HTTP 200), faux sinon. */
export async function symbolExists(symbol: string): Promise<boolean> {
  const response = await fetch(buildExchangeInfoUrl(symbol));
  return response.ok;
}

/** Récupère une page de bougies (≤ 1000), éventuellement bornée par `endTime` (ms). */
async function fetchPage(
  symbol: string,
  interval: string,
  limit: number,
  endTime?: number,
): Promise<Candle[]> {
  const response = await fetch(buildKlinesUrl(symbol, interval, limit, endTime));
  if (!response.ok) {
    throw new Error(`Binance klines: HTTP ${String(response.status)}`);
  }
  const raw = (await response.json()) as unknown[];
  return raw.map(toCandle);
}

/** Récupère l'historique récent des bougies via l'API REST de Binance (≤ 1000). */
export async function fetchRecentCandles(
  symbol: string,
  interval: string,
  limit: number,
): Promise<Candle[]> {
  return fetchPage(symbol, interval, Math.min(limit, MAX_PER_REQUEST));
}

/**
 * Récupère un long historique en paginant (pages de 1000, en remontant le temps).
 * Plafonné à `MAX_HISTORY` bougies. Renvoie l'ordre chronologique (plus ancien d'abord).
 */
export async function fetchHistory(
  symbol: string,
  interval: string,
  total: number,
): Promise<Candle[]> {
  const wanted = Math.min(total, MAX_HISTORY);
  if (wanted <= MAX_PER_REQUEST) {
    return fetchPage(symbol, interval, wanted);
  }

  let candles: Candle[] = [];
  let endTime: number | undefined;
  while (candles.length < wanted) {
    const limit = Math.min(MAX_PER_REQUEST, wanted - candles.length);
    const page = await fetchPage(symbol, interval, limit, endTime);
    if (page.length === 0) {
      break;
    }
    candles = page.concat(candles); // les plus anciennes devant
    endTime = page[0].time * 1000 - 1; // page suivante = juste avant la plus ancienne
    if (page.length < limit) {
      break; // plus d'historique disponible
    }
  }
  return candles;
}

/** URL du flux combiné Binance : trades (prix) + bougies (kline). */
export function buildStreamUrl(symbol: string, interval: string): string {
  const s = symbol.toLowerCase();
  return `${WS_BASE}/stream?streams=${s}@trade/${s}@kline_${interval}`;
}

export type BinanceEvent =
  | { kind: 'price'; price: number }
  | { kind: 'candle'; candle: Candle; closed: boolean }
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
      closed: k.x === true, // k.x = la bougie est-elle clôturée ?
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
