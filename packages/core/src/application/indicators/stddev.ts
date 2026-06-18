/**
 * Écart-type **population** (÷ N) sur une fenêtre glissante.
 * Convention cohérente avec les bandes de Bollinger. `null` tant que i < period - 1.
 */
export function stddev(values: number[], period: number): (number | null)[] {
  if (period <= 1 || !Number.isInteger(period)) {
    throw new Error('stddev: period must be an integer > 1');
  }
  const result: (number | null)[] = new Array<number | null>(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    const window = values.slice(i - period + 1, i + 1);
    const mean = window.reduce((sum, value) => sum + value, 0) / period;
    const variance = window.reduce((sum, value) => sum + (value - mean) ** 2, 0) / period;
    result[i] = Math.sqrt(variance);
  }
  return result;
}
