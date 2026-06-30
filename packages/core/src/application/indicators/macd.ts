import { ema } from './ema';

export interface MacdResult {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
}

/** EMA d'une série pouvant commencer par des `null` (suffixe non-null contigu). */
function emaOfNullable(values: (number | null)[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array<number | null>(values.length).fill(null);
  const start = values.findIndex((value) => value !== null);
  if (start === -1) {
    return result;
  }
  const dense = values.slice(start).filter((value): value is number => value !== null);
  const smoothed = ema(dense, period);
  for (let i = 0; i < smoothed.length; i++) {
    result[start + i] = smoothed[i];
  }
  return result;
}

/**
 * MACD : ligne = EMA(fast) − EMA(slow) ; signal = EMA(ligne, signalPeriod) ;
 * histogramme = ligne − signal. Renvoie trois séries alignées sur `closes`.
 */
export function macd(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MacdResult {
  if (
    !Number.isInteger(fastPeriod) ||
    !Number.isInteger(slowPeriod) ||
    !Number.isInteger(signalPeriod) ||
    fastPeriod <= 0 ||
    signalPeriod <= 0 ||
    fastPeriod >= slowPeriod
  ) {
    throw new Error('macd: invalid periods (need 0 < fast < slow, signal > 0)');
  }

  const fast = ema(closes, fastPeriod);
  const slow = ema(closes, slowPeriod);

  const macdLine: (number | null)[] = closes.map((_, i) => {
    const f = fast[i];
    const s = slow[i];
    return f !== null && s !== null ? f - s : null;
  });

  const signal = emaOfNullable(macdLine, signalPeriod);

  const histogram: (number | null)[] = closes.map((_, i) => {
    const m = macdLine[i];
    const sg = signal[i];
    return m !== null && sg !== null ? m - sg : null;
  });

  return { macd: macdLine, signal, histogram };
}
