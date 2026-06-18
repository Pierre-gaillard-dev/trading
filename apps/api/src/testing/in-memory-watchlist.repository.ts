import type { WatchedSymbolRecord, WatchlistRepository } from '../repositories/watchlist.repository';

interface Entry {
  userId: string;
  symbol: string;
  createdAt: Date;
}

/** Faux repository watchlist en mémoire (pour les tests, sans base). */
export class InMemoryWatchlistRepository implements WatchlistRepository {
  private readonly entries: Entry[] = [];

  listByUser(userId: string): Promise<WatchedSymbolRecord[]> {
    const items = this.entries
      .filter((entry) => entry.userId === userId)
      .map((entry) => ({ symbol: entry.symbol, createdAt: entry.createdAt }));
    return Promise.resolve(items);
  }

  add(userId: string, symbol: string): Promise<void> {
    const exists = this.entries.some((e) => e.userId === userId && e.symbol === symbol);
    if (!exists) {
      this.entries.push({ userId, symbol, createdAt: new Date(0) });
    }
    return Promise.resolve();
  }

  remove(userId: string, symbol: string): Promise<void> {
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const entry = this.entries[i];
      if (entry.userId === userId && entry.symbol === symbol) {
        this.entries.splice(i, 1);
      }
    }
    return Promise.resolve();
  }
}
