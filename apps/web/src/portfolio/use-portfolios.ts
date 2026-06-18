import { useEffect, useState } from 'react';
import type { PortfolioDto } from '@trading/shared';
import { createPortfolio, fetchPortfolios, removePortfolio } from '../lib/api';

export interface PortfoliosState {
  items: PortfolioDto[];
  error: string | null;
  loading: boolean;
  create: (name: string, initialCash: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/** Gère les portefeuilles de l'utilisateur (chargement + création/suppression). */
export function usePortfolios(): PortfoliosState {
  const [items, setItems] = useState<PortfolioDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPortfolios()
      .then(setItems)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Erreur de chargement.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const create = async (name: string, initialCash: string): Promise<void> => {
    try {
      const created = await createPortfolio(name, initialCash);
      setItems((current) => [...current, created]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création échouée.');
    }
  };

  const remove = async (id: string): Promise<void> => {
    try {
      await removePortfolio(id);
      setItems((current) => current.filter((item) => item.id !== id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression échouée.');
    }
  };

  return { items, error, loading, create, remove };
}
