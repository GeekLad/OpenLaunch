/**
 * Server-side fee validation using Meteora SDK constructors as ground truth.
 *
 * This module validates launch parameters against SDK-specific constraints
 * that cannot be expressed in a frontend Zod schema alone.
 */

import {
  getFeeTimeSchedulerParams,
  getFeeMarketCapSchedulerParams,
  validatePoolFees,
  BaseFeeMode,
  CollectFeeMode,
  ActivationType,
} from "@meteora-ag/cp-amm-sdk";
import { percentToBps, DEFAULT_NUMBER_OF_PERIODS, DEFAULT_SCHEDULER_EXPIRATION_SECONDS } from "@/config/defaults";
import { validateFeeScheduler, MIN_PRICE_MULTIPLE } from "./feeScheduler";

/**
 * Validates launch parameters against SDK-specific constraints.
 *
 * @param params - Launch parameters from the frontend form
 * @returns Validation result with optional field-level errors
 */
export function validateLaunchParams(
  params: Record<string, unknown>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  const lockedLiquidity = Number(params.lockedLiquidityPercentage ?? 100);
  if (lockedLiquidity < 0 || lockedLiquidity > 100) {
    errors.lockedLiquidityPercentage = "Locked liquidity must be between 0 and 100";
  }

  const feeSchedulerMode = String(params.feeSchedulerMode ?? "fixed");

  // Fee rates are stored as percentages (e.g., 0.5 for 0.5%)
  const feeStartRate = Number(params.feeStartRate ?? 0);
  const feeEndRate = Number(params.feeEndRate ?? 0);
  const feeFixedRate = Number(params.feeFixedRate ?? 0);
  const feeMarketCapStartRate = Number(params.feeMarketCapStartRate ?? 0);
  const feeMarketCapEndRate = Number(params.feeMarketCapEndRate ?? 0);
  const feeDurationHours = Number(params.feeDurationHours ?? 0);

  // Only validate the fields relevant to the active scheduler mode.
  if (feeSchedulerMode === "time-based") {
    if (feeStartRate !== 0 && (feeStartRate < 0.01 || feeStartRate > 99)) {
      errors.feeStartRate = "Fee start rate must be between 0.01% and 99%";
    }
    if (feeEndRate !== 0 && (feeEndRate < 0.01 || feeEndRate > 99)) {
      errors.feeEndRate = "Fee end rate must be between 0.01% and 99%";
    }
    if (feeDurationHours <= 0) {
      errors.feeDurationHours = "Fee duration must be at least 1 hour";
    }
  } else if (feeSchedulerMode === "market-cap-based") {
    if (feeMarketCapStartRate !== 0 && (feeMarketCapStartRate < 0.01 || feeMarketCapStartRate > 99)) {
      errors.feeMarketCapStartRate = "Fee start rate must be between 0.01% and 99%";
    }
    if (feeMarketCapEndRate !== 0 && (feeMarketCapEndRate < 0.01 || feeMarketCapEndRate > 99)) {
      errors.feeMarketCapEndRate = "Fee end rate must be between 0.01% and 99%";
    }
  } else {
    // fixed
    if (feeFixedRate !== 0 && (feeFixedRate < 0.01 || feeFixedRate > 99)) {
      errors.feeFixedRate = "Fixed fee rate must be between 0.01% and 99%";
    }
  }

  const quoteTokenMint = String(params.quoteTokenMint ?? "");
  if (
    quoteTokenMint !== "" &&
    quoteTokenMint !== "So11111111111111111111111111111111111111112" &&
    quoteTokenMint !== "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  ) {
    errors.quoteTokenMint = "Quote token must be SOL or USDC";
  }

  // Re-use DRY fee-scheduler validation shared with frontend
  const feeSchedConfig = {
    mode: feeSchedulerMode,
    startingMarketCap: params.startingMarketCap,
    endingMarketCap: params.endingMarketCap,
    durationMinutes: (feeDurationHours || 1) * 60,
  };
  const feeErrors = validateFeeScheduler(
    feeSchedConfig,
    params.initialMarketCap,
    params.marketCapRangeMax
  );
  feeErrors.forEach((err) => { errors[err.field] = err.message; });

  // If basic bounds already failed, skip SDK constructor validation
  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  let baseFee: unknown;

  // Scheduler expiration duration (seconds) for market-cap-based mode.
  // Must match the value used in createDAMMv2Pool (lib/solana/poolUtils.ts).
  const MARKET_CAP_SCHEDULER_EXPIRATION_SECONDS = DEFAULT_SCHEDULER_EXPIRATION_SECONDS;

  try {
    if (feeSchedulerMode === "time-based") {
      // Must match pool creation: BaseFeeMode.FeeTimeSchedulerExponential
      baseFee = getFeeTimeSchedulerParams(
        percentToBps(feeStartRate || 0.5),
        percentToBps(feeEndRate || 0.25),
        BaseFeeMode.FeeTimeSchedulerExponential,
        DEFAULT_NUMBER_OF_PERIODS,
        (feeDurationHours || 1) * 3600
      );
    } else if (feeSchedulerMode === "market-cap-based") {
      const startingMarketCap = Number(params.startingMarketCap ?? 0);
      const endingMarketCap = Number(params.endingMarketCap ?? 0);
      const priceMultiple =
        startingMarketCap > 0 ? endingMarketCap / startingMarketCap : 1;

      if (startingMarketCap > 0 && feeMarketCapStartRate <= feeMarketCapEndRate) {
        errors.feeMarketCapStartRate =
          `Starting fee rate (${feeMarketCapStartRate}%) must be greater than ending fee rate (${feeMarketCapEndRate}%)`;
        return { valid: false, errors };
      }

      // Guard: minimum viable priceMultiple per numberOfPeriod.
      // The SDK computes sqrtPriceStepBps = floor((sqrt(priceMultiple) - 1) * 10000 / numberOfPeriod)
      // and throws when that value is ≤ 0.
      if (priceMultiple > 1 && priceMultiple < MIN_PRICE_MULTIPLE) {
        const minEndingMcap = Math.ceil(startingMarketCap * MIN_PRICE_MULTIPLE);
        errors.endingMarketCap =
          `Ending market cap must be at least ${minEndingMcap} for this starting market cap ` +
          `(minimum price ratio is ${MIN_PRICE_MULTIPLE.toFixed(4)} for ${DEFAULT_NUMBER_OF_PERIODS} periods)`;
        return { valid: false, errors };
      }

      if (priceMultiple <= 1) {
        errors.feeSchedulerConfig =
          "Price multiple must be greater than 1 for market-cap-based scheduler";
        return { valid: false, errors };
      }

      // Must match pool creation: BaseFeeMode.FeeMarketCapSchedulerExponential
      // (decayMode defaults to exponential when undefined, matching poolUtils.ts)
      baseFee = getFeeMarketCapSchedulerParams(
        percentToBps(feeMarketCapStartRate || 50),
        percentToBps(feeMarketCapEndRate || 0.5),
        BaseFeeMode.FeeMarketCapSchedulerExponential,
        DEFAULT_NUMBER_OF_PERIODS,
        priceMultiple,
        MARKET_CAP_SCHEDULER_EXPIRATION_SECONDS
      );
    } else {
      baseFee = getFeeTimeSchedulerParams(
        percentToBps(feeFixedRate || 0.25),
        percentToBps(feeFixedRate || 0.25),
        BaseFeeMode.FeeTimeSchedulerLinear,
        0,
        0
      );
    }
  } catch (error) {
    errors.feeSchedulerConfig =
      error instanceof Error ? error.message : "Invalid fee scheduler parameters";
    return { valid: false, errors };
  }

  try {
    const feeTokenMode = String(params.feeTokenMode ?? "quoteOnly");
    const collectFeeMode =
      feeTokenMode === "both" ? CollectFeeMode.BothToken : CollectFeeMode.OnlyB;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const poolFees: any = {
      baseFee,
      compoundingFeeBps: 0,
      padding: 0,
      dynamicFee: null,
    };

    validatePoolFees(poolFees, collectFeeMode, ActivationType.Timestamp);
  } catch (error) {
    errors.poolFees =
      error instanceof Error ? error.message : "Invalid pool fee configuration";
    return { valid: false, errors };
  }

  return { valid: true, errors: {} };
}
