/**
 * Fee scheduler mode values.
 * Used in the discriminated union to tag the specific configuration shape.
 */
export type FeeSchedulerMode = 'market-cap-based' | 'time-based' | 'fixed';

/**
 * Discriminated union for fee scheduler configuration.
 *
 * - `market-cap-based`: Fees decay as market cap grows between
 *   `startingMarketCap` and `endingMarketCap`.
 * - `time-based`: Fees decay over a fixed duration from `startRate`
 *   to `endRate`.
 * - `fixed`: Static fee set by `baseFeeBps`.
 */
export type FeeSchedulerConfig =
  | { mode: 'market-cap-based'; startingMarketCap: number; endingMarketCap: number; feeMarketCapStartRate: number; feeMarketCapEndRate: number }
  | { mode: 'time-based'; startRate: number; endRate: number; durationMinutes: number }
  | { mode: 'fixed'; baseFeeBps: number };

/**
 * Which token(s) fees are collected in.
 *
 * - `quoteOnly`: Fees are collected in the quote token (SOL).
 * - `both`: Fees are collected in both tokens.
 */
export type FeeTokenMode = 'quoteOnly' | 'both';
