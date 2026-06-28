"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TokenFormData } from "@/types/token";
import { FeeSchedulerConfig } from "@/types/fee";
import { getMaxImageSizeBytes, getMaxImageSizeMB } from "@/lib/services/ipfsService";
import { DEFAULT_LAUNCH_PARAMS, getQuoteTokenMarketCapDefaults } from "@/config/defaults";
import { validateMarketCapRange, validateFeeSchedulerMarketCap, type ValidationError } from "@/lib/validation/feeScheduler";
import { tokenFormSchema, type TokenFormSchemaType, TOKEN_FORM_DEFAULTS } from "./schema";

export interface UseTokenLaunchFormProps {
  onSubmit: (data: TokenFormData) => void;
}

export interface ConfirmSection {
  title: string;
  items: { label: string; value: string }[];
}

export function useTokenLaunchForm({ onSubmit }: UseTokenLaunchFormProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [fileSizeWarning, setFileSizeWarning] = useState<string | null>(null);
  const [enableTimedLaunch, setEnableTimedLaunch] = useState(false);
  const [enableCustomPrivateKey, setEnableCustomPrivateKey] = useState(false);
  const [launchDate, setLaunchDate] = useState<string>("");
  const [launchHour, setLaunchHour] = useState<string>("");
  const [launchMinute, setLaunchMinute] = useState<string>("");
  const [launchPeriod, setLaunchPeriod] = useState<"AM" | "PM">("AM");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<TokenFormSchemaType | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // ── SOL/USD price (proxied through /api/price/sol so the Jupiter API key
  // is never exposed to the browser). Cached in-component for 5 minutes.
  const [solUsdPrice, setSolUsdPrice] = useState<number | null>(null);
  const solPriceFetchedAt = useRef<number>(0);
  const SOL_PRICE_CACHE_MS = 5 * 60 * 1000;

  useEffect(() => {
    let cancelled = false;
    const lastFetchAge = Date.now() - solPriceFetchedAt.current;
    if (lastFetchAge < SOL_PRICE_CACHE_MS && solPriceFetchedAt.current !== 0) {
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/price/sol");
        if (!res.ok) return;
        const data = (await res.json()) as { price: number | null };
        if (!cancelled && typeof data.price === "number") {
          setSolUsdPrice(data.price);
          solPriceFetchedAt.current = Date.now();
        }
      } catch {
        // Silent failure — the form just won't show a USD equivalent.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    control,
    setValue,
    watch,
    trigger,
    getValues,
    setError,
  } = useForm<TokenFormSchemaType>({
    resolver: zodResolver(tokenFormSchema),
    mode: "onChange",
    shouldUnregister: false,
    defaultValues: TOKEN_FORM_DEFAULTS,
  });

  const logoFile = watch("logoFile");
  const symbol = watch("symbol");
  const name = watch("name");

  const watchedSupply = watch("totalSupply");
  const watchedInitialMcap = watch("initialMarketCap");
  const watchedMax = watch("marketCapRangeMax");
  const watchedLocked = watch("lockedLiquidityPercentage");
  const watchedQuoteToken = watch("quoteTokenMint");
  const watchedFeeMode = watch("feeSchedulerMode");
  const watchedFeeToken = watch("feeTokenMode");
  const watchedStartMcap = watch("startingMarketCap");
  const watchedEndMcap = watch("endingMarketCap");
  const watchedFeeMcapStartRate = watch("feeMarketCapStartRate");
  const watchedFeeMcapEndRate = watch("feeMarketCapEndRate");
  const watchedTimeStartRate = watch("feeStartRate");
  const watchedTimeEndRate = watch("feeEndRate");
  const watchedFeeDuration = watch("feeDurationHours");
  const watchedFeeFixed = watch("feeFixedRate");

  // ── Per-quote-token market cap memory ──────────────────────────────────
  // When the user switches the quote token (SOL <-> USDC), we swap the
  // market cap fields to the *other* token's last-used values (or that
  // token's defaults on first use). This way flipping back and forth
  // preserves each token's market cap settings independently.
  const quoteTokenMemory = useRef<Record<string, {
    initialMarketCap: number;
    marketCapRangeMax: number;
    startingMarketCap: number;
    endingMarketCap: number;
  }>>({});

  const lastQuoteTokenRef = useRef<string | undefined>(watchedQuoteToken);
  const quoteTokenChangeInitRef = useRef(false);

  useEffect(() => {
    // Initialize memory for the starting quote token on first run.
    if (!quoteTokenChangeInitRef.current) {
      quoteTokenChangeInitRef.current = true;
      const mint = watchedQuoteToken ?? DEFAULT_LAUNCH_PARAMS.quoteTokenMint;
      quoteTokenMemory.current[mint] = {
        initialMarketCap: watchedInitialMcap ?? DEFAULT_LAUNCH_PARAMS.initialMarketCap,
        marketCapRangeMax: watchedMax ?? DEFAULT_LAUNCH_PARAMS.marketCapRangeMax,
        startingMarketCap: watchedStartMcap ?? DEFAULT_LAUNCH_PARAMS.startingMarketCap,
        endingMarketCap: watchedEndMcap ?? DEFAULT_LAUNCH_PARAMS.endingMarketCap,
      };
      lastQuoteTokenRef.current = mint;
      return;
    }

    const prevMint = lastQuoteTokenRef.current;
    const newMint = watchedQuoteToken ?? DEFAULT_LAUNCH_PARAMS.quoteTokenMint;
    if (prevMint === newMint) return;

    // Persist the outgoing token's current market cap values.
    quoteTokenMemory.current[prevMint ?? DEFAULT_LAUNCH_PARAMS.quoteTokenMint] = {
      initialMarketCap: watchedInitialMcap ?? DEFAULT_LAUNCH_PARAMS.initialMarketCap,
      marketCapRangeMax: watchedMax ?? DEFAULT_LAUNCH_PARAMS.marketCapRangeMax,
      startingMarketCap: watchedStartMcap ?? DEFAULT_LAUNCH_PARAMS.startingMarketCap,
      endingMarketCap: watchedEndMcap ?? DEFAULT_LAUNCH_PARAMS.endingMarketCap,
    };

    // Restore (or initialize) the incoming token's market cap values.
    const remembered = quoteTokenMemory.current[newMint];
    const defaults = getQuoteTokenMarketCapDefaults(newMint);
    const next = remembered ?? defaults;

    setValue("initialMarketCap", next.initialMarketCap, { shouldValidate: true, shouldDirty: true });
    setValue("marketCapRangeMax", next.marketCapRangeMax, { shouldValidate: true, shouldDirty: true });
    setValue("startingMarketCap", next.startingMarketCap, { shouldValidate: true, shouldDirty: true });
    setValue("endingMarketCap", next.endingMarketCap, { shouldValidate: true, shouldDirty: true });

    lastQuoteTokenRef.current = newMint;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedQuoteToken]);

  const isModified = useMemo(() => {
    const qDefaults = getQuoteTokenMarketCapDefaults(watchedQuoteToken);
    return (
      watchedSupply !== DEFAULT_LAUNCH_PARAMS.totalSupply ||
      watchedInitialMcap !== qDefaults.initialMarketCap ||
      watchedMax !== qDefaults.marketCapRangeMax ||
      watchedStartMcap !== qDefaults.startingMarketCap ||
      watchedEndMcap !== qDefaults.endingMarketCap ||
      watchedLocked !== DEFAULT_LAUNCH_PARAMS.lockedLiquidityPercentage ||
      watchedQuoteToken !== DEFAULT_LAUNCH_PARAMS.quoteTokenMint
    );
  }, [watchedSupply, watchedInitialMcap, watchedMax, watchedStartMcap, watchedEndMcap, watchedLocked, watchedQuoteToken]);

  const isFeeModified = useMemo(() => {
    const qDefaults = getQuoteTokenMarketCapDefaults(watchedQuoteToken);
    return (
      watchedFeeMode !== DEFAULT_LAUNCH_PARAMS.feeSchedulerMode ||
      watchedFeeToken !== DEFAULT_LAUNCH_PARAMS.feeTokenMode ||
      watchedStartMcap !== qDefaults.startingMarketCap ||
      watchedEndMcap !== qDefaults.endingMarketCap ||
      watchedTimeStartRate !== DEFAULT_LAUNCH_PARAMS.feeStartPercent ||
      watchedTimeEndRate !== DEFAULT_LAUNCH_PARAMS.feeEndPercent ||
      watchedFeeMcapStartRate !== DEFAULT_LAUNCH_PARAMS.feeMarketCapStartPercent ||
      watchedFeeMcapEndRate !== DEFAULT_LAUNCH_PARAMS.feeMarketCapEndPercent ||
      (watchedFeeDuration ?? 1) !== 1 ||
      watchedFeeFixed !== DEFAULT_LAUNCH_PARAMS.feeFixedPercent
    );
  }, [
    watchedFeeMode, watchedFeeToken, watchedStartMcap, watchedEndMcap,
    watchedTimeStartRate, watchedTimeEndRate, watchedFeeMcapStartRate,
    watchedFeeMcapEndRate, watchedFeeDuration, watchedFeeFixed, watchedQuoteToken,
  ]);

  const isLowLockedLiquidity = useMemo(() => {
    return (watchedLocked ?? 100) < 90;
  }, [watchedLocked]);

  // Computed every render for instant UI feedback
  const marketCapErrors = validateMarketCapRange(watchedInitialMcap, watchedMax);

  let feeSchedErrors: ValidationError[] = [];
  if (watchedFeeMode === "market-cap-based") {
    feeSchedErrors = validateFeeSchedulerMarketCap(
      watchedStartMcap ?? 0, watchedEndMcap ?? 0,
      watchedInitialMcap, watchedMax
    );
    if ((watchedFeeMcapEndRate ?? 0) > (watchedFeeMcapStartRate ?? 0)) {
      feeSchedErrors.push({ field: "feeMarketCapEndRate", message: "Ending fee rate must be less than or equal to starting fee rate" });
    }
  } else if (watchedFeeMode === "time-based") {
    if ((watchedTimeEndRate ?? 0) > (watchedTimeStartRate ?? 0)) {
      feeSchedErrors.push({ field: "feeEndRate", message: "Ending fee rate must be less than or equal to starting fee rate" });
    }
  }

  const isFormValid = !!(symbol && name && logoFile && !fileSizeWarning);

  // Merge Zod errors + computed cross-field errors.
  // Cross-field errors take priority (they are more specific than Zod's generic .min(1)).
  const allFieldErrors: Record<string, string> = {};
  marketCapErrors.forEach(e => { allFieldErrors[e.field] = e.message; });
  feeSchedErrors.forEach(e => { allFieldErrors[e.field] = e.message; });
  for (const [key, val] of Object.entries(errors)) {
    if (!allFieldErrors[key] && val?.message) allFieldErrors[key] = String(val.message);
  }

  const getLocalDateString = useCallback((date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const updateDateTime = useCallback((dateStr: string, hourStr: string, minuteStr: string, period: "AM" | "PM") => {
    if (!dateStr || hourStr === "" || minuteStr === "") return;
    const hour = parseInt(hourStr);
    const minute = parseInt(minuteStr);
    if (isNaN(hour) || isNaN(minute) || hour < 1 || hour > 12 || minute < 0 || minute > 59) return;

    let hour24 = hour;
    if (period === "AM") { if (hour === 12) hour24 = 0; }
    else { if (hour !== 12) hour24 = hour + 12; }

    const [year, month, day] = dateStr.split("-").map(Number);
    const newDate = new Date(year, month - 1, day, hour24, minute, 0, 0);
    if (newDate < new Date()) return;
    setValue("launchDateTime", newDate);
  }, [setValue]);

  const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = getMaxImageSizeBytes();
      const maxSizeMB = getMaxImageSizeMB();
      if (file.size > maxSize) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        setFileSizeWarning(`Warning: File size is ${fileSizeMB}MB. Maximum allowed size is ${maxSizeMB}MB.`);
        setLogoPreview(null);
        return;
      }
      setFileSizeWarning(null);
      setValue("logoFile", file, { shouldValidate: true });
      trigger("logoFile");
      const reader = new FileReader();
      reader.onloadend = () => { setLogoPreview(reader.result as string); };
      reader.readAsDataURL(file);
    }
  }, [setValue, trigger]);

  const handleFormSubmit = useCallback(async (data: TokenFormSchemaType) => {
    setIsValidating(true);
    try {
      const response = await fetch("/api/tokens/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();

      if (result.valid === false && result.errors) {
        Object.entries(result.errors).forEach(([field, message]) => {
          setError(field as keyof TokenFormSchemaType, { type: "server", message: message as string }, { shouldFocus: false });
        });
        setIsValidating(false);
        return;
      }

      setPendingSubmitData(data);
      setShowConfirmModal(true);
    } catch {
      setError("symbol", { type: "server", message: "Unable to validate. Please check your connection and try again." });
    } finally {
      setIsValidating(false);
    }
  }, [setError]);

  const buildConfirmContent = useCallback((): ConfirmSection[] => {
    const values = getValues();
    const qDefaults = getQuoteTokenMarketCapDefaults(values.quoteTokenMint);
    const sections: ConfirmSection[] = [];

    const addSection = (title: string, pairs: [string, string | number | undefined][]) => {
      const items = pairs
        .map(([label, val]) => ({ label, value: val !== undefined && val !== "" ? String(val) : undefined }))
        .filter((item): item is { label: string; value: string } => item.value !== undefined);
      if (items.length > 0) sections.push({ title, items });
    };

    addSection("Token Information", [
      ["Symbol", values.symbol],
      ["Name", values.name],
      ["Description", values.description],
    ]);

    addSection("Launch Parameters", [
      ["Total Supply", values.totalSupply !== DEFAULT_LAUNCH_PARAMS.totalSupply ? new Intl.NumberFormat().format(values.totalSupply) : undefined],
      ["Initial Market Cap", values.initialMarketCap !== qDefaults.initialMarketCap ? values.initialMarketCap : undefined],
      ["Market Cap Range", values.marketCapRangeMax !== qDefaults.marketCapRangeMax ? `${values.initialMarketCap} – ${values.marketCapRangeMax}` : undefined],
      ["Locked Liquidity", values.lockedLiquidityPercentage !== DEFAULT_LAUNCH_PARAMS.lockedLiquidityPercentage ? `${values.lockedLiquidityPercentage}%` : undefined],
      ["Quote Token", values.quoteTokenMint !== DEFAULT_LAUNCH_PARAMS.quoteTokenMint ? (values.quoteTokenMint === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" ? "USDC" : "SOL") : undefined],
    ]);

    addSection("Fee Configuration", [
      ["Fee Mode", values.feeSchedulerMode !== DEFAULT_LAUNCH_PARAMS.feeSchedulerMode ? values.feeSchedulerMode : undefined],
      ["Fee Token Mode", values.feeTokenMode !== DEFAULT_LAUNCH_PARAMS.feeTokenMode ? values.feeTokenMode : undefined],
      ["Starting Market Cap", values.startingMarketCap !== qDefaults.startingMarketCap ? values.startingMarketCap : undefined],
      ["Ending Market Cap", values.endingMarketCap !== qDefaults.endingMarketCap ? values.endingMarketCap : undefined],
      ["Fee Start Rate", values.feeStartRate !== DEFAULT_LAUNCH_PARAMS.feeStartPercent ? `${values.feeStartRate}%` : undefined],
      ["Fee End Rate", values.feeEndRate !== DEFAULT_LAUNCH_PARAMS.feeEndPercent ? `${values.feeEndRate}%` : undefined],
      ["Fee Duration (hrs)", values.feeDurationHours !== 1 ? values.feeDurationHours : undefined],
      ["Fixed Fee Rate", values.feeFixedRate !== DEFAULT_LAUNCH_PARAMS.feeFixedPercent ? `${values.feeFixedRate}%` : undefined],
    ]);

    return sections;
  }, [getValues]);

  const confirmLaunch = useCallback(() => {
    if (!pendingSubmitData) return;

    let feeSchedulerConfig: FeeSchedulerConfig;
    if (pendingSubmitData.feeSchedulerMode === "market-cap-based") {
      feeSchedulerConfig = {
        mode: "market-cap-based",
        startingMarketCap: pendingSubmitData.startingMarketCap ?? DEFAULT_LAUNCH_PARAMS.startingMarketCap,
        endingMarketCap: pendingSubmitData.endingMarketCap ?? DEFAULT_LAUNCH_PARAMS.endingMarketCap,
        feeMarketCapStartRatePercent: pendingSubmitData.feeMarketCapStartRate ?? DEFAULT_LAUNCH_PARAMS.feeMarketCapStartPercent,
        feeMarketCapEndRatePercent: pendingSubmitData.feeMarketCapEndRate ?? DEFAULT_LAUNCH_PARAMS.feeMarketCapEndPercent,
      };
    } else if (pendingSubmitData.feeSchedulerMode === "time-based") {
      feeSchedulerConfig = {
        mode: "time-based",
        startRatePercent: pendingSubmitData.feeStartRate ?? DEFAULT_LAUNCH_PARAMS.feeStartPercent,
        endRatePercent: pendingSubmitData.feeEndRate ?? DEFAULT_LAUNCH_PARAMS.feeEndPercent,
        durationMinutes: (pendingSubmitData.feeDurationHours ?? 1) * 60,
      };
    } else {
      feeSchedulerConfig = {
        mode: "fixed",
        baseFeePercent: pendingSubmitData.feeFixedRate ?? DEFAULT_LAUNCH_PARAMS.feeFixedPercent,
      };
    }

    const formData: TokenFormData = {
      symbol: pendingSubmitData.symbol,
      name: pendingSubmitData.name,
      description: pendingSubmitData.description,
      logoFile: pendingSubmitData.logoFile,
      feeSchedulerConfig,
      feeTokenMode: pendingSubmitData.feeTokenMode ?? DEFAULT_LAUNCH_PARAMS.feeTokenMode,
      totalSupply: pendingSubmitData.totalSupply,
      initialMarketCap: pendingSubmitData.initialMarketCap,
      marketCapRangeMax: pendingSubmitData.marketCapRangeMax,
      lockedLiquidityPercentage: pendingSubmitData.lockedLiquidityPercentage ?? DEFAULT_LAUNCH_PARAMS.lockedLiquidityPercentage,
      quoteTokenMint: pendingSubmitData.quoteTokenMint ?? DEFAULT_LAUNCH_PARAMS.quoteTokenMint,
      enableTimedLaunch: pendingSubmitData.enableTimedLaunch,
      launchDateTime: pendingSubmitData.launchDateTime ?? null,
      enableCustomPrivateKey: pendingSubmitData.enableCustomPrivateKey,
      customPrivateKey: pendingSubmitData.customPrivateKey,
      websiteUrl: pendingSubmitData.websiteUrl,
      twitterUrl: pendingSubmitData.twitterUrl,
      telegramUrl: pendingSubmitData.telegramUrl,
      discordUrl: pendingSubmitData.discordUrl,
    };
    onSubmit(formData);
    setShowConfirmModal(false);
    setPendingSubmitData(null);
  }, [pendingSubmitData, onSubmit]);

  const resetLaunchParams = useCallback(() => {
    const qDefaults = getQuoteTokenMarketCapDefaults(watchedQuoteToken);
    const mint = watchedQuoteToken ?? DEFAULT_LAUNCH_PARAMS.quoteTokenMint;
    setValue("totalSupply", DEFAULT_LAUNCH_PARAMS.totalSupply);
    setValue("initialMarketCap", qDefaults.initialMarketCap);
    setValue("marketCapRangeMax", qDefaults.marketCapRangeMax);
    setValue("lockedLiquidityPercentage", DEFAULT_LAUNCH_PARAMS.lockedLiquidityPercentage);
    setValue("quoteTokenMint", DEFAULT_LAUNCH_PARAMS.quoteTokenMint);
    setValue("startingMarketCap", qDefaults.startingMarketCap);
    setValue("endingMarketCap", qDefaults.endingMarketCap);
    quoteTokenMemory.current[mint] = qDefaults;
    trigger();
  }, [setValue, trigger, watchedQuoteToken]);

  const resetFeeSchedule = useCallback(() => {
    const qDefaults = getQuoteTokenMarketCapDefaults(watchedQuoteToken);
    setValue("feeSchedulerMode", DEFAULT_LAUNCH_PARAMS.feeSchedulerMode);
    setValue("feeTokenMode", DEFAULT_LAUNCH_PARAMS.feeTokenMode);
    setValue("startingMarketCap", qDefaults.startingMarketCap);
    setValue("endingMarketCap", qDefaults.endingMarketCap);
    setValue("feeStartRate", DEFAULT_LAUNCH_PARAMS.feeStartPercent);
    setValue("feeEndRate", DEFAULT_LAUNCH_PARAMS.feeEndPercent);
    setValue("feeMarketCapStartRate", DEFAULT_LAUNCH_PARAMS.feeMarketCapStartPercent);
    setValue("feeMarketCapEndRate", DEFAULT_LAUNCH_PARAMS.feeMarketCapEndPercent);
    setValue("feeDurationHours", 1);
    setValue("feeFixedRate", DEFAULT_LAUNCH_PARAMS.feeFixedPercent);
    trigger();
  }, [setValue, trigger, watchedQuoteToken]);

  return {
    // Form
    register,
    handleSubmit,
    formState: { errors, isValid },
    control,
    setValue,
    watch,
    trigger,
    getValues,
    setError,

    // Logo
    logoPreview,
    fileSizeWarning,
    handleLogoChange,

    // Launch params UI state
    isModified,
    isLowLockedLiquidity,
    resetLaunchParams,

    // Fee schedule UI state
    isFeeModified,
    resetFeeSchedule,

    // Timed launch
    enableTimedLaunch,
    setEnableTimedLaunch,
    launchDate,
    setLaunchDate,
    launchHour,
    setLaunchHour,
    launchMinute,
    setLaunchMinute,
    launchPeriod,
    setLaunchPeriod,
    updateDateTime,
    getLocalDateString,

    // Custom CA
    enableCustomPrivateKey,
    setEnableCustomPrivateKey,

    // Validation / errors
    isFormValid,
    allFieldErrors,
    marketCapErrors,
    feeSchedErrors,

    // Confirmation
    showConfirmModal,
    setShowConfirmModal,
    confirmLaunch,
    buildConfirmContent,

    // Submit
    handleFormSubmit,
    isValidating,

    // Watched values for sections
    watchedQuoteToken,
    watchedLocked,
    watchedFeeMode,
    symbol,
    logoFile,

    // Watched values for launch params
    watchedInitialMcap,
    watchedMax,
    solUsdPrice,

    // Watched fee schedule values (for live chart preview)
    watchedStartMcap,
    watchedEndMcap,
    watchedFeeMcapStartRate,
    watchedFeeMcapEndRate,
    watchedTimeStartRate,
    watchedTimeEndRate,
    watchedFeeDuration,
    watchedFeeFixed,
    watchedSupply,
  };
}
