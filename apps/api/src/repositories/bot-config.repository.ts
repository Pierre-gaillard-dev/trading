/** Une stratégie membre du bot, persistée : clé, poids, paramètres. */
export interface BotStrategyConfig {
  strategyKey: string;
  weight: number;
  params?: unknown;
}

export interface BotConfigRecord {
  id: string;
  userId: string;
  portfolioId: string;
  symbol: string;
  interval: string;
  strategies: BotStrategyConfig[];
  buyFraction: number;
  /** Inverse la décision finale de l'ensemble (achat ↔ vente). */
  invert: boolean;
}

export interface NewBotConfig {
  userId: string;
  portfolioId: string;
  symbol: string;
  interval: string;
  strategies: BotStrategyConfig[];
  buyFraction: number;
  invert: boolean;
}

/** Persistance des bots, pour les relancer au démarrage du serveur (port). */
export interface BotConfigRepository {
  create(input: NewBotConfig): Promise<BotConfigRecord>;
  listAll(): Promise<BotConfigRecord[]>;
  remove(userId: string, id: string): Promise<void>;
}
