import { PrismaClient } from '@prisma/client';
import type {
  CreatePortfolioInput,
  NewTrade,
  PortfolioRecord,
  PortfolioRepository,
  PositionRecord,
  TradeRecord,
} from './portfolio.repository';

interface Stringable {
  toString(): string;
}

interface PortfolioRow {
  id: string;
  name: string;
  baseCurrency: string;
  initialCash: Stringable;
  cash: Stringable;
  feeRate: Stringable;
  slippageBps: number;
  createdAt: Date;
}

function toRecord(row: PortfolioRow): PortfolioRecord {
  return {
    id: row.id,
    name: row.name,
    baseCurrency: row.baseCurrency,
    initialCash: row.initialCash.toString(),
    cash: row.cash.toString(),
    feeRate: row.feeRate.toString(),
    slippageBps: row.slippageBps,
    createdAt: row.createdAt,
  };
}

/** Implémentation réelle : portefeuilles, positions et trades dans PostgreSQL via Prisma. */
export class PrismaPortfolioRepository implements PortfolioRepository {
  constructor(private readonly db: PrismaClient = new PrismaClient()) {}

  async listByUser(userId: string): Promise<PortfolioRecord[]> {
    const rows = await this.db.portfolio.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
    return rows.map(toRecord);
  }

  async create(userId: string, input: CreatePortfolioInput): Promise<PortfolioRecord> {
    const row = await this.db.portfolio.create({
      data: {
        userId,
        name: input.name,
        initialCash: input.initialCash,
        cash: input.initialCash,
        feeRate: input.feeRate,
        slippageBps: input.slippageBps,
      },
    });
    return toRecord(row);
  }

  async findById(userId: string, id: string): Promise<PortfolioRecord | null> {
    const row = await this.db.portfolio.findFirst({ where: { id, userId } });
    return row === null ? null : toRecord(row);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.db.portfolio.deleteMany({ where: { id, userId } });
  }

  async updateCash(portfolioId: string, cash: string): Promise<void> {
    await this.db.portfolio.update({ where: { id: portfolioId }, data: { cash } });
  }

  async listPositions(portfolioId: string): Promise<PositionRecord[]> {
    const rows = await this.db.position.findMany({ where: { portfolioId } });
    return rows.map((row) => ({
      symbol: row.symbol,
      quantity: row.quantity.toString(),
      avgEntryPrice: row.avgEntryPrice.toString(),
    }));
  }

  async upsertPosition(
    portfolioId: string,
    symbol: string,
    quantity: string,
    avgEntryPrice: string,
  ): Promise<void> {
    await this.db.position.upsert({
      where: { portfolioId_symbol: { portfolioId, symbol } },
      update: { quantity, avgEntryPrice },
      create: { portfolioId, symbol, quantity, avgEntryPrice },
    });
  }

  async removePosition(portfolioId: string, symbol: string): Promise<void> {
    await this.db.position.deleteMany({ where: { portfolioId, symbol } });
  }

  async addTrade(trade: NewTrade): Promise<void> {
    await this.db.trade.create({
      data: {
        portfolioId: trade.portfolioId,
        symbol: trade.symbol,
        side: trade.side,
        quantity: trade.quantity,
        price: trade.price,
        fee: trade.fee,
        candleTime: trade.candleTime,
      },
    });
  }

  async listTrades(
    portfolioId: string,
    options: { symbol?: string; limit?: number } = {},
  ): Promise<TradeRecord[]> {
    const rows = await this.db.trade.findMany({
      where: { portfolioId, ...(options.symbol === undefined ? {} : { symbol: options.symbol }) },
      orderBy: { executedAt: 'desc' },
      take: options.limit ?? 100,
    });
    return rows.map((row) => ({
      id: row.id,
      symbol: row.symbol,
      side: row.side === 'SELL' ? 'SELL' : 'BUY',
      quantity: row.quantity.toString(),
      price: row.price.toString(),
      fee: row.fee.toString(),
      candleTime: row.candleTime,
      executedAt: row.executedAt,
    }));
  }
}
