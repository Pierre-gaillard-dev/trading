/**
 * Moyenne mobile simple. Tableau de même longueur que `values`, avec `null`
 * tant qu'il n'y a pas assez de points (i < period - 1).
 */
export function sma(values: number[], period: number): (number | null)[] {
  if (period <= 0 || !Number.isInteger(period)) {
    throw new Error('sma: period must be a positive integer');
  }
  const result: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) {
      sum -= values[i - period];
    }
    result.push(i >= period - 1 ? sum / period : null);
  }
  return result;
}
