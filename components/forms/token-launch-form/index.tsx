"use client";

import { Button } from "@/components/ui/button";
import { TokenFormData } from "@/types/token";
import { useTokenLaunchForm } from "./useTokenLaunchForm";
import { TokenInfoSection } from "./TokenInfoSection";
import { SocialLinksSection } from "./SocialLinksSection";
import { LaunchParamsSection } from "./LaunchParamsSection";
import { FeeScheduleSection } from "./FeeScheduleSection";
import { LaunchTimeSection } from "./LaunchTimeSection";
import { CustomCASection } from "./CustomCASection";
import { LaunchConfirmModal } from "./LaunchConfirmModal";

interface TokenLaunchFormProps {
  onSubmit: (data: TokenFormData) => void;
  isLoading?: boolean;
}

export function TokenLaunchForm({ onSubmit, isLoading = false }: TokenLaunchFormProps) {
  const form = useTokenLaunchForm({ onSubmit });

  // Collect every error currently blocking submission so the Launch Token
  // button can surface them via a hover tooltip when it is disabled.
  // `allFieldErrors` merges zod field errors with computed cross-field
  // errors (market cap range, fee scheduler, etc.); the file-size warning
  // is tracked separately and also disables the button, so include it.
  // Errors are ordered to match the form's top-to-bottom field layout so
  // the tooltip reads in the same order the user fills out the form.
  const FIELD_ORDER = [
    "symbol",
    "name",
    "logoFile", // fileSizeWarning is emitted alongside this field
    "description",
    "websiteUrl",
    "twitterUrl",
    "telegramUrl",
    "discordUrl",
    "totalSupply",
    "quoteTokenMint",
    "initialMarketCap",
    "marketCapRangeMax",
    "lockedLiquidityPercentage",
    "feeSchedulerMode",
    "feeTokenMode",
    "feeFixedRate",
    "startingMarketCap",
    "endingMarketCap",
    "feeMarketCapStartRate",
    "feeMarketCapEndRate",
    "feeDurationHours",
    "feeStartRate",
    "feeEndRate",
    "launchDateTime",
    "customPrivateKey",
  ] as const;

  const blockingErrors: string[] = [];
  const seenFields = new Set<string>();
  for (const field of FIELD_ORDER) {
    if (field === "logoFile" && form.fileSizeWarning) {
      // File-size warning renders just above the logoFile error in the form.
      blockingErrors.push(form.fileSizeWarning);
    }
    const message = form.allFieldErrors[field];
    if (message) {
      blockingErrors.push(message);
      seenFields.add(field);
    }
  }
  // Append any leftover errors not covered by FIELD_ORDER (defensive).
  for (const [field, message] of Object.entries(form.allFieldErrors)) {
    if (!seenFields.has(field)) blockingErrors.push(message);
  }

  const isDisabled = isLoading || !form.isFormValid || !form.formState.isValid || form.isValidating;
  const showErrorsTooltip = !isLoading && !form.isValidating && isDisabled && blockingErrors.length > 0;

  return (
    <form onSubmit={form.handleSubmit(form.handleFormSubmit)} className="space-y-6">
      <TokenInfoSection
        register={form.register}
        errors={form.formState.errors}
        isLoading={isLoading}
        logoPreview={form.logoPreview}
        fileSizeWarning={form.fileSizeWarning}
        handleLogoChange={form.handleLogoChange}
      />

      <SocialLinksSection
        register={form.register}
        errors={form.formState.errors}
        isLoading={isLoading}
      />

      <LaunchParamsSection
        control={form.control}
        errors={form.formState.errors}
        isLoading={isLoading}
        watchedQuoteToken={form.watchedQuoteToken}
        watchedLocked={form.watchedLocked}
        allFieldErrors={form.allFieldErrors}
        isModified={form.isModified}
        isLowLockedLiquidity={form.isLowLockedLiquidity}
        resetLaunchParams={form.resetLaunchParams}
        watchedSupply={form.watchedSupply}
        watchedInitialMcap={form.watchedInitialMcap}
        watchedMax={form.watchedMax}
        solUsdPrice={form.solUsdPrice}
      />

      <FeeScheduleSection
        control={form.control}
        isLoading={isLoading}
        watchedQuoteToken={form.watchedQuoteToken}
        watchedFeeMode={form.watchedFeeMode}
        symbol={form.symbol}
        allFieldErrors={form.allFieldErrors}
        isFeeModified={form.isFeeModified}
        resetFeeSchedule={form.resetFeeSchedule}
        watchedFeeMcapStartRate={form.watchedFeeMcapStartRate}
        watchedFeeMcapEndRate={form.watchedFeeMcapEndRate}
        watchedTimeStartRate={form.watchedTimeStartRate}
        watchedTimeEndRate={form.watchedTimeEndRate}
        watchedFeeDuration={form.watchedFeeDuration}
        watchedFeeFixed={form.watchedFeeFixed}
        watchedSupply={form.watchedSupply}
        watchedStartMcap={form.watchedStartMcap}
        watchedEndMcap={form.watchedEndMcap}
        solUsdPrice={form.solUsdPrice}
      />

      <LaunchTimeSection
        register={form.register}
        isLoading={isLoading}
        enableTimedLaunch={form.enableTimedLaunch}
        setEnableTimedLaunch={form.setEnableTimedLaunch}
        launchDate={form.launchDate}
        setLaunchDate={form.setLaunchDate}
        launchHour={form.launchHour}
        setLaunchHour={form.setLaunchHour}
        launchMinute={form.launchMinute}
        setLaunchMinute={form.setLaunchMinute}
        launchPeriod={form.launchPeriod}
        setLaunchPeriod={form.setLaunchPeriod}
        updateDateTime={form.updateDateTime}
        getLocalDateString={form.getLocalDateString}
      />

      <CustomCASection
        register={form.register}
        errors={form.formState.errors}
        isLoading={isLoading}
        enableCustomPrivateKey={form.enableCustomPrivateKey}
        setEnableCustomPrivateKey={form.setEnableCustomPrivateKey}
      />

      <LaunchConfirmModal
        open={form.showConfirmModal}
        onOpenChange={form.setShowConfirmModal}
        isLoading={isLoading}
        onConfirm={form.confirmLaunch}
        onCancel={() => {
          form.setShowConfirmModal(false);
          // pendingSubmitData is cleared inside confirmLaunch or we can leave it
        }}
        buildConfirmContent={form.buildConfirmContent}
      />

      <div className="group relative w-full">
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isDisabled}
          aria-describedby={showErrorsTooltip ? "launch-token-errors" : undefined}
        >
          {isLoading || form.isValidating ? "Loading..." : "Launch Token"}
        </Button>
        {showErrorsTooltip && (
          <div
            role="tooltip"
            id="launch-token-errors"
            className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-80 -translate-x-1/2 rounded-md border border-amber-400/70 bg-zinc-900 p-3 shadow-lg shadow-black/30 opacity-0 transition-opacity duration-150 group-hover:opacity-100 dark:border-amber-300/60 dark:bg-black"
          >
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-white dark:text-white">
              Resolve before launching
            </p>
            <ul className="list-disc space-y-1 pl-4 text-sm font-medium text-red-500 dark:text-red-400">
              {blockingErrors.map((message, idx) => (
                <li key={idx}>{message}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </form>
  );
}
