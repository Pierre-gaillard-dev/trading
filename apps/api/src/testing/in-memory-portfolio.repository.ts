import type {
  CreatePortfolioInput,
  PortfolioRecord,
  PortfolioRepository,
} from '../repositories/portfolio.repository';

interface Entry extends PortfolioRecord {
  userId: string;
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

/** Faux repository de portefeuilles en mémoire (pour les tests, sans base). */
export class InMemoryPortfolioRepository implements PortfolioRepository {
  private readonly entries: Entry[] = [];
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
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const entry = this.entries[i];
      if (entry.userId === userId && entry.id === id) {
        this.entries.splice(i, 1);
      }
    }
    return Promise.resolve();
  }
}
