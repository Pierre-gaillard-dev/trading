import { z } from 'zod';

/** Montant décimal en chaîne (pas de float pour l'argent), ex. "10000" ou "10000.50". */
const decimalString = z.string().regex(/^\d+(\.\d+)?$/, 'Montant invalide');

/** Création d'un portefeuille (le capital initial est l'argent fictif qu'on met). */
export const createPortfolioSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(50),
  initialCash: decimalString.refine((value) => Number(value) > 0, 'Le capital doit être > 0'),
  feeRate: decimalString.optional(),
  slippageBps: z.number().int().min(0).optional(),
});
export type CreatePortfolio = z.infer<typeof createPortfolioSchema>;

/** Portefeuille tel que renvoyé par l'API (montants en chaîne décimale). */
export const portfolioSchema = z.object({
  id: z.string(),
  name: z.string(),
  baseCurrency: z.string(),
  initialCash: z.string(),
  cash: z.string(),
  feeRate: z.string(),
  slippageBps: z.number(),
  createdAt: z.string(),
});
export type PortfolioDto = z.infer<typeof portfolioSchema>;

export const portfoliosResponseSchema = z.array(portfolioSchema);
