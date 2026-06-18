import type { RandomSource } from '@trading/core';

/**
 * Adapter d'infrastructure du port `RandomSource` : s'appuie sur `Math.random`.
 * C'est le SEUL endroit autorisé à tirer un vrai aléa ; le cœur le reçoit injecté.
 */
export class SystemRandom implements RandomSource {
  next(): number {
    return Math.random();
  }
}
