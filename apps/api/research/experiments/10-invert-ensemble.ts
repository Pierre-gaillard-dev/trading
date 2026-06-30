import type { EnsembleEntry } from '@trading/core';
import { DATASETS } from '../lib/datasets';
import { runConfig, summarize, type Config, type ResultRow } from '../lib/harness';

/**
 * Campagne 8 — inversion AU NIVEAU DE L'ENSEMBLE (flag `invert`).
 * Pour quelques ensembles de stratégies sélectionnées, on compare la décision
 * normale vs inversée (quand l'ensemble pencherait à acheter → on vend).
 * Multi-seed (ensembles probabilistes).
 */
const SEEDS = [1, 2, 3, 4, 5];

const sets: { label: string; entries: EnsembleEntry[] }[] = [
  { label: 'rsi seul', entries: [{ key: 'rsi', weight: 1 }] },
  {
    label: 'rsi + bollinger (mean-reversion)',
    entries: [
      { key: 'rsi', weight: 1 },
      { key: 'bollinger_bands', weight: 1, params: { mode: 'reversion' } },
    ],
  },
  {
    label: 'ma_crossover + donchian (tendance)',
    entries: [
      { key: 'ma_crossover', weight: 1 },
      { key: 'donchian_breakout', weight: 1 },
    ],
  },
];

const configs: Config[] = [];
for (const s of sets) {
  configs.push({ name: s.label, entries: s.entries });
  configs.push({ name: `inverse[${s.label}]`, entries: s.entries, invert: true });
}

const rows: ResultRow[] = [];
for (const c of configs) {
  for (const ds of DATASETS) rows.push(runConfig(c, ds, SEEDS));
}

console.log('## Ensemble normal vs inversé (moyenne 8 jeux × 5 seeds)\n');
console.log('| Ensemble | PnL moy % | Alpha moy | Sharpe moy | DD moy % | Profitable |');
console.log('|---|--:|--:|--:|--:|--:|');
for (const c of configs) {
  const r = rows.filter((x) => x.name === c.name);
  const s = summarize(c.name, r);
  const profitable = r.filter((x) => x.pnlPct > 0).length;
  console.log(
    `| ${c.name} | ${s.avgPnl.toFixed(2)} | ${s.avgAlpha.toFixed(2)} | ${s.avgSharpe.toFixed(2)} | ` +
      `${s.avgDd.toFixed(2)} | ${String(profitable)}/${String(r.length)} |`,
  );
}
