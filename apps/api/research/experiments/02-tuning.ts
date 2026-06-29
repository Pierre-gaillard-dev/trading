import type { StrategyKey } from '@trading/core';
import { DATASETS, type Dataset } from '../lib/datasets';
import { runConfig, summarize, type Config, type ResultRow } from '../lib/harness';

/**
 * Campagne 2 — tuning des paramètres des stratégies de tendance (ma_crossover,
 * donchian_breakout, macd). On balaie des grilles et on classe par alpha moyen.
 */

const DAILY = DATASETS.filter((d) => d.interval === '1d');
const HOURLY = DATASETS.filter((d) => d.interval === '1h');

function buildConfigs(): Config[] {
  const configs: Config[] = [];

  // --- ma_crossover : type de moyenne × paires (rapide, lente) ---
  const maPairs: [number, number][] = [
    [5, 20],
    [9, 21],
    [10, 50],
    [20, 50],
    [20, 100],
    [50, 100],
    [50, 200],
  ];
  for (const maType of ['SMA', 'EMA'] as const) {
    for (const [fast, slow] of maPairs) {
      configs.push({
        name: `ma ${maType} ${String(fast)}/${String(slow)}`,
        entries: [{ key: 'ma_crossover', weight: 1, params: { maType, fastPeriod: fast, slowPeriod: slow } }],
      });
    }
  }

  // --- donchian : (entrée, sortie) ---
  for (const entry of [10, 20, 55]) {
    for (const exit of [5, 10, 20]) {
      configs.push({
        name: `donchian ${String(entry)}/${String(exit)}`,
        entries: [{ key: 'donchian_breakout', weight: 1, params: { entryPeriod: entry, exitPeriod: exit } }],
      });
    }
  }

  // --- macd : (rapide, lente, signal) × requirePositive ---
  const macdSets: [number, number, number][] = [
    [12, 26, 9],
    [8, 21, 5],
    [5, 35, 5],
  ];
  for (const [fast, slow, signal] of macdSets) {
    for (const requirePositive of [false, true]) {
      configs.push({
        name: `macd ${String(fast)}/${String(slow)}/${String(signal)}${requirePositive ? ' +' : ''}`,
        entries: [
          {
            key: 'macd' as StrategyKey,
            weight: 1,
            params: { fastPeriod: fast, slowPeriod: slow, signalPeriod: signal, requirePositive },
          },
        ],
      });
    }
  }

  return configs;
}

function rank(label: string, datasets: Dataset[], configs: Config[]): void {
  console.log(`\n## ${label}\n`);
  console.log('| Config | PnL moy % | Alpha moy | Sharpe moy | DD moy % | Bat B&H |');
  console.log('|---|--:|--:|--:|--:|--:|');
  const summaries = configs
    .map((c) => {
      const rows: ResultRow[] = datasets.map((ds) => runConfig(c, ds));
      return summarize(c.name, rows);
    })
    .sort((a, b) => b.avgAlpha - a.avgAlpha);
  for (const s of summaries) {
    console.log(
      `| ${s.name} | ${s.avgPnl.toFixed(2)} | ${s.avgAlpha.toFixed(2)} | ${s.avgSharpe.toFixed(2)} | ` +
        `${s.avgDd.toFixed(2)} | ${String(s.beatsBuyHold)}/${String(s.total)} |`,
    );
  }
}

const configs = buildConfigs();
rank('Daily (3 jeux : BTC/ETH/SOL 1d)', DAILY, configs);
rank('Hourly (3 jeux : BTC/ETH/SOL 1h)', HOURLY, configs);
