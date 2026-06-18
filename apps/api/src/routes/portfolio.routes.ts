import type { FastifyInstance } from 'fastify';
import { createPortfolioController } from '../controllers/portfolio.controller';
import { requireAuth } from '../auth/require-auth';
import type { PortfolioRepository } from '../repositories/portfolio.repository';

export interface PortfolioRoutesOptions {
  portfolios: PortfolioRepository;
}

/** Routes des portefeuilles (toutes protégées par le JWT). */
export function portfolioRoutes(app: FastifyInstance, options: PortfolioRoutesOptions): void {
  const controller = createPortfolioController({ portfolios: options.portfolios });
  app.get('/api/portfolios', { preHandler: requireAuth }, controller.list);
  app.post('/api/portfolios', { preHandler: requireAuth }, controller.create);
  app.delete('/api/portfolios/:id', { preHandler: requireAuth }, controller.remove);
  app.get('/api/portfolios/:id/trades', { preHandler: requireAuth }, controller.trades);
  app.get('/api/portfolios/:id/positions', { preHandler: requireAuth }, controller.positions);
}
