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

/** Gère les portefeuilles + rafraîchit le cash toutes les 2 s (pour voir bouger). */
export function usePortfolios(): PortfoliosState {
  const [items, setItems] = useState<PortfolioDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      fetchPortfolios()
        .then((data) => {
          if (active) {
            setItems(data);
          }
        })
        .catch(() => {
          /* rafraîchissement silencieux */
        });
    };

    fetchPortfolios()
      .then((data) => {
        if (active) {
          setItems(data);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Erreur de chargement.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    const timer = setInterval(refresh, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
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
