import type { FastifyInstance } from 'fastify';
import {
  createBacktestController,
  type CandleFetcher,
} from '../controllers/backtest.controller';
import { requireAuth } from '../auth/require-auth';

export interface BacktestRoutesOptions {
  /** Récupérateur de bougies (injectable en test) ; par défaut Binance REST. */
  fetchCandles?: CandleFetcher;
}

/** Route de backtest (protégée par le JWT). */
export function backtestRoutes(app: FastifyInstance, options: BacktestRoutesOptions = {}): void {
  const controller = createBacktestController({ fetchCandles: options.fetchCandles });
  app.post('/api/backtest', { preHandler: requireAuth }, controller.run);
}
