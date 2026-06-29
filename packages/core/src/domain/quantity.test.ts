import { describe, it, expect } from 'vitest';
import { Quantity } from './quantity';

describe('Quantity', () => {
  describe('construction', () => {
    it('of() accepte une valeur ; passthrough sur une Quantity', () => {
      const q = Quantity.of('1.5');
      expect(q.toString()).toBe('1.5');
      expect(Quantity.of(q)).toBe(q);
    });

    it('zero() vaut 0', () => {
      expect(Quantity.zero().isZero()).toBe(true);
    });
  });

  describe('floorToStep (arrondi vers le bas au lot)', () => {
    it('arrondit vers le bas au multiple du stepSize', () => {
      // 1.23456 / 0.01 = 123.456 → floor 123 → ×0.01 = 1.23
      expect(Quantity.of('1.23456').floorToStep('0.01', 8).toString()).toBe('1.23');
    });

    it('respecte un stepSize fin', () => {
      // 0.999999 / 0.00001 = 99999.9 → floor 99999 → 0.99999
      expect(Quantity.of('0.999999').floorToStep('0.00001', 8).toString()).toBe('0.99999');
    });

    it('peut renvoyer zéro si la quantité est sous un pas', () => {
      expect(Quantity.of('0.004').floorToStep('0.01', 8).isZero()).toBe(true);
    });

    it('ne dépasse jamais la quantité visée (garantie d’arrondi bas)', () => {
      const q = Quantity.of('5.0').floorToStep('0.3', 8);
      // 5 / 0.3 = 16.66 → floor 16 → 4.8
      expect(q.toString()).toBe('4.8');
      expect(q.lt(Quantity.of('5.0'))).toBe(true);
    });

    it('lève si stepSize ≤ 0', () => {
      expect(() => Quantity.of(1).floorToStep('0', 8)).toThrow('stepSize');
      expect(() => Quantity.of(1).floorToStep('-0.1', 8)).toThrow('stepSize');
    });
  });

  describe('arithmétique & prédicats', () => {
    it('plus / minus', () => {
      expect(Quantity.of('0.1').plus(Quantity.of('0.2')).toString()).toBe('0.3');
      expect(Quantity.of('1').minus(Quantity.of('0.4')).toString()).toBe('0.6');
    });

    it('isZero / isPositive', () => {
      expect(Quantity.zero().isZero()).toBe(true);
      expect(Quantity.of('0.5').isPositive()).toBe(true);
      expect(Quantity.zero().isPositive()).toBe(false);
    });

    it('comparaisons gt / gte / lt / eq', () => {
      const a = Quantity.of('1');
      const b = Quantity.of('2');
      expect(b.gt(a)).toBe(true);
      expect(a.lt(b)).toBe(true);
      expect(a.gte(Quantity.of('1'))).toBe(true);
      expect(a.eq(Quantity.of('1'))).toBe(true);
    });

    it('toNumber', () => {
      expect(Quantity.of('2.25').toNumber()).toBe(2.25);
    });
  });
});
