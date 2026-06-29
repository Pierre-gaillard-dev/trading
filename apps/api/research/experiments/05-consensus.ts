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
 * Campagne 5 — combineur DÉTERMINISTE par consensus (prototype, hors core).
 *
 * Au lieu d'utiliser le score pondéré comme une probabilité (mécanisme actuel,
 * source de variance), on agit dès que le score franchit un seuil :
 *   score >= buyTh  → BUY ; score <= -sellTh → SELL ; sinon HOLD.
 * Aucun aléa → résultat reproductible, et on filtre les divergences au lieu de
 * les trancher au hasard.
 */
const VOTE: Record<Signal, number> = { BUY: 1, HOLD: 0, SELL: -1 };

interface Member {
  strategy: Strategy;
  weight: number;
}

class ConsensusStrategy implements Strategy {
  readonly key = 'consensus';
  readonly minCandles: number;

  constructor(
    private readonly members: Member[],
    private readonly buyTh = 0.5,
    private readonly sellTh = 0.5,
  ) {
    this.minCandles = Math.max(...members.map((m) => m.strategy.minCandles));
  }

  decide(context: StrategyContext): Signal {
    let weighted = 0;
    let total = 0;
    for (const { strategy, weight } of this.members) {
      total += weight;
      weighted += weight * VOTE[strategy.decide(context)];
    }
    const score = total === 0 ? 0 : weighted / total;
    if (score >= this.buyTh) return 'BUY';
    if (score <= -this.sellTh) return 'SELL';
    return 'HOLD';
  }
}

const make = (key: StrategyKey, params?: unknown): Strategy => createStrategy(key, params ?? {});

const donchian = (): Strategy => make('donchian_breakout', { entryPeriod: 20, exitPeriod: 5 });
const maEma20_100 = (): Strategy => make('ma_crossover', { maType: 'EMA', fastPeriod: 20, slowPeriod: 100 });
const macd8 = (): Strategy => make('macd', { fastPeriod: 8, slowPeriod: 21, signalPeriod: 5 });

const m = (strategy: Strategy, weight = 1): Member => ({ strategy, weight });

interface Variant {
  name: string;
  build: () => Strategy;
}

const variants: Variant[] = [
  { name: 'donchian 20/5 (réf)', build: () => donchian() },
  // Consensus = unanimité (seuil 1.0) sur 2 membres : n'agit que s'ils sont d'accord.
  { name: 'consensus≥1 (don+maEMA)', build: () => new ConsensusStrategy([m(donchian()), m(maEma20_100())], 1, 1) },
  // Consensus « au moins un, sans opposition » (seuil 0.5).
  { name: 'consensus≥.5 (don+maEMA)', build: () => new ConsensusStrategy([m(donchian()), m(maEma20_100())], 0.5, 0.5) },
  // Trio, seuil 0.5 (majorité pondérée).
  { name: 'consensus≥.5 (don+maEMA+macd)', build: () => new ConsensusStrategy([m(donchian()), m(maEma20_100()), m(macd8())], 0.5, 0.5) },
  // Trio, unanimité.
  { name: 'consensus≥1 (don+maEMA+macd)', build: () => new ConsensusStrategy([m(donchian()), m(maEma20_100()), m(macd8())], 1, 1) },
  // Donchian dominant (poids 2) + maEMA, seuil 0.5.
  { name: 'consensus≥.5 (2·don+maEMA)', build: () => new ConsensusStrategy([m(donchian(), 2), m(maEma20_100())], 0.5, 0.5) },
];

const DAILY = DATASETS.filter((d) => d.interval === '1d');

const allRows: ResultRow[] = [];
for (const v of variants) {
  for (const ds of DAILY) {
    allRows.push(runStrategy(v.name, v.build(), ds));
  }
}

console.log('## Détail par jeu (daily, déterministe)\n');
console.log(toMarkdownTable(allRows));

console.log('\n## Synthèse (moyenne sur BTC/ETH/SOL 1d)\n');
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
