import Decimal from 'decimal.js';

// Précision interne large ; les arrondis "métier" sont explicites et testés.
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };
export type DecimalValue = Decimal.Value;
