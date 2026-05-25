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

  const holdback = Number(params.holdbackPercentage ?? 0);
  if (holdback < 0 || holdback > 100) {
    errors.holdbackPercentage = "Holdback percentage must be between 0 and 100";
  }

  const feeStartRate = Number(params.feeStartRate ?? 0);
  const feeEndRate = Number(params.feeEndRate ?? 0);
  const feeFixedRate = Number(params.feeFixedRate ?? 0);

  if (feeStartRate !== 0 && (feeStartRate < 1 || feeStartRate > 9900)) {
    errors.feeStartRate = "Fee start rate must be between 1 and 9900 basis points";
  }
  if (feeEndRate !== 0 && (feeEndRate < 1 || feeEndRate > 9900)) {
    errors.feeEndRate = "Fee end rate must be between 1 and 9900 basis points";
  }
  if (feeFixedRate !== 0 && (feeFixedRate < 1 || feeFixedRate > 9900)) {
    errors.feeFixedRate = "Fixed fee rate must be between 1 and 9900 basis points";
  }

  const startingMarketCap = Number(params.startingMarketCap ?? 0);
  const endingMarketCap = Number(params.endingMarketCap ?? 0);
  if (startingMarketCap < 0) {
    errors.startingMarketCap = "Starting market cap must be greater than 0";
  }
  if (endingMarketCap < 0) {
    errors.endingMarketCap = "Ending market cap must be greater than 0";
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

  // If basic bounds already failed, skip SDK constructor validation
  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  const feeSchedulerMode = String(params.feeSchedulerMode ?? "fixed");
  let baseFee: unknown;

  try {
    if (feeSchedulerMode === "time-based") {
      baseFee = getFeeTimeSchedulerParams(
        feeStartRate || 50,
        feeEndRate || 25,
        BaseFeeMode.FeeTimeSchedulerLinear,
        60,
        (feeDurationHours || 1) * 3600
      );
    } else if (feeSchedulerMode === "market-cap-based") {
      const priceMultiple =
        startingMarketCap > 0
          ? Math.round(endingMarketCap / startingMarketCap)
          : 1;
      if (priceMultiple <= 1) {
        errors.feeSchedulerConfig =
          "Price multiple must be greater than 1 for market-cap-based scheduler";
        return { valid: false, errors };
      }
      baseFee = getFeeMarketCapSchedulerParams(
        feeStartRate || 50,
        feeEndRate || 25,
        BaseFeeMode.FeeMarketCapSchedulerLinear,
        60,
        priceMultiple,
        (feeDurationHours || 1) * 3600
      );
    } else {
      // Fixed fee mode
      baseFee = getFeeTimeSchedulerParams(
        feeFixedRate || 25,
        feeFixedRate || 25,
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
      feeTokenMode === "both"
        ? CollectFeeMode.BothToken
        : CollectFeeMode.OnlyB;

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
