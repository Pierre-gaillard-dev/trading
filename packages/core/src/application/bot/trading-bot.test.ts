import { describe, it, expect } from 'vitest';
import type { Candle } from '../../domain/candle';
import type { Signal, Strategy } from '../strategies/strategy';
import type { SymbolSpec } from '../../domain/symbol-spec';
import { Portfolio, type SeedPosition } from '../portfolio/portfolio';
import { FixedFractionSizing } from '../sizing/fixed-fraction-sizing';
import { TradingBot, type RiskParams } from './trading-bot';

const SPEC: SymbolSpec = {
  symbol: 'BTCUSDT',
  basePrecision: 8,
  quotePrecision: 2,
  stepSize: '0.00001',
  minNotional: '10',
};

function strat(signal: Signal, minCandles = 1): Strategy {
  return { key: 'fake', minCandles, decide: () => signal };
}

function candles(closes: number[]): Candle[] {
  return closes.map((close, i) => ({ openTime: i, open: close, high: close, low: close, close, volume: 1 }));
}

function makeBot(opts: {
  signal: Signal;
  minCandles?: number;
  cash?: string;
  positions?: SeedPosition[];
  risk?: RiskParams;
}) {
  const portfolio = new Portfolio({
    cash: opts.cash ?? '1000',
    feeRate: '0.001',
    slippageBps: 0,
    positions: opts.positions,
  });
  const bot = new TradingBot({
    symbol: 'BTCUSDT',
    spec: SPEC,
    strategy: strat(opts.signal, opts.minCandles),
    sizing: new FixedFractionSizing(0.95),
    portfolio,
    risk: opts.risk,
  });
  return { bot, portfolio };
}

const HELD: SeedPosition[] = [{ symbol: 'BTCUSDT', quantity: '1', avgEntryPrice: '100' }];

describe('TradingBot.onClosedCandle', () => {
  describe('garde & signaux de base', () => {
    it('ne fait rien tant que candles.length < minCandles', () => {
      const { bot } = makeBot({ signal: 'BUY', minCandles: 3 });
      expect(bot.onClosedCandle(candles([100, 101]))).toBeNull();
    });

    it('BUY à plat → ouvre une position', () => {
      const { bot, portfolio } = makeBot({ signal: 'BUY' });
      const fill = bot.onClosedCandle(candles([100]));
      expect(fill?.side).toBe('BUY');
      expect(portfolio.getPosition('BTCUSDT')).not.toBeNull();
    });

    it('HOLD → ne fait rien', () => {
      const { bot } = makeBot({ signal: 'HOLD' });
      expect(bot.onClosedCandle(candles([100]))).toBeNull();
    });

    it('SELL en position → solde la position', () => {
      const { bot, portfolio } = makeBot({ signal: 'SELL', positions: HELD });
      const fill = bot.onClosedCandle(candles([100]));
      expect(fill?.side).toBe('SELL');
      expect(portfolio.getPosition('BTCUSDT')).toBeNull();
    });

    it('SELL à plat → ne fait rien', () => {
      const { bot } = makeBot({ signal: 'SELL' });
      expect(bot.onClosedCandle(candles([100]))).toBeNull();
    });

    it('BUY alors qu’on est déjà en position → ne fait rien (pas de pyramidage auto)', () => {
      const { bot } = makeBot({ signal: 'BUY', positions: HELD });
      expect(bot.onClosedCandle(candles([100]))).toBeNull();
    });
  });

  describe('gestion du risque (prioritaire sur la stratégie)', () => {
    it('stop-loss : prix ≤ entrée·(1−SL) → vend, même si la stratégie dit HOLD', () => {
      const { bot, portfolio } = makeBot({ signal: 'HOLD', positions: HELD, risk: { stopLossPct: 0.05 } });
      // entrée 100, seuil SL = 95 ; close 95 déclenche.
      const fill = bot.onClosedCandle(candles([95]));
      expect(fill?.side).toBe('SELL');
      expect(portfolio.getPosition('BTCUSDT')).toBeNull();
    });

    it('take-profit : prix ≥ entrée·(1+TP) → vend', () => {
      const { bot, portfolio } = makeBot({ signal: 'HOLD', positions: HELD, risk: { takeProfitPct: 0.1 } });
      // seuil TP = 110 ; close 112 le franchit clairement (évite les aléas de flottant à 110.0000…1).
      const fill = bot.onClosedCandle(candles([112]));
      expect(fill?.side).toBe('SELL');
      expect(portfolio.getPosition('BTCUSDT')).toBeNull();
    });

    it('le SL prime sur un signal BUY de la stratégie', () => {
      const { bot, portfolio } = makeBot({ signal: 'BUY', positions: HELD, risk: { stopLossPct: 0.05 } });
      const fill = bot.onClosedCandle(candles([95]));
      expect(fill?.side).toBe('SELL');
      expect(portfolio.getPosition('BTCUSDT')).toBeNull();
    });

    it('aucun déclenchement entre les seuils → suit la stratégie (HOLD ici)', () => {
      const { bot, portfolio } = makeBot({
        signal: 'HOLD',
        positions: HELD,
        risk: { stopLossPct: 0.05, takeProfitPct: 0.1 },
      });
      // close 97 : ni ≤ 95 ni ≥ 110.
      expect(bot.onClosedCandle(candles([97]))).toBeNull();
      expect(portfolio.getPosition('BTCUSDT')).not.toBeNull();
    });
  });
});
