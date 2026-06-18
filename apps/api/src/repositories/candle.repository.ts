import type { Candle } from '@trading/shared';

/**
 * Stockage des bougies (cache partagé : dashboard + workers).
 * Évite de re-télécharger l'historique et survit aux redémarrages.
 */
export interface CandleRepository {
  /** Insère un lot de bougies (ignore les doublons). */
  saveHistory(symbol: string, interval: string, candles: Candle[]): Promise<void>;
  /** Enregistre/maj une bougie clôturée. */
  saveClosedCandle(symbol: string, interval: string, candle: Candle): Promise<void>;
  /** Renvoie les `limit` dernières bougies, par ordre chronologique. */
  getRecent(symbol: string, interval: string, limit: number): Promise<Candle[]>;
  /** Dernier prix connu d'un symbole (close de la bougie la plus récente, tous intervalles confondus), ou null. */
  getLastPrice(symbol: string): Promise<number | null>;
}
