import 'dotenv/config';
import { buildApp } from './app';
import { MarketHub } from './services/binance/market.gateway';

// Une seule connexion à Binance, partagée par tous les clients du dashboard.
const marketHub = new MarketHub({ symbol: 'BTCUSDT', interval: '1m' });
void marketHub.start();

const app = buildApp({ marketHub });
const port = Number(process.env.PORT ?? 3001);

app.listen({ port, host: '0.0.0.0' }).catch((err: unknown) => {
  app.log.error(err);
  process.exit(1);
});
