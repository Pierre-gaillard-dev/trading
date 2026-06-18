import type { Candle } from '@trading/shared';
import type { CandleRepository } from '../repositories/candle.repository';

/** Faux stockage de bougies en mémoire (pour les tests, sans base). */
export class InMemoryCandleRepository implements CandleRepository {
  private readonly store = new Map<string, Map<number, Candle>>();

  private bucket(symbol: string, interval: string): Map<number, Candle> {
    const key = `${symbol}|${interval}`;
    let bucket = this.store.get(key);
    if (!bucket) {
      bucket = new Map<number, Candle>();
      this.store.set(key, bucket);
    }
    return bucket;
  }

  saveHistory(symbol: string, interval: string, candles: Candle[]): Promise<void> {
    const bucket = this.bucket(symbol, interval);
    for (const candle of candles) {
      if (!bucket.has(candle.time)) {
        bucket.set(candle.time, candle);
      }
    }
    return Promise.resolve();
  }

  saveClosedCandle(symbol: string, interval: string, candle: Candle): Promise<void> {
    this.bucket(symbol, interval).set(candle.time, candle);
    return Promise.resolve();
  }

  getRecent(symbol: string, interval: string, limit: number): Promise<Candle[]> {
    const all = [...this.bucket(symbol, interval).values()].sort((a, b) => a.time - b.time);
    return Promise.resolve(all.slice(-limit));
  }
}
