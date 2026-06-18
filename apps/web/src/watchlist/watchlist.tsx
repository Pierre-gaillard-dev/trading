import { useState, type FormEvent } from 'react';
import type { WatchedSymbol } from '@trading/shared';

export interface WatchlistProps {
  items: WatchedSymbol[];
  loading: boolean;
  error: string | null;
  onAdd: (symbol: string) => Promise<void>;
  onRemove: (symbol: string) => Promise<void>;
}

export function Watchlist({ items, loading, error, onAdd, onRemove }: WatchlistProps) {
  const [symbol, setSymbol] = useState('');

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = symbol.trim();
    if (value === '') {
      return;
    }
    await onAdd(value);
    setSymbol('');
  }

  return (
    <section className='rounded-xl bg-white p-6 shadow'>
      <h2 className='mb-3 text-lg font-semibold text-slate-900'>Cryptos suivies</h2>

      <form onSubmit={(event) => void handleAdd(event)} className='mb-3 flex gap-2'>
        <input
          value={symbol}
          onChange={(event) => {
            setSymbol(event.target.value);
          }}
          placeholder='Ex. ETHUSDT'
          className='flex-1 rounded-md border border-slate-300 px-3 py-2 uppercase outline-none focus:border-slate-500'
        />
        <button
          type='submit'
          className='rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700'
        >
          Ajouter
        </button>
      </form>

      {error !== null && <p className='mb-2 text-sm text-red-600'>{error}</p>}

      {loading && <p className='text-sm text-slate-500'>Chargement…</p>}

      {!loading && items.length === 0 && (
        <p className='text-sm text-slate-500'>Aucune crypto suivie pour l'instant.</p>
      )}

      {!loading && items.length > 0 && (
        <ul className='divide-y divide-slate-100'>
          {items.map((item) => (
            <li key={item.symbol} className='flex items-center justify-between py-2'>
              <span className='font-medium text-slate-800'>{item.symbol}</span>
              <button
                type='button'
                onClick={() => void onRemove(item.symbol)}
                className='text-sm text-red-600 hover:underline'
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
