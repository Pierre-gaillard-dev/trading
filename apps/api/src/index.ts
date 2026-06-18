import 'dotenv/config';
import { buildApp } from './app';
import { MarketRegistry } from './services/binance/market.registry';

// Un flux Binance par symbole demandé (créé à la demande, partagé entre clients).
const marketRegistry = new MarketRegistry('1m');

const app = buildApp({ marketRegistry });
const port = Number(process.env.PORT ?? 3001);

app.listen({ port, host: '0.0.0.0' }).catch((err: unknown) => {
  app.log.error(err);
  process.exit(1);
});
