/**
 * @trading/shared — types et utilitaires partagés entre l'API et le dashboard.
 * Point d'entrée unique : organiser les fichiers en sous-dossiers ne change pas
 * les imports `@trading/shared` côté API/web.
 */

// types/
export type { PasswordCheck } from './types/password';

// utils/
export { validatePassword, PASSWORD_MIN_LENGTH } from './utils/password';

// constants/
export { DEMO_ACCOUNT } from './constants/demo-account';

// schemas/
export {
  loginRequestSchema,
  loginResponseSchema,
  publicUserSchema,
  meResponseSchema,
  type LoginRequest,
  type LoginResponse,
  type PublicUser,
  type MeResponse,
} from './schemas/auth';
export {
  candleSchema,
  marketMessageSchema,
  CANDLE_INTERVALS,
  type Candle,
  type CandleInterval,
  type MarketMessage,
} from './schemas/market';
export {
  addWatchedSymbolSchema,
  watchedSymbolSchema,
  watchlistResponseSchema,
  type AddWatchedSymbol,
  type WatchedSymbol,
  type WatchlistResponse,
} from './schemas/watchlist';
