import type { Price } from './price';
import type { Quantity } from './quantity';

/**
 * Position détenue sur un symbole (v1 : long uniquement).
 * `null` côté contexte de stratégie = on est « à plat » (flat).
 */
export interface Position {
  readonly symbol: string;
  readonly quantity: Quantity;
  readonly avgEntryPrice: Price;
}
