/**
 * Contraintes d'un symbole (inspirées de Binance exchangeInfo).
 * Pilote les arrondis et les rejets d'ordres (cf. docs/trading-engine.md §1).
 */
export interface SymbolSpec {
  /** Paire complète, ex. "BTCUSDT". */
  readonly symbol: string;
  /** Décimales max de la quantité (base). */
  readonly basePrecision: number;
  /** Décimales max des montants (quote). */
  readonly quotePrecision: number;
  /** Pas de quantité (lot size), ex. "0.00001". */
  readonly stepSize: string;
  /** Notionnel minimum d'un ordre, en quote, ex. "10". */
  readonly minNotional: string;
}
