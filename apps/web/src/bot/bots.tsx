import { useState, type FormEvent } from 'react';
import { CANDLE_INTERVALS, type PortfolioDto } from '@trading/shared';
import { useBots } from './use-bots';
import { StrategyPicker, useStrategyPicks } from './strategy-picker';

export function Bots({ portfolios }: { portfolios: PortfolioDto[] }) {
  const { items, strategies, error, create, stop } = useBots();
  const [portfolioId, setPortfolioId] = useState('');
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState<string>('1m');
  const [buyPct, setBuyPct] = useState('10');
  const picker = useStrategyPicks();

  const effectivePortfolio = portfolioId || portfolios[0]?.id || '';

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const chosen = picker.entries();
    if (effectivePortfolio === '' || chosen.length === 0) {
      return;
    }
    const pct = Number(buyPct);
    const buyFraction = Number.isFinite(pct) && pct > 0 ? Math.min(pct, 100) / 100 : 0.1;
    await create({
      portfolioId: effectivePortfolio,
      symbol: symbol.trim().toUpperCase(),
      interval,
      strategies: chosen,
      buyFraction,
    });
    picker.reset();
  }

  const portfolioName = (id: string): string => portfolios.find((p) => p.id === id)?.name ?? id;

  return (
    <section className='rounded-xl bg-white p-6 shadow'>
      <h2 className='mb-3 text-lg font-semibold text-slate-900'>Bots</h2>

      {portfolios.length === 0 ? (
        <p className='text-sm text-slate-500'>Crée d'abord un portefeuille pour lancer un bot.</p>
      ) : (
        <form onSubmit={(event) => void handleCreate(event)} className='mb-3 space-y-3'>
          <div className='flex flex-wrap gap-2'>
            <select
              value={effectivePortfolio}
              onChange={(event) => {
                setPortfolioId(event.target.value);
              }}
              className='rounded-md border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-500'
            >
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              value={symbol}
              onChange={(event) => {
                setSymbol(event.target.value);
              }}
              placeholder='BTCUSDT'
              className='w-32 rounded-md border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-slate-500'
            />
            <select
              value={interval}
              onChange={(event) => {
                setInterval(event.target.value);
              }}
              className='rounded-md border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-500'
            >
              {CANDLE_INTERVALS.map((iv) => (
                <option key={iv} value={iv}>
                  {iv}
                </option>
              ))}
            </select>
            <label className='flex items-center gap-1 text-sm text-slate-600'>
              <input
                value={buyPct}
                onChange={(event) => {
                  setBuyPct(event.target.value);
                }}
                inputMode='decimal'
                className='w-16 rounded-md border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-500'
              />
              % / achat
            </label>
          </div>

          <StrategyPicker
            strategies={strategies}
            picks={picker.picks}
            onToggle={picker.toggle}
            onWeight={picker.setWeight}
          />

          <button
            type='submit'
            className='rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700'
          >
            Lancer
          </button>
        </form>
      )}

      {error !== null && <p className='mb-2 text-sm text-red-600'>{error}</p>}

      {items.length === 0 ? (
        <p className='text-sm text-slate-500'>Aucun bot en cours.</p>
      ) : (
        <ul className='divide-y divide-slate-100'>
          {items.map((bot) => (
            <li key={bot.id} className='flex items-center justify-between py-2 text-sm'>
              <span className='text-slate-800'>
                <span className='font-medium'>{bot.symbol}</span> · {bot.interval} ·{' '}
                {bot.strategies.map((s) => `${s.strategyKey}×${String(s.weight)}`).join(', ')}
                <span className='ml-2 text-slate-500'>({portfolioName(bot.portfolioId)})</span>
              </span>
              <button
                type='button'
                onClick={() => void stop(bot.id)}
                className='text-red-600 hover:underline'
              >
                Arrêter
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
