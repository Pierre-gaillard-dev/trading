import { describe, it, expect } from 'vitest';
import { Decimal } from './decimal';
import { Money } from './money';

describe('Money', () => {
  describe('construction', () => {
    it('of() accepte une valeur décimale', () => {
      expect(Money.of('10.50').toString()).toBe('10.5');
    });

    it('of() est idempotent sur un Money existant (passthrough)', () => {
      const m = Money.of(5);
      expect(Money.of(m)).toBe(m);
    });

    it('zero() vaut 0', () => {
      expect(Money.zero().isZero()).toBe(true);
    });
  });

  describe('arithmétique (décimale, pas de float)', () => {
    it('plus / minus sont exacts là où le float échouerait (0.1 + 0.2)', () => {
      expect(Money.of('0.1').plus(Money.of('0.2')).toString()).toBe('0.3');
    });

    it('minus peut donner un montant négatif', () => {
      const r = Money.of(5).minus(Money.of(8));
      expect(r.isNegative()).toBe(true);
      expect(r.toString()).toBe('-3');
    });

    it('times multiplie par un scalaire', () => {
      expect(Money.of('2.5').times(4).toString()).toBe('10');
    });
  });

  describe('round (arrondi explicite et testé)', () => {
    it('arrondit au plus proche (HALF_UP)', () => {
      expect(Money.of('10.125').round(2, Decimal.ROUND_HALF_UP).toString()).toBe('10.13');
    });

    it('peut arrondir vers le bas (DOWN / troncature)', () => {
      expect(Money.of('10.129').round(2, Decimal.ROUND_DOWN).toString()).toBe('10.12');
    });

    it('peut arrondir vers le haut (UP, ex. frais)', () => {
      expect(Money.of('10.121').round(2, Decimal.ROUND_UP).toString()).toBe('10.13');
    });
  });

  describe('prédicats & comparaisons', () => {
    it('isNegative / isZero', () => {
      expect(Money.of(-1).isNegative()).toBe(true);
      expect(Money.of(0).isNegative()).toBe(false);
      expect(Money.zero().isZero()).toBe(true);
    });

    it('gt / gte / lt / lte / eq', () => {
      const a = Money.of(5);
      const b = Money.of(8);
      expect(b.gt(a)).toBe(true);
      expect(a.lt(b)).toBe(true);
      expect(a.gte(Money.of(5))).toBe(true);
      expect(a.lte(Money.of(5))).toBe(true);
      expect(a.eq(Money.of(5))).toBe(true);
      expect(a.eq(b)).toBe(false);
    });
  });

  it('toNumber convertit en nombre JS', () => {
    expect(Money.of('3.14').toNumber()).toBe(3.14);
  });
});
