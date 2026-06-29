import { describe, it, expect } from 'vitest';
import { Money } from '../../domain/money';
import { Price } from '../../domain/price';
import { Quantity } from '../../domain/quantity';
import type { SymbolSpec } from '../../domain/symbol-spec';
import { ExecutionEngine, type ExecutionInput, type Fill } from './execution-engine';

const SPEC: SymbolSpec = {
  symbol: 'BTCUSDT',
  basePrecision: 8,
  quotePrecision: 2,
  stepSize: '0.00001',
  minNotional: '10',
};

const engine = new ExecutionEngine();

function input(over: Partial<ExecutionInput> = {}): ExecutionInput {
  return {
    side: 'BUY',
    quantity: Quantity.of('1'),
    marketPrice: Price.of('100'),
    cash: Money.of('1000'),
    positionQty: Quantity.zero(),
    spec: SPEC,
    feeRate: '0.001',
    slippageBps: 0,
    ...over,
  };
}

describe('ExecutionEngine', () => {
  describe('BUY', () => {
    it('exécute un achat : frais arrondis UP, cash débité, position créditée', () => {
      const r = engine.execute(input()) as Fill;
      expect(r.status).toBe('FILLED');
      expect(r.execPrice.toString()).toBe('100');
      expect(r.notional.toString()).toBe('100');
      expect(r.fee.toString()).toBe('0.1'); // 100 × 0.001 = 0.10
      expect(r.cashAfter.toString()).toBe('899.9'); // 1000 − (100 + 0.10)
      expect(r.positionQtyAfter.toString()).toBe('1');
    });

    it('applique le slippage en défaveur (prix majoré)', () => {
      const r = engine.execute(input({ slippageBps: 50, feeRate: '0' })) as Fill;
      expect(r.execPrice.toString()).toBe('100.5'); // 100 × 1.005
      expect(r.cashAfter.toString()).toBe('899.5');
    });

    it('arrondit les frais VERS LE HAUT (jamais en faveur du trader)', () => {
      // 100 × 0.00015 = 0.015 → arrondi UP à 2 décimales = 0.02
      const r = engine.execute(input({ feeRate: '0.00015' })) as Fill;
      expect(r.fee.toString()).toBe('0.02');
    });

    it('rejette si fonds insuffisants (coût = notional + frais > cash)', () => {
      // coût = 100.10 > cash 100
      const r = engine.execute(input({ cash: Money.of('100') }));
      expect(r).toEqual({ status: 'REJECTED', reason: 'INSUFFICIENT_FUNDS' });
    });

    it('le cash ne devient jamais négatif (invariant)', () => {
      const r = engine.execute(input({ cash: Money.of('100') }));
      expect(r.status).toBe('REJECTED');
    });
  });

  describe('SELL', () => {
    it('exécute une vente : frais déduits du produit, position réduite', () => {
      const r = engine.execute(
        input({ side: 'SELL', positionQty: Quantity.of('1'), cash: Money.of('500') }),
      ) as Fill;
      expect(r.status).toBe('FILLED');
      expect(r.fee.toString()).toBe('0.1');
      expect(r.cashAfter.toString()).toBe('599.9'); // 500 + (100 − 0.10)
      expect(r.positionQtyAfter.toString()).toBe('0');
    });

    it('applique le slippage en défaveur (prix minoré)', () => {
      const r = engine.execute(
        input({ side: 'SELL', positionQty: Quantity.of('1'), slippageBps: 50, feeRate: '0' }),
      ) as Fill;
      expect(r.execPrice.toString()).toBe('99.5'); // 100 × 0.995
    });

    it('rejette la vente à découvert : quantité > position (pas de short en v1)', () => {
      const r = engine.execute(
        input({ side: 'SELL', quantity: Quantity.of('2'), positionQty: Quantity.of('1') }),
      );
      expect(r).toEqual({ status: 'REJECTED', reason: 'INSUFFICIENT_POSITION' });
    });
  });

  describe('rejets communs', () => {
    it('quantité nulle ou négative → NON_POSITIVE_QUANTITY', () => {
      expect(engine.execute(input({ quantity: Quantity.zero() }))).toEqual({
        status: 'REJECTED',
        reason: 'NON_POSITIVE_QUANTITY',
      });
    });

    it('notionnel sous le minimum → BELOW_MIN_NOTIONAL', () => {
      // 100 × 0.05 = 5 < minNotional 10
      expect(engine.execute(input({ quantity: Quantity.of('0.05') }))).toEqual({
        status: 'REJECTED',
        reason: 'BELOW_MIN_NOTIONAL',
      });
    });
  });
});
