import type { FastifyReply, FastifyRequest } from 'fastify';
import { STRATEGY_KEYS } from '@trading/core';
import { createBotSchema } from '@trading/shared';
import type { BotManager } from '../workers/bot-manager';

export interface BotControllerDeps {
  bots: BotManager;
}

function currentUserId(request: FastifyRequest): string {
  return (request.user as { sub: string }).sub;
}

export function createBotController({ bots }: BotControllerDeps) {
  async function create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const parsed = createBotSchema.safeParse(request.body);
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

    try {
      const bot = await bots.start({
        userId: currentUserId(request),
        portfolioId: data.portfolioId,
        symbol: data.symbol.toUpperCase(),
        interval: data.interval,
        strategies: data.strategies.map((s) => ({
          strategyKey: s.strategyKey,
          weight: s.weight,
          params: s.params,
        })),
        buyFraction: data.buyFraction,
        invert: data.invert,
      });
      return reply.code(201).send(bot);
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : 'Échec.' });
    }
  }

  function list(request: FastifyRequest, reply: FastifyReply): FastifyReply {
    return reply.send(bots.list(currentUserId(request)));
  }

  async function remove(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const { id } = request.params as { id: string };
    const stopped = await bots.stop(currentUserId(request), id);
    return reply.code(stopped ? 204 : 404).send();
  }

  return { create, list, remove };
}
