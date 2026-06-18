import type { FastifyReply, FastifyRequest } from 'fastify';
import { addWatchedSymbolSchema } from '@trading/shared';
import type { WatchlistRepository } from '../repositories/watchlist.repository';

export interface WatchlistControllerDeps {
  watchlist: WatchlistRepository;
  /** Vérifie qu'un symbole existe (Binance en prod, faux en test). */
  symbolExists: (symbol: string) => Promise<boolean>;
}

function currentUserId(request: FastifyRequest): string {
  return (request.user as { sub: string }).sub;
}

export function createWatchlistController({ watchlist, symbolExists }: WatchlistControllerDeps) {
  async function list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const items = await watchlist.listByUser(currentUserId(request));
    return reply.send(items);
  }

  async function add(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const parsed = addWatchedSymbolSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: 'Requête invalide.', details: parsed.error.flatten().fieldErrors });
    }

    const symbol = parsed.data.symbol.toUpperCase();

    let exists: boolean;
    try {
      exists = await symbolExists(symbol);
    } catch {
      // Binance injoignable (réseau coupé / bloqué) : erreur explicite, pas un crash 500.
      return reply
        .code(503)
        .send({ error: 'Validation indisponible : Binance est injoignable. Réessaie plus tard.' });
    }
    if (!exists) {
      return reply.code(422).send({ error: `Symbole inconnu sur Binance : ${symbol}` });
    }

    await watchlist.add(currentUserId(request), symbol);
    const items = await watchlist.listByUser(currentUserId(request));
    return reply.code(201).send(items);
  }

  async function remove(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const { symbol } = request.params as { symbol: string };
    await watchlist.remove(currentUserId(request), symbol.toUpperCase());
    return reply.code(204).send();
  }

  return { list, add, remove };
}
