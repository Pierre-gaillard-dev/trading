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

/** Une position valorisée au prix courant (montants en chaîne décimale). */
export const positionSummarySchema = z.object({
  symbol: z.string(),
  quantity: z.string(),
  avgEntryPrice: z.string(),
  /** Dernier prix connu, ou null si aucune bougie n'est disponible. */
  lastPrice: z.string().nullable(),
  /** Valeur courante = quantité × dernier prix (ou coût si pas de prix). */
  value: z.string(),
  /** Coût d'entrée = quantité × prix moyen d'achat. */
  costBasis: z.string(),
  /** Plus/moins-value latente = valeur − coût. */
  unrealizedPnl: z.string(),
  unrealizedPnlPct: z.string(),
});
export type PositionSummaryDto = z.infer<typeof positionSummarySchema>;

/** Synthèse $ d'un portefeuille : cash, positions valorisées, équité, PnL. */
export const portfolioSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  baseCurrency: z.string(),
  initialCash: z.string(),
  /** Cash disponible (non investi). */
  cash: z.string(),
  /** Valeur totale des cryptos détenues. */
  positionsValue: z.string(),
  /** Équité = cash + valeur des positions. */
  equity: z.string(),
  /** Gain/perte total = équité − capital initial. */
  pnl: z.string(),
  pnlPct: z.string(),
  positions: z.array(positionSummarySchema),
});
export type PortfolioSummaryDto = z.infer<typeof portfolioSummarySchema>;
