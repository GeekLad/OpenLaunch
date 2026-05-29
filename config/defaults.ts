/**
 * Default values for all configurable token launch parameters.
 */

// Token parameters
export const DEFAULT_TOTAL_SUPPLY = 1_000_000_000;
export const DEFAULT_DECIMALS = 9;

// Pool parameters
export const DEFAULT_POOL_LIQUIDITY_PERCENTAGE = 1.0;
export const DEFAULT_BASE_FEE_BPS = 25;
export const DEFAULT_LOCKED_LIQUIDITY_PERCENTAGE = 100;
export const DEFAULT_QUOTE_TOKEN_MINT = 'So11111111111111111111111111111111111111112';

// Fee scheduler defaults (market-cap-based is the new default per D-15)
export const DEFAULT_FEE_SCHEDULER_MODE = 'market-cap-based' as const;
export const DEFAULT_FEE_TOKEN_MODE = 'quoteOnly' as const;

// Market cap defaults (used for both pool range and fee scheduler defaults)
export const DEFAULT_INITIAL_MARKET_CAP = 10_000; // 10k SOL market cap at launch
export const DEFAULT_MARKET_CAP_RANGE_MIN = 1_000;
export const DEFAULT_MARKET_CAP_RANGE_MAX = 1_000_000;

// Fee scheduler market cap defaults
// Starting market cap defaults to the initial market cap (launch market cap)
export const DEFAULT_STARTING_MARKET_CAP = DEFAULT_INITIAL_MARKET_CAP;
// Ending market cap defaults to the pool's max market cap range
export const DEFAULT_ENDING_MARKET_CAP = DEFAULT_MARKET_CAP_RANGE_MAX;

// Fee rate defaults (stored as percent values in the UI, 0.5% = 50 bps)
export const DEFAULT_FEE_START_PERCENT = 0.5;   // 0.5%
export const DEFAULT_FEE_END_PERCENT = 0.25;    // 0.25%
export const DEFAULT_MARKET_CAP_FEE_START_PERCENT = 0.5;
export const DEFAULT_MARKET_CAP_FEE_END_PERCENT = 0.25;
export const DEFAULT_FEE_DURATION_MINUTES = 60;
export const DEFAULT_FIXED_FEE_PERCENT = 0.25;  // 0.25%
export const DEFAULT_NUMBER_OF_PERIODS = 60;

/**
 * Known quote token mints and their decimal places.
 */
export const QUOTE_TOKEN_DECIMALS: Record<string, number> = {
  "So11111111111111111111111111111111111111112": 9, // SOL (wrapped)
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": 6, // USDC
};

/**
 * Return the decimal places for a known quote-token mint.
 * Throws a clear error for unknown mints so mis-decimalization never
 * happens silently.
 */
export function getQuoteTokenDecimals(quoteTokenMint: string): number {
  const decimals = QUOTE_TOKEN_DECIMALS[quoteTokenMint];
  if (decimals === undefined) {
    throw new Error(
      `Unsupported quote token mint "${quoteTokenMint}". ` +
        `Supported: ${Object.keys(QUOTE_TOKEN_DECIMALS).join(", ")}`
    );
  }
  return decimals;
}

/**
 * Convert a market cap (in quote token terms) to price per token.
 * Used internally since the Meteora SDK operates on price, not market cap.
 */
export function marketCapToPrice(marketCap: number, totalSupply: number): number {
  return totalSupply > 0 ? marketCap / totalSupply : 0;
}

/**
 * Convert a price per token to market cap.
 */
export function priceToMarketCap(price: number, totalSupply: number): number {
  return price * totalSupply;
}

/**
 * Convert a percentage value (e.g., 0.5 for 0.5%) to basis points (50).
 */
export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}

/**
 * Convert basis points to percentage.
 */
export function bpsToPercent(bps: number): number {
  return bps / 100;
}

export const DEFAULT_LAUNCH_PARAMS = {
  totalSupply: DEFAULT_TOTAL_SUPPLY,
  decimals: DEFAULT_DECIMALS,
  initialMarketCap: DEFAULT_INITIAL_MARKET_CAP,
  marketCapRangeMin: DEFAULT_MARKET_CAP_RANGE_MIN,
  marketCapRangeMax: DEFAULT_MARKET_CAP_RANGE_MAX,
  feeSchedulerMode: DEFAULT_FEE_SCHEDULER_MODE,
  feeTokenMode: DEFAULT_FEE_TOKEN_MODE,
  poolLiquidityPercentage: DEFAULT_POOL_LIQUIDITY_PERCENTAGE,
  baseFeeBps: DEFAULT_BASE_FEE_BPS,
  lockedLiquidityPercentage: DEFAULT_LOCKED_LIQUIDITY_PERCENTAGE,
  quoteTokenMint: DEFAULT_QUOTE_TOKEN_MINT,
  startingMarketCap: DEFAULT_STARTING_MARKET_CAP,
  endingMarketCap: DEFAULT_ENDING_MARKET_CAP,
  feeStartPercent: DEFAULT_FEE_START_PERCENT,
  feeEndPercent: DEFAULT_FEE_END_PERCENT,
  feeMarketCapStartPercent: DEFAULT_MARKET_CAP_FEE_START_PERCENT,
  feeMarketCapEndPercent: DEFAULT_MARKET_CAP_FEE_END_PERCENT,
  feeFixedPercent: DEFAULT_FIXED_FEE_PERCENT,
} as const;
