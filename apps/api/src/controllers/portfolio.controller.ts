import type { FastifyReply, FastifyRequest } from 'fastify';
import { createPortfolioSchema } from '@trading/shared';
import type { PortfolioRepository } from '../repositories/portfolio.repository';
import { buildPortfolioSummary } from '../services/portfolio-summary';

/** Source de prix minimale (dernier prix connu d'un symbole). */
export interface PriceSource {
  getLastPrice(symbol: string): Promise<number | null>;
}

export interface PortfolioControllerDeps {
  portfolios: PortfolioRepository;
  prices: PriceSource;
}

function currentUserId(request: FastifyRequest): string {
  return (request.user as { sub: string }).sub;
}

export function createPortfolioController({ portfolios, prices }: PortfolioControllerDeps) {
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

  async function summary(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const { id } = request.params as { id: string };
    const record = await portfolios.findById(currentUserId(request), id);
    if (record === null) {
      return reply.code(404).send({ error: 'Portefeuille introuvable.' });
    }
    const held = await portfolios.listPositions(id);
    const uniqueSymbols = [...new Set(held.map((p) => p.symbol))];
    const priceList = await Promise.all(
      uniqueSymbols.map(async (symbol) => [symbol, await prices.getLastPrice(symbol)] as const),
    );
    return reply.send(buildPortfolioSummary(record, held, new Map(priceList)));
  }

  return { list, create, remove, trades, positions, summary };
}
