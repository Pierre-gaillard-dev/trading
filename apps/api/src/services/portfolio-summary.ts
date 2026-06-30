import { Decimal } from '@trading/core';
import type { PortfolioSummaryDto } from '@trading/shared';
import type { PortfolioRecord, PositionRecord } from '../repositories/portfolio.repository';

/** Précision d'affichage de l'argent (2 décimales pour l'USDT). */
const MONEY_DP = 2;

function money(value: Decimal): string {
  return value.toFixed(MONEY_DP);
}

/**
 * Construit la synthèse $ d'un portefeuille (fonction PURE, testable) :
 * valorise chaque position au dernier prix connu, puis additionne cash + positions
 * pour l'équité et le PnL. Aucun float : tout passe par `Decimal`.
 *
 * @param prices dernier prix connu par symbole (null si indisponible → on retombe sur le coût).
 */
export function buildPortfolioSummary(
  record: PortfolioRecord,
  positions: PositionRecord[],
  prices: ReadonlyMap<string, number | null>,
): PortfolioSummaryDto {
  const cash = new Decimal(record.cash);
  let positionsValue = new Decimal(0);

  const positionSummaries = positions.map((position) => {
    const quantity = new Decimal(position.quantity);
    const avgEntryPrice = new Decimal(position.avgEntryPrice);
    const costBasis = quantity.times(avgEntryPrice);

    const raw = prices.get(position.symbol);
    const lastPrice = raw === undefined || raw === null ? null : new Decimal(raw);
    // Sans prix connu, on valorise au coût (PnL latent = 0) plutôt que d'inventer.
    const value = lastPrice === null ? costBasis : quantity.times(lastPrice);
    const unrealizedPnl = value.minus(costBasis);
    const unrealizedPnlPct = costBasis.isZero()
      ? new Decimal(0)
      : unrealizedPnl.div(costBasis).times(100);

    positionsValue = positionsValue.plus(value);

    return {
      symbol: position.symbol,
      quantity: quantity.toString(),
      avgEntryPrice: avgEntryPrice.toString(),
      lastPrice: lastPrice === null ? null : lastPrice.toString(),
      value: money(value),
      costBasis: money(costBasis),
      unrealizedPnl: money(unrealizedPnl),
      unrealizedPnlPct: unrealizedPnlPct.toFixed(MONEY_DP),
    };
  });

  const equity = cash.plus(positionsValue);
  const initialCash = new Decimal(record.initialCash);
  const pnl = equity.minus(initialCash);
  const pnlPct = initialCash.isZero() ? new Decimal(0) : pnl.div(initialCash).times(100);

  return {
    id: record.id,
    name: record.name,
    baseCurrency: record.baseCurrency,
    initialCash: money(initialCash),
    cash: money(cash),
    positionsValue: money(positionsValue),
    equity: money(equity),
    pnl: money(pnl),
    pnlPct: pnlPct.toFixed(MONEY_DP),
    positions: positionSummaries,
  };
}
