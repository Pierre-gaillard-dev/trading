import { PrismaClient } from '@prisma/client';
import type {
  CreatePortfolioInput,
  PortfolioRecord,
  PortfolioRepository,
} from './portfolio.repository';

interface PortfolioRow {
  id: string;
  name: string;
  baseCurrency: string;
  initialCash: { toString(): string };
  cash: { toString(): string };
  feeRate: { toString(): string };
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

/** Implémentation réelle : les portefeuilles dans PostgreSQL via Prisma. */
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
        cash: input.initialCash, // au départ, cash = capital initial
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
}
