/** Sens d'un ordre (v1 : achat/vente au marché). */
export type OrderSide = 'BUY' | 'SELL';

/** Motif de rejet d'un ordre par le moteur d'exécution. */
export type RejectReason =
  | 'INSUFFICIENT_FUNDS'
  | 'INSUFFICIENT_POSITION'
  | 'BELOW_MIN_NOTIONAL'
  | 'NON_POSITIVE_QUANTITY';
