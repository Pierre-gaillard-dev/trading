import { PrismaClient } from '@prisma/client';
import type { WatchedSymbolRecord, WatchlistRepository } from './watchlist.repository';

/** Implémentation réelle : la watchlist dans PostgreSQL via Prisma. */
export class PrismaWatchlistRepository implements WatchlistRepository {
  constructor(private readonly db: PrismaClient = new PrismaClient()) {}

  listByUser(userId: string): Promise<WatchedSymbolRecord[]> {
    return this.db.watchedSymbol.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { symbol: true, createdAt: true },
    });
  }

  async add(userId: string, symbol: string): Promise<void> {
    // upsert : ajouter sans erreur si déjà suivi (idempotent).
    await this.db.watchedSymbol.upsert({
      where: { userId_symbol: { userId, symbol } },
      update: {},
      create: { userId, symbol },
    });
  }

  async remove(userId: string, symbol: string): Promise<void> {
    await this.db.watchedSymbol.deleteMany({ where: { userId, symbol } });
  }
}
