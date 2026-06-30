import type { FastifyInstance } from 'fastify';
import { createWatchlistController } from '../controllers/watchlist.controller';
import { requireAuth } from '../auth/require-auth';
import type { WatchlistRepository } from '../repositories/watchlist.repository';

export interface WatchlistRoutesOptions {
  watchlist: WatchlistRepository;
  symbolExists: (symbol: string) => Promise<boolean>;
}

/** Routes de la watchlist (toutes protégées par le JWT). */
export function watchlistRoutes(app: FastifyInstance, options: WatchlistRoutesOptions): void {
  const controller = createWatchlistController({
    watchlist: options.watchlist,
    symbolExists: options.symbolExists,
  });

  app.get('/api/watchlist', { preHandler: requireAuth }, controller.list);
  app.post('/api/watchlist', { preHandler: requireAuth }, controller.add);
  app.delete('/api/watchlist/:symbol', { preHandler: requireAuth }, controller.remove);
}
