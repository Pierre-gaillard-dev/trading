import type { PortfolioDto, TradeDto, PositionDto } from '@trading/shared';

export interface TradingPanelProps {
  portfolios: PortfolioDto[];
  selectedPortfolioId: string;
  onSelect: (id: string) => void;
  symbol: string;
  trades: TradeDto[];
  positions: PositionDto[];
}

function num(value: string, digits = 2): string {
  const n = Number(value);
  return Number.isNaN(n) ? value : n.toLocaleString('fr-FR', { maximumFractionDigits: digits });
}

function time(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('fr-FR');
}

export function TradingPanel({
  portfolios,
  selectedPortfolioId,
  onSelect,
  symbol,
  trades,
  positions,
}: TradingPanelProps) {
  const symbolTrades = trades.filter((trade) => trade.symbol === symbol);

  return (
    <section className='rounded-xl bg-white p-6 shadow'>
      <div className='mb-3 flex items-center justify-between'>
        <h2 className='text-lg font-semibold text-slate-900'>Activité du portefeuille</h2>
        <select
          value={selectedPortfolioId}
          onChange={(event) => {
            onSelect(event.target.value);
          }}
          className='rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-500'
        >
          {portfolios.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {portfolios.length === 0 && (
        <p className='text-sm text-slate-500'>Crée un portefeuille pour voir son activité.</p>
      )}

      {positions.length > 0 && (
        <div className='mb-3'>
          <p className='mb-1 text-xs font-medium uppercase text-slate-400'>Positions</p>
          <ul className='text-sm text-slate-700'>
            {positions.map((position) => (
              <li key={position.symbol}>
                {position.symbol} : {num(position.quantity, 6)} @ {num(position.avgEntryPrice)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className='mb-1 text-xs font-medium uppercase text-slate-400'>Transactions — {symbol}</p>
      {symbolTrades.length === 0 ? (
        <p className='text-sm text-slate-500'>Aucune transaction sur {symbol} pour l'instant.</p>
      ) : (
        <table className='w-full text-left text-sm'>
          <thead className='text-xs uppercase text-slate-400'>
            <tr>
              <th className='py-1'>Date</th>
              <th>Sens</th>
              <th>Stratégie</th>
              <th className='text-right'>Quantité</th>
              <th className='text-right'>Prix</th>
              <th className='text-right'>Frais</th>
            </tr>
          </thead>
          <tbody>
            {symbolTrades.map((trade) => (
              <tr key={trade.id} className='border-t border-slate-100'>
                <td className='py-1 text-slate-500'>{time(trade.executedAt)}</td>
                <td className={trade.side === 'BUY' ? 'text-green-600' : 'text-red-600'}>
                  {trade.side === 'BUY' ? 'Achat' : 'Vente'}
                </td>
                <td className='text-slate-600'>{trade.strategyKey}</td>
                <td className='text-right'>{num(trade.quantity, 6)}</td>
                <td className='text-right'>{num(trade.price)}</td>
                <td className='text-right text-slate-500'>{num(trade.fee)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
