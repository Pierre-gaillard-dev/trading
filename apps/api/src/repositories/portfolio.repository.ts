export interface PortfolioRecord {
  id: string;
  name: string;
  baseCurrency: string;
  initialCash: string;
  cash: string;
  feeRate: string;
  slippageBps: number;
  createdAt: Date;
}

export interface CreatePortfolioInput {
  name: string;
  initialCash: string;
  feeRate: string;
  slippageBps: number;
}

/** Accès aux portefeuilles d'un utilisateur (port). */
export interface PortfolioRepository {
  listByUser(userId: string): Promise<PortfolioRecord[]>;
  create(userId: string, input: CreatePortfolioInput): Promise<PortfolioRecord>;
  findById(userId: string, id: string): Promise<PortfolioRecord | null>;
  remove(userId: string, id: string): Promise<void>;
}
