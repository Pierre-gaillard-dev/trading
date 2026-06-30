import type { Signal, Strategy, StrategyContext } from './strategy';

/** Référence (benchmark) : acheter une fois (à plat), puis ne plus jamais vendre. */
export class BuyAndHoldStrategy implements Strategy {
  readonly key = 'buy_and_hold';
  readonly minCandles = 1;

  decide(context: StrategyContext): Signal {
    return context.position === null ? 'BUY' : 'HOLD';
  }
}
