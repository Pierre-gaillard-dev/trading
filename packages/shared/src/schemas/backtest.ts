import { z } from 'zod';
import { CANDLE_INTERVALS, type CandleInterval } from './market';
import { strategyWeightSchema } from './bot';

const decimalString = z.string().regex(/^\d+(\.\d+)?$/, 'Montant invalide');

/** Lancement d'un backtest : rejouer des stratégies pondérées sur l'historique. */
export const runBacktestSchema = z.object({
  symbol: z.string().regex(/^[A-Za-z0-9]{2,16}USDT$/i, 'Symbole invalide'),
  interval: z
    .string()
    .refine(
      (value): value is CandleInterval => (CANDLE_INTERVALS as readonly string[]).includes(value),
      'Intervalle invalide',
    ),
  strategies: z.array(strategyWeightSchema).min(1, 'Au moins une stratégie'),
  initialCash: decimalString.refine((value) => Number(value) > 0, 'Le capital doit être > 0'),
  buyFraction: z.number().gt(0).max(1).optional(),
  feeRate: decimalString.optional(),
  slippageBps: z.number().int().min(0).optional(),
  /** Nombre de bougies historiques à rejouer (max 10000, défaut 500). */
  candles: z.number().int().min(50).max(10000).optional(),
  /** Graine d'aléa (rend le backtest reproductible). */
  seed: z.number().int().optional(),
});
export type RunBacktest = z.infer<typeof runBacktestSchema>;

/** Un trade simulé pendant le backtest. */
export const backtestTradeSchema = z.object({
  side: z.enum(['BUY', 'SELL']),
  quantity: z.string(),
  execPrice: z.string(),
  fee: z.string(),
  candleTime: z.number(),
});

/** Un point de la courbe d'équité (valeur totale au fil du temps). */
export const equityPointSchema = z.object({
  time: z.number(),
  equity: z.string(),
});

/** Résultat chiffré d'un backtest. */
export const backtestResultSchema = z.object({
  candleCount: z.number(),
  initialEquity: z.string(),
  finalEquity: z.string(),
  pnl: z.string(),
  pnlPct: z.string(),
  maxDrawdownPct: z.string(),
  tradeCount: z.number(),
  closedTrades: z.number(),
  wins: z.number(),
  winRatePct: z.string(),
  buyHoldPnlPct: z.string(),
  trades: z.array(backtestTradeSchema),
  equityCurve: z.array(equityPointSchema),
});
export type BacktestResultDto = z.infer<typeof backtestResultSchema>;