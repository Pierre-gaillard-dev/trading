import { describe, it, expect } from 'vitest';
import {
  buildKlinesUrl,
  buildExchangeInfoUrl,
  buildStreamUrl,
  parseStreamMessage,
} from './binance.client';

/**
 * Tests UNITAIRES (offline) du client Binance : constructeurs d'URL et décodage du
 * flux. Aucune dépendance réseau (les tests d'accès réel sont dans binance.test.ts,
 * opt-in via BINANCE_E2E=1). On cible le contrat exact des URL et le parsing robuste.
 */

describe('buildKlinesUrl', () => {
  it('met le symbole en majuscules et inclut interval + limit', () => {
    expect(buildKlinesUrl('btcusdt', '1m', 5)).toBe(
      'https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=5',
    );
  });

  it('laisse un symbole déjà en majuscules inchangé', () => {
    expect(buildKlinesUrl('ETHUSDT', '1h', 100)).toContain('symbol=ETHUSDT');
  });
});

describe('buildExchangeInfoUrl', () => {
  it('met le symbole en majuscules', () => {
    expect(buildExchangeInfoUrl('btcusdt')).toBe(
      'https://data-api.binance.vision/api/v3/exchangeInfo?symbol=BTCUSDT',
    );
  });
});

describe('buildStreamUrl', () => {
  it('met le symbole en minuscules et combine les flux trade + kline', () => {
    expect(buildStreamUrl('BTCUSDT', '1m')).toBe(
      'wss://data-stream.binance.vision/stream?streams=btcusdt@trade/btcusdt@kline_1m',
    );
  });
});

describe('parseStreamMessage', () => {
  function tradeMsg(price: string) {
    return JSON.stringify({ stream: 'btcusdt@trade', data: { e: 'trade', s: 'BTCUSDT', p: price } });
  }

  function klineMsg(overrides: Record<string, unknown> = {}) {
    return JSON.stringify({
      stream: 'btcusdt@kline_1m',
      data: {
        e: 'kline',
        s: 'BTCUSDT',
        k: { t: 1_700_000_000_000, o: '1', h: '2', l: '0.5', c: '1.5', v: '100', x: false, ...overrides },
      },
    });
  }

  describe('évènement trade (prix)', () => {
    it('décode un prix', () => {
      expect(parseStreamMessage(tradeMsg('40000.5'))).toEqual({ kind: 'price', price: 40000.5 });
    });

    it('renvoie null si le prix n’est pas une chaîne', () => {
      const raw = JSON.stringify({ stream: 's', data: { e: 'trade', s: 'BTCUSDT', p: 40000 } });
      expect(parseStreamMessage(raw)).toBeNull();
    });

    // FAILLE POTENTIELLE : un prix non numérique ("abc") n'est pas rejeté → price = NaN.
    it('renvoie un prix NaN (à signaler) pour une chaîne non numérique', () => {
      const result = parseStreamMessage(tradeMsg('abc'));
      expect(result?.kind).toBe('price');
      expect(result?.kind === 'price' && Number.isNaN(result.price)).toBe(true);
    });
  });

  describe('évènement kline (bougie)', () => {
    it('décode une bougie non clôturée et convertit le temps en secondes', () => {
      expect(parseStreamMessage(klineMsg())).toEqual({
        kind: 'candle',
        closed: false,
        candle: { time: 1_700_000_000, open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 },
      });
    });

    it('marque la bougie comme clôturée quand x = true', () => {
      const result = parseStreamMessage(klineMsg({ x: true }));
      expect(result?.kind === 'candle' && result.closed).toBe(true);
    });

    it('considère non clôturée si x est absent ou non strictement true', () => {
      const result = parseStreamMessage(klineMsg({ x: 'true' }));
      expect(result?.kind === 'candle' && result.closed).toBe(false);
    });
  });

  describe('messages ignorés', () => {
    it('renvoie null pour un type d’évènement inconnu', () => {
      const raw = JSON.stringify({ stream: 's', data: { e: 'depthUpdate' } });
      expect(parseStreamMessage(raw)).toBeNull();
    });

    it('renvoie null quand data est null', () => {
      expect(parseStreamMessage(JSON.stringify({ stream: 's', data: null }))).toBeNull();
    });

    it('renvoie null quand data n’est pas un objet', () => {
      expect(parseStreamMessage(JSON.stringify({ stream: 's', data: 'oops' }))).toBeNull();
    });

    it('lève sur un JSON invalide (entrée corrompue)', () => {
      expect(() => parseStreamMessage('pas-du-json')).toThrow();
    });
  });
});
