import { invariant } from '../domain/invariant';
import type { RandomSource } from '../ports/random-source';

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

/**
 * Double de test : générateur pseudo-aléatoire déterministe (mulberry32).
 * Même graine → même séquence. Pratique pour des séries « réalistes » mais
 * reproductibles, sans dépendre de `Math.random`.
 */
export class SeededRandom implements RandomSource {
  private state: number;

  constructor(seed = 1) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}
