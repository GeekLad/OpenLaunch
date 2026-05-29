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
import { percentToBps } from "@/config/defaults";
import { validateFeeScheduler } from "./feeScheduler";

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

  // Fee rates are stored as percentages (e.g., 0.5 for 0.5%)
  const feeStartRate = Number(params.feeStartRate ?? 0);
  const feeEndRate = Number(params.feeEndRate ?? 0);
  const feeFixedRate = Number(params.feeFixedRate ?? 0);

  if (feeStartRate !== 0 && (feeStartRate < 0.01 || feeStartRate > 99)) {
    errors.feeStartRate = "Fee start rate must be between 0.01% and 99%";
  }
  if (feeEndRate !== 0 && (feeEndRate < 0.01 || feeEndRate > 99)) {
    errors.feeEndRate = "Fee end rate must be between 0.01% and 99%";
  }
  if (feeFixedRate !== 0 && (feeFixedRate < 0.01 || feeFixedRate > 99)) {
    errors.feeFixedRate = "Fixed fee rate must be between 0.01% and 99%";
  }

  const feeDurationHours = Number(params.feeDurationHours ?? 0);
  if (feeDurationHours <= 0) {
    errors.feeDurationHours = "Fee duration must be at least 1 hour";
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
    mode: params.feeSchedulerMode,
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

  const feeSchedulerMode = String(params.feeSchedulerMode ?? "fixed");
  let baseFee: unknown;

  try {
    if (feeSchedulerMode === "time-based") {
      baseFee = getFeeTimeSchedulerParams(
        percentToBps(feeStartRate || 0.5),
        percentToBps(feeEndRate || 0.25),
        BaseFeeMode.FeeTimeSchedulerLinear,
        60,
        (feeDurationHours || 1) * 3600
      );
    } else if (feeSchedulerMode === "market-cap-based") {
      const startingMarketCap = Number(params.startingMarketCap ?? 0);
      const endingMarketCap = Number(params.endingMarketCap ?? 0);
      const priceMultiple =
        startingMarketCap > 0 ? endingMarketCap / startingMarketCap : 1;
      if (priceMultiple <= 1) {
        errors.feeSchedulerConfig =
          "Price multiple must be greater than 1 for market-cap-based scheduler";
        return { valid: false, errors };
      }
      baseFee = getFeeMarketCapSchedulerParams(
        percentToBps(feeStartRate || 0.5),
        percentToBps(feeEndRate || 0.25),
        BaseFeeMode.FeeMarketCapSchedulerLinear,
        60,
        priceMultiple,
        (feeDurationHours || 1) * 3600
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
