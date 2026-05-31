"use client";

import * as z from "zod";
import { validateAndParsePrivateKey } from "@/lib/utils/keypairUtils";
import { validateFeeSchedulerMarketCap, validateMarketCapRange } from "@/lib/validation/feeScheduler";
import { DEFAULT_LAUNCH_PARAMS } from "@/config/defaults";

export const tokenFormSchema = z.object({
  symbol: z.string().min(1, "Symbol is required").max(10, "Symbol must be 10 characters or less"),
  name: z.string().min(1, "Name is required").max(32, "Name must be 32 characters or less"),
  description: z.string().optional(),
  logoFile: z.instanceof(File, { message: "Logo image is required" }),
  totalSupply: z.number().min(1, "Total supply is required"),
  initialMarketCap: z.number().min(1, "Initial market cap is required"),
  marketCapRangeMax: z.number().min(1),
  lockedLiquidityPercentage: z.number().min(0).max(100).optional(),
  quoteTokenMint: z.string().optional(),
  feeSchedulerMode: z.enum(["market-cap-based", "time-based", "fixed"]).optional(),
  feeTokenMode: z.enum(["quoteOnly", "both"]).optional(),
  startingMarketCap: z.number().min(1).optional(),
  endingMarketCap: z.number().min(1).optional(),
  feeStartRate: z.number().min(0.01).max(99).optional(),
  feeEndRate: z.number().min(0.01).max(99).optional(),
  feeMarketCapStartRate: z.number().min(0.01).max(99).optional(),
  feeMarketCapEndRate: z.number().min(0.01).max(99).optional(),
  feeDurationHours: z.number().min(1).optional(),
  feeFixedRate: z.number().min(0.01).max(99).optional(),
  enableTimedLaunch: z.boolean(),
  launchDateTime: z.date().nullable().optional(),
  enableCustomPrivateKey: z.boolean(),
  customPrivateKey: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  twitterUrl: z.string().url().optional().or(z.literal("")),
  telegramUrl: z.string().url().optional().or(z.literal("")),
  discordUrl: z.string().url().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (data.enableCustomPrivateKey) {
    const privateKey = data.customPrivateKey?.trim();
    if (!privateKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Private key is required when custom key is enabled",
        path: ["customPrivateKey"],
      });
      return;
    }
    const result = validateAndParsePrivateKey(privateKey);
    if (!result.isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error || "Invalid private key format",
        path: ["customPrivateKey"],
      });
    }
  }

  // Market cap range validation
  validateMarketCapRange(data.initialMarketCap, data.marketCapRangeMax).forEach((err) => {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: err.message, path: [err.field as "initialMarketCap" | "marketCapRangeMax"] });
  });

  // Fee scheduler market cap validation (when mode is market-cap-based)
  if (data.feeSchedulerMode === "market-cap-based") {
    validateFeeSchedulerMarketCap(
      data.startingMarketCap ?? 0,
      data.endingMarketCap ?? 0,
      data.initialMarketCap,
      data.marketCapRangeMax
    ).forEach((err) => {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: err.message, path: [err.field as "startingMarketCap" | "endingMarketCap"] });
    });

    if ((data.feeMarketCapEndRate ?? 0) > (data.feeMarketCapStartRate ?? 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ending fee rate must be less than or equal to starting fee rate",
        path: ["feeMarketCapEndRate"],
      });
    }
  }

  // Fee scheduler time-based validation
  if (data.feeSchedulerMode === "time-based") {
    if ((data.feeEndRate ?? 0) > (data.feeStartRate ?? 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ending fee rate must be less than or equal to starting fee rate",
        path: ["feeEndRate"],
      });
    }
  }
});

export type TokenFormSchemaType = z.infer<typeof tokenFormSchema>;

export const TOKEN_FORM_DEFAULTS = {
  totalSupply: DEFAULT_LAUNCH_PARAMS.totalSupply,
  initialMarketCap: DEFAULT_LAUNCH_PARAMS.initialMarketCap,
  marketCapRangeMax: DEFAULT_LAUNCH_PARAMS.marketCapRangeMax,
  lockedLiquidityPercentage: DEFAULT_LAUNCH_PARAMS.lockedLiquidityPercentage,
  quoteTokenMint: DEFAULT_LAUNCH_PARAMS.quoteTokenMint,
  feeSchedulerMode: DEFAULT_LAUNCH_PARAMS.feeSchedulerMode,
  feeTokenMode: DEFAULT_LAUNCH_PARAMS.feeTokenMode,
  startingMarketCap: DEFAULT_LAUNCH_PARAMS.startingMarketCap,
  endingMarketCap: DEFAULT_LAUNCH_PARAMS.endingMarketCap,
  feeStartRate: DEFAULT_LAUNCH_PARAMS.feeStartPercent,
  feeEndRate: DEFAULT_LAUNCH_PARAMS.feeEndPercent,
  feeMarketCapStartRate: DEFAULT_LAUNCH_PARAMS.feeMarketCapStartPercent,
  feeMarketCapEndRate: DEFAULT_LAUNCH_PARAMS.feeMarketCapEndPercent,
  feeDurationHours: 1,
  feeFixedRate: DEFAULT_LAUNCH_PARAMS.feeFixedPercent,
  enableTimedLaunch: false,
  enableCustomPrivateKey: false,
} as const;
