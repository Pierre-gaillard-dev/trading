import { useState, type FormEvent } from 'react';
import { usePortfolios } from './use-portfolios';

function formatMoney(value: string): string {
  const n = Number(value);
  return Number.isNaN(n) ? value : n.toLocaleString('fr-FR');
}

export function Portfolios() {
  const { items, error, loading, create, remove } = usePortfolios();
  const [name, setName] = useState('');
  const [initialCash, setInitialCash] = useState('10000');

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim() === '' || initialCash.trim() === '') {
      return;
    }
    await create(name.trim(), initialCash.trim());
    setName('');
    setInitialCash('10000');
  }

  return (
    <section className='rounded-xl bg-white p-6 shadow'>
      <h2 className='mb-3 text-lg font-semibold text-slate-900'>Portefeuilles (fictifs)</h2>

      <form onSubmit={(event) => void handleCreate(event)} className='mb-3 flex flex-wrap gap-2'>
        <input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          placeholder='Nom (ex. RSI sur BTC)'
          className='flex-1 rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500'
        />
        <input
          value={initialCash}
          onChange={(event) => {
            setInitialCash(event.target.value);
          }}
          inputMode='decimal'
          placeholder='Capital (USDT)'
          className='w-40 rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500'
        />
        <button
          type='submit'
          className='rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700'
        >
          Créer
        </button>
      </form>

      {error !== null && <p className='mb-2 text-sm text-red-600'>{error}</p>}

      {loading && <p className='text-sm text-slate-500'>Chargement…</p>}

      {!loading && items.length === 0 && (
        <p className='text-sm text-slate-500'>Aucun portefeuille. Crées-en un pour commencer.</p>
      )}

      {!loading && items.length > 0 && (
        <ul className='divide-y divide-slate-100'>
          {items.map((portfolio) => (
            <li key={portfolio.id} className='flex items-center justify-between py-2'>
              <div>
                <span className='font-medium text-slate-800'>{portfolio.name}</span>
                <span className='ml-2 text-sm text-slate-500'>
                  {formatMoney(portfolio.cash)} {portfolio.baseCurrency}
                </span>
              </div>
              <button
                type='button'
                onClick={() => void remove(portfolio.id)}
                className='text-sm text-red-600 hover:underline'
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
