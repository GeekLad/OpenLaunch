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
 * - `time-based`: Fees decay over a fixed duration from `startRatePercent`
 *   to `endRatePercent`.
 * - `fixed`: Static fee set by `baseFeePercent`.
 */
export type FeeSchedulerConfig =
  | { mode: 'market-cap-based'; startingMarketCap: number; endingMarketCap: number; feeMarketCapStartRatePercent: number; feeMarketCapEndRatePercent: number; decayMode?: 'linear' | 'exponential' }
  | { mode: 'time-based'; startRatePercent: number; endRatePercent: number; durationMinutes: number }
  | { mode: 'fixed'; baseFeePercent: number };

/**
 * Which token(s) fees are collected in.
 *
 * - `quoteOnly`: Fees are collected in the quote token (SOL).
 * - `both`: Fees are collected in both tokens.
 */
export type FeeTokenMode = 'quoteOnly' | 'both';
