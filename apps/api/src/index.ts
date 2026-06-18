import 'dotenv/config';
import { buildApp } from './app';
import { MarketRegistry } from './services/binance/market.registry';
import { PrismaCandleRepository } from './repositories/prisma-candle.repository';

// Les bougies sont persistées en base (cache partagé dashboard + workers).
const candleRepository = new PrismaCandleRepository();
// Un flux Binance par (symbole, intervalle) demandé, créé à la demande et partagé.
const marketRegistry = new MarketRegistry(candleRepository);

const app = buildApp({ marketRegistry });
const port = Number(process.env.PORT ?? 3001);

app.listen({ port, host: '0.0.0.0' }).catch((err: unknown) => {
  app.log.error(err);
  process.exit(1);
});
