import 'dotenv/config';
import { buildApp } from './app';
import { MarketRegistry } from './services/binance/market.registry';
import { WorkerManager } from './workers/worker-manager';
import { BotManager } from './workers/bot-manager';
import { PrismaCandleRepository } from './repositories/prisma-candle.repository';
import { PrismaPortfolioRepository } from './repositories/prisma-portfolio.repository';
import { PrismaBotConfigRepository } from './repositories/prisma-bot-config.repository';
import { SystemRandom } from './services/system-random';

// Les bougies sont persistées en base (cache partagé dashboard + workers).
const candleRepository = new PrismaCandleRepository();
const portfolioRepository = new PrismaPortfolioRepository();
const botConfigRepository = new PrismaBotConfigRepository();

// Un flux Binance par (symbole, intervalle), créé à la demande et partagé.
const marketRegistry = new MarketRegistry(candleRepository);
// Distribue les bougies clôturées aux workers (avec l'historique depuis la DB).
const workerManager = new WorkerManager(marketRegistry, candleRepository);
// Démarre/arrête les bots de trading (persistés → relancés au démarrage).
// Aléa réel injecté (Math.random) ; le cœur reste déterministe et testable.
const botManager = new BotManager(
  workerManager,
  portfolioRepository,
  botConfigRepository,
  new SystemRandom(),
);

const app = buildApp({
  marketRegistry,
  botManager,
  portfolioRepository,
  candleRepository,
});
const port = Number(process.env.PORT ?? 3001);

app
  .listen({ port, host: '0.0.0.0' })
  .then(() => botManager.restore()) // relance les bots persistés
  .catch((err: unknown) => {
    app.log.error(err);
    process.exit(1);
  });
