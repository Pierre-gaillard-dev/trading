import { useEffect, useRef } from 'react';
import {
  createChart,
  LineSeries,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type LineData,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { BacktestResultDto } from '@trading/shared';

type EquityPoint = BacktestResultDto['equityCurve'][number];
type PricePoint = BacktestResultDto['priceCurve'][number];
type BacktestTrade = BacktestResultDto['trades'][number];

const EQUITY_COLOR = '#2563eb';
const PRICE_COLOR = '#f59e0b';

/** Renvoie le temps de courbe le plus proche d'un temps de trade (la courbe peut être sous-échantillonnée). */
function nearestTime(times: number[], target: number): number | null {
  if (times.length === 0) {
    return null;
  }
  let lo = 0;
  let hi = times.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] < target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  const prev = lo > 0 ? lo - 1 : lo;
  return Math.abs(times[lo] - target) <= Math.abs(times[prev] - target) ? times[lo] : times[prev];
}

function toMarkers(price: PricePoint[], trades: BacktestTrade[]): SeriesMarker<Time>[] {
  const times = price.map((p) => p.time);
  const markers: SeriesMarker<Time>[] = [];
  for (const trade of [...trades].sort((a, b) => a.candleTime - b.candleTime)) {
    const time = nearestTime(times, trade.candleTime);
    if (time === null) {
      continue;
    }
    markers.push({
      time: time as UTCTimestamp,
      position: trade.side === 'BUY' ? 'belowBar' : 'aboveBar',
      color: trade.side === 'BUY' ? '#16a34a' : '#dc2626',
      shape: trade.side === 'BUY' ? 'arrowUp' : 'arrowDown',
      text: trade.side === 'BUY' ? 'Achat' : 'Vente',
    });
  }
  return markers;
}

export interface BacktestChartProps {
  equity: EquityPoint[];
  price: PricePoint[];
  trades?: BacktestTrade[];
}

/**
 * Deux courbes superposées et alignées dans le temps : l'équité du portefeuille
 * (axe gauche, bleu) et le prix de la crypto (axe droit, ambre) — pour situer
 * l'état du marché. Les marqueurs achat/vente sont posés sur la courbe de prix
 * (là où le trade a eu lieu).
 */
export function BacktestChart({ equity, price, trades = [] }: BacktestChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const equityRef = useRef<ISeriesApi<'Line'> | null>(null);
  const priceRef = useRef<ISeriesApi<'Line'> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const chart = createChart(container, {
      height: 260,
      layout: { textColor: '#334155', background: { color: '#ffffff' } },
      grid: { vertLines: { color: '#f1f5f9' }, horzLines: { color: '#f1f5f9' } },
      timeScale: { timeVisible: true, secondsVisible: false },
      leftPriceScale: { visible: true, borderColor: EQUITY_COLOR },
      rightPriceScale: { visible: true, borderColor: PRICE_COLOR },
    });
    const equitySeries = chart.addSeries(LineSeries, {
      color: EQUITY_COLOR,
      lineWidth: 2,
      priceScaleId: 'left',
    });
    const priceSeries = chart.addSeries(LineSeries, {
      color: PRICE_COLOR,
      lineWidth: 1,
      priceScaleId: 'right',
    });
    chartRef.current = chart;
    equityRef.current = equitySeries;
    priceRef.current = priceSeries;
    markersRef.current = createSeriesMarkers(priceSeries, []);

    const handleResize = () => {
      chart.applyOptions({ width: container.clientWidth });
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      equityRef.current = null;
      priceRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!equityRef.current || !priceRef.current) {
      return;
    }
    const equityData: LineData[] = equity.map((point) => ({
      time: point.time as UTCTimestamp,
      value: Number(point.equity),
    }));
    const priceData: LineData[] = price.map((point) => ({
      time: point.time as UTCTimestamp,
      value: point.price,
    }));
    equityRef.current.setData(equityData);
    priceRef.current.setData(priceData);
    markersRef.current?.setMarkers(toMarkers(price, trades));
    chartRef.current?.timeScale().fitContent();
  }, [equity, price, trades]);

  return (
    <div>
      <div className='mb-1 flex gap-4 text-xs text-slate-500'>
        <span className='flex items-center gap-1'>
          <span
            className='inline-block h-2 w-3 rounded-sm'
            style={{ backgroundColor: EQUITY_COLOR }}
          />
          Équité (gauche)
        </span>
        <span className='flex items-center gap-1'>
          <span
            className='inline-block h-2 w-3 rounded-sm'
            style={{ backgroundColor: PRICE_COLOR }}
          />
          Prix (droite)
        </span>
      </div>
      <div ref={containerRef} className='w-full' />
    </div>
  );
}
