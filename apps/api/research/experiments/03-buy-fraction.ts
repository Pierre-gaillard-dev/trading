import { DATASETS } from '../lib/datasets';
import { runConfig, summarize, type Config, type ResultRow } from '../lib/harness';

/**
 * Campagne 3 — effet de la fraction d'achat (part du cash investie par achat).
 * On fixe deux configs robustes (une daily, une hourly) et on balaie buyFraction.
 */
const FRACTIONS = [0.1, 0.25, 0.5, 0.75, 0.95, 1.0];

const bases: { label: string; entries: Config['entries']; datasets: typeof DATASETS }[] = [
  {
    label: 'donchian 20/5 (daily)',
    entries: [{ key: 'donchian_breakout', weight: 1, params: { entryPeriod: 20, exitPeriod: 5 } }],
    datasets: DATASETS.filter((d) => d.interval === '1d'),
  },
  {
    label: 'ma SMA 50/200 (hourly)',
    entries: [{ key: 'ma_crossover', weight: 1, params: { maType: 'SMA', fastPeriod: 50, slowPeriod: 200 } }],
    datasets: DATASETS.filter((d) => d.interval === '1h'),
  },
];

for (const base of bases) {
  console.log(`\n## ${base.label}\n`);
  console.log('| buyFraction | PnL moy % | Alpha moy | Sharpe moy | DD moy % | Bat B&H |');
  console.log('|--:|--:|--:|--:|--:|--:|');
  for (const fraction of FRACTIONS) {
    const config: Config = { name: `f=${String(fraction)}`, entries: base.entries, buyFraction: fraction };
    const rows: ResultRow[] = base.datasets.map((ds) => runConfig(config, ds));
    const s = summarize(config.name, rows);
    console.log(
      `| ${fraction.toFixed(2)} | ${s.avgPnl.toFixed(2)} | ${s.avgAlpha.toFixed(2)} | ` +
        `${s.avgSharpe.toFixed(2)} | ${s.avgDd.toFixed(2)} | ${String(s.beatsBuyHold)}/${String(s.total)} |`,
    );
  }
}
