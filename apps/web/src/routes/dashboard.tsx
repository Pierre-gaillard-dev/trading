import { useNavigate } from '@tanstack/react-router';
import { setToken } from '../auth/auth-store';
import { useMarket } from '../market/use-market';
import { CandleChart } from '../market/candle-chart';

export function DashboardPage() {
  const navigate = useNavigate();
  const { price, candles, connected } = useMarket();

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
              <p className='text-sm text-slate-500'>BTC / USDT</p>
              <p className='text-3xl font-semibold text-slate-900'>
                {price === null ? '—' : `${price.toLocaleString('fr-FR')} USDT`}
              </p>
            </div>
            <span className={connected ? 'text-xs text-green-600' : 'text-xs text-slate-400'}>
              {connected ? '● en direct' : '○ connexion…'}
            </span>
          </div>
        </section>

        <section className='rounded-xl bg-white p-4 shadow'>
          <CandleChart candles={candles} />
        </section>
      </main>
    </div>
  );
}
