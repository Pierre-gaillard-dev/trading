export interface WatchedSymbolRecord {
  symbol: string;
  createdAt: Date;
}

/** Contrat d'accès à la watchlist d'un utilisateur (port). */
export interface WatchlistRepository {
  listByUser(userId: string): Promise<WatchedSymbolRecord[]>;
  add(userId: string, symbol: string): Promise<void>;
  remove(userId: string, symbol: string): Promise<void>;
}
