import type { FastifyInstance, FastifyReply } from 'fastify';
import { STRATEGY_KEYS } from '@trading/core';
import { createBotController } from '../controllers/bot.controller';
import { requireAuth } from '../auth/require-auth';
import type { BotManager } from '../workers/bot-manager';

export interface BotRoutesOptions {
  bots: BotManager;
}

/** Routes des bots + liste des stratégies disponibles (toutes protégées par le JWT). */
export function botRoutes(app: FastifyInstance, options: BotRoutesOptions): void {
  const controller = createBotController({ bots: options.bots });

  app.get('/api/strategies', { preHandler: requireAuth }, (_request, reply: FastifyReply) =>
    reply.send(STRATEGY_KEYS),
  );
  app.post('/api/bots', { preHandler: requireAuth }, controller.create);
  app.get('/api/bots', { preHandler: requireAuth }, controller.list);
  app.delete('/api/bots/:id', { preHandler: requireAuth }, controller.remove);
}
