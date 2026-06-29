import type { EnsembleEntry } from '@trading/core';
import { DATASETS } from '../lib/datasets';
import { runConfig, summarize, toMarkdownTable, type Config, type ResultRow } from '../lib/harness';

/**
 * Campagne 4 — combinaisons de stratégies pondérées (ensembles).
 * L'ensemble est probabiliste → on moyenne sur 5 seeds et on reporte σ(PnL).
 * Briques tunées issues de la campagne 2.
 */
const SEEDS = [1, 2, 3, 4, 5];

// Briques daily tunées.
const donchian: EnsembleEntry = { key: 'donchian_breakout', weight: 1, params: { entryPeriod: 20, exitPeriod: 5 } };
const maEma20_100: EnsembleEntry = { key: 'ma_crossover', weight: 1, params: { maType: 'EMA', fastPeriod: 20, slowPeriod: 100 } };
const maEma50_100: EnsembleEntry = { key: 'ma_crossover', weight: 1, params: { maType: 'EMA', fastPeriod: 50, slowPeriod: 100 } };
const macd8_21_5: EnsembleEntry = { key: 'macd', weight: 1, params: { fastPeriod: 8, slowPeriod: 21, signalPeriod: 5 } };
const rsi: EnsembleEntry = { key: 'rsi', weight: 1 };

const w = (e: EnsembleEntry, weight: number): EnsembleEntry => ({ ...e, weight });

const configs: Config[] = [
  // Référence : meilleure brique seule.
  { name: 'donchian 20/5 (réf)', entries: [donchian] },
  // Paires équipondérées.
  { name: 'donchian + maEMA20/100', entries: [donchian, maEma20_100] },
  { name: 'donchian + maEMA50/100', entries: [donchian, maEma50_100] },
  { name: 'donchian + macd8/21/5', entries: [donchian, macd8_21_5] },
  { name: 'maEMA20/100 + macd8/21/5', entries: [maEma20_100, macd8_21_5] },
  // Trio de tendance.
  { name: 'donchian + maEMA20/100 + macd', entries: [donchian, maEma20_100, macd8_21_5] },
  // Pondérations (donchian dominant).
  { name: '2·donchian + 1·maEMA20/100', entries: [w(donchian, 2), maEma20_100] },
  { name: '3·donchian + 1·macd', entries: [w(donchian, 3), macd8_21_5] },
  // Ajout d'une mean-reversion minoritaire (hypothèse : ça dilue → à vérifier).
  { name: '2·donchian + 1·rsi', entries: [w(donchian, 2), rsi] },
];

const DAILY = DATASETS.filter((d) => d.interval === '1d');

const allRows: ResultRow[] = [];
for (const config of configs) {
  for (const ds of DAILY) {
    allRows.push(runConfig(config, ds, SEEDS));
  }
}

console.log('## Détail par jeu (daily, moyenne sur 5 seeds)\n');
console.log(toMarkdownTable(allRows));

console.log('\n## Synthèse par ensemble (moyenne sur BTC/ETH/SOL 1d)\n');
console.log('| Ensemble | PnL moy % | Alpha moy | Sharpe moy | DD moy % | Bat B&H |');
console.log('|---|--:|--:|--:|--:|--:|');
const summaries = configs
  .map((c) => summarize(c.name, allRows.filter((r) => r.name === c.name)))
  .sort((a, b) => b.avgAlpha - a.avgAlpha);
for (const s of summaries) {
  console.log(
    `| ${s.name} | ${s.avgPnl.toFixed(2)} | ${s.avgAlpha.toFixed(2)} | ${s.avgSharpe.toFixed(2)} | ` +
      `${s.avgDd.toFixed(2)} | ${String(s.beatsBuyHold)}/${String(s.total)} |`,
  );
}
