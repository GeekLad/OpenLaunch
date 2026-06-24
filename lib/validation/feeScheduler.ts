/**
 * DRY fee-scheduler validation logic used by both client and server.
 *
 * Every function returns ALL failures at once, not just the first one.
 */

import { DEFAULT_NUMBER_OF_PERIODS } from "@/config/defaults";

export interface ValidationError {
  field: string;
  message: string;
}

function isPositive(n: unknown): n is number {
  return typeof n === "number" && !Number.isNaN(n) && n > 0;
}

/**
 * Minimum viable price ratio so the SDK's sqrtPriceStepBps stays ≥ 1.
 * Derived from: (1 + DEFAULT_NUMBER_OF_PERIODS / 10000) ^ 2
 */
export const MIN_PRICE_MULTIPLE = (1 + DEFAULT_NUMBER_OF_PERIODS / 10000) ** 2;

/**
 * Validate the pool market cap range (initial < max).
 */
export function validateMarketCapRange(
  initial: unknown,
  max: unknown
): ValidationError[] {
  const errors: ValidationError[] = [];
  const iCap = isPositive(initial) ? initial : 0;
  const xCap = isPositive(max) ? max : 0;

  if (iCap <= 0) {
    errors.push({ field: "initialMarketCap", message: "Initial market cap must be greater than 0" });
  }
  if (iCap > 0 && xCap > 0 && iCap >= xCap) {
    errors.push({ field: "marketCapRangeMax", message: "Initial market cap must be less than maximum market cap" });
  }

  return errors;
}

/**
 * Validate a market-cap-based fee scheduler configuration.
 *
 * @param startMcap — the fee schedule's starting market cap
 * @param endMcap   — the fee schedule's ending market cap
 * @param launchMcap     — the token's initial market cap at launch
 * @param poolMaxMcap — the pool's maximum supported market cap
 * @returns an array of fee-scheduler-specific errors. Empty array = valid.
 */
export function validateFeeSchedulerMarketCap(
  startMcap: unknown,
  endMcap: unknown,
  launchMcap: unknown,
  poolMaxMcap: unknown
): ValidationError[] {
  const errors: ValidationError[] = [];

  const sCap = isPositive(startMcap) ? startMcap : 0;
  const eCap = isPositive(endMcap) ? endMcap : 0;
  const lCap = isPositive(launchMcap) ? launchMcap : 0;
  const pMax = isPositive(poolMaxMcap) ? poolMaxMcap : Number.MAX_SAFE_INTEGER;

  if (!isPositive(startMcap)) {
    errors.push({ field: "startingMarketCap", message: "Starting market cap must be greater than 0" });
  }
  if (!isPositive(endMcap)) {
    errors.push({ field: "endingMarketCap", message: "Ending market cap must be greater than 0" });
  }

  if (sCap > 0 && eCap > 0) {
    if (eCap <= sCap) {
      errors.push({ field: "endingMarketCap", message: "Ending market cap must be greater than starting market cap" });
    }
    if (lCap > 0 && sCap < lCap) {
      errors.push({ field: "startingMarketCap", message: `Starting market cap must be \u003e= launch market cap (${lCap})` });
    }
    if (eCap > pMax) {
      errors.push({ field: "endingMarketCap", message: `Ending market cap must be \u003c= pool max market cap (${pMax})` });
    }
    if (eCap > sCap) {
      const priceMultiple = eCap / sCap;
      if (priceMultiple < MIN_PRICE_MULTIPLE) {
        const minEndingMcap = Math.ceil(sCap * MIN_PRICE_MULTIPLE);
        errors.push({ field: "endingMarketCap", message: `Ending market cap too close to starting market cap. Must be at least ${minEndingMcap}} for ${DEFAULT_NUMBER_OF_PERIODS} periods)` });
      }
    }
  }

  return errors;
}

/**
 * Validate a time-based fee scheduler configuration.
 */
export function validateFeeSchedulerTimeBased(
  durationMinutes: unknown
): ValidationError[] {
  const errors: ValidationError[] = [];
  const duration = typeof durationMinutes === "number" ? durationMinutes : 0;
  if (duration <= 0) {
    errors.push({ field: "durationMinutes", message: "Duration must be greater than 0" });
  }
  return errors;
}

/**
 * Run all fee-scheduler validations and return every error found.
 *
 * @param feeSchedulerConfig — must contain `mode` field
 * @param launchMcap     — the token's initial market cap
 * @param poolMaxMcap — the pool's max market cap range
 * @returns an array of ALL errors. Empty array = all validations pass.
 */
export function validateFeeScheduler(
  feeSchedulerConfig: Record<string, unknown>,
  launchMcap: unknown,
  poolMaxMcap: unknown
): ValidationError[] {
  const mode = String(feeSchedulerConfig?.mode ?? "fixed");
  if (mode === "market-cap-based") {
    const startMcap = feeSchedulerConfig.startingMarketCap;
    const endMcap   = feeSchedulerConfig.endingMarketCap;
    return validateFeeSchedulerMarketCap(startMcap, endMcap, launchMcap, poolMaxMcap);
  }
  if (mode === "time-based") {
    return validateFeeSchedulerTimeBased(feeSchedulerConfig.durationMinutes);
  }
  return [];
}
