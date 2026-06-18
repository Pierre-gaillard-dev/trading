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
type BacktestTrade = BacktestResultDto['trades'][number];

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
  const cand = lo;
  const prev = lo > 0 ? lo - 1 : lo;
  return Math.abs(times[cand] - target) <= Math.abs(times[prev] - target) ? times[cand] : times[prev];
}

function toMarkers(points: EquityPoint[], trades: BacktestTrade[]): SeriesMarker<Time>[] {
  const times = points.map((p) => p.time);
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

/** Courbe d'équité (valeur totale du portefeuille) avec marqueurs achat/vente. */
export function EquityCurve({ points, trades = [] }: { points: EquityPoint[]; trades?: BacktestTrade[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const chart = createChart(container, {
      height: 220,
      layout: { textColor: '#334155', background: { color: '#ffffff' } },
      grid: { vertLines: { color: '#f1f5f9' }, horzLines: { color: '#f1f5f9' } },
      timeScale: { timeVisible: true, secondsVisible: false },
    });
    const series = chart.addSeries(LineSeries, { color: '#2563eb', lineWidth: 2 });
    chartRef.current = chart;
    seriesRef.current = series;
    markersRef.current = createSeriesMarkers(series, []);

    const handleResize = () => {
      chart.applyOptions({ width: container.clientWidth });
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) {
      return;
    }
    const data: LineData[] = points.map((point) => ({
      time: point.time as UTCTimestamp,
      value: Number(point.equity),
    }));
    series.setData(data);
    markersRef.current?.setMarkers(toMarkers(points, trades));
    chartRef.current?.timeScale().fitContent();
  }, [points, trades]);

  return <div ref={containerRef} className='w-full' />;
}
