/**
 * Default values for all configurable token launch parameters.
 *
 * These constants replace the previous environment-variable-driven
 * defaults. They are used by both the frontend form (as `defaultValues`)
 * and the backend API (as fallback values when a field is omitted).
 */

// Token parameters
export const DEFAULT_TOTAL_SUPPLY = 1_000_000_000;
export const DEFAULT_DECIMALS = 9;

// Pricing parameters
export const DEFAULT_INITIAL_PRICE = 0.00001;
export const DEFAULT_PRICE_RANGE_MIN = 0.000001;
export const DEFAULT_PRICE_RANGE_MAX = 0.0001;

// Fee scheduler defaults (market-cap-based is the new default per D-15)
export const DEFAULT_FEE_SCHEDULER_MODE = 'market-cap-based' as const;
export const DEFAULT_FEE_TOKEN_MODE = 'quoteOnly' as const;

// Pool parameters
export const DEFAULT_POOL_LIQUIDITY_PERCENTAGE = 1.0;
export const DEFAULT_BASE_FEE_BPS = 25;
export const DEFAULT_HOLDBACK_PERCENTAGE = 0;
export const DEFAULT_QUOTE_TOKEN_MINT = 'So11111111111111111111111111111111111111112';

// Time-based fee scheduler defaults (only used when mode is 'time-based')
export const DEFAULT_STARTING_MARKET_CAP = 1_000;
export const DEFAULT_ENDING_MARKET_CAP = 100_000;
export const DEFAULT_FEE_START_RATE = 50;
export const DEFAULT_FEE_END_RATE = 25;
export const DEFAULT_MARKET_CAP_FEE_START_RATE = 50;
export const DEFAULT_MARKET_CAP_FEE_END_RATE = 25;
export const DEFAULT_FEE_DURATION_MINUTES = 60;
export const DEFAULT_NUMBER_OF_PERIODS = 60;

/**
 * Aggregate object containing every launch-relevant default.
 * Useful for spreading into form defaults or API fallback objects.
 *
 * Note: Time-specific defaults (feeDurationMinutes, numberOfPeriods) are
 * kept as separate exported constants and only used when fee scheduler mode
 * is 'time-based'. The aggregate defaults to 'market-cap-based' mode.
 */
export const DEFAULT_LAUNCH_PARAMS = {
  totalSupply: DEFAULT_TOTAL_SUPPLY,
  decimals: DEFAULT_DECIMALS,
  initialPrice: DEFAULT_INITIAL_PRICE,
  priceRangeMin: DEFAULT_PRICE_RANGE_MIN,
  priceRangeMax: DEFAULT_PRICE_RANGE_MAX,
  feeSchedulerMode: DEFAULT_FEE_SCHEDULER_MODE,
  feeTokenMode: DEFAULT_FEE_TOKEN_MODE,
  poolLiquidityPercentage: DEFAULT_POOL_LIQUIDITY_PERCENTAGE,
  baseFeeBps: DEFAULT_BASE_FEE_BPS,
  holdbackPercentage: DEFAULT_HOLDBACK_PERCENTAGE,
  quoteTokenMint: DEFAULT_QUOTE_TOKEN_MINT,
  startingMarketCap: DEFAULT_STARTING_MARKET_CAP,
  endingMarketCap: DEFAULT_ENDING_MARKET_CAP,
  feeStartRate: DEFAULT_FEE_START_RATE,
  feeEndRate: DEFAULT_FEE_END_RATE,
  feeMarketCapStartRate: DEFAULT_MARKET_CAP_FEE_START_RATE,
  feeMarketCapEndRate: DEFAULT_MARKET_CAP_FEE_END_RATE,
} as const;
