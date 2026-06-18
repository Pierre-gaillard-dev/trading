/**
 * Bougie OHLCV clôturée, vue par le domaine. `openTime` en epoch ms.
 * Les prix sont des `number` : ce sont des entrées de calcul d'indicateurs
 * (analyse technique), pas des montants d'argent. Le décimal est réservé à
 * l'argent (Money/Quantity/Price) côté portefeuille/exécution.
 */
export interface Candle {
  readonly openTime: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
}
