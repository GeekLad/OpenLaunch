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

      <Button type="submit" size="lg" className="w-full" disabled={isLoading || !form.isFormValid || !form.formState.isValid || form.isValidating}>
        {isLoading || form.isValidating ? "Loading..." : "Launch Token"}
      </Button>
    </form>
  );
}
