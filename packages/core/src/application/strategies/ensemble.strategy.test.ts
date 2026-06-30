import { describe, it, expect } from 'vitest';
import type { RandomSource } from '../../ports/random-source';
import type { Signal, Strategy, StrategyContext } from './strategy';
import { EnsembleStrategy } from './ensemble.strategy';

/** Stratégie factice qui renvoie toujours le même signal. */
function fixed(signal: Signal): Strategy {
  return { key: 'fake', minCandles: 1, decide: () => signal };
}

/** Aléa déterministe : renvoie toujours `value` (par défaut 0 → on agit toujours). */
const constantRandom = (value = 0): RandomSource => ({ next: () => value });

const ctx: StrategyContext = { candles: [], position: null };

describe('EnsembleStrategy — inversion de la décision finale', () => {
  it('sans invert : un membre BUY (score +1) → BUY', () => {
    const ensemble = new EnsembleStrategy({
      entries: [{ strategy: fixed('BUY'), weight: 1 }],
      random: constantRandom(),
    });
    expect(ensemble.decide(ctx)).toBe('BUY');
  });

  it('avec invert : un membre BUY → SELL', () => {
    const ensemble = new EnsembleStrategy({
      entries: [{ strategy: fixed('BUY'), weight: 1 }],
      random: constantRandom(),
      invert: true,
    });
    expect(ensemble.decide(ctx)).toBe('SELL');
  });

  it('avec invert : un membre SELL → BUY', () => {
    const ensemble = new EnsembleStrategy({
      entries: [{ strategy: fixed('SELL'), weight: 1 }],
      random: constantRandom(),
      invert: true,
    });
    expect(ensemble.decide(ctx)).toBe('BUY');
  });

  it('HOLD (score nul) reste HOLD même avec invert', () => {
    const ensemble = new EnsembleStrategy({
      entries: [{ strategy: fixed('HOLD'), weight: 1 }],
      random: constantRandom(),
      invert: true,
    });
    expect(ensemble.decide(ctx)).toBe('HOLD');
  });

  it('invert préserve l’intensité : même tirage, direction opposée', () => {
    // 2 membres BUY + 1 SELL (poids égaux) → score +1/3 ; tirage 0.2 < 1/3 → agit.
    const entries = [
      { strategy: fixed('BUY'), weight: 1 },
      { strategy: fixed('BUY'), weight: 1 },
      { strategy: fixed('SELL'), weight: 1 },
    ];
    const base = new EnsembleStrategy({ entries, random: constantRandom(0.2) });
    const inverted = new EnsembleStrategy({ entries, random: constantRandom(0.2), invert: true });
    expect(base.decide(ctx)).toBe('BUY');
    expect(inverted.decide(ctx)).toBe('SELL');
  });

  it('invert n’agit pas si le tirage dépasse l’intensité (HOLD des deux côtés)', () => {
    // score = 1/3 ; tirage 0.5 > 1/3 → HOLD, et l'inverse aussi (|score| identique).
    const entries = [
      { strategy: fixed('BUY'), weight: 1 },
      { strategy: fixed('BUY'), weight: 1 },
      { strategy: fixed('SELL'), weight: 1 },
    ];
    expect(new EnsembleStrategy({ entries, random: constantRandom(0.5) }).decide(ctx)).toBe('HOLD');
    expect(
      new EnsembleStrategy({ entries, random: constantRandom(0.5), invert: true }).decide(ctx),
    ).toBe('HOLD');
  });
});
