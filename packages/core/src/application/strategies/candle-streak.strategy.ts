import { invariant } from '../../domain/invariant';
import type { Candle } from '../../domain/candle';
import type { Signal, Strategy, StrategyContext } from './strategy';

export interface CandleStreakParams {
  /** Nombre de bougies rouges consécutives qui déclenche un achat. */
  redToBuy?: number;
  /** Nombre de bougies vertes consécutives qui déclenche une vente. */
  greenToSell?: number;
}

type Color = 'red' | 'green' | 'flat';

/** Couleur d'une bougie : rouge si elle clôture sous son ouverture, verte si au-dessus. */
function color(candle: Candle): Color {
  if (candle.close < candle.open) {
    return 'red';
  }
  if (candle.close > candle.open) {
    return 'green';
  }
  return 'flat';
}

/**
 * Série de bougies (« candle streak »), contrarien :
 * après N bougies rouges consécutives → BUY (on parie sur le rebond),
 * après M bougies vertes consécutives → SELL (on prend ses gains après la hausse).
 * Une bougie neutre (close == open) casse la série.
 */
export class CandleStreakStrategy implements Strategy {
  readonly key = 'candle_streak';
  readonly minCandles: number;
  private readonly redToBuy: number;
  private readonly greenToSell: number;

  constructor(params: CandleStreakParams = {}) {
    this.redToBuy = params.redToBuy ?? 3;
    this.greenToSell = params.greenToSell ?? 5;
    invariant(
      Number.isInteger(this.redToBuy) && this.redToBuy > 0,
      'candle_streak: redToBuy doit être un entier > 0',
    );
    invariant(
      Number.isInteger(this.greenToSell) && this.greenToSell > 0,
      'candle_streak: greenToSell doit être un entier > 0',
    );
    this.minCandles = Math.max(this.redToBuy, this.greenToSell);
  }

  decide(context: StrategyContext): Signal {
    const { candles } = context;
    if (candles.length < this.minCandles) {
      return 'HOLD';
    }
    const lastColor = color(candles[candles.length - 1]);
    if (lastColor === 'flat') {
      return 'HOLD';
    }
    // Longueur de la série de même couleur qui se termine sur la dernière bougie.
    let streak = 0;
    for (let i = candles.length - 1; i >= 0; i -= 1) {
      if (color(candles[i]) !== lastColor) {
        break;
      }
      streak += 1;
    }
    if (lastColor === 'red' && streak >= this.redToBuy) {
      return 'BUY';
    }
    if (lastColor === 'green' && streak >= this.greenToSell) {
      return 'SELL';
    }
    return 'HOLD';
  }
}
