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

export interface PositionRecord {
  symbol: string;
  quantity: string;
  avgEntryPrice: string;
}

export interface TradeRecord {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  strategyKey: string;
  quantity: string;
  price: string;
  fee: string;
  candleTime: number;
  executedAt: Date;
}

export interface NewTrade {
  portfolioId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  strategyKey: string;
  quantity: string;
  price: string;
  fee: string;
  candleTime: number;
}

/** Accès aux portefeuilles d'un utilisateur, leurs positions et leurs trades (port). */
export interface PortfolioRepository {
  listByUser(userId: string): Promise<PortfolioRecord[]>;
  create(userId: string, input: CreatePortfolioInput): Promise<PortfolioRecord>;
  findById(userId: string, id: string): Promise<PortfolioRecord | null>;
  remove(userId: string, id: string): Promise<void>;

  // --- état de trading (utilisé par les bots) ---
  updateCash(portfolioId: string, cash: string): Promise<void>;
  listPositions(portfolioId: string): Promise<PositionRecord[]>;
  upsertPosition(
    portfolioId: string,
    symbol: string,
    quantity: string,
    avgEntryPrice: string,
  ): Promise<void>;
  removePosition(portfolioId: string, symbol: string): Promise<void>;
  addTrade(trade: NewTrade): Promise<void>;
  listTrades(
    portfolioId: string,
    options?: { symbol?: string; limit?: number },
  ): Promise<TradeRecord[]>;
}
