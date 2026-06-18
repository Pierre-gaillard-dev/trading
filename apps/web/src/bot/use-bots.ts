import { useEffect, useState } from 'react';
import type { BotDto } from '@trading/shared';
import { fetchBots, createBot, stopBot, fetchStrategies, type CreateBotInput } from '../lib/api';

export interface BotsState {
  items: BotDto[];
  strategies: string[];
  error: string | null;
  create: (input: CreateBotInput) => Promise<void>;
  stop: (id: string) => Promise<void>;
}

/** Gère les bots (création/arrêt) + liste rafraîchie + clés de stratégies. */
export function useBots(): BotsState {
  const [items, setItems] = useState<BotDto[]>([]);
  const [strategies, setStrategies] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchStrategies()
      .then((list) => {
        if (active) {
          setStrategies(list);
        }
      })
      .catch(() => {
        /* ignore */
      });

    const refresh = () => {
      fetchBots()
        .then((list) => {
          if (active) {
            setItems(list);
          }
        })
        .catch(() => {
          /* ignore */
        });
    };
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const create = async (input: CreateBotInput): Promise<void> => {
    try {
      await createBot(input);
      setItems(await fetchBots());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Démarrage échoué.');
    }
  };

  const stop = async (id: string): Promise<void> => {
    try {
      await stopBot(id);
      setItems((current) => current.filter((bot) => bot.id !== id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Arrêt échoué.');
    }
  };

  return { items, strategies, error, create, stop };
}
