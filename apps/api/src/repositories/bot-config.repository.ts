export interface BotConfigRecord {
  id: string;
  userId: string;
  portfolioId: string;
  symbol: string;
  interval: string;
  strategyKey: string;
  params: unknown;
  buyFraction: number;
}

export interface NewBotConfig {
  userId: string;
  portfolioId: string;
  symbol: string;
  interval: string;
  strategyKey: string;
  params: unknown;
  buyFraction: number;
}

/** Persistance des bots, pour les relancer au démarrage du serveur (port). */
export interface BotConfigRepository {
  create(input: NewBotConfig): Promise<BotConfigRecord>;
  listAll(): Promise<BotConfigRecord[]>;
  remove(userId: string, id: string): Promise<void>;
}
