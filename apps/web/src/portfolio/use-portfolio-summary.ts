import { useEffect, useState } from 'react';
import type { PortfolioSummaryDto } from '@trading/shared';
import { fetchPortfolioSummary } from '../lib/api';

/** Synthèse $ d'un portefeuille, rafraîchie toutes les 2 s (cash, équité, PnL, positions). */
export function usePortfolioSummary(portfolioId: string | null): PortfolioSummaryDto | null {
  const [summary, setSummary] = useState<PortfolioSummaryDto | null>(null);

  useEffect(() => {
    if (portfolioId === null) {
      setSummary(null);
      return;
    }
    let active = true;
    const refresh = () => {
      fetchPortfolioSummary(portfolioId)
        .then((data) => {
          if (active) {
            setSummary(data);
          }
        })
        .catch(() => {
          /* rafraîchissement silencieux */
        });
    };
    refresh();
    const timer = setInterval(refresh, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [portfolioId]);

  return summary;
}
