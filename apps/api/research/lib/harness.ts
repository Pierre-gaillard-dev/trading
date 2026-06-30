import {
  runBacktest,
  createEnsemble,
  FixedFractionSizing,
  SeededRandom,
  type EnsembleEntry,
  type Strategy,
  type RiskParams,
} from '@trading/core';
import type { BacktestResult, Candle as CoreCandle } from '@trading/core';
import { defaultSymbolSpec } from '../../src/services/symbol-spec';
import {
  loadCore,
  datasetLabel,
  PERIODS_PER_YEAR,
  type Dataset,
} from './datasets';

const INITIAL_CASH = 10_000;
const FEE_RATE = 0.001;
const SLIPPAGE_BPS = 5;

/** Une configuration testable : un nom + l'ensemble pondéré + la fraction d'achat. */
export interface Config {
  readonly name: string;
  readonly entries: EnsembleEntry[];
  /** Part du cash investie par achat (défaut 0,95 pour exploiter au mieux le capital). */
  readonly buyFraction?: number;
  /** Gestion du risque par trade (stop-loss / take-profit), optionnelle. */
  readonly risk?: RiskParams;
  /** Inverse la décision finale de l'ensemble (achat ↔ vente). Défaut false. */
  readonly invert?: boolean;
}

/** Métriques d'un backtest, agrégées sur les seeds testés. */
export interface ResultRow {
  readonly name: string;
  readonly dataset: string;
  /** Rendement net moyen (%). */
  readonly pnlPct: number;
  /** Surperformance vs « acheter et garder » (points de %). */
  readonly alphaPct: number;
  readonly buyHoldPct: number;
  readonly maxDdPct: number;
  /** Sharpe annualisé (à partir de la courbe d'équité). */
  readonly sharpe: number;
  readonly trades: number;
  readonly closedTrades: number;
  readonly winRatePct: number;
  /** Écart-type du PnL% entre seeds (0 pour une stratégie déterministe). */
  readonly pnlStd: number;
  readonly seeds: number;
}

/** Sharpe annualisé à partir d'une courbe d'équité (rendements par période). */
function annualizedSharpe(equity: number[], periodsPerYear: number): number {
  if (equity.length < 3) return 0;
  const rets: number[] = [];
  for (let i = 1; i < equity.length; i++) {
    if (equity[i - 1] > 0) rets.push(equity[i] / equity[i - 1] - 1);
  }
  if (rets.length < 2) return 0;
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length - 1);
  const std = Math.sqrt(variance);
  if (std === 0) return 0;
  return (mean / std) * Math.sqrt(periodsPerYear);
}

function std(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const v = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(v);
}

const mean = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;

/**
 * Exécute une config sur un jeu de données. Pour un ensemble multi-stratégies
 * (décision probabiliste), on moyenne sur plusieurs seeds pour mesurer la
 * robustesse ; une stratégie unique est déterministe (un seul seed suffit).
 */
export function runConfig(config: Config, ds: Dataset, seeds: number[] = [1]): ResultRow {
  return runConfigOn(config, loadCore(ds), datasetLabel(ds), ds.interval, ds.symbol, seeds);
}

/**
 * Variante : exécute une config sur des bougies fournies (ex. une sous-fenêtre),
 * avec un libellé et un intervalle explicites. Même logique multi-seed.
 */
export function runConfigOn(
  config: Config,
  candles: CoreCandle[],
  label: string,
  interval: string,
  symbol: string,
  seeds: number[] = [1],
): ResultRow {
  const spec = defaultSymbolSpec(symbol);
  const periodsPerYear = PERIODS_PER_YEAR[interval] ?? 365;
  const isSingle = config.entries.length === 1;
  const usedSeeds = isSingle ? [seeds[0] ?? 1] : seeds;

  const pnls: number[] = [];
  const alphas: number[] = [];
  const dds: number[] = [];
  const sharpes: number[] = [];
  const trades: number[] = [];
  const closed: number[] = [];
  const wins: number[] = [];
  let buyHold = 0;

  for (const seed of usedSeeds) {
    const result = runBacktest({
      symbol,
      spec,
      candles,
      strategy: createEnsemble(config.entries, new SeededRandom(seed), config.invert),
      sizing: new FixedFractionSizing(config.buyFraction ?? 0.95),
      initialCash: INITIAL_CASH,
      feeRate: FEE_RATE,
      slippageBps: SLIPPAGE_BPS,
      risk: config.risk,
    });
    const pnlPct = Number(result.pnlPct);
    buyHold = Number(result.buyHoldPnlPct);
    pnls.push(pnlPct);
    alphas.push(pnlPct - buyHold);
    dds.push(Number(result.maxDrawdownPct));
    sharpes.push(annualizedSharpe(result.equityCurve.map((p) => Number(p.equity)), periodsPerYear));
    trades.push(result.tradeCount);
    closed.push(result.closedTrades);
    wins.push(Number(result.winRatePct));
  }

  return {
    name: config.name,
    dataset: label,
    pnlPct: mean(pnls),
    alphaPct: mean(alphas),
    buyHoldPct: buyHold,
    maxDdPct: mean(dds),
    sharpe: mean(sharpes),
    trades: Math.round(mean(trades)),
    closedTrades: Math.round(mean(closed)),
    winRatePct: mean(wins),
    pnlStd: std(pnls),
    seeds: usedSeeds.length,
  };
}

/** Transforme un résultat de backtest brut en ligne de métriques (run unique). */
function rowFromResult(name: string, ds: Dataset, result: BacktestResult): ResultRow {
  const periodsPerYear = PERIODS_PER_YEAR[ds.interval] ?? 365;
  const pnlPct = Number(result.pnlPct);
  const buyHold = Number(result.buyHoldPnlPct);
  return {
    name,
    dataset: datasetLabel(ds),
    pnlPct,
    alphaPct: pnlPct - buyHold,
    buyHoldPct: buyHold,
    maxDdPct: Number(result.maxDrawdownPct),
    sharpe: annualizedSharpe(result.equityCurve.map((p) => Number(p.equity)), periodsPerYear),
    trades: result.tradeCount,
    closedTrades: result.closedTrades,
    winRatePct: Number(result.winRatePct),
    pnlStd: 0,
    seeds: 1,
  };
}

/**
 * Exécute une `Strategy` quelconque (y compris un combineur maison) en backtest
 * déterministe sur un jeu de données. Sert à prototyper de nouvelles idées hors
 * du mécanisme d'ensemble probabiliste de `core`.
 */
export function runStrategy(
  name: string,
  strategy: Strategy,
  ds: Dataset,
  buyFraction = 0.95,
): ResultRow {
  const result = runBacktest({
    symbol: ds.symbol,
    spec: defaultSymbolSpec(ds.symbol),
    candles: loadCore(ds),
    strategy,
    sizing: new FixedFractionSizing(buyFraction),
    initialCash: INITIAL_CASH,
    feeRate: FEE_RATE,
    slippageBps: SLIPPAGE_BPS,
  });
  return rowFromResult(name, ds, result);
}

const f = (n: number, dp = 2): string => (Number.isFinite(n) ? n.toFixed(dp) : '—');

/** Rend un tableau Markdown trié par alpha décroissant. */
export function toMarkdownTable(rows: ResultRow[]): string {
  const header =
    '| Config | Jeu | PnL % | vs B&H | B&H % | MaxDD % | Sharpe | Trades | Win % | σ(PnL) |\n' +
    '|---|---|--:|--:|--:|--:|--:|--:|--:|--:|';
  const body = rows
    .map(
      (r) =>
        `| ${r.name} | ${r.dataset} | ${f(r.pnlPct)} | ${f(r.alphaPct)} | ${f(r.buyHoldPct)} | ` +
        `${f(r.maxDdPct)} | ${f(r.sharpe)} | ${String(r.trades)} | ${f(r.winRatePct)} | ${f(r.pnlStd)} |`,
    )
    .join('\n');
  return `${header}\n${body}`;
}

/** Agrège plusieurs lignes (un même config sur N jeux) en une synthèse moyenne. */
export function summarize(name: string, rows: ResultRow[]): {
  name: string;
  avgPnl: number;
  avgAlpha: number;
  avgSharpe: number;
  avgDd: number;
  beatsBuyHold: number;
  total: number;
} {
  return {
    name,
    avgPnl: mean(rows.map((r) => r.pnlPct)),
    avgAlpha: mean(rows.map((r) => r.alphaPct)),
    avgSharpe: mean(rows.map((r) => r.sharpe)),
    avgDd: mean(rows.map((r) => r.maxDdPct)),
    beatsBuyHold: rows.filter((r) => r.alphaPct > 0).length,
    total: rows.length,
  };
}
