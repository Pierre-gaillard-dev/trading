import type { Candle } from '../domain/candle';

/** Bougie de test, avec valeurs par défaut surchargeables. */
export function aCandle(overrides: Partial<Candle> = {}): Candle {
  return { openTime: 0, open: 100, high: 101, low: 99, close: 100, volume: 1, ...overrides };
}

/**
 * Construit une série de bougies à partir d'une liste de clôtures (open/high/low = close).
 * Pratique pour tester les indicateurs et stratégies sur des séries connues.
 */
export function candlesFromCloses(closes: number[], startTime = 0, stepMs = 60_000): Candle[] {
  return closes.map((close, i) =>
    aCandle({ openTime: startTime + i * stepMs, open: close, high: close, low: close, close }),
  );
}
