import { z } from 'zod';

/**
 * Contrat des données de marché (partagé back ↔ front).
 * Une bougie est prête pour l'affichage : temps en SECONDES (format attendu par
 * les libs de graphiques) et valeurs numériques.
 */
export const candleSchema = z.object({
  time: z.number(), // début de la bougie, en secondes UNIX
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
});
export type Candle = z.infer<typeof candleSchema>;

/** Intervalles de bougie proposés (doivent être des intervalles Binance valides). */
export const CANDLE_INTERVALS = ['1m', '15m', '1h', '1d'] as const;
export type CandleInterval = (typeof CANDLE_INTERVALS)[number];

/**
 * Messages poussés par le serveur sur le WebSocket /ws/market.
 * - snapshot : envoyé à la connexion (prix courant + historique des bougies)
 * - price    : nouveau prix (à chaque trade)
 * - candle   : bougie ajoutée ou mise à jour
 */
export const marketMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('snapshot'),
    symbol: z.string(),
    interval: z.string(),
    price: z.number().nullable(),
    candles: z.array(candleSchema),
  }),
  z.object({
    type: z.literal('price'),
    symbol: z.string(),
    price: z.number(),
  }),
  z.object({
    type: z.literal('candle'),
    symbol: z.string(),
    candle: candleSchema,
  }),
]);
export type MarketMessage = z.infer<typeof marketMessageSchema>;
