import { z } from 'zod';

/** Symbole d'une paire cotée en USDT (ex. BTCUSDT). Insensible à la casse à la saisie. */
export const addWatchedSymbolSchema = z.object({
  symbol: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{2,16}USDT$/i, 'Symbole invalide (ex. BTCUSDT)'),
});
export type AddWatchedSymbol = z.infer<typeof addWatchedSymbolSchema>;

/** Une crypto suivie, telle que renvoyée par l'API. */
export const watchedSymbolSchema = z.object({
  symbol: z.string(),
  createdAt: z.string(), // ISO 8601
});
export type WatchedSymbol = z.infer<typeof watchedSymbolSchema>;

export const watchlistResponseSchema = z.array(watchedSymbolSchema);
export type WatchlistResponse = z.infer<typeof watchlistResponseSchema>;
