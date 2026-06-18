import { useEffect, useRef } from 'react';
import {
  createChart,
  CandlestickSeries,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type CandlestickData,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Candle } from '@trading/shared';

export interface TradeMarker {
  time: number; // secondes (candleTime)
  side: 'BUY' | 'SELL';
}

function toSeriesData(candles: Candle[]): CandlestickData[] {
  return candles.map((candle) => ({
    time: candle.time as UTCTimestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  }));
}

function toMarkers(trades: TradeMarker[]): SeriesMarker<Time>[] {
  return [...trades]
    .sort((a, b) => a.time - b.time)
    .map((trade) => ({
      time: trade.time as UTCTimestamp,
      position: trade.side === 'BUY' ? 'belowBar' : 'aboveBar',
      color: trade.side === 'BUY' ? '#16a34a' : '#dc2626',
      shape: trade.side === 'BUY' ? 'arrowUp' : 'arrowDown',
      text: trade.side === 'BUY' ? 'Achat' : 'Vente',
    }));
}

export function CandleChart({ candles, trades = [] }: { candles: Candle[]; trades?: TradeMarker[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  // On ne recadre la vue qu'une fois par jeu de données (sinon le zoom/déplacement saute).
  const shouldFitRef = useRef(true);

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
    const series = chart.addSeries(CandlestickSeries);
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

  // Mise à jour des bougies. On recadre seulement au 1er affichage (ou après un
  // changement de crypto/intervalle, qui remet `candles` à vide) → on préserve
  // le zoom et le déplacement de l'utilisateur lors des rafraîchissements live.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) {
      return;
    }
    if (candles.length === 0) {
      shouldFitRef.current = true;
      return;
    }
    series.setData(toSeriesData(candles));
    if (shouldFitRef.current) {
      chartRef.current?.timeScale().fitContent();
      shouldFitRef.current = false;
    }
  }, [candles]);

  // Mise à jour des marqueurs achat/vente.
  useEffect(() => {
    markersRef.current?.setMarkers(toMarkers(trades));
  }, [trades]);

  return <div ref={containerRef} className='w-full' />;
}
