import type { RandomSource } from '../ports/random-source';

/**
 * Générateur pseudo-aléatoire déterministe (mulberry32) : même graine → même
 * séquence. Utile partout où l'on veut de l'aléa REPRODUCTIBLE — typiquement un
 * backtest qu'on peut rejouer à l'identique, ou un test. Implémente le port
 * `RandomSource`, donc interchangeable avec l'aléa système.
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
