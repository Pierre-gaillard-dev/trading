function toRsi(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) {
    return 100;
  }
  if (avgGain === 0) {
    return 0;
  }
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Relative Strength Index avec **lissage de Wilder**.
 * - 1re valeur (index `period`) : moyenne SIMPLE des `period` premières variations.
 * - suivantes : avg = (avg_prev·(period-1) + valeur) / period.
 * `null` tant que i < period.
 */
export function rsi(closes: number[], period = 14): (number | null)[] {
  if (period <= 1 || !Number.isInteger(period)) {
    throw new Error('rsi: period must be an integer > 1');
  }
  const result: (number | null)[] = new Array<number | null>(closes.length).fill(null);
  if (closes.length <= period) {
    return result;
  }

  // Première moyenne (simple) sur les `period` premières variations.
  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta >= 0) {
      gainSum += delta;
    } else {
      lossSum -= delta;
    }
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  result[period] = toRsi(avgGain, avgLoss);

  // Lissage de Wilder pour les valeurs suivantes.
  for (let i = period + 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = toRsi(avgGain, avgLoss);
  }
  return result;
}
