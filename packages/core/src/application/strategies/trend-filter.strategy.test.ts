import { describe, it, expect } from 'vitest';
import type { Candle } from '../../domain/candle';
import type { StrategyContext } from './strategy';
import { TrendFilterStrategy } from './trend-filter.strategy';
import { createStrategy, STRATEGY_KEYS } from './index';

/**
 * `TrendFilterStrategy` = croisement de moyennes filtré par une SMA de tendance.
 * Pour des cas déterministes lisibles, on utilise des SMA courtes :
 * fast=2, slow=3, trendPeriod=4 → minCandles = max(3,4)+1 = 5.
 */
function ctx(closes: number[]): StrategyContext {
  const candles: Candle[] = closes.map((close, i) => ({
    openTime: i * 60_000,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1,
  }));
  return { candles, position: null };
}

const params = { maType: 'SMA' as const, fastPeriod: 2, slowPeriod: 3, trendPeriod: 4 };

describe('TrendFilterStrategy', () => {
  describe('contrat', () => {
    it('expose la clé stable et minCandles = max(slow, trend) + 1', () => {
      const strategy = new TrendFilterStrategy({ slowPeriod: 100, trendPeriod: 200 });
      expect(strategy.key).toBe('trend_filter');
      expect(strategy.minCandles).toBe(201);
    });

    it('renvoie HOLD tant qu’il manque des bougies (< minCandles)', () => {
      const strategy = new TrendFilterStrategy(params); // minCandles = 5
      expect(strategy.decide(ctx([10, 10, 10, 10]))).toBe('HOLD');
    });
  });

  describe('filtre de régime', () => {
    it('BUY : croisement haussier ET prix au-dessus de la SMA de tendance', () => {
      const strategy = new TrendFilterStrategy(params);
      // SMA2 croise au-dessus de SMA3 à la dernière bougie ; prix (20) > SMA4 (12.5).
      expect(strategy.decide(ctx([10, 10, 10, 10, 10, 20]))).toBe('BUY');
    });

    it('achat BLOQUÉ (→ HOLD) : croisement haussier mais prix sous la SMA de tendance', () => {
      const strategy = new TrendFilterStrategy(params);
      // Rebond en plein downtrend : SMA2 croise au-dessus de SMA3, mais prix (45) < SMA4 (46.75).
      expect(strategy.decide(ctx([100, 80, 60, 40, 42, 45]))).toBe('HOLD');
    });

    it('SELL : les sorties passent même sous la SMA de tendance (régime baissier)', () => {
      const strategy = new TrendFilterStrategy(params);
      // Sommet puis repli : SMA2 croise SOUS SMA3 ; prix (48) < SMA4 (51.25) → SELL autorisé.
      expect(strategy.decide(ctx([40, 45, 50, 55, 52, 48]))).toBe('SELL');
    });

    it('HOLD : pas de croisement, même en régime haussier', () => {
      const strategy = new TrendFilterStrategy(params);
      // Tendance haussière régulière : fast reste au-dessus de slow, aucun croisement frais.
      expect(strategy.decide(ctx([1, 2, 3, 4, 5, 6]))).toBe('HOLD');
    });
  });

  describe('validation des paramètres', () => {
    it('rejette fastPeriod ≤ 0', () => {
      expect(() => new TrendFilterStrategy({ fastPeriod: 0 })).toThrow('fastPeriod');
    });

    it('rejette slowPeriod ≤ fastPeriod', () => {
      expect(() => new TrendFilterStrategy({ fastPeriod: 20, slowPeriod: 20 })).toThrow(
        'slowPeriod',
      );
    });

    it('rejette trendPeriod ≤ 1', () => {
      expect(() => new TrendFilterStrategy({ trendPeriod: 1 })).toThrow('trendPeriod');
    });
  });

  describe('intégration au registre', () => {
    it('est exposée dans STRATEGY_KEYS', () => {
      expect(STRATEGY_KEYS).toContain('trend_filter');
    });

    it('createStrategy("trend_filter") fabrique bien la stratégie', () => {
      const strategy = createStrategy('trend_filter', { fastPeriod: 10, slowPeriod: 30 });
      expect(strategy).toBeInstanceOf(TrendFilterStrategy);
      expect(strategy.key).toBe('trend_filter');
    });
  });
});
