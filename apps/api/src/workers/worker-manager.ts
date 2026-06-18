import type { Candle } from '@trading/shared';
import type { CandleRepository } from '../repositories/candle.repository';
import type { CandleFeed } from '../services/binance/market.registry';
import type { Worker } from './worker';

/**
 * Héberge les workers : les démarre/arrête, et à chaque bougie clôturée leur
 * fournit la bougie + l'historique récent (lu depuis la base, pas re-téléchargé).
 */
export class WorkerManager {
  private readonly detachers = new Map<string, () => void>();

  constructor(
    private readonly feed: CandleFeed,
    private readonly candles: CandleRepository,
    private readonly historyLimit = 500,
  ) {}

  start(worker: Worker): void {
    if (this.detachers.has(worker.id)) {
      return;
    }
    const detach = this.feed.attach(worker.symbol, worker.interval, (candle) => {
      void this.deliver(worker, candle);
    });
    this.detachers.set(worker.id, detach);
  }

  stop(workerId: string): void {
    const detach = this.detachers.get(workerId);
    if (detach) {
      detach();
      this.detachers.delete(workerId);
    }
  }

  stopAll(): void {
    for (const detach of this.detachers.values()) {
      detach();
    }
    this.detachers.clear();
  }

  get runningCount(): number {
    return this.detachers.size;
  }

  private async deliver(worker: Worker, candle: Candle): Promise<void> {
    const history = await this.candles.getRecent(worker.symbol, worker.interval, this.historyLimit);
    await worker.onClosedCandle(candle, history);
  }
}
