import Fastify, { type FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyWebsocket from '@fastify/websocket';
import { authRoutes } from './routes/auth.routes';
import { marketRoutes } from './routes/market.routes';
import { watchlistRoutes } from './routes/watchlist.routes';
import { portfolioRoutes } from './routes/portfolio.routes';
import { botRoutes } from './routes/bot.routes';
import { backtestRoutes } from './routes/backtest.routes';
import { PrismaUserRepository } from './repositories/prisma-user.repository';
import { PrismaWatchlistRepository } from './repositories/prisma-watchlist.repository';
import { PrismaPortfolioRepository } from './repositories/prisma-portfolio.repository';
import { PrismaCandleRepository } from './repositories/prisma-candle.repository';
import { symbolExists as binanceSymbolExists } from './services/binance/binance.client';
import type { UserRepository } from './repositories/user.repository';
import type { WatchlistRepository } from './repositories/watchlist.repository';
import type { PortfolioRepository } from './repositories/portfolio.repository';
import type { CandleRepository } from './repositories/candle.repository';
import type { MarketRegistry } from './services/binance/market.registry';
import type { BotManager } from './workers/bot-manager';

export interface BuildAppOptions {
  /** Repository des utilisateurs ; par défaut Prisma (Postgres). En test : InMemoryUserRepository. */
  userRepository?: UserRepository;
  /** Repository de la watchlist ; par défaut Prisma. En test : InMemoryWatchlistRepository. */
  watchlistRepository?: WatchlistRepository;
  /** Vérifie qu'un symbole existe ; par défaut Binance. En test : un faux. */
  symbolExists?: (symbol: string) => Promise<boolean>;
  /** Repository des portefeuilles ; par défaut Prisma. En test : InMemoryPortfolioRepository. */
  portfolioRepository?: PortfolioRepository;
  /** Repository des bougies, utilisé pour valoriser les positions ; par défaut Prisma. */
  candleRepository?: CandleRepository;
  /** Force les logs Fastify. Par défaut activés, sauf en test (coupés automatiquement). */
  logger?: boolean;
  /** Registre des flux de marché ; si fourni, active le WebSocket /ws/market (multi-symboles). */
  marketRegistry?: MarketRegistry;
  /** Gestionnaire de bots ; si fourni, active les routes /api/bots et /api/strategies. */
  botManager?: BotManager;
}

/**
 * Construit l'application Fastify (sans la démarrer).
 * Les dépendances sont injectées → on peut monter l'app dans un test
 * avec un faux repository, sans toucher à la base de données.
 */
export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  // Logs coupés par défaut en test (Vitest définit VITEST) ; option explicite prioritaire.
  const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST !== undefined;
  const app = Fastify({ logger: options.logger ?? !isTest });

  const users = options.userRepository ?? new PrismaUserRepository();
  const watchlist = options.watchlistRepository ?? new PrismaWatchlistRepository();
  const portfolios = options.portfolioRepository ?? new PrismaPortfolioRepository();
  const candles = options.candleRepository ?? new PrismaCandleRepository();
  const symbolExists = options.symbolExists ?? binanceSymbolExists;
  const secret = process.env.JWT_SECRET ?? 'dev-secret-change-me';

  void app.register(fastifyJwt, { secret });
  void app.register(authRoutes, { users });
  void app.register(watchlistRoutes, { watchlist, symbolExists });
  void app.register(portfolioRoutes, { portfolios, prices: candles });
  // Backtest : rejoue des stratégies sur l'historique Binance (à la demande).
  void app.register(backtestRoutes);

  // Données de marché temps réel (optionnel : seulement si un registre est fourni).
  if (options.marketRegistry) {
    void app.register(fastifyWebsocket);
    void app.register(marketRoutes, { registry: options.marketRegistry });
  }

  // Bots (optionnel : seulement si un BotManager est fourni).
  if (options.botManager) {
    void app.register(botRoutes, { bots: options.botManager });
  }

  return app;
}
