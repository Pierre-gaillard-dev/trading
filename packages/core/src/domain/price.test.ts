import { describe, it, expect } from 'vitest';
import { Price } from './price';
import { Quantity } from './quantity';

describe('Price', () => {
  describe('construction & notionnel', () => {
    it('of() accepte une valeur ; passthrough sur un Price', () => {
      const p = Price.of('100');
      expect(Price.of(p)).toBe(p);
    });

    it('times(quantity) renvoie le notionnel en Money', () => {
      // 40000 × 0.5 = 20000
      expect(Price.of('40000').times(Quantity.of('0.5')).toString()).toBe('20000');
    });
  });

  describe('withSlippage (en défaveur du trader, arrondi au pas de cotation)', () => {
    it('BUY → prix majoré', () => {
      // 100 × (1 + 5/10000) = 100.05
      expect(Price.of('100').withSlippage(5, 'BUY', 2).toString()).toBe('100.05');
    });

    it('SELL → prix minoré', () => {
      // 100 × (1 - 5/10000) = 99.95
      expect(Price.of('100').withSlippage(5, 'SELL', 2).toString()).toBe('99.95');
    });

    it('arrondit à la précision quote (HALF_UP)', () => {
      // 100 × 1.005 = 100.5 ; à 2 décimales = 100.5
      expect(Price.of('100').withSlippage(50, 'BUY', 2).toString()).toBe('100.5');
    });

    it('slippage nul laisse le prix inchangé (au pas près)', () => {
      expect(Price.of('123.456').withSlippage(0, 'BUY', 2).toString()).toBe('123.46');
    });
  });

  describe('comparaisons', () => {
    it('gt / gte / lt / lte / eq', () => {
      const a = Price.of('100');
      const b = Price.of('200');
      expect(b.gt(a)).toBe(true);
      expect(a.lt(b)).toBe(true);
      expect(a.gte(Price.of('100'))).toBe(true);
      expect(a.lte(Price.of('100'))).toBe(true);
      expect(a.eq(Price.of('100'))).toBe(true);
      expect(a.eq(b)).toBe(false);
    });

    it('toNumber', () => {
      expect(Price.of('99.5').toNumber()).toBe(99.5);
    });
  });
});
