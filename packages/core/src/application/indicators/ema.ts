/**
 * Moyenne mobile exponentielle. Seed = SMA des `period` premières valeurs,
 * puis EMA_t = close_t·k + EMA_{t-1}·(1-k) avec k = 2/(period+1).
 * `null` tant que i < period - 1.
 */
export function ema(values: number[], period: number): (number | null)[] {
  if (period <= 0 || !Number.isInteger(period)) {
    throw new Error('ema: period must be a positive integer');
  }
  const result: (number | null)[] = new Array<number | null>(values.length).fill(null);
  if (values.length < period) {
    return result;
  }

  const k = 2 / (period + 1);
  let seed = 0;
  for (let i = 0; i < period; i++) {
    seed += values[i];
  }
  seed /= period;

  result[period - 1] = seed;
  let previous = seed;
  for (let i = period; i < values.length; i++) {
    previous = values[i] * k + previous * (1 - k);
    result[i] = previous;
  }
  return result;
}
