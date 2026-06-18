import type { RandomSource } from '../../ports/random-source';
import type { Strategy } from './strategy';
import { EnsembleStrategy, type WeightedStrategy } from './ensemble.strategy';
import { MaCrossoverStrategy, type MaCrossoverParams } from './ma-crossover.strategy';
import { RsiStrategy, type RsiParams } from './rsi.strategy';
import { MacdStrategy, type MacdParams } from './macd.strategy';
import { BollingerBandsStrategy, type BollingerParams } from './bollinger-bands.strategy';
import { MomentumRocStrategy, type MomentumRocParams } from './momentum-roc.strategy';
import { DonchianBreakoutStrategy, type DonchianParams } from './donchian-breakout.strategy';
import { BuyAndHoldStrategy } from './buy-and-hold.strategy';
import { CandleStreakStrategy, type CandleStreakParams } from './candle-streak.strategy';

export type { Signal, Strategy, StrategyContext } from './strategy';
export {
  EnsembleStrategy,
  type WeightedStrategy,
  type EnsembleConfig,
} from './ensemble.strategy';
export { MaCrossoverStrategy, type MaCrossoverParams, type MaType } from './ma-crossover.strategy';
export { RsiStrategy, type RsiParams } from './rsi.strategy';
export { MacdStrategy, type MacdParams } from './macd.strategy';
export {
  BollingerBandsStrategy,
  type BollingerParams,
  type BollingerMode,
} from './bollinger-bands.strategy';
export { MomentumRocStrategy, type MomentumRocParams } from './momentum-roc.strategy';
export { DonchianBreakoutStrategy, type DonchianParams } from './donchian-breakout.strategy';
export { BuyAndHoldStrategy } from './buy-and-hold.strategy';
export { CandleStreakStrategy, type CandleStreakParams } from './candle-streak.strategy';

/** Clés stables des stratégies disponibles. */
export type StrategyKey =
  | 'ma_crossover'
  | 'rsi'
  | 'macd'
  | 'bollinger_bands'
  | 'momentum_roc'
  | 'donchian_breakout'
  | 'buy_and_hold'
  | 'candle_streak';

export const STRATEGY_KEYS: readonly StrategyKey[] = [
  'ma_crossover',
  'rsi',
  'macd',
  'bollinger_bands',
  'momentum_roc',
  'donchian_breakout',
  'buy_and_hold',
  'candle_streak',
];

/**
 * Fabrique une stratégie à partir de sa clé et de ses paramètres.
 * Les paramètres sont validés par le constructeur de chaque stratégie (lève si invalide).
 */
export function createStrategy(key: StrategyKey, params: unknown = {}): Strategy {
  switch (key) {
    case 'ma_crossover':
      return new MaCrossoverStrategy(params as MaCrossoverParams);
    case 'rsi':
      return new RsiStrategy(params as RsiParams);
    case 'macd':
      return new MacdStrategy(params as MacdParams);
    case 'bollinger_bands':
      return new BollingerBandsStrategy(params as BollingerParams);
    case 'momentum_roc':
      return new MomentumRocStrategy(params as MomentumRocParams);
    case 'donchian_breakout':
      return new DonchianBreakoutStrategy(params as DonchianParams);
    case 'buy_and_hold':
      return new BuyAndHoldStrategy();
    case 'candle_streak':
      return new CandleStreakStrategy(params as CandleStreakParams);
  }
}

/** Une stratégie membre de l'ensemble : sa clé, son poids, ses paramètres. */
export interface EnsembleEntry {
  key: StrategyKey;
  weight: number;
  params?: unknown;
}

/**
 * Fabrique un ensemble pondéré à partir d'une liste de clés/poids et d'une
 * source d'aléa injectée. Chaque membre est construit via `createStrategy`.
 */
export function createEnsemble(entries: readonly EnsembleEntry[], random: RandomSource): Strategy {
  const weighted: WeightedStrategy[] = entries.map((entry) => ({
    strategy: createStrategy(entry.key, entry.params ?? {}),
    weight: entry.weight,
  }));
  return new EnsembleStrategy({ entries: weighted, random });
}
