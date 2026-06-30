import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Candle as MarketCandle } from '@trading/shared';
import type { Candle as CoreCandle } from '@trading/core';
import { fetchHistory } from '../../src/services/binance/binance.client';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(HERE, '..', 'data');

/** Un jeu de données = un symbole, un intervalle, un nombre de bougies. */
export interface Dataset {
  readonly symbol: string;
  readonly interval: string;
  readonly count: number;
}

/**
 * Univers de backtest : 3 actifs (régimes différents) × 3 échelles de temps.
 *  - 15m × 5000 ≈ 52 jours (court terme, bruité)
 *  - 1h  × 5000 ≈ 208 jours (moyen terme)
 *  - 1d  × ~1500-2000 ≈ 4-5 ans (long terme, cycles complets)
 */
export const DATASETS: readonly Dataset[] = [
  { symbol: 'BTCUSDT', interval: '15m', count: 5000 },
  { symbol: 'BTCUSDT', interval: '1h', count: 5000 },
  { symbol: 'BTCUSDT', interval: '1d', count: 2000 },
  { symbol: 'ETHUSDT', interval: '15m', count: 5000 },
  { symbol: 'ETHUSDT', interval: '1h', count: 5000 },
  { symbol: 'ETHUSDT', interval: '1d', count: 2000 },
  { symbol: 'SOLUSDT', interval: '1h', count: 5000 },
  { symbol: 'SOLUSDT', interval: '1d', count: 1500 },
];

/**
 * Jeux court terme ÉTENDUS (régimes variés) pour la recherche de profit en 15m/1h :
 *  - 1h  × 10000 ≈ 14 mois (englobe hausses ET baisses)
 *  - 15m × 10000 ≈ 104 jours
 */
export const SHORT_TERM_DATASETS: readonly Dataset[] = [
  { symbol: 'BTCUSDT', interval: '1h', count: 10000 },
  { symbol: 'ETHUSDT', interval: '1h', count: 10000 },
  { symbol: 'SOLUSDT', interval: '1h', count: 10000 },
  { symbol: 'BTCUSDT', interval: '15m', count: 10000 },
  { symbol: 'ETHUSDT', interval: '15m', count: 10000 },
  { symbol: 'SOLUSDT', interval: '15m', count: 10000 },
];

/** Nombre de périodes par an, pour annualiser le Sharpe selon l'intervalle. */
export const PERIODS_PER_YEAR: Record<string, number> = {
  '15m': 4 * 24 * 365,
  '1h': 24 * 365,
  '1d': 365,
};

function cachePath(ds: Dataset): string {
  return join(DATA_DIR, `${ds.symbol}-${ds.interval}-${String(ds.count)}.json`);
}

export function datasetLabel(ds: Dataset): string {
  return `${ds.symbol} ${ds.interval}`;
}

/** Télécharge un jeu de données et l'écrit dans le cache local (idempotent). */
export async function fetchAndCache(ds: Dataset): Promise<number> {
  mkdirSync(DATA_DIR, { recursive: true });
  const candles = await fetchHistory(ds.symbol, ds.interval, ds.count);
  writeFileSync(cachePath(ds), JSON.stringify(candles));
  return candles.length;
}

/** Charge un jeu de données depuis le cache (lève s'il n'a pas été téléchargé). */
export function loadMarket(ds: Dataset): MarketCandle[] {
  const path = cachePath(ds);
  if (!existsSync(path)) {
    throw new Error(`Cache manquant pour ${datasetLabel(ds)} — lance d'abord "fetch".`);
  }
  return JSON.parse(readFileSync(path, 'utf8')) as MarketCandle[];
}

export function isCached(ds: Dataset): boolean {
  return existsSync(cachePath(ds));
}

/** Conversion bougie marché (temps en secondes) → bougie cœur (même convention que l'API). */
export function toCore(candle: MarketCandle): CoreCandle {
  return {
    openTime: candle.time,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  };
}

/** Charge un jeu de données prêt pour le backtest (bougies cœur, ordre chronologique). */
export function loadCore(ds: Dataset): CoreCandle[] {
  return loadMarket(ds).map(toCore);
}
