import { useEffect, useRef } from 'react';
import {
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { BacktestResultDto } from '@trading/shared';

type EquityPoint = BacktestResultDto['equityCurve'][number];

/** Courbe d'équité (valeur totale du portefeuille au fil du backtest). */
export function EquityCurve({ points }: { points: EquityPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);

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
    chartRef.current?.timeScale().fitContent();
  }, [points]);

  return <div ref={containerRef} className='w-full' />;
}
