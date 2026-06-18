import { describe, it, expect } from 'vitest';
import { addWatchedSymbolSchema, watchedSymbolSchema, watchlistResponseSchema } from './watchlist';

/**
 * `addWatchedSymbolSchema` : ajout d'une crypto suivie. Contrairement au bot,
 * le symbole est rogné (.trim()) AVANT la validation regex → on teste ce comportement.
 */
describe('addWatchedSymbolSchema', () => {
  it('accepte un symbole USDT valide', () => {
    expect(addWatchedSymbolSchema.safeParse({ symbol: 'BTCUSDT' }).success).toBe(true);
  });

  it('accepte un symbole en minuscules', () => {
    expect(addWatchedSymbolSchema.safeParse({ symbol: 'ethusdt' }).success).toBe(true);
  });

  it('rogne les espaces autour avant de valider', () => {
    const result = addWatchedSymbolSchema.safeParse({ symbol: '  btcusdt  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.symbol).toBe('btcusdt');
    }
  });

  it('rejette un symbole vide', () => {
    expect(addWatchedSymbolSchema.safeParse({ symbol: '' }).success).toBe(false);
  });

  it('rejette un symbole qui ne finit pas par USDT', () => {
    expect(addWatchedSymbolSchema.safeParse({ symbol: 'BTCEUR' }).success).toBe(false);
  });

  it('rejette un symbole avec caractères interdits', () => {
    expect(addWatchedSymbolSchema.safeParse({ symbol: 'BTC/USDT' }).success).toBe(false);
  });

  it('rejette un champ symbol manquant', () => {
    expect(addWatchedSymbolSchema.safeParse({}).success).toBe(false);
  });

  it('rejette un symbol non-chaîne', () => {
    expect(addWatchedSymbolSchema.safeParse({ symbol: 123 }).success).toBe(false);
  });
});

/** `watchedSymbolSchema` / `watchlistResponseSchema` : forme de sortie. */
describe('watchedSymbolSchema', () => {
  const item = { symbol: 'BTCUSDT', createdAt: '2026-01-01T00:00:00.000Z' };

  it('accepte un élément valide', () => {
    expect(watchedSymbolSchema.safeParse(item).success).toBe(true);
  });

  it('rejette un createdAt manquant', () => {
    expect(watchedSymbolSchema.safeParse({ symbol: 'BTCUSDT' }).success).toBe(false);
  });

  it('valide une liste (réponse complète)', () => {
    expect(watchlistResponseSchema.safeParse([item]).success).toBe(true);
  });

  it('valide une liste vide', () => {
    expect(watchlistResponseSchema.safeParse([]).success).toBe(true);
  });
});
