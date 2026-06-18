import { useEffect, useState, type FormEvent } from 'react';
import { CANDLE_INTERVALS, type BacktestResultDto, type CandleInterval } from '@trading/shared';
import { fetchStrategies, runBacktest } from '../lib/api';
import { StrategyPicker, useStrategyPicks } from '../bot/strategy-picker';
import { EquityCurve } from './equity-curve';

function pnlClass(value: string): string {
  return Number(value) >= 0 ? 'text-green-600' : 'text-red-600';
}

function signed(value: string): string {
  return Number(value) >= 0 ? `+${value}` : value;
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className='rounded-lg bg-slate-50 p-3'>
      <p className='text-xs uppercase tracking-wide text-slate-400'>{label}</p>
      <p className={`text-lg font-semibold ${className ?? 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

export function Backtest() {
  const [strategies, setStrategies] = useState<string[]>([]);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState<CandleInterval>('1h');
  const [initialCash, setInitialCash] = useState('10000');
  const [buyPct, setBuyPct] = useState('10');
  const [candles, setCandles] = useState('500');
  const picker = useStrategyPicks();

  const [result, setResult] = useState<BacktestResultDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    fetchStrategies()
      .then((list) => {
        if (active) {
          setStrategies(list);
        }
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const chosen = picker.entries();
    if (chosen.length === 0) {
      setError('Choisis au moins une stratégie.');
      return;
    }
    const pct = Number(buyPct);
    const buyFraction = Number.isFinite(pct) && pct > 0 ? Math.min(pct, 100) / 100 : 0.1;
    const count = Number(candles);
    setLoading(true);
    setError(null);
    try {
      const res = await runBacktest({
        symbol: symbol.trim().toUpperCase(),
        interval,
        strategies: chosen,
        initialCash: initialCash.trim(),
        buyFraction,
        candles: Number.isFinite(count) ? Math.min(Math.max(count, 50), 1000) : 500,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backtest échoué.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const beatsBuyHold =
    result !== null && Number(result.pnlPct) > Number(result.buyHoldPnlPct);

  return (
    <section className='rounded-xl bg-white p-6 shadow'>
      <h2 className='mb-1 text-lg font-semibold text-slate-900'>Backtest</h2>
      <p className='mb-3 text-sm text-slate-500'>
        Rejoue tes stratégies sur l'historique réel — sans toucher à tes portefeuilles ni attendre
        le live.
      </p>

      <form onSubmit={(event) => void handleRun(event)} className='mb-4 space-y-3'>
        <div className='flex flex-wrap gap-2'>
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
              setInterval(event.target.value as CandleInterval);
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
            Capital
            <input
              value={initialCash}
              onChange={(event) => {
                setInitialCash(event.target.value);
              }}
              inputMode='decimal'
              className='w-24 rounded-md border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-500'
            />
          </label>
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
          <label className='flex items-center gap-1 text-sm text-slate-600'>
            Bougies
            <input
              value={candles}
              onChange={(event) => {
                setCandles(event.target.value);
              }}
              inputMode='numeric'
              className='w-20 rounded-md border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-500'
            />
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
          disabled={loading}
          className='rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-50'
        >
          {loading ? 'Calcul…' : 'Lancer le backtest'}
        </button>
      </form>

      {error !== null && <p className='mb-2 text-sm text-red-600'>{error}</p>}

      {result !== null && (
        <div className='space-y-4'>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
            <Stat
              label='Résultat'
              value={`${signed(result.pnlPct)} %`}
              className={pnlClass(result.pnl)}
            />
            <Stat label='Équité finale' value={result.finalEquity} />
            <Stat label='Pire chute (drawdown)' value={`-${result.maxDrawdownPct} %`} className='text-slate-900' />
            <Stat
              label='vs Acheter & garder'
              value={`${signed(result.buyHoldPnlPct)} %`}
              className={beatsBuyHold ? 'text-green-600' : 'text-red-600'}
            />
            <Stat label='Trades' value={String(result.tradeCount)} />
            <Stat label='Allers-retours' value={String(result.closedTrades)} />
            <Stat label='Gagnants' value={`${String(result.wins)} (${result.winRatePct} %)`} />
            <Stat label='Capital initial' value={result.initialEquity} />
          </div>

          <p className='text-sm text-slate-600'>
            {beatsBuyHold
              ? '✅ La stratégie a battu un simple « acheter & garder » sur cette période.'
              : '⚠️ Un simple « acheter & garder » aurait fait au moins aussi bien sur cette période.'}
          </p>

          {result.equityCurve.length > 0 && <EquityCurve points={result.equityCurve} />}
        </div>
      )}
    </section>
  );
}
