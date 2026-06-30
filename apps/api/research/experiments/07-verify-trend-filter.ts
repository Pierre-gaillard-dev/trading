import { DATASETS } from '../lib/datasets';
import { runConfig, toMarkdownTable, summarize, type Config, type ResultRow } from '../lib/harness';

/**
 * Campagne 6 (vérif) — la stratégie `trend_filter` désormais dans core doit
 * reproduire le prototype de la campagne 5b (maEMA20/100 + filtre SMA200).
 * On la passe via le registre (createEnsemble → createStrategy), déterministe.
 */
const config: Config = {
  name: 'trend_filter (core, EMA 20/100, SMA200)',
  entries: [
    { key: 'trend_filter', weight: 1, params: { maType: 'EMA', fastPeriod: 20, slowPeriod: 100, trendPeriod: 200 } },
  ],
};

const SETS = DATASETS.filter((d) => d.interval === '1d' || d.interval === '1h');
const rows: ResultRow[] = SETS.map((ds) => runConfig(config, ds));

console.log(toMarkdownTable([...rows].sort((a, b) => b.alphaPct - a.alphaPct)));
const s = summarize(config.name, rows);
console.log(
  `\nMoyenne (6 jeux) — PnL ${s.avgPnl.toFixed(2)} | alpha ${s.avgAlpha.toFixed(2)} | ` +
    `Sharpe ${s.avgSharpe.toFixed(2)} | DD ${s.avgDd.toFixed(2)} | bat B&H ${String(s.beatsBuyHold)}/${String(s.total)}`,
);
