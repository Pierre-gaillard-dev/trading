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
import {
  runBacktestSchema,
  type BacktestResultDto,
  type Candle as MarketCandle,
} from '@trading/shared';
import { fetchHistory } from '../services/binance/binance.client';
import { defaultSymbolSpec } from '../services/symbol-spec';

const DEFAULT_CANDLES = 500;
const DEFAULT_BUY_FRACTION = 0.1;
const DEFAULT_SEED = 1;
/** Points max renvoyés pour la courbe d'équité (on sous-échantillonne au-delà). */
const MAX_CURVE_POINTS = 1500;

/** Réduit un tableau à ~max éléments en gardant le dernier (pour alléger la réponse). */
function downsample<T>(items: T[], max: number): T[] {
  if (items.length <= max) {
    return items;
  }
  const step = Math.ceil(items.length / max);
  const out = items.filter((_, index) => index % step === 0);
  const last = items[items.length - 1];
  if (out[out.length - 1] !== last) {
    out.push(last);
  }
  return out;
}

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
  const fetcher: CandleFetcher = fetchCandles ?? fetchHistory;

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
    // On allège les courbes pour le transport (les métriques restent calculées sur la série complète).
    const response: BacktestResultDto = {
      ...result,
      equityCurve: downsample(result.equityCurve, MAX_CURVE_POINTS),
      priceCurve: downsample(result.priceCurve, MAX_CURVE_POINTS),
    };
    return reply.send(response);
  }

  return { run };
}
