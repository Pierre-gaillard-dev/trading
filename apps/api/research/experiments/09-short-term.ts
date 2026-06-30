import type { RiskParams, EnsembleEntry } from '@trading/core';
import { SHORT_TERM_DATASETS, loadCore } from '../lib/datasets';
import { runConfigOn, type Config, type ResultRow } from '../lib/harness';

/**
 * Campagne 7 — recherche de PROFIT en court terme (15m / 1h).
 *
 * Les fenêtres récentes sont globalement baissières → on découpe chaque jeu en
 * 5 sous-fenêtres consécutives (certaines haussières, d'autres baissières) et on
 * mesure, pour chaque config, sur combien de sous-fenêtres elle est RÉELLEMENT
 * PROFITABLE (PnL > 0), pas seulement « bat le buy & hold ». On teste l'apport
 * du stop-loss / take-profit (SL/TP), levier non exploré jusqu'ici.
 */
const SEGMENTS = 5;

const e = (key: string, params?: unknown): EnsembleEntry => ({ key: key as EnsembleEntry['key'], weight: 1, params });
const sltp = (sl: number, tp: number): RiskParams => ({ stopLossPct: sl, takeProfitPct: tp });

const candidates: Config[] = [
  { name: 'buy_and_hold (réf)', entries: [e('buy_and_hold')] },
  // Mean-reversion (souvent meilleure en range/court terme).
  { name: 'rsi 14 (30/70)', entries: [e('rsi', { period: 14, oversold: 30, overbought: 70 })] },
  { name: 'rsi 7 (25/75)', entries: [e('rsi', { period: 7, oversold: 25, overbought: 75 })] },
  { name: 'bollinger reversion 20/2', entries: [e('bollinger_bands', { period: 20, k: 2, mode: 'reversion' })] },
  { name: 'rsi 14 + SL3/TP6', entries: [e('rsi', { period: 14 })], risk: sltp(0.03, 0.06) },
  { name: 'bollinger 20/2 + SL3/TP6', entries: [e('bollinger_bands', { period: 20, k: 2, mode: 'reversion' })], risk: sltp(0.03, 0.06) },
  // Tendance courte + SL/TP (couper les pertes du sur-trading).
  { name: 'ma EMA 9/21', entries: [e('ma_crossover', { maType: 'EMA', fastPeriod: 9, slowPeriod: 21 })] },
  { name: 'ma EMA 9/21 + SL3/TP6', entries: [e('ma_crossover', { maType: 'EMA', fastPeriod: 9, slowPeriod: 21 })], risk: sltp(0.03, 0.06) },
  { name: 'ma EMA 9/21 + SL2/TP10', entries: [e('ma_crossover', { maType: 'EMA', fastPeriod: 9, slowPeriod: 21 })], risk: sltp(0.02, 0.1) },
  { name: 'donchian 20/10', entries: [e('donchian_breakout', { entryPeriod: 20, exitPeriod: 10 })] },
  { name: 'donchian 20/10 + SL3/TP6', entries: [e('donchian_breakout', { entryPeriod: 20, exitPeriod: 10 })], risk: sltp(0.03, 0.06) },
  { name: 'macd 12/26/9 + SL3/TP6', entries: [e('macd', { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 })], risk: sltp(0.03, 0.06) },
];

// Toutes les sous-fenêtres (jeu × segment), avec leur tendance (buy & hold local).
interface Window {
  label: string;
  interval: string;
  symbol: string;
  candles: ReturnType<typeof loadCore>;
}
const windows: Window[] = [];
for (const ds of SHORT_TERM_DATASETS) {
  const full = loadCore(ds);
  const size = Math.floor(full.length / SEGMENTS);
  for (let i = 0; i < SEGMENTS; i++) {
    const candles = full.slice(i * size, (i + 1) * size);
    windows.push({ label: `${ds.symbol} ${ds.interval} #${String(i + 1)}`, interval: ds.interval, symbol: ds.symbol, candles });
  }
}

// Tendance de chaque sous-fenêtre (pour le contexte).
console.log(`## ${String(windows.length)} sous-fenêtres (B&H local)\n`);
console.log('| Fenêtre | B&H % |');
console.log('|---|--:|');
for (const w of windows) {
  const bh = ((w.candles[w.candles.length - 1].close / w.candles[0].close - 1) * 100).toFixed(1);
  console.log(`| ${w.label} | ${bh} |`);
}

// Évaluation : pour chaque config, % de sous-fenêtres profitables + PnL moyen/médian.
const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n === 0 ? 0 : n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};

// Pré-calcule toutes les lignes (config × fenêtre), réutilisées par les 3 vues.
const isBull = (w: Window): boolean => w.candles[w.candles.length - 1].close > w.candles[0].close;
const bullWindows = windows.filter(isBull);
const bearWindows = windows.filter((w) => !isBull(w));

const resultsByConfig = new Map<string, ResultRow[]>();
for (const c of candidates) {
  resultsByConfig.set(
    c.name,
    windows.map((w) => runConfigOn(c, w.candles, w.label, w.interval, w.symbol, [1, 2, 3])),
  );
}

function ranking(title: string, subset: Window[]): void {
  const labels = new Set(subset.map((w) => w.label));
  console.log(`\n## ${title} (${String(subset.length)} fenêtres)\n`);
  console.log('| Config | PnL moy % | PnL médian % | Profitable | Trades moy |');
  console.log('|---|--:|--:|--:|--:|');
  const rows = candidates
    .map((c) => {
      const all = resultsByConfig.get(c.name) ?? [];
      const sel = all.filter((r) => labels.has(r.dataset));
      const pnls = sel.map((r) => r.pnlPct);
      return {
        name: c.name,
        avg: pnls.reduce((a, b) => a + b, 0) / pnls.length,
        med: median(pnls),
        profitable: sel.filter((r) => r.pnlPct > 0).length,
        trades: Math.round(sel.reduce((a, r) => a + r.trades, 0) / sel.length),
        total: sel.length,
      };
    })
    .sort((a, b) => b.avg - a.avg);
  for (const r of rows) {
    console.log(
      `| ${r.name} | ${r.avg.toFixed(2)} | ${r.med.toFixed(2)} | ${String(r.profitable)}/${String(r.total)} | ${String(r.trades)} |`,
    );
  }
}

ranking('Toutes les sous-fenêtres', windows);
ranking('Sous-fenêtres HAUSSIÈRES (B&H local > 0)', bullWindows);
ranking('Sous-fenêtres BAISSIÈRES (B&H local < 0)', bearWindows);
