import { describe, it, expect } from 'vitest';
import { Money } from '../../domain/money';
import { Price } from '../../domain/price';
import { Quantity } from '../../domain/quantity';
import type { SymbolSpec } from '../../domain/symbol-spec';
import { Portfolio } from './portfolio';

const SPEC: SymbolSpec = {
  symbol: 'BTCUSDT',
  basePrecision: 8,
  quotePrecision: 2,
  stepSize: '0.00001',
  minNotional: '10',
};

/** Portefeuille sans slippage (math prévisible), frais 0,1 %. */
function pf(cash = '1000') {
  return new Portfolio({ cash, feeRate: '0.001', slippageBps: 0 });
}

function buy(p: Portfolio, qty: string, price: string) {
  return p.execute({
    symbol: 'BTCUSDT',
    side: 'BUY',
    quantity: Quantity.of(qty),
    marketPrice: Price.of(price),
    spec: SPEC,
  });
}

function sell(p: Portfolio, qty: string, price: string) {
  return p.execute({
    symbol: 'BTCUSDT',
    side: 'SELL',
    quantity: Quantity.of(qty),
    marketPrice: Price.of(price),
    spec: SPEC,
  });
}

const at = (price: string): Map<string, Price> => new Map([['BTCUSDT', Price.of(price)]]);

describe('Portfolio', () => {
  describe('initialisation', () => {
    it('expose le cash, le cash initial et les défauts frais/slippage', () => {
      const p = new Portfolio({ cash: '1000' });
      expect(p.getCash().toString()).toBe('1000');
      expect(p.getInitialCash().toString()).toBe('1000');
      expect(p.getFeeRate()).toBe(0.001);
      expect(p.getSlippageBps()).toBe(5);
    });

    it('reconstruit des positions seedées', () => {
      const p = new Portfolio({ cash: '0', positions: [{ symbol: 'BTCUSDT', quantity: '0.5', avgEntryPrice: '40000' }] });
      const pos = p.getPosition('BTCUSDT');
      expect(pos?.quantity.toString()).toBe('0.5');
      expect(pos?.avgEntryPrice.toString()).toBe('40000');
    });
  });

  describe('achat', () => {
    it('débite le cash (notional + frais) et crée la position', () => {
      const p = pf('1000');
      const r = buy(p, '1', '100');
      expect(r.status).toBe('FILLED');
      expect(p.getCash().toString()).toBe('899.9'); // 1000 − 100 − 0.10
      expect(p.getPosition('BTCUSDT')?.quantity.toString()).toBe('1');
      expect(p.getPosition('BTCUSDT')?.avgEntryPrice.toString()).toBe('100');
    });

    it('un achat additionnel moyenne le prix d’entrée (pondéré par les quantités)', () => {
      const p = pf('1000');
      buy(p, '1', '100');
      buy(p, '1', '200');
      const pos = p.getPosition('BTCUSDT');
      expect(pos?.quantity.toString()).toBe('2');
      expect(pos?.avgEntryPrice.toString()).toBe('150'); // (100 + 200) / 2
    });

    it('un ordre rejeté ne modifie ni le cash ni les positions', () => {
      const p = pf('50'); // pas assez pour acheter 1 @ 100
      const r = buy(p, '1', '100');
      expect(r.status).toBe('REJECTED');
      expect(p.getCash().toString()).toBe('50');
      expect(p.getPosition('BTCUSDT')).toBeNull();
    });
  });

  describe('vente', () => {
    it('crédite le produit (net de frais) et supprime la position si soldée', () => {
      const p = pf('1000');
      buy(p, '1', '100'); // cash 899.9
      const r = sell(p, '1', '100');
      expect(r.status).toBe('FILLED');
      expect(p.getCash().toString()).toBe('999.8'); // 899.9 + (100 − 0.10)
      expect(p.getPosition('BTCUSDT')).toBeNull();
    });

    it('une vente partielle conserve le prix d’entrée moyen', () => {
      const p = pf('1000');
      buy(p, '2', '100');
      sell(p, '1', '150');
      const pos = p.getPosition('BTCUSDT');
      expect(pos?.quantity.toString()).toBe('1');
      expect(pos?.avgEntryPrice.toString()).toBe('100'); // inchangé par la vente
    });
  });

  describe('valorisation', () => {
    it('equity = cash + Σ(quantité × prix courant)', () => {
      const p = pf('1000');
      buy(p, '1', '100'); // cash 899.9, position 1
      expect(p.equity(at('120')).toString()).toBe('1019.9'); // 899.9 + 120
    });

    it('equity retombe sur le prix d’entrée si aucun prix courant fourni', () => {
      const p = pf('1000');
      buy(p, '1', '100');
      expect(p.equity(new Map()).toString()).toBe('999.9'); // 899.9 + 100
    });

    it('unrealizedPnl = Σ quantité × (prix courant − prix d’entrée)', () => {
      const p = pf('1000');
      buy(p, '1', '100');
      expect(p.unrealizedPnl(at('120')).toString()).toBe('20');
    });

    it('totalPnl = equity − cash initial (intègre les frais payés)', () => {
      const p = pf('1000');
      buy(p, '1', '100');
      expect(p.totalPnl(at('100')).toString()).toBe('-0.1'); // seulement les frais
      expect(p.totalPnl(at('110')).toString()).toBe('9.9');
    });
  });
});
