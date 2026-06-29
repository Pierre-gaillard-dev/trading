import { runBacktest, createStrategy, FixedFractionSizing } from '@trading/core';
import { DATASETS, loadCore } from '../lib/datasets';
import { defaultSymbolSpec } from '../../src/services/symbol-spec';

/**
 * Vérité terrain : combien de trades `trend_filter` fait-elle vraiment, et avec
 * quel PnL, (a) sur l'historique complet et (b) sur les 500 dernières bougies
 * (ce que voit un backtest "par défaut" du dashboard). Objectif : vérifier la
 * critique "elle n'achète rien".
 */
const strat = () =>
  createStrategy('trend_filter', { maType: 'EMA', fastPeriod: 20, slowPeriod: 100, trendPeriod: 200 });

function run(candles: ReturnType<typeof loadCore>, symbol: string) {
  const r = runBacktest({
    symbol,
    spec: defaultSymbolSpec(symbol),
    candles,
    strategy: strat(),
    sizing: new FixedFractionSizing(0.95),
    initialCash: 10_000,
    feeRate: 0.001,
    slippageBps: 5,
  });
  // Part du temps RÉELLEMENT investie (équité ≠ cash → on est en position).
  return { trades: r.tradeCount, pnl: r.pnlPct, bh: r.buyHoldPnlPct, candles: r.candleCount };
}

console.log('| Jeu | Fenêtre | Bougies | Trades | PnL % | B&H % |');
console.log('|---|---|--:|--:|--:|--:|');
for (const ds of DATASETS) {
  const full = loadCore(ds);
  const last500 = full.slice(-500);
  const a = run(full, ds.symbol);
  const b = run(last500, ds.symbol);
  console.log(`| ${ds.symbol} ${ds.interval} | complet | ${String(a.candles)} | ${String(a.trades)} | ${a.pnl} | ${a.bh} |`);
  console.log(`| ${ds.symbol} ${ds.interval} | 500 dern. | ${String(b.candles)} | ${String(b.trades)} | ${b.pnl} | ${b.bh} |`);
}
