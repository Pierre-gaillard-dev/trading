import { useEffect, useState } from 'react';
import type { WatchedSymbol } from '@trading/shared';
import { addWatched, fetchWatchlist, removeWatched } from '../lib/api';

export interface WatchlistState {
  items: WatchedSymbol[];
  error: string | null;
  loading: boolean;
  add: (symbol: string) => Promise<void>;
  remove: (symbol: string) => Promise<void>;
}

/** Gère la watchlist de l'utilisateur (chargement + ajout/suppression). */
export function useWatchlist(): WatchlistState {
  const [items, setItems] = useState<WatchedSymbol[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWatchlist()
      .then(setItems)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Erreur de chargement.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const add = async (symbol: string): Promise<void> => {
    try {
      setItems(await addWatched(symbol));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ajout échoué.');
    }
  };

  const remove = async (symbol: string): Promise<void> => {
    try {
      await removeWatched(symbol);
      setItems((current) => current.filter((item) => item.symbol !== symbol));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression échouée.');
    }
  };

  return { items, error, loading, add, remove };
}
