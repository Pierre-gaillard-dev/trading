/**
 * Rate of Change (en %) : ROC_t = (close_t − close_{t-period}) / close_{t-period} × 100.
 * `null` tant que i < period, ou si la valeur de référence est 0 (évite ±Infinity/NaN).
 */
export function roc(closes: number[], period: number): (number | null)[] {
  if (period <= 0 || !Number.isInteger(period)) {
    throw new Error('roc: period must be a positive integer');
  }
  const result: (number | null)[] = new Array<number | null>(closes.length).fill(null);
  for (let i = period; i < closes.length; i++) {
    const past = closes[i - period];
    result[i] = past === 0 ? null : ((closes[i] - past) / past) * 100;
  }
  return result;
}
