import type { SymbolSpec } from '@trading/core';

/**
 * SymbolSpec par défaut (raisonnable) pour une paire *USDT.
 * À terme, à remplacer par les vraies valeurs de Binance `exchangeInfo`
 * (précision et minNotional propres à chaque crypto).
 */
export function defaultSymbolSpec(symbol: string): SymbolSpec {
  return { symbol, basePrecision: 8, quotePrecision: 2, stepSize: '0.00001', minNotional: '10' };
}
