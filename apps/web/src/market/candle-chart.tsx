import { useEffect, useRef } from 'react';
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Candle } from '@trading/shared';

function toSeriesData(candles: Candle[]): CandlestickData[] {
  return candles.map((candle) => ({
    time: candle.time as UTCTimestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  }));
}

export function CandleChart({ candles }: { candles: Candle[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  // Création du graphique (une seule fois).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const chart = createChart(container, {
      height: 360,
      layout: { textColor: '#334155', background: { color: '#ffffff' } },
      grid: { vertLines: { color: '#f1f5f9' }, horzLines: { color: '#f1f5f9' } },
      timeScale: { timeVisible: true, secondsVisible: false },
    });
    chartRef.current = chart;
    seriesRef.current = chart.addSeries(CandlestickSeries);

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

  // Mise à jour des bougies.
  useEffect(() => {
    seriesRef.current?.setData(toSeriesData(candles));
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  return <div ref={containerRef} className='w-full' />;
}
