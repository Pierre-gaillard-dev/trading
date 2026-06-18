import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  runBacktest,
  createEnsemble,
  FixedFractionSizing,
  SeededRandom,
  STRATEGY_KEYS,
  type EnsembleEntry,
  type StrategyKey,
  type Candle as CoreCandle,
} from '@trading/core';
import { runBacktestSchema, type Candle as MarketCandle } from '@trading/shared';
import { fetchRecentCandles } from '../services/binance/binance.client';
import { defaultSymbolSpec } from '../services/symbol-spec';

const DEFAULT_CANDLES = 500;
const DEFAULT_BUY_FRACTION = 0.1;
const DEFAULT_SEED = 1;

/** Récupère l'historique des bougies (injectable pour tester sans réseau). */
export type CandleFetcher = (
  symbol: string,
  interval: string,
  limit: number,
) => Promise<MarketCandle[]>;

export interface BacktestControllerDeps {
  fetchCandles?: CandleFetcher;
}

/** Conversion bougie marché (temps en secondes) → bougie cœur. On garde les secondes. */
function toCore(candle: MarketCandle): CoreCandle {
  return {
    openTime: candle.time,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  };
}

export function createBacktestController({ fetchCandles }: BacktestControllerDeps = {}) {
  const fetcher: CandleFetcher = fetchCandles ?? fetchRecentCandles;

  async function run(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const parsed = runBacktestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: 'Requête invalide.', details: parsed.error.flatten().fieldErrors });
    }
    const data = parsed.data;
    const known = STRATEGY_KEYS as readonly string[];
    const unknownKey = data.strategies.find((s) => !known.includes(s.strategyKey));
    if (unknownKey !== undefined) {
      return reply.code(400).send({ error: `Stratégie inconnue : ${unknownKey.strategyKey}` });
    }

    const symbol = data.symbol.toUpperCase();
    let market: MarketCandle[];
    try {
      market = await fetcher(symbol, data.interval, data.candles ?? DEFAULT_CANDLES);
    } catch {
      return reply.code(503).send({ error: 'Historique indisponible (Binance injoignable).' });
    }
    if (market.length === 0) {
      return reply.code(404).send({ error: 'Aucune bougie pour ce symbole/intervalle.' });
    }

    const entries: EnsembleEntry[] = data.strategies.map((s) => ({
      key: s.strategyKey as StrategyKey,
      weight: s.weight,
      params: s.params,
    }));
    const strategy = createEnsemble(entries, new SeededRandom(data.seed ?? DEFAULT_SEED));

    const result = runBacktest({
      symbol,
      spec: defaultSymbolSpec(symbol),
      candles: market.map(toCore),
      strategy,
      sizing: new FixedFractionSizing(data.buyFraction ?? DEFAULT_BUY_FRACTION),
      initialCash: data.initialCash,
      feeRate: data.feeRate,
      slippageBps: data.slippageBps,
    });
    return reply.send(result);
  }

  return { run };
}
