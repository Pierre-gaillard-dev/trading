import { invariant } from '../../domain/invariant';
import type { RandomSource } from '../../ports/random-source';
import type { Signal, Strategy, StrategyContext } from './strategy';

/** Une stratégie membre de l'ensemble, avec son poids (> 0). */
export interface WeightedStrategy {
  readonly strategy: Strategy;
  readonly weight: number;
}

export interface EnsembleConfig {
  readonly entries: readonly WeightedStrategy[];
  /** Source d'aléa injectée (port). */
  readonly random: RandomSource;
}

const VOTE: Record<Signal, number> = { BUY: 1, HOLD: 0, SELL: -1 };

/**
 * Combine plusieurs stratégies pondérées en une seule décision.
 *
 * 1. Chaque membre vote : BUY (+1), SELL (-1), HOLD (0).
 * 2. On en fait une moyenne pondérée par les poids → un `score` ∈ [-1, +1]
 *    (déterministe, sans aléa). Positif = penche achat, négatif = penche vente.
 * 3. Le score sert de **probabilité** : on tire un nombre dans [0, 1) via le
 *    port `RandomSource`. Si score > 0 et tirage < score → BUY ; si score < 0
 *    et tirage < |score| → SELL ; sinon HOLD.
 *
 * Le `decide` n'est donc pas pur au sens strict (il consomme l'aléa), mais il
 * reste **déterministe pour un `RandomSource` donné** → testable en injectant
 * un double (`SequentialRandom`, `SeededRandom`).
 */
export class EnsembleStrategy implements Strategy {
  readonly key = 'ensemble';
  readonly minCandles: number;
  private readonly entries: readonly WeightedStrategy[];
  private readonly random: RandomSource;

  constructor({ entries, random }: EnsembleConfig) {
    invariant(entries.length > 0, 'EnsembleStrategy: au moins une stratégie requise');
    invariant(
      entries.every((e) => e.weight > 0),
      'EnsembleStrategy: chaque poids doit être strictement positif',
    );
    this.entries = entries;
    this.random = random;
    // On attend que toutes les stratégies aient assez de bougies pour décider.
    this.minCandles = Math.max(...entries.map((e) => e.strategy.minCandles));
  }

  /** Score pondéré ∈ [-1, +1] pour la dernière bougie (déterministe, sans aléa). */
  score(context: StrategyContext): number {
    let weighted = 0;
    let total = 0;
    for (const { strategy, weight } of this.entries) {
      total += weight;
      weighted += weight * VOTE[strategy.decide(context)];
    }
    return total === 0 ? 0 : weighted / total;
  }

  decide(context: StrategyContext): Signal {
    const score = this.score(context);
    if (score === 0) {
      return 'HOLD';
    }
    const draw = this.random.next();
    if (score > 0) {
      return draw < score ? 'BUY' : 'HOLD';
    }
    return draw < -score ? 'SELL' : 'HOLD';
  }
}
