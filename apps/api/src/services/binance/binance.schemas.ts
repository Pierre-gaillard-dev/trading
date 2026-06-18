import { z } from 'zod';

/**
 * Schémas des réponses BRUTES de Binance (ce que renvoie réellement leur API).
 * Servent à vérifier, par des tests d'accès réel, que le contrat Binance
 * correspond toujours à ce qu'on suppose dans `binance.client.ts`.
 */

// REST /api/v3/klines : tableau de bougies, chacune étant un tableau
// [openTime, open, high, low, close, volume, ...]. On valide les 6 champs utilisés.
export const binanceKlineSchema = z
  .tuple([
    z.number(), // openTime (ms)
    z.string(), // open
    z.string(), // high
    z.string(), // low
    z.string(), // close
    z.string(), // volume
  ])
  .rest(z.unknown());

export const binanceKlinesResponseSchema = z.array(binanceKlineSchema);

// Flux WebSocket : évènement "trade" (prix).
export const binanceTradeEventSchema = z.object({
  e: z.literal('trade'),
  s: z.string(), // symbole
  p: z.string(), // prix
});

// Flux WebSocket : évènement "kline" (bougie).
export const binanceKlineEventSchema = z.object({
  e: z.literal('kline'),
  s: z.string(),
  k: z.object({
    t: z.number(), // début de bougie (ms)
    o: z.string(),
    h: z.string(),
    l: z.string(),
    c: z.string(),
    v: z.string(),
    x: z.boolean(), // bougie clôturée ?
  }),
});

// Message du flux combiné : { stream, data: <trade | kline> }.
export const binanceStreamMessageSchema = z.object({
  stream: z.string(),
  data: z.discriminatedUnion('e', [binanceTradeEventSchema, binanceKlineEventSchema]),
});
