/**
 * Renvoie les deux dernières valeurs d'une série d'indicateur (avant-dernière, dernière)
 * si elles sont toutes deux disponibles (non-null), sinon `null`.
 * Sert à détecter un croisement sur le dernier point.
 */
export function lastTwoNumbers(series: (number | null)[]): [number, number] | null {
  const n = series.length;
  if (n < 2) {
    return null;
  }
  const prev = series[n - 2];
  const now = series[n - 1];
  if (prev === null || now === null) {
    return null;
  }
  return [prev, now];
}
