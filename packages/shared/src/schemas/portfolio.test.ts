import { describe, it, expect } from 'vitest';
import { createPortfolioSchema, portfolioSchema, portfoliosResponseSchema } from './portfolio';

/**
 * `createPortfolioSchema` est le rempart d'entrée de POST /api/portfolios.
 * On y vérifie : nom (trim + bornes), capital initial (décimal en chaîne + > 0),
 * et les champs optionnels (feeRate, slippageBps). C'est de l'argent → on cherche
 * surtout les valeurs qui pourraient passer alors qu'elles ne devraient pas.
 */
describe('createPortfolioSchema', () => {
  const valid = { name: 'Mon portefeuille', initialCash: '10000' };

  describe('cas nominal', () => {
    it('accepte un nom et un capital valides (sans champs optionnels)', () => {
      const result = createPortfolioSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('accepte un capital décimal en chaîne', () => {
      const result = createPortfolioSchema.safeParse({ ...valid, initialCash: '10000.50' });
      expect(result.success).toBe(true);
    });

    it('accepte feeRate et slippageBps optionnels bien formés', () => {
      const result = createPortfolioSchema.safeParse({
        ...valid,
        feeRate: '0.001',
        slippageBps: 5,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('name', () => {
    it('rogne les espaces autour du nom', () => {
      const result = createPortfolioSchema.safeParse({ ...valid, name: '  Crypto  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Crypto');
      }
    });

    it('rejette un nom vide', () => {
      const result = createPortfolioSchema.safeParse({ ...valid, name: '' });
      expect(result.success).toBe(false);
    });

    it('rejette un nom composé uniquement d’espaces (vide après trim)', () => {
      const result = createPortfolioSchema.safeParse({ ...valid, name: '     ' });
      expect(result.success).toBe(false);
    });

    it('accepte un nom de 50 caractères (borne haute)', () => {
      const result = createPortfolioSchema.safeParse({ ...valid, name: 'a'.repeat(50) });
      expect(result.success).toBe(true);
    });

    it('rejette un nom de 51 caractères', () => {
      const result = createPortfolioSchema.safeParse({ ...valid, name: 'a'.repeat(51) });
      expect(result.success).toBe(false);
    });

    it('rejette un nom manquant', () => {
      const result = createPortfolioSchema.safeParse({ initialCash: '10000' });
      expect(result.success).toBe(false);
    });
  });

  describe('initialCash', () => {
    it('rejette zéro (le capital doit être > 0)', () => {
      const result = createPortfolioSchema.safeParse({ ...valid, initialCash: '0' });
      expect(result.success).toBe(false);
    });

    it('rejette une valeur négative', () => {
      const result = createPortfolioSchema.safeParse({ ...valid, initialCash: '-100' });
      expect(result.success).toBe(false);
    });

    it('rejette un nombre (doit être une chaîne décimale, pas un float)', () => {
      const result = createPortfolioSchema.safeParse({ ...valid, initialCash: 10000 });
      expect(result.success).toBe(false);
    });

    it('rejette une chaîne non numérique', () => {
      const result = createPortfolioSchema.safeParse({ ...valid, initialCash: 'beaucoup' });
      expect(result.success).toBe(false);
    });

    it('rejette une notation scientifique', () => {
      const result = createPortfolioSchema.safeParse({ ...valid, initialCash: '1e5' });
      expect(result.success).toBe(false);
    });

    it('rejette un point décimal sans décimales ("10.")', () => {
      const result = createPortfolioSchema.safeParse({ ...valid, initialCash: '10.' });
      expect(result.success).toBe(false);
    });

    it('rejette un point décimal sans partie entière (".5")', () => {
      const result = createPortfolioSchema.safeParse({ ...valid, initialCash: '.5' });
      expect(result.success).toBe(false);
    });

    it('rejette les espaces dans le montant', () => {
      const result = createPortfolioSchema.safeParse({ ...valid, initialCash: ' 10000 ' });
      expect(result.success).toBe(false);
    });

    // FAILLE POTENTIELLE : les zéros en tête ("01000") passent le regex et Number=1000 > 0.
    it('accepte (à signaler) un montant avec zéros en tête', () => {
      const result = createPortfolioSchema.safeParse({ ...valid, initialCash: '01000' });
      expect(result.success).toBe(true);
    });
  });

  describe('feeRate (optionnel)', () => {
    it('rejette un feeRate non décimal', () => {
      const result = createPortfolioSchema.safeParse({ ...valid, feeRate: 'cher' });
      expect(result.success).toBe(false);
    });

    // FAILLE POTENTIELLE : aucun plafond sur feeRate → un taux de frais aberrant passe.
    it('accepte (à signaler) un feeRate > 1 (ex. "999", soit 99 900 %)', () => {
      const result = createPortfolioSchema.safeParse({ ...valid, feeRate: '999' });
      expect(result.success).toBe(true);
    });
  });

  describe('slippageBps (optionnel)', () => {
    it('rejette un slippage négatif', () => {
      const result = createPortfolioSchema.safeParse({ ...valid, slippageBps: -1 });
      expect(result.success).toBe(false);
    });

    it('rejette un slippage non entier', () => {
      const result = createPortfolioSchema.safeParse({ ...valid, slippageBps: 5.5 });
      expect(result.success).toBe(false);
    });

    it('rejette un slippage en chaîne', () => {
      const result = createPortfolioSchema.safeParse({ ...valid, slippageBps: '5' });
      expect(result.success).toBe(false);
    });

    it('accepte un slippage de 0 (borne basse)', () => {
      const result = createPortfolioSchema.safeParse({ ...valid, slippageBps: 0 });
      expect(result.success).toBe(true);
    });
  });
});

/** `portfolioSchema` valide la forme renvoyée par l'API (montants en chaîne). */
describe('portfolioSchema', () => {
  const record = {
    id: 'pf_1',
    name: 'Crypto',
    baseCurrency: 'USDT',
    initialCash: '10000',
    cash: '9500',
    feeRate: '0.001',
    slippageBps: 5,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('accepte un portefeuille complet', () => {
    expect(portfolioSchema.safeParse(record).success).toBe(true);
  });

  it('rejette si slippageBps est une chaîne (doit rester numérique en sortie)', () => {
    expect(portfolioSchema.safeParse({ ...record, slippageBps: '5' }).success).toBe(false);
  });

  it('rejette un champ manquant', () => {
    const { cash, ...withoutCash } = record;
    void cash;
    expect(portfolioSchema.safeParse(withoutCash).success).toBe(false);
  });

  it('valide un tableau de portefeuilles', () => {
    expect(portfoliosResponseSchema.safeParse([record, record]).success).toBe(true);
  });
});
