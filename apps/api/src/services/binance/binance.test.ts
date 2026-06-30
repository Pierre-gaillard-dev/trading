import { describe, it, expect } from 'vitest';
import { WebSocket } from 'ws';
import { buildKlinesUrl, buildStreamUrl } from './binance.client';
import { binanceKlinesResponseSchema, binanceStreamMessageSchema } from './binance.schemas';

// Tests d'ACCÈS RÉEL à Binance → dépendent du réseau (donc opt-in, pas dans la suite par défaut).
// Pour les lancer :  BINANCE_E2E=1 pnpm --filter @trading/api test
const RUN = process.env.BINANCE_E2E === '1';

describe.skipIf(!RUN)('Binance — accès réel aux données (réseau requis)', () => {
  it('REST klines : la réponse correspond au schéma zod', async () => {
    const response = await fetch(buildKlinesUrl('BTCUSDT', '1m', 5));
    expect(response.ok).toBe(true);

    const parsed = binanceKlinesResponseSchema.safeParse(await response.json());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toHaveLength(5);
    }
  });

  it('WS stream : le premier message reçu correspond au schéma zod', async () => {
    const received = await new Promise<unknown>((resolve, reject) => {
      const ws = new WebSocket(buildStreamUrl('BTCUSDT', '1m'));
      const timer = setTimeout(() => {
        ws.close();
        reject(new Error('Aucun message Binance reçu (timeout)'));
      }, 10_000);

      ws.on('message', (raw: Buffer) => {
        clearTimeout(timer);
        ws.close();
        resolve(JSON.parse(raw.toString()));
      });
      ws.on('error', (error: Error) => {
        clearTimeout(timer);
        reject(error);
      });
    });

    const parsed = binanceStreamMessageSchema.safeParse(received);
    expect(parsed.success).toBe(true);
  }, 15_000);
});
