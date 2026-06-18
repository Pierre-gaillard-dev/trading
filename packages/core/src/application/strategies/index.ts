import type { Strategy } from './strategy';
import { MaCrossoverStrategy, type MaCrossoverParams } from './ma-crossover.strategy';
import { RsiStrategy, type RsiParams } from './rsi.strategy';
import { MacdStrategy, type MacdParams } from './macd.strategy';
import { BollingerBandsStrategy, type BollingerParams } from './bollinger-bands.strategy';
import { MomentumRocStrategy, type MomentumRocParams } from './momentum-roc.strategy';
import { DonchianBreakoutStrategy, type DonchianParams } from './donchian-breakout.strategy';
import { BuyAndHoldStrategy } from './buy-and-hold.strategy';

export type { Signal, Strategy, StrategyContext } from './strategy';
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

/** Clés stables des stratégies disponibles. */
export type StrategyKey =
  | 'ma_crossover'
  | 'rsi'
  | 'macd'
  | 'bollinger_bands'
  | 'momentum_roc'
  | 'donchian_breakout'
  | 'buy_and_hold';

export const STRATEGY_KEYS: readonly StrategyKey[] = [
  'ma_crossover',
  'rsi',
  'macd',
  'bollinger_bands',
  'momentum_roc',
  'donchian_breakout',
  'buy_and_hold',
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
  }
}
