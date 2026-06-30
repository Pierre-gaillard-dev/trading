import type { Candle } from '@trading/shared';

/**
 * Un worker = un traitement qui tourne en fond sur un (symbole, intervalle) et
 * réagit à chaque bougie clôturée. Les futurs bots de trading implémenteront
 * cette interface (stratégie → décision → exécution).
 */
export interface Worker {
  readonly id: string;
  readonly symbol: string;
  readonly interval: string;
  /** Appelé à chaque bougie clôturée, avec l'historique récent en contexte. */
  onClosedCandle(candle: Candle, history: Candle[]): void | Promise<void>;
}
