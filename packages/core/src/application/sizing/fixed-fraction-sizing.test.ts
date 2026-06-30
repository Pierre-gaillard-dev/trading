import { describe, it, expect } from 'vitest';
import { Money } from '../../domain/money';
import { Price } from '../../domain/price';
import type { SymbolSpec } from '../../domain/symbol-spec';
import { FixedFractionSizing } from './fixed-fraction-sizing';

const SPEC: SymbolSpec = {
  symbol: 'BTCUSDT',
  basePrecision: 8,
  quotePrecision: 2,
  stepSize: '0.00001',
  minNotional: '10',
};

function size(fraction: number, cash: string, execPrice = '100', feeRate = '0') {
  return new FixedFractionSizing(fraction).sizeForBuy({
    cash: Money.of(cash),
    execPrice: Price.of(execPrice),
    feeRate,
    spec: SPEC,
  });
}

describe('FixedFractionSizing', () => {
  it('engage la fraction du cash, arrondie au lot (marge de sécurité retranchée)', () => {
    // budget = 1000·1 − 0.02 = 999.98 ; unitCost = 100 ; rawQty ≈ 9.9998.
    expect(size(1, '1000').toString()).toBe('9.9998');
  });

  it('intègre les frais dans le coût unitaire (réduit la quantité)', () => {
    // unitCost = 100·1.001 = 100.1 ; budget 949.98 → ≈ 9.49...
    const q = size(0.95, '1000', '100', '0.001');
    expect(q.isPositive()).toBe(true);
    expect(q.lt(size(0.95, '1000', '100', '0'))).toBe(true);
  });

  it('renvoie 0 si le notionnel résultant est sous le minimum', () => {
    // cash 5 → notionnel ~4.98 < minNotional 10.
    expect(size(1, '5').isZero()).toBe(true);
  });

  it('renvoie 0 si le budget est nul ou négatif', () => {
    expect(size(1, '0').isZero()).toBe(true);
  });

  it('renvoie 0 si le coût unitaire est nul (prix d’exécution ≤ 0)', () => {
    expect(size(1, '1000', '0').isZero()).toBe(true);
  });

  it('lève si la fraction n’est pas dans (0, 1]', () => {
    expect(() => new FixedFractionSizing(0)).toThrow('fraction');
    expect(() => new FixedFractionSizing(1.5)).toThrow('fraction');
  });
});
