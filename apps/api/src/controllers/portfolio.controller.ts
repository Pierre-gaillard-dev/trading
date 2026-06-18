import type { FastifyReply, FastifyRequest } from 'fastify';
import { createPortfolioSchema } from '@trading/shared';
import type { PortfolioRepository } from '../repositories/portfolio.repository';

export interface PortfolioControllerDeps {
  portfolios: PortfolioRepository;
}

function currentUserId(request: FastifyRequest): string {
  return (request.user as { sub: string }).sub;
}

export function createPortfolioController({ portfolios }: PortfolioControllerDeps) {
  async function list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const items = await portfolios.listByUser(currentUserId(request));
    return reply.send(items);
  }

  async function create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const parsed = createPortfolioSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: 'Requête invalide.', details: parsed.error.flatten().fieldErrors });
    }
    const data = parsed.data;
    const record = await portfolios.create(currentUserId(request), {
      name: data.name,
      initialCash: data.initialCash,
      feeRate: data.feeRate ?? '0.001',
      slippageBps: data.slippageBps ?? 5,
    });
    return reply.code(201).send(record);
  }

  async function remove(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const { id } = request.params as { id: string };
    await portfolios.remove(currentUserId(request), id);
    return reply.code(204).send();
  }

  async function trades(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const { id } = request.params as { id: string };
    const owned = await portfolios.findById(currentUserId(request), id);
    if (owned === null) {
      return reply.code(404).send({ error: 'Portefeuille introuvable.' });
    }
    const { symbol } = request.query as { symbol?: string };
    return reply.send(await portfolios.listTrades(id, { symbol, limit: 200 }));
  }

  async function positions(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const { id } = request.params as { id: string };
    const owned = await portfolios.findById(currentUserId(request), id);
    if (owned === null) {
      return reply.code(404).send({ error: 'Portefeuille introuvable.' });
    }
    return reply.send(await portfolios.listPositions(id));
  }

  return { list, create, remove, trades, positions };
}
