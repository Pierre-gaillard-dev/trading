import { describe, it, expect } from 'vitest';
import type { Candle } from '../../domain/candle';
import type { Signal, Strategy, StrategyContext } from '../strategies/strategy';
import type { SymbolSpec } from '../../domain/symbol-spec';
import { FixedFractionSizing } from '../sizing/fixed-fraction-sizing';
import { runBacktest } from './backtester';

const SPEC: SymbolSpec = {
  symbol: 'BTCUSDT',
  basePrecision: 8,
  quotePrecision: 2,
  stepSize: '0.00001',
  minNotional: '10',
};

/** Stratégie scriptée par seuils : achète à plat sous `buyAt`, vend selon les seuils. */
function scripted(opts: { buyAt: number; sellAbove?: number; sellBelow?: number }): Strategy {
  return {
    key: 'scripted',
    minCandles: 1,
    decide(ctx: StrategyContext): Signal {
      const c = ctx.candles[ctx.candles.length - 1].close;
      if (ctx.position === null) return c <= opts.buyAt ? 'BUY' : 'HOLD';
      if (opts.sellAbove !== undefined && c >= opts.sellAbove) return 'SELL';
      if (opts.sellBelow !== undefined && c <= opts.sellBelow) return 'SELL';
      return 'HOLD';
    },
  };
}

function run(closes: number[], strategy: Strategy) {
  return runBacktest({
    symbol: 'BTCUSDT',
    spec: SPEC,
    candles: closes.map((close, i) => ({ openTime: i, open: close, high: close, low: close, close, volume: 1 })),
    strategy,
    sizing: new FixedFractionSizing(0.95),
    initialCash: 1000,
    feeRate: 0.001,
    slippageBps: 0,
  });
}

describe('runBacktest', () => {
  it('aller-retour gagnant : 1 trade fermé, win rate 100 %, PnL positif', () => {
    const r = run([100, 100, 120], scripted({ buyAt: 100, sellAbove: 120 }));
    expect(r.candleCount).toBe(3);
    expect(r.tradeCount).toBe(2); // 1 BUY + 1 SELL
    expect(r.closedTrades).toBe(1);
    expect(r.wins).toBe(1);
    expect(r.winRatePct).toBe('100.00');
    expect(Number(r.pnlPct)).toBeGreaterThan(0);
    expect(r.buyHoldPnlPct).toBe('20.00'); // (120 − 100) / 100
  });

  it('aller-retour perdant : win rate 0 %, PnL négatif', () => {
    const r = run([100, 100, 80], scripted({ buyAt: 100, sellBelow: 80 }));
    expect(r.closedTrades).toBe(1);
    expect(r.wins).toBe(0);
    expect(r.winRatePct).toBe('0.00');
    expect(Number(r.pnlPct)).toBeLessThan(0);
    expect(r.buyHoldPnlPct).toBe('-20.00');
  });

  it('calcule un max drawdown positif quand l’équité chute depuis un sommet', () => {
    // Achète à 100, garde : équité monte (150) puis chute (75) → drawdown important.
    const r = run([100, 150, 75], scripted({ buyAt: 100, sellAbove: 99999 }));
    expect(Number(r.maxDrawdownPct)).toBeGreaterThan(40);
  });

  it('expose des courbes alignées sur les bougies', () => {
    const r = run([100, 110, 120], scripted({ buyAt: 0 })); // n'achète jamais
    expect(r.equityCurve).toHaveLength(3);
    expect(r.priceCurve).toHaveLength(3);
    expect(r.priceCurve.map((p) => p.price)).toEqual([100, 110, 120]);
    // Sans aucun trade, l'équité reste au capital initial.
    expect(r.tradeCount).toBe(0);
    expect(r.finalEquity).toBe('1000.00');
  });

  it('série vide → résultat neutre (pas de division par zéro)', () => {
    const r = run([], scripted({ buyAt: 100 }));
    expect(r.candleCount).toBe(0);
    expect(r.initialEquity).toBe('1000.00');
    expect(r.finalEquity).toBe('1000.00');
    expect(r.pnl).toBe('0.00');
    expect(r.buyHoldPnlPct).toBe('0.00');
    expect(r.tradeCount).toBe(0);
    expect(r.equityCurve).toEqual([]);
  });
});
