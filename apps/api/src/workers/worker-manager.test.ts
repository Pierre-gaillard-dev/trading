import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Candle } from '@trading/shared';
import { WorkerManager } from './worker-manager';
import type { Worker } from './worker';
import type { CandleFeed } from '../services/binance/market.registry';
import { InMemoryCandleRepository } from '../testing/in-memory-candle.repository';

/** Faux flux : mémorise les abonnements et permet d'émettre une bougie « à la main ». */
class FakeFeed implements CandleFeed {
  readonly attached: { symbol: string; interval: string }[] = [];
  detachCount = 0;
  private readonly listeners = new Map<string, (candle: Candle) => void>();

  attach(symbol: string, interval: string, onClosedCandle: (candle: Candle) => void): () => void {
    this.attached.push({ symbol, interval });
    this.listeners.set(`${symbol}|${interval}`, onClosedCandle);
    return () => {
      this.detachCount += 1;
    };
  }

  emit(symbol: string, interval: string, candle: Candle): void {
    this.listeners.get(`${symbol}|${interval}`)?.(candle);
  }
}

/** Worker espion minimal. */
function spyWorker(over: Partial<Worker> = {}): Worker & { calls: { candle: Candle; history: Candle[] }[] } {
  const calls: { candle: Candle; history: Candle[] }[] = [];
  return {
    id: 'w1',
    symbol: 'BTCUSDT',
    interval: '1m',
    onClosedCandle(candle, history) {
      calls.push({ candle, history });
    },
    calls,
    ...over,
  };
}

const candle = (time: number): Candle => ({ time, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1 });

/** Laisse tourner les micro-tâches (deliver est asynchrone et non attendu par le feed). */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('WorkerManager', () => {
  let feed: FakeFeed;
  let candles: InMemoryCandleRepository;
  let manager: WorkerManager;

  beforeEach(() => {
    feed = new FakeFeed();
    candles = new InMemoryCandleRepository();
    manager = new WorkerManager(feed, candles);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('start / stop', () => {
    it('abonne le worker au flux et incrémente le compteur', () => {
      manager.start(spyWorker());
      expect(manager.runningCount).toBe(1);
      expect(feed.attached).toEqual([{ symbol: 'BTCUSDT', interval: '1m' }]);
    });

    it('est idempotent : démarrer deux fois le même id n’abonne qu’une fois', () => {
      manager.start(spyWorker());
      manager.start(spyWorker());
      expect(manager.runningCount).toBe(1);
      expect(feed.attached).toHaveLength(1);
    });

    it('détache au stop et décrémente le compteur', () => {
      manager.start(spyWorker());
      manager.stop('w1');
      expect(manager.runningCount).toBe(0);
      expect(feed.detachCount).toBe(1);
    });

    it('stop sur un id inconnu ne fait rien (pas d’erreur)', () => {
      expect(() => manager.stop('inconnu')).not.toThrow();
      expect(feed.detachCount).toBe(0);
    });

    it('stopAll détache tous les workers', () => {
      manager.start(spyWorker({ id: 'a' }));
      manager.start(spyWorker({ id: 'b' }));
      manager.stopAll();
      expect(manager.runningCount).toBe(0);
      expect(feed.detachCount).toBe(2);
    });
  });

  describe('livraison d’une bougie clôturée', () => {
    it('transmet la bougie + l’historique récent lu depuis le repository', async () => {
      await candles.saveHistory('BTCUSDT', '1m', [candle(1), candle(2)]);
      const worker = spyWorker();
      manager.start(worker);

      feed.emit('BTCUSDT', '1m', candle(3));
      await flush();

      expect(worker.calls).toHaveLength(1);
      expect(worker.calls[0].candle).toEqual(candle(3));
      expect(worker.calls[0].history.map((c) => c.time)).toEqual([1, 2]);
    });

    it('isole une erreur du worker (ne propage pas, n’arrête pas les autres)', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const boom = spyWorker({
        id: 'boom',
        onClosedCandle() {
          throw new Error('stratégie en panne');
        },
      });
      const healthy = spyWorker({ id: 'ok', symbol: 'ETHUSDT' });
      manager.start(boom);
      manager.start(healthy);

      feed.emit('BTCUSDT', '1m', candle(1));
      feed.emit('ETHUSDT', '1m', candle(1));
      await flush();

      // Le worker sain a bien reçu sa bougie malgré l'échec de l'autre.
      expect(healthy.calls).toHaveLength(1);
      expect(console.warn).toHaveBeenCalled();
    });

    it('isole une erreur du repository d’historique', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(candles, 'getRecent').mockRejectedValue(new Error('DB indisponible'));
      const worker = spyWorker();
      manager.start(worker);

      feed.emit('BTCUSDT', '1m', candle(1));
      await flush();

      expect(worker.calls).toHaveLength(0); // jamais appelé, mais pas de crash
      expect(console.warn).toHaveBeenCalled();
    });
  });
});
