import type {
  CreatePortfolioInput,
  NewTrade,
  PortfolioRecord,
  PortfolioRepository,
  PositionRecord,
  TradeRecord,
} from '../repositories/portfolio.repository';

interface Entry extends PortfolioRecord {
  userId: string;
}

/** Faux repository de portefeuilles en mémoire (pour les tests, sans base). */
export class InMemoryPortfolioRepository implements PortfolioRepository {
  private readonly entries: Entry[] = [];
  private readonly positions = new Map<string, Map<string, PositionRecord>>();
  private readonly trades: (TradeRecord & { portfolioId: string })[] = [];
  private sequence = 0;

  listByUser(userId: string): Promise<PortfolioRecord[]> {
    return Promise.resolve(this.entries.filter((e) => e.userId === userId).map(strip));
  }

  create(userId: string, input: CreatePortfolioInput): Promise<PortfolioRecord> {
    this.sequence += 1;
    const entry: Entry = {
      id: `pf_${String(this.sequence)}`,
      userId,
      name: input.name,
      baseCurrency: 'USDT',
      initialCash: input.initialCash,
      cash: input.initialCash,
      feeRate: input.feeRate,
      slippageBps: input.slippageBps,
      createdAt: new Date(0),
    };
    this.entries.push(entry);
    return Promise.resolve(strip(entry));
  }

  findById(userId: string, id: string): Promise<PortfolioRecord | null> {
    const entry = this.entries.find((e) => e.userId === userId && e.id === id);
    return Promise.resolve(entry ? strip(entry) : null);
  }

  remove(userId: string, id: string): Promise<void> {
    const index = this.entries.findIndex((e) => e.userId === userId && e.id === id);
    if (index !== -1) {
      this.entries.splice(index, 1);
    }
    return Promise.resolve();
  }

  updateCash(portfolioId: string, cash: string): Promise<void> {
    const entry = this.entries.find((e) => e.id === portfolioId);
    if (entry) {
      entry.cash = cash;
    }
    return Promise.resolve();
  }

  listPositions(portfolioId: string): Promise<PositionRecord[]> {
    return Promise.resolve([...(this.positions.get(portfolioId)?.values() ?? [])]);
  }

  upsertPosition(
    portfolioId: string,
    symbol: string,
    quantity: string,
    avgEntryPrice: string,
  ): Promise<void> {
    let bucket = this.positions.get(portfolioId);
    if (!bucket) {
      bucket = new Map<string, PositionRecord>();
      this.positions.set(portfolioId, bucket);
    }
    bucket.set(symbol, { symbol, quantity, avgEntryPrice });
    return Promise.resolve();
  }

  removePosition(portfolioId: string, symbol: string): Promise<void> {
    this.positions.get(portfolioId)?.delete(symbol);
    return Promise.resolve();
  }

  addTrade(trade: NewTrade): Promise<void> {
    this.sequence += 1;
    this.trades.push({
      id: `tr_${String(this.sequence)}`,
      portfolioId: trade.portfolioId,
      symbol: trade.symbol,
      side: trade.side,
      strategyKey: trade.strategyKey,
      quantity: trade.quantity,
      price: trade.price,
      fee: trade.fee,
      candleTime: trade.candleTime,
      executedAt: new Date(0),
    });
    return Promise.resolve();
  }

  listTrades(
    portfolioId: string,
    options: { symbol?: string; limit?: number } = {},
  ): Promise<TradeRecord[]> {
    const filtered = this.trades.filter(
      (t) => t.portfolioId === portfolioId && (options.symbol === undefined || t.symbol === options.symbol),
    );
    const sorted = [...filtered].reverse().slice(0, options.limit ?? 100);
    return Promise.resolve(
      sorted.map((t) => ({
        id: t.id,
        symbol: t.symbol,
        side: t.side,
        strategyKey: t.strategyKey,
        quantity: t.quantity,
        price: t.price,
        fee: t.fee,
        candleTime: t.candleTime,
        executedAt: t.executedAt,
      })),
    );
  }
}

function strip(entry: Entry): PortfolioRecord {
  return {
    id: entry.id,
    name: entry.name,
    baseCurrency: entry.baseCurrency,
    initialCash: entry.initialCash,
    cash: entry.cash,
    feeRate: entry.feeRate,
    slippageBps: entry.slippageBps,
    createdAt: entry.createdAt,
  };
}
