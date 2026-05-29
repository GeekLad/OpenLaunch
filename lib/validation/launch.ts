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
  holdbackPercentage: number;
  priceRangeMin: number;
  initialPrice: number;
  priceRangeMax: number;
  baseFeeBps: number;
  feeSchedulerConfig: FeeSchedulerConfig;
  feeTokenMode: string;
  quoteTokenMint: string;
  feeDecayPeriods: number;
}

/**
 * Type-safe branch extractor for the FeeSchedulerConfig discriminated union.
 * Use after narrowing on `mode` to pull out branch-specific fields.
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

  // ─── Holdback ───
  if (
    formData.holdbackPercentage === undefined ||
    formData.holdbackPercentage < 0 ||
    formData.holdbackPercentage > 100
  ) {
    add(
      "holdbackPercentage",
      "Holdback percentage must be between 0 and 100",
      "HOLDBACK_OUT_OF_RANGE"
    );
  }

  // ─── Price range ───
  if (
    formData.priceRangeMin === undefined ||
    formData.priceRangeMin <= 0
  ) {
    add("priceRangeMin", "Minimum price must be greater than 0", "PRICE_MIN_INVALID");
  }
  if (
    formData.initialPrice === undefined ||
    formData.initialPrice <= (formData.priceRangeMin ?? 0)
  ) {
    add(
      "initialPrice",
      "Initial price must be greater than minimum price",
      "PRICE_INITIAL_TOO_LOW"
    );
  }
  if (
    formData.priceRangeMax === undefined ||
    formData.priceRangeMax <= (formData.initialPrice ?? 0)
  ) {
    add(
      "priceRangeMax",
      "Maximum price must be greater than initial price",
      "PRICE_MAX_TOO_LOW"
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

  // ─── Decay periods (optional — not always present in TokenFormData) ───
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
 * Quick Solana-base58 sanity check. Does NOT guarantee the address is on-curve
 * (that requires a PublicKey construction / ed25519 verify), but catches
 * obvious typos and non-base58 strings.
 */
export function isValidSolanaAddress(address: string): boolean {
  if (!address || address.length < 32 || address.length > 44) return false;
  for (const ch of address) {
    if (!BASE58_ALPHABET.includes(ch)) return false;
  }
  return true;
}
