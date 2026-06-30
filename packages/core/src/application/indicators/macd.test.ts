import { describe, it, expect } from 'vitest';
import { macd } from './macd';

describe('macd', () => {
  it('série constante → ligne, signal et histogramme nuls là où définis', () => {
    // fast 2, slow 3, signal 2 sur une série plate.
    const r = macd([100, 100, 100, 100, 100], 2, 3, 2);
    expect(r.macd).toEqual([null, null, 0, 0, 0]);
    expect(r.signal).toEqual([null, null, null, 0, 0]);
    expect(r.histogram).toEqual([null, null, null, 0, 0]);
  });

  it('les trois séries ont la longueur des closes', () => {
    const closes = Array.from({ length: 40 }, (_, i) => i + 1);
    const r = macd(closes);
    expect(r.macd).toHaveLength(40);
    expect(r.signal).toHaveLength(40);
    expect(r.histogram).toHaveLength(40);
  });

  it('tendance haussière → ligne MACD positive (EMA rapide > EMA lente)', () => {
    const closes = Array.from({ length: 40 }, (_, i) => i + 1);
    const r = macd(closes);
    expect(r.macd[39]).not.toBeNull();
    expect(r.macd[39] as number).toBeGreaterThan(0);
  });

  it('lève sur des périodes invalides', () => {
    expect(() => macd([1, 2, 3], 26, 12, 9)).toThrow('periods'); // fast >= slow
    expect(() => macd([1, 2, 3], 12, 26, 0)).toThrow('periods'); // signal <= 0
    expect(() => macd([1, 2, 3], 0, 26, 9)).toThrow('periods'); // fast <= 0
    expect(() => macd([1, 2, 3], 12.5, 26, 9)).toThrow('periods'); // non entier
  });
});
