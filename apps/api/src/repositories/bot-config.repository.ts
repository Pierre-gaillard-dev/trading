export interface BotConfigRecord {
  id: string;
  userId: string;
  portfolioId: string;
  symbol: string;
  interval: string;
  strategyKey: string;
  params: unknown;
}

export interface NewBotConfig {
  userId: string;
  portfolioId: string;
  symbol: string;
  interval: string;
  strategyKey: string;
  params: unknown;
}

/** Persistance des bots, pour les relancer au démarrage du serveur (port). */
export interface BotConfigRepository {
  create(input: NewBotConfig): Promise<BotConfigRecord>;
  listAll(): Promise<BotConfigRecord[]>;
  remove(userId: string, id: string): Promise<void>;
}
