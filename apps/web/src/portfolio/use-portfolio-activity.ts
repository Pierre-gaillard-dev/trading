import { useEffect, useState } from 'react';
import type { TradeDto, PositionDto } from '@trading/shared';
import { fetchTrades, fetchPositions } from '../lib/api';

export interface PortfolioActivity {
  trades: TradeDto[];
  positions: PositionDto[];
}

/** Trades + positions d'un portefeuille, rafraîchis toutes les 2 s. */
export function usePortfolioActivity(portfolioId: string | null): PortfolioActivity {
  const [trades, setTrades] = useState<TradeDto[]>([]);
  const [positions, setPositions] = useState<PositionDto[]>([]);

  useEffect(() => {
    if (portfolioId === null) {
      setTrades([]);
      setPositions([]);
      return;
    }
    let active = true;
    const refresh = () => {
      void Promise.all([fetchTrades(portfolioId), fetchPositions(portfolioId)])
        .then(([t, p]) => {
          if (active) {
            setTrades(t);
            setPositions(p);
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

  return { trades, positions };
}
