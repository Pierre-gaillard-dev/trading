import { PrismaClient } from '@prisma/client';
import type { Candle } from '@trading/shared';
import type { CandleRepository } from './candle.repository';

/** Implémentation réelle : les bougies dans PostgreSQL via Prisma. */
export class PrismaCandleRepository implements CandleRepository {
  constructor(private readonly db: PrismaClient = new PrismaClient()) {}

  async saveHistory(symbol: string, interval: string, candles: Candle[]): Promise<void> {
    if (candles.length === 0) {
      return;
    }
    await this.db.candle.createMany({
      data: candles.map((c) => ({
        symbol,
        interval,
        openTime: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      })),
      skipDuplicates: true,
    });
  }

  async saveClosedCandle(symbol: string, interval: string, candle: Candle): Promise<void> {
    const values = {
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    };
    await this.db.candle.upsert({
      where: { symbol_interval_openTime: { symbol, interval, openTime: candle.time } },
      update: values,
      create: { symbol, interval, openTime: candle.time, ...values },
    });
  }

  async getRecent(symbol: string, interval: string, limit: number): Promise<Candle[]> {
    const rows = await this.db.candle.findMany({
      where: { symbol, interval },
      orderBy: { openTime: 'desc' },
      take: limit,
    });
    return rows
      .reverse()
      .map((r) => ({
        time: r.openTime,
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume,
      }));
  }

  async getLastPrice(symbol: string): Promise<number | null> {
    const row = await this.db.candle.findFirst({
      where: { symbol },
      orderBy: { openTime: 'desc' },
      select: { close: true },
    });
    return row?.close ?? null;
  }
}
