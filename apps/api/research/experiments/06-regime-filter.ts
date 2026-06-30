import {
  createStrategy,
  type Strategy,
  type StrategyContext,
  type Signal,
  type StrategyKey,
} from '@trading/core';
import { DATASETS } from '../lib/datasets';
import { runStrategy, summarize, toMarkdownTable, type ResultRow } from '../lib/harness';

/**
 * Campagne 5b — filtre de régime (trend filter).
 *
 * Idée classique : ne prendre des positions LONG que lorsque le marché est en
 * tendance de fond haussière (prix au-dessus d'une SMA longue). En tendance
 * baissière, on bloque les achats et on laisse passer les sorties → on évite
 * d'acheter les couteaux qui tombent. Prototype hors core.
 */
function smaLast(closes: number[], period: number): number {
  if (closes.length < period) return NaN;
  let sum = 0;
  for (let i = closes.length - period; i < closes.length; i++) sum += closes[i];
  return sum / period;
}

class RegimeFiltered implements Strategy {
  readonly key = 'regime';
  readonly minCandles: number;

  constructor(
    private readonly inner: Strategy,
    private readonly smaPeriod = 200,
  ) {
    this.minCandles = Math.max(inner.minCandles, smaPeriod + 1);
  }

  decide(context: StrategyContext): Signal {
    const closes = context.candles.map((c) => c.close);
    const signal = this.inner.decide(context);
    const trend = smaLast(closes, this.smaPeriod);
    const price = closes[closes.length - 1];
    if (Number.isNaN(trend)) return signal;
    // Sous la tendance de fond : on n'achète pas ; on laisse les ventes/sorties.
    if (price < trend) return signal === 'SELL' ? 'SELL' : 'HOLD';
    return signal;
  }
}

const make = (key: StrategyKey, params?: unknown): Strategy => createStrategy(key, params ?? {});
const donchian = (): Strategy => make('donchian_breakout', { entryPeriod: 20, exitPeriod: 5 });
const maEma = (): Strategy => make('ma_crossover', { maType: 'EMA', fastPeriod: 20, slowPeriod: 100 });

interface Variant {
  name: string;
  build: () => Strategy;
}
const variants: Variant[] = [
  { name: 'donchian 20/5 (réf)', build: () => donchian() },
  { name: 'donchian + filtre SMA100', build: () => new RegimeFiltered(donchian(), 100) },
  { name: 'donchian + filtre SMA200', build: () => new RegimeFiltered(donchian(), 200) },
  { name: 'maEMA20/100 (réf)', build: () => maEma() },
  { name: 'maEMA20/100 + filtre SMA200', build: () => new RegimeFiltered(maEma(), 200) },
];

// Daily + hourly : le filtre devrait surtout aider sur l'hourly baissier.
const SETS = DATASETS.filter((d) => d.interval === '1d' || d.interval === '1h');

const allRows: ResultRow[] = [];
for (const v of variants) {
  for (const ds of SETS) {
    allRows.push(runStrategy(v.name, v.build(), ds));
  }
}

console.log('## Détail par jeu (daily + hourly, déterministe)\n');
console.log(toMarkdownTable([...allRows].sort((a, b) => b.alphaPct - a.alphaPct)));

console.log('\n## Synthèse (moyenne sur 6 jeux : BTC/ETH/SOL × 1d/1h)\n');
console.log('| Variante | PnL moy % | Alpha moy | Sharpe moy | DD moy % | Bat B&H |');
console.log('|---|--:|--:|--:|--:|--:|');
const summaries = variants
  .map((v) => summarize(v.name, allRows.filter((r) => r.name === v.name)))
  .sort((a, b) => b.avgSharpe - a.avgSharpe);
for (const s of summaries) {
  console.log(
    `| ${s.name} | ${s.avgPnl.toFixed(2)} | ${s.avgAlpha.toFixed(2)} | ${s.avgSharpe.toFixed(2)} | ` +
      `${s.avgDd.toFixed(2)} | ${String(s.beatsBuyHold)}/${String(s.total)} |`,
  );
}
