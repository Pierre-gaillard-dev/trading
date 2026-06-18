import { Decimal, type DecimalValue } from '../../domain/decimal';
import { Price } from '../../domain/price';
import type { Candle } from '../../domain/candle';
import type { OrderSide } from '../../domain/order';
import type { SymbolSpec } from '../../domain/symbol-spec';
import { Portfolio } from '../portfolio/portfolio';
import { TradingBot, type RiskParams } from '../bot/trading-bot';
import type { Strategy } from '../strategies/strategy';
import type { SizingPolicy } from '../sizing/sizing-policy';

export interface BacktestInput {
  symbol: string;
  spec: SymbolSpec;
  /** Bougies historiques, ordre chronologique (la plus ancienne en premier). */
  candles: readonly Candle[];
  strategy: Strategy;
  sizing: SizingPolicy;
  initialCash: DecimalValue;
  feeRate?: DecimalValue;
  slippageBps?: number;
  risk?: RiskParams;
}

/** Un trade simulé pendant le backtest. */
export interface BacktestTrade {
  side: OrderSide;
  quantity: string;
  execPrice: string;
  fee: string;
  candleTime: number;
}

/** Un point de la courbe d'équité (valeur totale du portefeuille au fil du temps). */
export interface EquityPoint {
  time: number;
  equity: string;
}

export interface BacktestResult {
  initialEquity: string;
  finalEquity: string;
  /** Gain/perte = équité finale − capital initial. */
  pnl: string;
  pnlPct: string;
  /** Pire perte depuis un sommet d'équité (en %), un indicateur de risque. */
  maxDrawdownPct: string;
  tradeCount: number;
  /** Allers-retours terminés (achat suivi de sa revente). */
  closedTrades: number;
  wins: number;
  winRatePct: string;
  /** Rendement d'un simple « acheter et garder » sur la période (référence). */
  buyHoldPnlPct: string;
  trades: BacktestTrade[];
  equityCurve: EquityPoint[];
}

const MONEY_DP = 2;
const PCT_DP = 2;

function pct(part: Decimal, whole: Decimal): Decimal {
  return whole.isZero() ? new Decimal(0) : part.div(whole).times(100);
}

/**
 * Rejoue une stratégie sur un historique de bougies (fonction PURE, déterministe)
 * en réutilisant exactement le moteur live : `TradingBot` + `Portfolio` + sizing
 * + frais/slippage. Aucune IO, aucun accès réseau/temps. Renvoie le résultat chiffré
 * (PnL, drawdown, win rate, comparaison buy & hold) et la courbe d'équité.
 *
 * Pour un ensemble (qui tire au sort), injecter un `RandomSource` déterministe
 * (ex. `SeededRandom`) rend le backtest 100 % reproductible.
 */
export function runBacktest(input: BacktestInput): BacktestResult {
  const { symbol, spec, candles, strategy, sizing } = input;
  const initialCash = new Decimal(input.initialCash);

  const portfolio = new Portfolio({
    cash: initialCash,
    feeRate: input.feeRate ?? 0.001,
    slippageBps: input.slippageBps ?? 5,
  });
  const bot = new TradingBot({ symbol, spec, strategy, sizing, portfolio, risk: input.risk });

  const series: Candle[] = [];
  const trades: BacktestTrade[] = [];
  const equityCurve: EquityPoint[] = [];

  let closedTrades = 0;
  let wins = 0;
  let entryCash: Decimal | null = null;

  let peakEquity = initialCash;
  let maxDrawdown = new Decimal(0);

  for (const candle of candles) {
    series.push(candle);
    const cashBefore = portfolio.getCash().amount;

    const fill = bot.onClosedCandle(series);
    if (fill !== null) {
      trades.push({
        side: fill.side,
        quantity: fill.quantity.toString(),
        execPrice: fill.execPrice.toString(),
        fee: fill.fee.toString(),
        candleTime: candle.openTime,
      });
      if (fill.side === 'BUY') {
        // Début d'un aller-retour : on mémorise le cash avant l'achat.
        entryCash = cashBefore;
      } else if (entryCash !== null) {
        // Revente → aller-retour terminé : gagnant si on a plus de cash qu'avant l'achat.
        closedTrades += 1;
        if (portfolio.getCash().amount.gt(entryCash)) {
          wins += 1;
        }
        entryCash = null;
      }
    }

    const equity = portfolio.equity(new Map([[symbol, Price.of(candle.close)]])).amount;
    equityCurve.push({ time: candle.openTime, equity: equity.toFixed(MONEY_DP) });

    if (equity.gt(peakEquity)) {
      peakEquity = equity;
    }
    const drawdown = pct(peakEquity.minus(equity), peakEquity);
    if (drawdown.gt(maxDrawdown)) {
      maxDrawdown = drawdown;
    }
  }

  const finalEquity = candles.length === 0 ? initialCash : new Decimal(equityCurve[equityCurve.length - 1].equity);
  const pnl = finalEquity.minus(initialCash);

  const first = candles[0];
  const last = candles[candles.length - 1];
  const buyHoldPnlPct =
    candles.length === 0 || first.close === 0
      ? new Decimal(0)
      : pct(new Decimal(last.close).minus(first.close), new Decimal(first.close));

  return {
    initialEquity: initialCash.toFixed(MONEY_DP),
    finalEquity: finalEquity.toFixed(MONEY_DP),
    pnl: pnl.toFixed(MONEY_DP),
    pnlPct: pct(pnl, initialCash).toFixed(PCT_DP),
    maxDrawdownPct: maxDrawdown.toFixed(PCT_DP),
    tradeCount: trades.length,
    closedTrades,
    wins,
    winRatePct: closedTrades === 0 ? '0.00' : pct(new Decimal(wins), new Decimal(closedTrades)).toFixed(PCT_DP),
    buyHoldPnlPct: buyHoldPnlPct.toFixed(PCT_DP),
    trades,
    equityCurve,
  };
}
