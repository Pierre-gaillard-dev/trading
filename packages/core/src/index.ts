// === Domaine ===
export { Decimal, type DecimalValue } from './domain/decimal';
export { Money } from './domain/money';
export { Quantity } from './domain/quantity';
export { Price } from './domain/price';
export type { Candle } from './domain/candle';
export type { Position } from './domain/position';
export type { SymbolSpec } from './domain/symbol-spec';
export type { OrderSide, RejectReason } from './domain/order';
export { invariant } from './domain/invariant';

// === Indicateurs (fonctions pures) ===
export { crossesAbove, crossesBelow } from './application/indicators/crossover';
export { sma } from './application/indicators/sma';
export { ema } from './application/indicators/ema';
export { rsi } from './application/indicators/rsi';
export { macd, type MacdResult } from './application/indicators/macd';
export { stddev } from './application/indicators/stddev';
export { bollinger, type BollingerBands } from './application/indicators/bollinger';
export { roc } from './application/indicators/roc';

// === Ports ===
export type { RandomSource } from './ports/random-source';

// === Stratégies ===
export * from './application/strategies';

// === Exécution & portefeuille ===
export {
  ExecutionEngine,
  type ExecutionInput,
  type ExecutionResult,
  type Fill,
  type Rejection,
} from './application/execution/execution-engine';
export { type SizingPolicy, type SizingInput } from './application/sizing/sizing-policy';
export { FixedFractionSizing } from './application/sizing/fixed-fraction-sizing';
export {
  Portfolio,
  type PortfolioConfig,
  type SeedPosition,
  type ExecuteOrderInput,
} from './application/portfolio/portfolio';

// === Bot ===
export {
  TradingBot,
  type TradingBotConfig,
  type RiskParams,
} from './application/bot/trading-bot';
