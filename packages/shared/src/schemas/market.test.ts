import { describe, it, expect } from 'vitest';
import { candleSchema, marketMessageSchema, CANDLE_INTERVALS } from './market';

/** `candleSchema` : une bougie prête pour le graphe (temps en secondes, valeurs numériques). */
describe('candleSchema', () => {
  const candle = { time: 1_700_000_000, open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 };

  it('accepte une bougie bien formée', () => {
    expect(candleSchema.safeParse(candle).success).toBe(true);
  });

  it('rejette une valeur en chaîne (doit être numérique)', () => {
    expect(candleSchema.safeParse({ ...candle, close: '1.5' }).success).toBe(false);
  });

  it('rejette un champ manquant', () => {
    const { volume, ...withoutVolume } = candle;
    void volume;
    expect(candleSchema.safeParse(withoutVolume).success).toBe(false);
  });
});

/**
 * `marketMessageSchema` : union discriminée des messages WebSocket /ws/market.
 * On vérifie chaque variante et le fait que le discriminant `type` est requis.
 */
describe('marketMessageSchema', () => {
  describe('snapshot', () => {
    const snapshot = {
      type: 'snapshot',
      symbol: 'BTCUSDT',
      interval: '1m',
      price: 40000,
      candles: [{ time: 1, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1 }],
    };

    it('accepte un snapshot complet', () => {
      expect(marketMessageSchema.safeParse(snapshot).success).toBe(true);
    });

    it('accepte un prix null (pas encore de prix connu)', () => {
      expect(marketMessageSchema.safeParse({ ...snapshot, price: null }).success).toBe(true);
    });

    it('accepte une liste de bougies vide', () => {
      expect(marketMessageSchema.safeParse({ ...snapshot, candles: [] }).success).toBe(true);
    });

    it('rejette une bougie mal formée dans la liste', () => {
      const result = marketMessageSchema.safeParse({
        ...snapshot,
        candles: [{ time: 1 }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('price', () => {
    it('accepte un message price', () => {
      const result = marketMessageSchema.safeParse({
        type: 'price',
        symbol: 'BTCUSDT',
        price: 41000,
      });
      expect(result.success).toBe(true);
    });

    it('rejette un price null (ici le prix est obligatoire, contrairement au snapshot)', () => {
      const result = marketMessageSchema.safeParse({
        type: 'price',
        symbol: 'BTCUSDT',
        price: null,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('candle', () => {
    it('accepte un message candle', () => {
      const result = marketMessageSchema.safeParse({
        type: 'candle',
        symbol: 'BTCUSDT',
        candle: { time: 1, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1 },
      });
      expect(result.success).toBe(true);
    });
  });

  it('rejette un type inconnu', () => {
    expect(marketMessageSchema.safeParse({ type: 'tick', symbol: 'BTCUSDT' }).success).toBe(false);
  });

  it('rejette un message sans discriminant type', () => {
    expect(marketMessageSchema.safeParse({ symbol: 'BTCUSDT', price: 1 }).success).toBe(false);
  });
});

describe('CANDLE_INTERVALS', () => {
  it('expose exactement les intervalles supportés', () => {
    expect(CANDLE_INTERVALS).toEqual(['1m', '15m', '1h', '1d']);
  });
});
