/**
 * Détection de croisement entre deux séries A et B, entre l'avant-dernier point
 * (`prev`) et le dernier (`now`). Factorisé et réutilisé par plusieurs stratégies.
 */

/** A passe (strictement) au-dessus de B. */
export function crossesAbove(aPrev: number, aNow: number, bPrev: number, bNow: number): boolean {
  return aPrev <= bPrev && aNow > bNow;
}

/** A passe (strictement) au-dessous de B. */
export function crossesBelow(aPrev: number, aNow: number, bPrev: number, bNow: number): boolean {
  return aPrev >= bPrev && aNow < bNow;
}
