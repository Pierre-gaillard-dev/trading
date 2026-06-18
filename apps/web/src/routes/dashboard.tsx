import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { CANDLE_INTERVALS, type CandleInterval } from '@trading/shared';
import { setToken } from '../auth/auth-store';
import { useMarket } from '../market/use-market';
import { CandleChart, type TradeMarker } from '../market/candle-chart';
import { useWatchlist } from '../watchlist/use-watchlist';
import { Watchlist } from '../watchlist/watchlist';
import { usePortfolios } from '../portfolio/use-portfolios';
import { usePortfolioActivity } from '../portfolio/use-portfolio-activity';
import { Portfolios } from '../portfolio/portfolios';
import { TradingPanel } from '../portfolio/trading-panel';
import { Bots } from '../bot/bots';

export function DashboardPage() {
  const navigate = useNavigate();
  const watchlist = useWatchlist();
  const portfolios = usePortfolios();

  const [selected, setSelected] = useState('BTCUSDT');
  const [selectedInterval, setSelectedInterval] = useState<CandleInterval>('1m');
  const [selectedPortfolioId, setSelectedPortfolioId] = useState('');

  const { price, candles, connected } = useMarket(selected, selectedInterval);
  const { trades, positions } = usePortfolioActivity(selectedPortfolioId || null);

  // Symboles affichables : la watchlist, avec BTCUSDT toujours dispo.
  const symbols = useMemo(
    () => [...new Set(['BTCUSDT', ...watchlist.items.map((i) => i.symbol)])],
    [watchlist.items],
  );

  useEffect(() => {
    if (!symbols.includes(selected)) {
      setSelected(symbols[0] ?? 'BTCUSDT');
    }
  }, [symbols, selected]);

  // Sélectionne le premier portefeuille par défaut / si l'actuel disparaît.
  useEffect(() => {
    const ids = portfolios.items.map((p) => p.id);
    if (selectedPortfolioId === '' || !ids.includes(selectedPortfolioId)) {
      setSelectedPortfolioId(ids[0] ?? '');
    }
  }, [portfolios.items, selectedPortfolioId]);

  // Marqueurs achat/vente du symbole affiché, pour le graphe.
  const markers = useMemo<TradeMarker[]>(
    () =>
      trades
        .filter((trade) => trade.symbol === selected)
        .map((trade) => ({ time: trade.candleTime, side: trade.side })),
    [trades, selected],
  );

  function handleLogout() {
    setToken(null);
    void navigate({ to: '/login' });
  }

  return (
    <div className='min-h-screen bg-slate-100 p-6'>
      <header className='mx-auto flex max-w-4xl items-center justify-between'>
        <h1 className='text-2xl font-bold text-slate-900'>Dashboard</h1>
        <button
          type='button'
          onClick={handleLogout}
          className='rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700'
        >
          Se déconnecter
        </button>
      </header>

      <main className='mx-auto mt-6 max-w-4xl space-y-4'>
        <section className='rounded-xl bg-white p-6 shadow'>
          <div className='flex items-baseline justify-between'>
            <div>
              <select
                value={selected}
                onChange={(event) => {
                  setSelected(event.target.value);
                }}
                className='mb-1 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 outline-none focus:border-slate-500'
              >
                {symbols.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <p className='text-3xl font-semibold text-slate-900'>
                {price === null ? '—' : `${price.toLocaleString('fr-FR')} USDT`}
              </p>
            </div>
            <div className='flex flex-col items-end gap-2'>
              <div className='flex gap-1'>
                {CANDLE_INTERVALS.map((iv) => (
                  <button
                    key={iv}
                    type='button'
                    onClick={() => {
                      setSelectedInterval(iv);
                    }}
                    className={
                      iv === selectedInterval
                        ? 'rounded bg-slate-900 px-2 py-1 text-xs text-white'
                        : 'rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200'
                    }
                  >
                    {iv}
                  </button>
                ))}
              </div>
              <span className={connected ? 'text-xs text-green-600' : 'text-xs text-slate-400'}>
                {connected ? '● en direct' : '○ connexion…'}
              </span>
            </div>
          </div>
        </section>

        <section className='rounded-xl bg-white p-4 shadow'>
          <CandleChart candles={candles} trades={markers} />
        </section>

        <Bots portfolios={portfolios.items} />

        <TradingPanel
          portfolios={portfolios.items}
          selectedPortfolioId={selectedPortfolioId}
          onSelect={setSelectedPortfolioId}
          symbol={selected}
          trades={trades}
          positions={positions}
        />

        <Portfolios
          items={portfolios.items}
          loading={portfolios.loading}
          error={portfolios.error}
          onCreate={portfolios.create}
          onRemove={portfolios.remove}
        />

        <Watchlist
          items={watchlist.items}
          loading={watchlist.loading}
          error={watchlist.error}
          onAdd={watchlist.add}
          onRemove={watchlist.remove}
        />
      </main>
    </div>
  );
}
