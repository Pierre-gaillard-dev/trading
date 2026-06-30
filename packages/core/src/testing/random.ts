import { invariant } from '../domain/invariant';
import type { RandomSource } from '../ports/random-source';

// SeededRandom est une vraie utilité (backtests reproductibles) → vit hors de testing/.
// On la ré-exporte ici pour rester pratique côté tests.
export { SeededRandom } from '../random/seeded-random';

/**
 * Double de test : rejoue une liste de valeurs fixées, en boucle.
 * Idéal pour piloter un tirage au sort de façon 100 % déterministe
 * (ex. `new SequentialRandom([0.1, 0.9])` → 0.1, 0.9, 0.1, 0.9, …).
 */
export class SequentialRandom implements RandomSource {
  private index = 0;

  constructor(private readonly values: readonly number[]) {
    invariant(values.length > 0, 'SequentialRandom: au moins une valeur requise');
    invariant(
      values.every((v) => v >= 0 && v < 1),
      'SequentialRandom: chaque valeur doit être dans [0, 1)',
    );
  }

  next(): number {
    const value = this.values[this.index % this.values.length];
    this.index += 1;
    return value;
  }
}
