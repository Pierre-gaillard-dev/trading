import { PrismaClient, Prisma } from '@prisma/client';
import type {
  BotConfigRecord,
  BotConfigRepository,
  BotStrategyConfig,
  NewBotConfig,
} from './bot-config.repository';

interface BotConfigRow {
  id: string;
  userId: string;
  portfolioId: string;
  symbol: string;
  interval: string;
  strategies: unknown;
  buyFraction: number;
  invert: boolean;
}

function toRecord(row: BotConfigRow): BotConfigRecord {
  return {
    id: row.id,
    userId: row.userId,
    portfolioId: row.portfolioId,
    symbol: row.symbol,
    interval: row.interval,
    strategies: (Array.isArray(row.strategies) ? row.strategies : []) as BotStrategyConfig[],
    buyFraction: row.buyFraction,
    invert: row.invert ?? false,
  };
}

/** Implémentation réelle : la config des bots dans PostgreSQL via Prisma. */
export class PrismaBotConfigRepository implements BotConfigRepository {
  constructor(private readonly db: PrismaClient = new PrismaClient()) {}

  async create(input: NewBotConfig): Promise<BotConfigRecord> {
    const row = await this.db.botConfig.create({
      data: {
        userId: input.userId,
        portfolioId: input.portfolioId,
        symbol: input.symbol,
        interval: input.interval,
        strategies: input.strategies as unknown as Prisma.InputJsonValue,
        buyFraction: input.buyFraction,
        invert: input.invert,
      },
    });
    return toRecord(row);
  }

  async listAll(): Promise<BotConfigRecord[]> {
    const rows = await this.db.botConfig.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map(toRecord);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.db.botConfig.deleteMany({ where: { id, userId } });
  }
}
