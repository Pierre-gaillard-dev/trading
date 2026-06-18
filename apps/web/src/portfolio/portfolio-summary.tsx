import type { PortfolioSummaryDto } from '@trading/shared';

function money(value: string, currency: string): string {
  const n = Number(value);
  const formatted = Number.isNaN(n)
    ? value
    : n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${formatted} ${currency}`;
}

function qty(value: string): string {
  const n = Number(value);
  return Number.isNaN(n) ? value : n.toLocaleString('fr-FR', { maximumFractionDigits: 6 });
}

/** Couleur selon le signe (vert si ≥ 0, rouge sinon). */
function pnlClass(value: string): string {
  return Number(value) >= 0 ? 'text-green-600' : 'text-red-600';
}

function signed(value: string): string {
  return Number(value) >= 0 ? `+${value}` : value;
}

export function PortfolioSummary({ summary }: { summary: PortfolioSummaryDto | null }) {
  if (summary === null) {
    return null;
  }
  const currency = summary.baseCurrency;

  return (
    <section className='rounded-xl bg-white p-6 shadow'>
      <h2 className='mb-3 text-lg font-semibold text-slate-900'>
        Synthèse — {summary.name}
      </h2>

      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        <div className='rounded-lg bg-slate-50 p-3'>
          <p className='text-xs uppercase tracking-wide text-slate-400'>Cash dispo.</p>
          <p className='text-lg font-semibold text-slate-900'>{money(summary.cash, currency)}</p>
        </div>
        <div className='rounded-lg bg-slate-50 p-3'>
          <p className='text-xs uppercase tracking-wide text-slate-400'>Valeur cryptos</p>
          <p className='text-lg font-semibold text-slate-900'>
            {money(summary.positionsValue, currency)}
          </p>
        </div>
        <div className='rounded-lg bg-slate-50 p-3'>
          <p className='text-xs uppercase tracking-wide text-slate-400'>Équité totale</p>
          <p className='text-lg font-semibold text-slate-900'>{money(summary.equity, currency)}</p>
        </div>
        <div className='rounded-lg bg-slate-50 p-3'>
          <p className='text-xs uppercase tracking-wide text-slate-400'>Gain / perte</p>
          <p className={`text-lg font-semibold ${pnlClass(summary.pnl)}`}>
            {signed(money(summary.pnl, currency))}
          </p>
          <p className={`text-xs ${pnlClass(summary.pnl)}`}>{signed(summary.pnlPct)} %</p>
        </div>
      </div>

      <p className='mt-4 text-xs text-slate-400'>
        Capital initial : {money(summary.initialCash, currency)}
      </p>

      {summary.positions.length > 0 && (
        <table className='mt-3 w-full text-left text-sm'>
          <thead className='text-xs uppercase text-slate-400'>
            <tr>
              <th className='py-1'>Crypto</th>
              <th className='text-right'>Quantité</th>
              <th className='text-right'>Prix moyen</th>
              <th className='text-right'>Prix actuel</th>
              <th className='text-right'>Valeur</th>
              <th className='text-right'>+/- latent</th>
            </tr>
          </thead>
          <tbody>
            {summary.positions.map((position) => (
              <tr key={position.symbol} className='border-t border-slate-100'>
                <td className='py-1 font-medium text-slate-800'>{position.symbol}</td>
                <td className='text-right'>{qty(position.quantity)}</td>
                <td className='text-right text-slate-600'>{position.avgEntryPrice}</td>
                <td className='text-right text-slate-600'>{position.lastPrice ?? '—'}</td>
                <td className='text-right'>{money(position.value, currency)}</td>
                <td className={`text-right ${pnlClass(position.unrealizedPnl)}`}>
                  {signed(position.unrealizedPnl)} ({signed(position.unrealizedPnlPct)} %)
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
