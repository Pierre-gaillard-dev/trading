import type { Candle } from '../../domain/candle';
import type { Position } from '../../domain/position';

/** Décision émise par une stratégie pour la dernière bougie du contexte. */
export type Signal = 'BUY' | 'SELL' | 'HOLD';

/** Tout ce dont une stratégie a besoin pour décider. Immuable. */
export interface StrategyContext {
  /** Bougies clôturées, ordre chronologique (la plus récente en dernier). */
  readonly candles: readonly Candle[];
  /** Position actuelle sur le symbole, ou null si à plat (flat). */
  readonly position: Position | null;
}

/**
 * Stratégie = fonction PURE et déterministe : à entrée identique, sortie identique.
 * Aucune IO, aucun accès au temps/aléa. Le sizing (combien) n'est PAS ici.
 */
export interface Strategy {
  /** Identifiant stable (clé utilisée en base et dans l'API). */
  readonly key: string;
  /** Nombre minimal de bougies requis avant de pouvoir décider. */
  readonly minCandles: number;
  decide(context: StrategyContext): Signal;
}
