import { STRATEGY_KEYS, type StrategyKey } from '@trading/core';
import { DATASETS } from '../lib/datasets';
import { runConfig, toMarkdownTable, summarize, type Config, type ResultRow } from '../lib/harness';

/**
 * Campagne 1 — baseline : chaque stratégie seule, paramètres par défaut,
 * sur tous les jeux de données. Sert de point de référence pour la suite.
 */
const configs: Config[] = STRATEGY_KEYS.map((key: StrategyKey) => ({
  name: key,
  entries: [{ key, weight: 1 }],
}));

const rows: ResultRow[] = [];
for (const config of configs) {
  for (const ds of DATASETS) {
    rows.push(runConfig(config, ds));
  }
}

console.log('## Résultats bruts (toutes stratégies × tous jeux)\n');
console.log(toMarkdownTable([...rows].sort((a, b) => b.alphaPct - a.alphaPct)));

console.log('\n## Synthèse par stratégie (moyenne sur les 8 jeux)\n');
console.log('| Stratégie | PnL moy % | Alpha moy | Sharpe moy | DD moy % | Bat B&H |');
console.log('|---|--:|--:|--:|--:|--:|');
const summaries = configs
  .map((c) => summarize(c.name, rows.filter((r) => r.name === c.name)))
  .sort((a, b) => b.avgAlpha - a.avgAlpha);
for (const s of summaries) {
  console.log(
    `| ${s.name} | ${s.avgPnl.toFixed(2)} | ${s.avgAlpha.toFixed(2)} | ${s.avgSharpe.toFixed(2)} | ` +
      `${s.avgDd.toFixed(2)} | ${String(s.beatsBuyHold)}/${String(s.total)} |`,
  );
}
