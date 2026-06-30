import { describe, it, expect } from 'vitest';
import { createBotSchema, botSchema, tradeSchema, positionSchema } from './bot';

/**
 * `createBotSchema` valide la création d'un bot. Points sensibles :
 * - `symbol` doit ressembler à une paire USDT (regex insensible à la casse) ;
 * - `interval` doit être l'un des intervalles Binance autorisés ;
 * - `strategyKey` n'est ici que « non vide » (la validation de l'existence réelle
 *   de la stratégie se fait dans le controller, pas dans le schéma).
 */
describe('createBotSchema', () => {
  const valid = {
    portfolioId: 'pf_1',
    symbol: 'BTCUSDT',
    interval: '1m',
    strategies: [{ strategyKey: 'ma_crossover', weight: 1 }],
  };

  describe('cas nominal', () => {
    it('accepte une création valide', () => {
      expect(createBotSchema.safeParse(valid).success).toBe(true);
    });

    it('accepte des params optionnels (par stratégie)', () => {
      const result = createBotSchema.safeParse({
        ...valid,
        strategies: [{ strategyKey: 'ma_crossover', weight: 1, params: { fast: 9, slow: 21 } }],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('symbol', () => {
    it('accepte un symbole en minuscules (regex insensible à la casse)', () => {
      expect(createBotSchema.safeParse({ ...valid, symbol: 'ethusdt' }).success).toBe(true);
    });

    it('rejette un symbole sans suffixe USDT', () => {
      expect(createBotSchema.safeParse({ ...valid, symbol: 'BTCEUR' }).success).toBe(false);
    });

    it('rejette un symbole avec un tiret', () => {
      expect(createBotSchema.safeParse({ ...valid, symbol: 'BTC-USDT' }).success).toBe(false);
    });

    it('rejette "USDT" seul (partie base manquante)', () => {
      expect(createBotSchema.safeParse({ ...valid, symbol: 'USDT' }).success).toBe(false);
    });

    it('rejette un symbole vide', () => {
      expect(createBotSchema.safeParse({ ...valid, symbol: '' }).success).toBe(false);
    });

    // FAILLE POTENTIELLE : contrairement à la watchlist, le symbole du bot n'est PAS
    // rogné (pas de .trim()) → un espace en fin de chaîne le fait échouer.
    it('rejette (à signaler) un symbole avec espace final, non rogné', () => {
      expect(createBotSchema.safeParse({ ...valid, symbol: 'BTCUSDT ' }).success).toBe(false);
    });

    // QUIRK : "USDTUSDT" matche (base="USDT" + suffixe "USDT"). Documenté ici.
    it('accepte (quirk) "USDTUSDT"', () => {
      expect(createBotSchema.safeParse({ ...valid, symbol: 'USDTUSDT' }).success).toBe(true);
    });

    it('rejette une base de plus de 16 caractères', () => {
      const tooLong = `${'A'.repeat(17)}USDT`;
      expect(createBotSchema.safeParse({ ...valid, symbol: tooLong }).success).toBe(false);
    });
  });

  describe('interval', () => {
    it.each(['1m', '15m', '1h', '1d'])('accepte l’intervalle autorisé %s', (interval) => {
      expect(createBotSchema.safeParse({ ...valid, interval }).success).toBe(true);
    });

    it('rejette un intervalle non listé (5m)', () => {
      expect(createBotSchema.safeParse({ ...valid, interval: '5m' }).success).toBe(false);
    });

    it('rejette un intervalle avec mauvaise casse (1M)', () => {
      expect(createBotSchema.safeParse({ ...valid, interval: '1M' }).success).toBe(false);
    });
  });

  describe('strategies', () => {
    it('rejette une liste de stratégies vide', () => {
      expect(createBotSchema.safeParse({ ...valid, strategies: [] }).success).toBe(false);
    });

    it('rejette une clé de stratégie vide', () => {
      expect(
        createBotSchema.safeParse({ ...valid, strategies: [{ strategyKey: '', weight: 1 }] })
          .success,
      ).toBe(false);
    });

    it('rejette un poids nul ou négatif', () => {
      expect(
        createBotSchema.safeParse({
          ...valid,
          strategies: [{ strategyKey: 'ma_crossover', weight: 0 }],
        }).success,
      ).toBe(false);
    });

    // À SIGNALER : le schéma laisse passer n'importe quelle clé non vide ;
    // c'est le controller qui rejette les stratégies inconnues (cf. bot.test des routes).
    it('accepte (au niveau schéma) une clé inconnue non vide', () => {
      expect(
        createBotSchema.safeParse({
          ...valid,
          strategies: [{ strategyKey: 'stratégie_bidon', weight: 1 }],
        }).success,
      ).toBe(true);
    });
  });

  describe('buyFraction (optionnel, part du cash investie par achat)', () => {
    it('accepte une fraction dans ]0, 1]', () => {
      expect(createBotSchema.safeParse({ ...valid, buyFraction: 0.1 }).success).toBe(true);
    });

    it('accepte la borne haute 1 (100 % du cash)', () => {
      expect(createBotSchema.safeParse({ ...valid, buyFraction: 1 }).success).toBe(true);
    });

    it('rejette 0 (doit être strictement > 0)', () => {
      expect(createBotSchema.safeParse({ ...valid, buyFraction: 0 }).success).toBe(false);
    });

    it('rejette une valeur négative', () => {
      expect(createBotSchema.safeParse({ ...valid, buyFraction: -0.1 }).success).toBe(false);
    });

    it('rejette une fraction > 1 (on ne peut pas investir plus que le cash)', () => {
      expect(createBotSchema.safeParse({ ...valid, buyFraction: 1.5 }).success).toBe(false);
    });

    it('rejette une fraction en chaîne', () => {
      expect(createBotSchema.safeParse({ ...valid, buyFraction: '0.5' }).success).toBe(false);
    });
  });

  it('rejette un portfolioId vide', () => {
    expect(createBotSchema.safeParse({ ...valid, portfolioId: '' }).success).toBe(false);
  });
});

/** `tradeSchema` : forme d'un trade renvoyé par l'API. */
describe('tradeSchema', () => {
  const trade = {
    id: 'tr_1',
    symbol: 'BTCUSDT',
    side: 'BUY',
    strategyKey: 'rsi',
    quantity: '0.5',
    price: '40000',
    fee: '20',
    candleTime: 1_700_000_000,
    executedAt: '2026-01-01T00:00:00.000Z',
  };

  it('accepte un trade BUY complet', () => {
    expect(tradeSchema.safeParse(trade).success).toBe(true);
  });

  it('accepte SELL', () => {
    expect(tradeSchema.safeParse({ ...trade, side: 'SELL' }).success).toBe(true);
  });

  it('rejette un side inconnu', () => {
    expect(tradeSchema.safeParse({ ...trade, side: 'HOLD' }).success).toBe(false);
  });

  it('rejette candleTime en chaîne (doit être numérique pour le graphe)', () => {
    expect(tradeSchema.safeParse({ ...trade, candleTime: '1700000000' }).success).toBe(false);
  });
});

/** `positionSchema` : forme d'une position détenue. */
describe('positionSchema', () => {
  it('accepte une position valide', () => {
    const result = positionSchema.safeParse({
      symbol: 'BTCUSDT',
      quantity: '0.5',
      avgEntryPrice: '40000',
    });
    expect(result.success).toBe(true);
  });

  it('rejette une position sans avgEntryPrice', () => {
    expect(positionSchema.safeParse({ symbol: 'BTCUSDT', quantity: '0.5' }).success).toBe(false);
  });
});

/** `botSchema` : bot renvoyé par l'API. */
describe('botSchema', () => {
  it('accepte un bot valide', () => {
    const result = botSchema.safeParse({
      id: 'bot_1',
      portfolioId: 'pf_1',
      symbol: 'BTCUSDT',
      interval: '1m',
      strategies: [{ strategyKey: 'macd', weight: 1 }],
    });
    expect(result.success).toBe(true);
  });
});
