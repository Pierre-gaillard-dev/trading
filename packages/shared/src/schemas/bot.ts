import { z } from 'zod';
import { CANDLE_INTERVALS, type CandleInterval } from './market';

/** Une stratégie membre de l'ensemble, avec son poids (> 0). */
export const strategyWeightSchema = z.object({
  strategyKey: z.string().min(1),
  weight: z.number().gt(0),
  params: z.record(z.string(), z.unknown()).optional(),
});
export type StrategyWeight = z.infer<typeof strategyWeightSchema>;

/** Création d'un bot : portefeuille + crypto + intervalle + stratégies pondérées. */
export const createBotSchema = z.object({
  portfolioId: z.string().min(1),
  symbol: z.string().regex(/^[A-Za-z0-9]{2,16}USDT$/i, 'Symbole invalide'),
  interval: z
    .string()
    .refine(
      (value): value is CandleInterval => (CANDLE_INTERVALS as readonly string[]).includes(value),
      'Intervalle invalide',
    ),
  /** Au moins une stratégie ; chacune avec son poids. */
  strategies: z.array(strategyWeightSchema).min(1, 'Au moins une stratégie'),
  /** Part du cash investie par achat (0–1). */
  buyFraction: z.number().gt(0).max(1).optional(),
  /** Inverse la décision finale de l'ensemble (achat ↔ vente). Défaut false. */
  invert: z.boolean().optional(),
});
export type CreateBot = z.infer<typeof createBotSchema>;

/** Bot tel que renvoyé par l'API. */
export const botSchema = z.object({
  id: z.string(),
  portfolioId: z.string(),
  symbol: z.string(),
  interval: z.string(),
  strategies: z.array(z.object({ strategyKey: z.string(), weight: z.number() })),
  invert: z.boolean().optional(),
});
export type BotDto = z.infer<typeof botSchema>;

/** Trade exécuté (montants en chaîne décimale ; `candleTime` en secondes pour le graphe). */
export const tradeSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  side: z.enum(['BUY', 'SELL']),
  strategyKey: z.string(),
  quantity: z.string(),
  price: z.string(),
  fee: z.string(),
  candleTime: z.number(),
  executedAt: z.string(),
});
export type TradeDto = z.infer<typeof tradeSchema>;

/** Position détenue. */
export const positionSchema = z.object({
  symbol: z.string(),
  quantity: z.string(),
  avgEntryPrice: z.string(),
});
export type PositionDto = z.infer<typeof positionSchema>;
