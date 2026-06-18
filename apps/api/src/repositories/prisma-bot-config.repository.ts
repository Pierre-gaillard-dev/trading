import { PrismaClient, Prisma } from '@prisma/client';
import type {
  BotConfigRecord,
  BotConfigRepository,
  NewBotConfig,
} from './bot-config.repository';

interface BotConfigRow {
  id: string;
  userId: string;
  portfolioId: string;
  symbol: string;
  interval: string;
  strategyKey: string;
  params: unknown;
  buyFraction: number;
}

function toRecord(row: BotConfigRow): BotConfigRecord {
  return {
    id: row.id,
    userId: row.userId,
    portfolioId: row.portfolioId,
    symbol: row.symbol,
    interval: row.interval,
    strategyKey: row.strategyKey,
    params: row.params,
    buyFraction: row.buyFraction,
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
        strategyKey: input.strategyKey,
        params: (input.params ?? {}) as Prisma.InputJsonValue,
        buyFraction: input.buyFraction,
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
