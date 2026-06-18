import 'dotenv/config';
import { buildApp } from './app';
import { MarketRegistry } from './services/binance/market.registry';
import { WorkerManager } from './workers/worker-manager';
import { BotManager } from './workers/bot-manager';
import { PrismaCandleRepository } from './repositories/prisma-candle.repository';
import { PrismaPortfolioRepository } from './repositories/prisma-portfolio.repository';

// Les bougies sont persistées en base (cache partagé dashboard + workers).
const candleRepository = new PrismaCandleRepository();
const portfolioRepository = new PrismaPortfolioRepository();

// Un flux Binance par (symbole, intervalle), créé à la demande et partagé.
const marketRegistry = new MarketRegistry(candleRepository);
// Distribue les bougies clôturées aux workers (avec l'historique depuis la DB).
const workerManager = new WorkerManager(marketRegistry, candleRepository);
// Démarre/arrête les bots de trading.
const botManager = new BotManager(workerManager, portfolioRepository);

const app = buildApp({ marketRegistry, botManager, portfolioRepository });
const port = Number(process.env.PORT ?? 3001);

app.listen({ port, host: '0.0.0.0' }).catch((err: unknown) => {
  app.log.error(err);
  process.exit(1);
});
