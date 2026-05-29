/**
 * Server-side pre-flight validation for token launch parameters.
 *
 * Runs before any Solana transactions are built. Returns ALL failures
 * so the UI can display every field-level error at once.
 *
 * Cross-reference: components/forms/TokenLaunchForm.tsx (Zod schema)
 */

import { type FeeSchedulerConfig } from "@/types/fee";

export interface LaunchValidationError {
  field: string;
  message: string;
  code: string;
}

/** Structured validation error thrown when launch parameters are invalid. */
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: LaunchValidationError[]
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export interface LaunchValidationInput {
  totalSupply: number;
  lockedLiquidityPercentage: number;
  marketCapRangeMin: number;
  initialMarketCap: number;
  marketCapRangeMax: number;
  baseFeeBps: number;
  feeSchedulerConfig: FeeSchedulerConfig;
  feeTokenMode: string;
  quoteTokenMint: string;
  feeDecayPeriods: number;
}

/**
 * Type-safe branch extractor for the FeeSchedulerConfig discriminated union.
 */
type MarketCapConfig = Extract<FeeSchedulerConfig, { mode: "market-cap-based" }>;
type TimeBasedConfig = Extract<FeeSchedulerConfig, { mode: "time-based" }>;

/**
 * Validate every launch parameter that will be used to build on-chain
 * transactions. Returns an empty array when all checks pass.
 *
 * Checks are run in the order they appear; ALL failures are collected.
 */
export function validateLaunchParams(
  formData: Partial<LaunchValidationInput>
): LaunchValidationError[] {
  const errors: LaunchValidationError[] = [];
  const add = (field: string, message: string, code: string) =>
    errors.push({ field, message, code });

  // ─── Supply ───
  if (formData.totalSupply === undefined || formData.totalSupply <= 0) {
    add("totalSupply", "Total supply must be greater than 0", "SUPPLY_INVALID");
  } else if (!Number.isInteger(formData.totalSupply)) {
    add("totalSupply", "Total supply must be an integer", "SUPPLY_NOT_INTEGER");
  } else if (formData.totalSupply > Number.MAX_SAFE_INTEGER) {
    add(
      "totalSupply",
      "Total supply exceeds safe integer range",
      "SUPPLY_TOO_LARGE"
    );
  }

  // ─── Locked Liquidity ───
  if (
    formData.lockedLiquidityPercentage === undefined ||
    formData.lockedLiquidityPercentage < 0 ||
    formData.lockedLiquidityPercentage > 100
  ) {
    add(
      "lockedLiquidityPercentage",
      "Locked liquidity must be between 0 and 100",
      "LIQUIDITY_OUT_OF_RANGE"
    );
  }

  // ─── Market cap range ───
  if (
    formData.marketCapRangeMin === undefined ||
    formData.marketCapRangeMin <= 0
  ) {
    add("marketCapRangeMin", "Minimum market cap must be greater than 0", "MCAP_MIN_INVALID");
  }
  if (
    formData.initialMarketCap === undefined ||
    formData.initialMarketCap <= (formData.marketCapRangeMin ?? 0)
  ) {
    add(
      "initialMarketCap",
      "Initial market cap must be greater than minimum market cap",
      "MCAP_INITIAL_TOO_LOW"
    );
  }
  if (
    formData.marketCapRangeMax === undefined ||
    formData.marketCapRangeMax <= (formData.initialMarketCap ?? 0)
  ) {
    add(
      "marketCapRangeMax",
      "Maximum market cap must be greater than initial market cap",
      "MCAP_MAX_TOO_LOW"
    );
  }

  // ─── Base fee ───
  if (
    formData.baseFeeBps !== undefined &&
    (formData.baseFeeBps < 0 || formData.baseFeeBps > 10000)
  ) {
    add(
      "baseFeeBps",
      "Base fee must be between 0 and 10,000 bps (0–100%)",
      "BASE_FEE_OUT_OF_RANGE"
    );
  }

  // ─── Fee-scheduler branch checks ───
  const mode = formData.feeSchedulerConfig?.mode;
  const sched = formData.feeSchedulerConfig;

  if (mode === "market-cap-based" && sched) {
    const branch = sched as MarketCapConfig;
    if (branch.startingMarketCap <= 0) {
      add("startingMarketCap", "Starting market cap must be > 0", "MCAP_START_INVALID");
    }
    if (branch.endingMarketCap <= branch.startingMarketCap) {
      add(
        "endingMarketCap",
        "Ending market cap must be greater than starting market cap",
        "MCAP_END_TOO_LOW"
      );
    }
    // Fee scheduler caps must be within pool range:
    // starting >= initial (launch) market cap, and ending <= max market cap range
    const launchMcap = (formData.totalSupply ?? 0) > 0
      ? (formData.initialMarketCap ?? 0)
      : 0;
    const maxMcap = formData.marketCapRangeMax ?? Number.MAX_SAFE_INTEGER;
    if (launchMcap > 0 && branch.startingMarketCap < launchMcap) {
      add(
        "startingMarketCap",
        `Fee schedule starting market cap (${branch.startingMarketCap}) must be >= launch market cap (${launchMcap})`,
        "MCAP_SCHEDULER_BELOW_LAUNCH"
      );
    }
    if (branch.endingMarketCap > maxMcap) {
      add(
        "endingMarketCap",
        `Fee schedule ending market cap (${branch.endingMarketCap}) must be <= pool max market cap (${maxMcap})`,
        "MCAP_SCHEDULER_ABOVE_MAX"
      );
    }
  } else if (mode === "time-based" && sched) {
    const branch = sched as TimeBasedConfig;
    if (branch.durationMinutes <= 0) {
      add("durationMinutes", "Duration must be greater than 0", "DURATION_INVALID");
    }
  }

  // ─── Quote token ───
  if (!isValidSolanaAddress(formData.quoteTokenMint ?? "")) {
    add("quoteTokenMint", "Invalid Solana address", "QUOTE_MINT_INVALID");
  } else if (
    formData.quoteTokenMint !==
      "So11111111111111111111111111111111111111112" &&
    formData.quoteTokenMint !== "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  ) {
    add(
      "quoteTokenMint",
      'Quote token must be SOL (So1111...11112) or USDC (EPjFW...TDt1v)',
      "QUOTE_MINT_UNKNOWN"
    );
  }

  // ─── Decay periods (optional) ───
  if (
    formData.feeDecayPeriods !== undefined &&
    (formData.feeDecayPeriods <= 0 || formData.feeDecayPeriods > 1000)
  ) {
    add(
      "feeDecayPeriods",
      "Number of periods must be between 1 and 1000",
      "PERIODS_OUT_OF_RANGE"
    );
  }

  return errors;
}

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/**
 * Quick Solana-base58 sanity check.
 */
export function isValidSolanaAddress(address: string): boolean {
  if (!address || address.length < 32 || address.length > 44) return false;
  for (const ch of address) {
    if (!BASE58_ALPHABET.includes(ch)) return false;
  }
  return true;
}
