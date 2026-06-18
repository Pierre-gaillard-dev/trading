import { sma } from './sma';
import { stddev } from './stddev';

export interface BollingerBands {
  middle: (number | null)[];
  upper: (number | null)[];
  lower: (number | null)[];
}

/**
 * Bandes de Bollinger : middle = SMA(period) ; upper/lower = middle ± k·σ
 * (σ = écart-type population). `null` tant que la fenêtre est incomplète.
 */
export function bollinger(closes: number[], period = 20, multiplier = 2): BollingerBands {
  const middle = sma(closes, period);
  const deviation = stddev(closes, period);

  const upper = closes.map((_, i) => {
    const m = middle[i];
    const d = deviation[i];
    return m !== null && d !== null ? m + multiplier * d : null;
  });
  const lower = closes.map((_, i) => {
    const m = middle[i];
    const d = deviation[i];
    return m !== null && d !== null ? m - multiplier * d : null;
  });

  return { middle, upper, lower };
}
