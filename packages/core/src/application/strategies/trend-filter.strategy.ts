import { invariant } from '../../domain/invariant';
import { sma } from '../indicators/sma';
import { ema } from '../indicators/ema';
import { crossesAbove, crossesBelow } from '../indicators/crossover';
import { lastTwoNumbers } from './support';
import type { MaType } from './ma-crossover.strategy';
import type { Signal, Strategy, StrategyContext } from './strategy';

export interface TrendFilterParams {
  /** Type de moyenne pour le croisement d'entrée (défaut EMA). */
  maType?: MaType;
  /** Période de la moyenne rapide (entrée). Défaut 20. */
  fastPeriod?: number;
  /** Période de la moyenne lente (entrée). Défaut 100. */
  slowPeriod?: number;
  /** Période de la SMA de tendance de fond (filtre de régime). Défaut 200. */
  trendPeriod?: number;
}

/**
 * Croisement de moyennes **filtré par un régime de tendance de fond**.
 *
 * Entrée : croisement d'une MA rapide au-dessus d'une MA lente (comme `ma_crossover`).
 * Filtre : on n'autorise les **achats** que si le prix est **au-dessus** de la SMA
 * longue de tendance (`trendPeriod`). Sous cette SMA (régime baissier), on bloque les
 * achats et on ne laisse passer que les **sorties** (SELL). Le but est d'éviter
 * d'« attraper les couteaux qui tombent » : moins de faux signaux en marché baissier,
 * drawdown et risque ajusté nettement meilleurs (cf. recherche `research/05b-*`).
 *
 * Stratégie PURE et déterministe : aucune IO, aucun aléa.
 */
export class TrendFilterStrategy implements Strategy {
  readonly key = 'trend_filter';
  readonly minCandles: number;
  private readonly maType: MaType;
  private readonly fastPeriod: number;
  private readonly slowPeriod: number;
  private readonly trendPeriod: number;

  constructor(params: TrendFilterParams = {}) {
    this.maType = params.maType ?? 'EMA';
    this.fastPeriod = params.fastPeriod ?? 20;
    this.slowPeriod = params.slowPeriod ?? 100;
    this.trendPeriod = params.trendPeriod ?? 200;
    invariant(
      Number.isInteger(this.fastPeriod) && this.fastPeriod > 0,
      'trend_filter: fastPeriod doit être un entier > 0',
    );
    invariant(
      Number.isInteger(this.slowPeriod) && this.slowPeriod > this.fastPeriod,
      'trend_filter: slowPeriod doit être un entier > fastPeriod',
    );
    invariant(
      Number.isInteger(this.trendPeriod) && this.trendPeriod > 1,
      'trend_filter: trendPeriod doit être un entier > 1',
    );
    this.minCandles = Math.max(this.slowPeriod, this.trendPeriod) + 1;
  }

  decide(context: StrategyContext): Signal {
    const closes = context.candles.map((candle) => candle.close);
    if (closes.length < this.minCandles) {
      return 'HOLD';
    }

    const movingAverage = this.maType === 'SMA' ? sma : ema;
    const fast = lastTwoNumbers(movingAverage(closes, this.fastPeriod));
    const slow = lastTwoNumbers(movingAverage(closes, this.slowPeriod));
    if (fast === null || slow === null) {
      return 'HOLD';
    }

    let base: Signal = 'HOLD';
    if (crossesAbove(fast[0], fast[1], slow[0], slow[1])) {
      base = 'BUY';
    } else if (crossesBelow(fast[0], fast[1], slow[0], slow[1])) {
      base = 'SELL';
    }

    // Filtre de régime : sous la SMA de tendance, on n'achète pas (on garde les sorties).
    const trendSeries = sma(closes, this.trendPeriod);
    const trend = trendSeries[trendSeries.length - 1];
    const price = closes[closes.length - 1];
    if (trend !== null && price < trend) {
      return base === 'SELL' ? 'SELL' : 'HOLD';
    }
    return base;
  }
}
