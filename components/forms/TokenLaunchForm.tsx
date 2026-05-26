"use client";

import { useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";
import { TokenFormData } from "@/types/token";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { getMaxImageSizeBytes, getMaxImageSizeMB } from "@/lib/services/ipfsService";
import { FeeSchedulerConfig } from "@/types/fee";
import { DEFAULT_LAUNCH_PARAMS } from "@/config/defaults";
import { validateAndParsePrivateKey } from "@/lib/utils/keypairUtils";
import { cn } from "@/lib/utils";

const tokenFormSchema = z.object({
  symbol: z.string().min(1, "Symbol is required").max(10, "Symbol must be 10 characters or less"),
  name: z.string().min(1, "Name is required").max(32, "Name must be 32 characters or less"),
  description: z.string().optional(),
  logoFile: z.instanceof(File, { message: "Logo image is required" }),
  totalSupply: z.number().min(1, "Total supply is required"),
  initialPrice: z.number().min(0, "Initial price is required"),
  priceRangeMin: z.number().min(0),
  priceRangeMax: z.number().min(0),
  holdbackPercentage: z.number().min(0).max(100).optional(),
  quoteTokenMint: z.string().optional(),
  feeSchedulerMode: z.enum(['market-cap-based', 'time-based', 'fixed']).optional(),
  feeTokenMode: z.enum(['quoteOnly', 'both']).optional(),
  startingMarketCap: z.number().min(0).optional(),
  endingMarketCap: z.number().min(0).optional(),
  feeStartRate: z.number().min(1).max(9900).optional(),
  feeEndRate: z.number().min(1).max(9900).optional(),
  feeMarketCapStartRate: z.number().min(1).max(9900).optional(),
  feeMarketCapEndRate: z.number().min(1).max(9900).optional(),
  feeDurationHours: z.number().min(1).optional(),
  feeFixedRate: z.number().min(1).max(9900).optional(),
  enableTimedLaunch: z.boolean(),
  launchDateTime: z.date().nullable().optional(),
  enableCustomPrivateKey: z.boolean(),
  customPrivateKey: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  twitterUrl: z.string().url().optional().or(z.literal("")),
  telegramUrl: z.string().url().optional().or(z.literal("")),
  discordUrl: z.string().url().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  // Validate custom private key only if enabled
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

  // Price range validation: min < initial < max
  if (data.priceRangeMin >= data.initialPrice) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Minimum price must be less than initial price",
      path: ["priceRangeMin"],
    });
  }
  if (data.initialPrice >= data.priceRangeMax) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Initial price must be less than maximum price",
      path: ["priceRangeMax"],
    });
  }
  if (data.priceRangeMin >= data.priceRangeMax) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Minimum price must be less than maximum price",
      path: ["priceRangeMin"],
    });
  }

});

type TokenFormSchemaType = z.infer<typeof tokenFormSchema>;

interface TokenLaunchFormProps {
  onSubmit: (data: TokenFormData) => void;
  isLoading?: boolean;
}

export function TokenLaunchForm({ onSubmit, isLoading = false }: TokenLaunchFormProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [fileSizeWarning, setFileSizeWarning] = useState<string | null>(null);
  const [enableTimedLaunch, setEnableTimedLaunch] = useState(false);
  const [enableCustomPrivateKey, setEnableCustomPrivateKey] = useState(false);
  const [launchDate, setLaunchDate] = useState<string>("");
  const [launchHour, setLaunchHour] = useState<string>("");
  const [launchMinute, setLaunchMinute] = useState<string>("");
  const [launchPeriod, setLaunchPeriod] = useState<"AM" | "PM">("AM");
  const [isLaunchParamsOpen, setIsLaunchParamsOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<TokenFormSchemaType | null>(null);
  const [isValidating, setIsValidating] = useState(false);

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
    mode: "onBlur",
    shouldUnregister: false,
    defaultValues: {
      totalSupply: DEFAULT_LAUNCH_PARAMS.totalSupply,
      initialPrice: DEFAULT_LAUNCH_PARAMS.initialPrice,
      priceRangeMin: DEFAULT_LAUNCH_PARAMS.priceRangeMin,
      priceRangeMax: DEFAULT_LAUNCH_PARAMS.priceRangeMax,
      holdbackPercentage: DEFAULT_LAUNCH_PARAMS.holdbackPercentage,
      quoteTokenMint: DEFAULT_LAUNCH_PARAMS.quoteTokenMint,
      feeSchedulerMode: DEFAULT_LAUNCH_PARAMS.feeSchedulerMode,
      feeTokenMode: DEFAULT_LAUNCH_PARAMS.feeTokenMode,
      startingMarketCap: DEFAULT_LAUNCH_PARAMS.startingMarketCap,
      endingMarketCap: DEFAULT_LAUNCH_PARAMS.endingMarketCap,
      feeStartRate: DEFAULT_LAUNCH_PARAMS.feeStartRate,
      feeEndRate: DEFAULT_LAUNCH_PARAMS.feeEndRate,
      feeMarketCapStartRate: DEFAULT_LAUNCH_PARAMS.feeMarketCapStartRate,
      feeMarketCapEndRate: DEFAULT_LAUNCH_PARAMS.feeMarketCapEndRate,
      feeDurationHours: 1,
      feeFixedRate: DEFAULT_LAUNCH_PARAMS.baseFeeBps,
      enableTimedLaunch: false,
      enableCustomPrivateKey: false,
    },
  });

  const logoFile = watch("logoFile");
  const symbol = watch("symbol");
  const name = watch("name");

  const watchedSupply = watch("totalSupply");
  const watchedInitial = watch("initialPrice");
  const watchedMin = watch("priceRangeMin");
  const watchedMax = watch("priceRangeMax");
  const watchedHoldback = watch("holdbackPercentage");
  const watchedQuoteToken = watch("quoteTokenMint");
  const watchedFeeMode = watch("feeSchedulerMode");
  const watchedFeeToken = watch("feeTokenMode");

  const watchedStartingMarketCap = watch("startingMarketCap");
  const watchedEndingMarketCap = watch("endingMarketCap");
  const watchedFeeStartRate = watch("feeStartRate");
  const watchedFeeEndRate = watch("feeEndRate");
  const watchedFeeMarketCapStartRate = watch("feeMarketCapStartRate");
  const watchedFeeMarketCapEndRate = watch("feeMarketCapEndRate");

  const isModified = useMemo(() => {
    return (
      watchedSupply !== DEFAULT_LAUNCH_PARAMS.totalSupply ||
      watchedInitial !== DEFAULT_LAUNCH_PARAMS.initialPrice ||
      watchedMin !== DEFAULT_LAUNCH_PARAMS.priceRangeMin ||
      watchedMax !== DEFAULT_LAUNCH_PARAMS.priceRangeMax ||
      watchedHoldback !== DEFAULT_LAUNCH_PARAMS.holdbackPercentage ||
      watchedQuoteToken !== DEFAULT_LAUNCH_PARAMS.quoteTokenMint ||
      watchedFeeMode !== 'market-cap-based' ||
      watchedFeeToken !== 'quoteOnly'
    );
  }, [watchedSupply, watchedInitial, watchedMin, watchedMax, watchedHoldback, watchedQuoteToken, watchedFeeMode, watchedFeeToken]);

  const isHighHoldback = useMemo(() => {
    return (watchedHoldback ?? 0) > 10;
  }, [watchedHoldback]);

  // Compute price range errors directly from watched values —
  // bypasses react-hook-form's error system so they survive resolver re-runs
  const priceError = useMemo(() => {
    if (watchedMin >= watchedInitial) {
      return { field: "priceRangeMin", message: "Minimum price must be less than initial price" };
    }
    if (watchedMin >= watchedMax) {
      return { field: "priceRangeMin", message: "Minimum price must be less than maximum price" };
    }
    if (watchedInitial >= watchedMax) {
      return { field: "priceRangeMax", message: "Initial price must be less than maximum price" };
    }
    return null;
  }, [watchedMin, watchedInitial, watchedMax]);

  // Compute fee scheduler cross-field errors directly from watched values —
  // bypasses react-hook-form's error system so they survive resolver re-runs
  const feeSchedulerError = useMemo(() => {
    // Market-cap-based mode checks
    if (watchedFeeMode === 'market-cap-based') {
      if ((watchedEndingMarketCap ?? 0) <= (watchedStartingMarketCap ?? 0)) {
        return { field: "endingMarketCap", message: "Ending market cap must be greater than starting market cap" };
      }
      if ((watchedFeeMarketCapEndRate ?? 0) > (watchedFeeMarketCapStartRate ?? 0)) {
        return { field: "feeMarketCapEndRate", message: "Ending fee rate must be less than or equal to starting fee rate" };
      }
    }
    // Time-based mode checks
    if (watchedFeeMode === 'time-based') {
      if ((watchedFeeEndRate ?? 0) > (watchedFeeStartRate ?? 0)) {
        return { field: "feeEndRate", message: "Fee end rate must be less than or equal to fee start rate" };
      }
    }
    return null;
  }, [watchedFeeMode, watchedStartingMarketCap, watchedEndingMarketCap, watchedFeeStartRate, watchedFeeEndRate, watchedFeeMarketCapStartRate, watchedFeeMarketCapEndRate]);

  // Check if all required fields are filled
  const isFormValid = !!(symbol && name && logoFile && !fileSizeWarning);

  // Helper function to get local date string in YYYY-MM-DD format
  const getLocalDateString = (date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to update the datetime and validate it's not in the past
  const updateDateTime = (dateStr: string, hourStr: string, minuteStr: string, period: "AM" | "PM") => {
    if (!dateStr || hourStr === "" || minuteStr === "") {
      return;
    }

    const hour = parseInt(hourStr);
    const minute = parseInt(minuteStr);

    if (isNaN(hour) || isNaN(minute) || hour < 1 || hour > 12 || minute < 0 || minute > 59) {
      return;
    }

    // Convert 12-hour to 24-hour format
    let hour24 = hour;
    if (period === "AM") {
      if (hour === 12) hour24 = 0; // 12 AM is 00:00
    } else {
      if (hour !== 12) hour24 = hour + 12; // PM adds 12, except for 12 PM
    }

    const [year, month, day] = dateStr.split('-').map(Number);
    const newDate = new Date(year, month - 1, day, hour24, minute, 0, 0);

    // Check if the selected date/time is in the past
    const now = new Date();
    if (newDate < now) {
      // Don't set a date in the past
      return;
    }

    setValue("launchDateTime", newDate);
  };

  // Get minimum time values when today is selected (in 12-hour format)
  const getMinTime = () => {
    if (!launchDate) return { minHour: 1, minMinute: 0 };

    const today = getLocalDateString();
    if (launchDate === today) {
      const now = new Date();
      const currentHour24 = now.getHours();
      const currentMinute = now.getMinutes();

      // Convert current 24-hour to 12-hour
      let currentHour12 = currentHour24 % 12;
      if (currentHour12 === 0) currentHour12 = 12;
      const currentPeriod = currentHour24 >= 12 ? "PM" : "AM";

      // Convert selected 12-hour to 24-hour
      const selectedHour12 = parseInt(launchHour);
      if (isNaN(selectedHour12)) return { minHour: 1, minMinute: 0 };

      let selectedHour24 = selectedHour12;
      if (launchPeriod === "AM") {
        if (selectedHour12 === 12) selectedHour24 = 0;
      } else {
        if (selectedHour12 !== 12) selectedHour24 = selectedHour12 + 12;
      }

      // If selected period is before current period (AM when it's PM), no restriction
      if (launchPeriod === "AM" && currentPeriod === "PM") {
        return { minHour: 1, minMinute: 0 };
      }

      // If selected period is after current period (PM when it's AM), no restriction
      if (launchPeriod === "PM" && currentPeriod === "AM") {
        return { minHour: 1, minMinute: 0 };
      }

      // Same period - check the hour
      if (selectedHour24 === currentHour24) {
        return { minHour: currentHour12, minMinute: currentMinute + 1 };
      }

      if (selectedHour24 < currentHour24) {
        return { minHour: currentHour12, minMinute: 0 };
      }

      return { minHour: 1, minMinute: 0 };
    }

    return { minHour: 1, minMinute: 0 };
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (configurable via environment variable, default 1MB)
      const maxSize = getMaxImageSizeBytes();
      const maxSizeMB = getMaxImageSizeMB();
      if (file.size > maxSize) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        setFileSizeWarning(`Warning: File size is ${fileSizeMB}MB. Maximum allowed size is ${maxSizeMB}MB. Please select a smaller image.`);
        setLogoPreview(null);
        return;
      }

      setFileSizeWarning(null);
      setValue("logoFile", file, { shouldValidate: true });
      trigger("logoFile");
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (data: TokenFormSchemaType) => {
    setIsValidating(true);
    try {
      const response = await fetch('/api/tokens/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();

      if (result.valid === false && result.errors) {
        Object.entries(result.errors).forEach(([field, message]) => {
          setError(
            field as keyof TokenFormSchemaType,
            { type: 'server', message: message as string },
            { shouldFocus: false }
          );
        });
        setIsValidating(false);
        return;
      }

      setPendingSubmitData(data);
      setShowConfirmModal(true);
    } catch {
      setError('symbol', {
        type: 'server',
        message: 'Unable to validate. Please check your connection and try again.',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const confirmLaunch = () => {
    if (!pendingSubmitData) return;
    let feeSchedulerConfig: FeeSchedulerConfig;
    if (pendingSubmitData.feeSchedulerMode === 'market-cap-based') {
      feeSchedulerConfig = {
        mode: 'market-cap-based',
        startingMarketCap: pendingSubmitData.startingMarketCap ?? DEFAULT_LAUNCH_PARAMS.startingMarketCap,
        endingMarketCap: pendingSubmitData.endingMarketCap ?? DEFAULT_LAUNCH_PARAMS.endingMarketCap,
        feeMarketCapStartRate: pendingSubmitData.feeMarketCapStartRate ?? DEFAULT_LAUNCH_PARAMS.feeMarketCapStartRate,
        feeMarketCapEndRate: pendingSubmitData.feeMarketCapEndRate ?? DEFAULT_LAUNCH_PARAMS.feeMarketCapEndRate,
      };
    } else if (pendingSubmitData.feeSchedulerMode === 'time-based') {
      feeSchedulerConfig = {
        mode: 'time-based',
        startRate: pendingSubmitData.feeStartRate ?? DEFAULT_LAUNCH_PARAMS.feeStartRate,
        endRate: pendingSubmitData.feeEndRate ?? DEFAULT_LAUNCH_PARAMS.feeEndRate,
        durationMinutes: (pendingSubmitData.feeDurationHours ?? 1) * 60,
      };
    } else {
      feeSchedulerConfig = {
        mode: 'fixed',
        baseFeeBps: pendingSubmitData.feeFixedRate ?? DEFAULT_LAUNCH_PARAMS.baseFeeBps,
      };
    }

    const formData: TokenFormData = {
      symbol: pendingSubmitData.symbol,
      name: pendingSubmitData.name,
      description: pendingSubmitData.description,
      logoFile: pendingSubmitData.logoFile,
      feeSchedulerConfig: feeSchedulerConfig,
      feeTokenMode: pendingSubmitData.feeTokenMode ?? DEFAULT_LAUNCH_PARAMS.feeTokenMode,
      totalSupply: pendingSubmitData.totalSupply,
      initialPrice: pendingSubmitData.initialPrice,
      priceRangeMin: pendingSubmitData.priceRangeMin,
      priceRangeMax: pendingSubmitData.priceRangeMax,
      holdbackPercentage: pendingSubmitData.holdbackPercentage ?? DEFAULT_LAUNCH_PARAMS.holdbackPercentage,
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
  };

  // Build confirmation modal content: non-default values grouped by section
  const buildConfirmContent = () => {
    const values = getValues();
    const sections: { title: string; items: { label: string; value: string }[] }[] = [];

    const addSection = (title: string, pairs: [string, string | number | undefined][]) => {
      const items = pairs
        .map(([label, val]) => ({ label, value: val !== undefined && val !== '' ? String(val) : undefined }))
        .filter((item): item is { label: string; value: string } => item.value !== undefined);
      if (items.length > 0) sections.push({ title, items });
    };

    addSection('Token Information', [
      ['Symbol', values.symbol !== '' ? values.symbol : undefined],
      ['Name', values.name !== '' ? values.name : undefined],
      ['Description', values.description],
    ]);

    addSection('Launch Parameters', [
      ['Total Supply', values.totalSupply !== DEFAULT_LAUNCH_PARAMS.totalSupply ? values.totalSupply : undefined],
      ['Initial Price', values.initialPrice !== DEFAULT_LAUNCH_PARAMS.initialPrice ? values.initialPrice : undefined],
      ['Price Range Min', values.priceRangeMin !== DEFAULT_LAUNCH_PARAMS.priceRangeMin ? values.priceRangeMin : undefined],
      ['Price Range Max', values.priceRangeMax !== DEFAULT_LAUNCH_PARAMS.priceRangeMax ? values.priceRangeMax : undefined],
      ['Holdback %', values.holdbackPercentage !== DEFAULT_LAUNCH_PARAMS.holdbackPercentage ? values.holdbackPercentage : undefined],
      ['Quote Token', values.quoteTokenMint !== DEFAULT_LAUNCH_PARAMS.quoteTokenMint ? (values.quoteTokenMint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' ? 'USDC' : 'SOL') : undefined],
    ]);

    addSection('Fee Configuration', [
      ['Fee Mode', values.feeSchedulerMode !== DEFAULT_LAUNCH_PARAMS.feeSchedulerMode ? values.feeSchedulerMode : undefined],
      ['Fee Token Mode', values.feeTokenMode !== DEFAULT_LAUNCH_PARAMS.feeTokenMode ? values.feeTokenMode : undefined],
      ['Starting Market Cap', values.startingMarketCap !== DEFAULT_LAUNCH_PARAMS.startingMarketCap ? values.startingMarketCap : undefined],
      ['Ending Market Cap', values.endingMarketCap !== DEFAULT_LAUNCH_PARAMS.endingMarketCap ? values.endingMarketCap : undefined],
      ['Fee Start Rate', values.feeStartRate !== DEFAULT_LAUNCH_PARAMS.feeStartRate ? values.feeStartRate : undefined],
      ['Fee End Rate', values.feeEndRate !== DEFAULT_LAUNCH_PARAMS.feeEndRate ? values.feeEndRate : undefined],
      ['Fee Duration (hrs)', values.feeDurationHours !== 1 ? values.feeDurationHours : undefined],
      ['Fixed Fee Rate', values.feeFixedRate !== DEFAULT_LAUNCH_PARAMS.baseFeeBps ? values.feeFixedRate : undefined],
    ]);

    return sections;
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Token Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>Token Information</CardTitle>
          <CardDescription>Basic information about your meme token</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Token Symbol *</Label>
              <Input
                id="symbol"
                placeholder="e.g., DOGE"
                {...register("symbol")}
                disabled={isLoading}
              />
              {errors.symbol && (
                <p className="text-sm text-destructive">{errors.symbol.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Token Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Dogecoin"
                {...register("name")}
                disabled={isLoading}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoFile">Logo Image *</Label>
            <Input
              id="logoFile"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
              onChange={handleLogoChange}
              disabled={isLoading}
            />
            {fileSizeWarning && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-300 rounded-md">
                <p className="text-sm text-yellow-800 flex items-start gap-2">
                  <span className="text-lg">⚠️</span>
                  <span>{fileSizeWarning}</span>
                </p>
              </div>
            )}
            {logoPreview && (
              <div className="mt-2">
                <Image src={logoPreview} alt="Logo preview" width={96} height={96} className="h-24 w-24 rounded-lg object-cover" />
              </div>
            )}
            {errors.logoFile && (
              <p className="text-sm text-destructive">{errors.logoFile.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Token Description</Label>
            <textarea
              id="description"
              placeholder="Describe your token..."
              {...register("description")}
              disabled={isLoading}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Launch Time Section */}
      <Card>
        <CardHeader>
          <CardTitle>Launch Time</CardTitle>
          <CardDescription>Schedule when your token becomes tradeable</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enableTimedLaunch"
              {...register("enableTimedLaunch")}
              checked={enableTimedLaunch}
              onChange={(e) => setEnableTimedLaunch(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4"
            />
            <Label htmlFor="enableTimedLaunch">Enable Timed Launch</Label>
          </div>

          {enableTimedLaunch && (
            <div className="space-y-2">
              <Label>
                Launch Date & Time (Local Time: {Intl.DateTimeFormat().resolvedOptions().timeZone} UTC{new Date().getTimezoneOffset() <= 0 ? '+' : '-'}{Math.abs(new Date().getTimezoneOffset() / 60).toString().padStart(2, '0')}:{(Math.abs(new Date().getTimezoneOffset()) % 60).toString().padStart(2, '0')})
              </Label>
              <div className="flex gap-1.5 items-end">
                <div className="flex-1 max-w-[200px]">
                  <Input
                    id="launchDate"
                    type="date"
                    value={launchDate}
                    min={getLocalDateString()}
                    onChange={(e) => {
                      const dateValue = e.target.value;
                      setLaunchDate(dateValue);
                      updateDateTime(dateValue, launchHour, launchMinute, launchPeriod);
                    }}
                    onClick={() => {
                      // Initialize with today's date if empty
                      if (!launchDate) {
                        const today = getLocalDateString();
                        setLaunchDate(today);
                        updateDateTime(today, launchHour, launchMinute, launchPeriod);
                      }
                    }}
                    disabled={isLoading}
                  />
                </div>
                <div className="w-16">
                  <Input
                    id="launchHour"
                    type="number"
                    min="1"
                    max="12"
                    value={launchHour}
                    placeholder="HH"
                    onChange={(e) => {
                      // Allow free typing, just store the value
                      setLaunchHour(e.target.value);
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (!value) return;

                      let numValue = parseInt(value);
                      if (isNaN(numValue)) return;

                      // Enforce 12-hour format (1-12)
                      if (numValue > 12) numValue = 12;
                      if (numValue < 1) numValue = 1;

                      // Enforce minimum hour for today
                      const minTime = getMinTime();
                      if (numValue < minTime.minHour) {
                        numValue = minTime.minHour;
                      }

                      // Add zero-padding and update
                      const paddedValue = numValue.toString().padStart(2, '0');
                      setLaunchHour(paddedValue);
                      updateDateTime(launchDate, paddedValue, launchMinute, launchPeriod);
                    }}
                    onClick={() => {
                      // Initialize with next hour if empty
                      if (!launchHour) {
                        const now = new Date();
                        const nextHour24 = (now.getHours() + 1) % 24;
                        let nextHour12 = nextHour24 % 12;
                        if (nextHour12 === 0) nextHour12 = 12;
                        const period = nextHour24 >= 12 ? "PM" : "AM";
                        const hourStr = nextHour12.toString().padStart(2, '0');
                        setLaunchHour(hourStr);
                        setLaunchMinute("00");
                        setLaunchPeriod(period);
                        updateDateTime(launchDate, hourStr, "00", period);
                      }
                    }}
                    disabled={isLoading}
                    className="text-center"
                  />
                </div>
                <span className="text-lg font-bold pb-2">:</span>
                <div className="w-16">
                  <Input
                    id="launchMinute"
                    type="number"
                    min="0"
                    max="59"
                    value={launchMinute}
                    placeholder="MM"
                    onChange={(e) => {
                      // Allow free typing, just store the value
                      setLaunchMinute(e.target.value);
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (!value) return;

                      let numValue = parseInt(value);
                      if (isNaN(numValue)) return;

                      // Enforce 0-59 range for minutes
                      if (numValue > 59) numValue = 59;
                      if (numValue < 0) numValue = 0;

                      // Enforce minimum minute for current hour on today
                      const minTime = getMinTime();
                      const selectedHour = parseInt(launchHour);
                      if (!isNaN(selectedHour) && selectedHour === minTime.minHour && numValue < minTime.minMinute) {
                        numValue = minTime.minMinute;
                      }

                      // Add zero-padding and update
                      const paddedValue = numValue.toString().padStart(2, '0');
                      setLaunchMinute(paddedValue);
                      updateDateTime(launchDate, launchHour, paddedValue, launchPeriod);
                    }}
                    onClick={() => {
                      // Initialize with 0 minutes if empty
                      if (!launchMinute) {
                        setLaunchMinute("00");
                        updateDateTime(launchDate, launchHour, "00", launchPeriod);
                      }
                    }}
                    disabled={isLoading}
                    className="text-center"
                  />
                </div>
                <div className="w-16">
                  <select
                    id="launchPeriod"
                    value={launchPeriod}
                    onChange={(e) => {
                      const period = e.target.value as "AM" | "PM";
                      setLaunchPeriod(period);
                      updateDateTime(launchDate, launchHour, launchMinute, period);
                    }}
                    disabled={isLoading}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-center font-medium"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
              {errors.launchDateTime && (
                <p className="text-sm text-destructive">{errors.launchDateTime.message}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fee Schedule Section */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Schedule</CardTitle>
          <CardDescription>Configure dynamic fee scheduling for your token</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Fee Scheduler Mode Select */}
          <div className="space-y-2">
            <Label htmlFor="feeSchedulerMode">Fee Scheduler Mode</Label>
            <Controller
              name="feeSchedulerMode"
              control={control}
              render={({ field: { onChange, value } }) => (
                <Select value={value} onValueChange={onChange} disabled={isLoading}>
                  <SelectTrigger id="feeSchedulerMode" className="w-full">
                    <SelectValue placeholder="Select fee scheduler mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market-cap-based">Market-Cap Based</SelectItem>
                    <SelectItem value="time-based">Time-Based</SelectItem>
                    <SelectItem value="fixed">Disabled (Fixed Fee)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-sm text-muted-foreground">How trading fees decay over time</p>
            {errors.feeSchedulerMode && (
              <p className="text-sm text-destructive">{errors.feeSchedulerMode.message}</p>
            )}
          </div>

          {/* Fee Token Mode RadioGroup */}
          <div className="space-y-2">
            <Label htmlFor="feeTokenMode">Fee Token Mode</Label>
            <Controller
              name="feeTokenMode"
              control={control}
              render={({ field: { onChange, value } }) => (
                <RadioGroup value={value} onValueChange={onChange} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="quoteOnly" id="quoteOnly" disabled={isLoading} />
                    <Label htmlFor="quoteOnly" className="cursor-pointer font-normal">Quote Token Only</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="both" disabled={isLoading} />
                    <Label htmlFor="both" className="cursor-pointer font-normal">Both Quote + Base Token</Label>
                  </div>
                </RadioGroup>
              )}
            />
            <p className="text-sm text-muted-foreground">Which tokens fees are collected in</p>
          </div>

          {/* Dynamic sub-fields: Market-Cap Based */}
          <div className={cn("space-y-4", watchedFeeMode !== 'market-cap-based' && "hidden")}>
            <div className="space-y-2">
              <Label htmlFor="startingMarketCap">Starting Market Cap</Label>
              <Input
                id="startingMarketCap"
                type="number"
                inputMode="numeric"
                {...register("startingMarketCap", { valueAsNumber: true })}
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground">Market cap at which fee schedule begins (e.q., 1,000)</p>
              {errors.startingMarketCap && (
                <p className="text-sm text-destructive">{errors.startingMarketCap.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endingMarketCap">Ending Market Cap</Label>
              <Input
                id="endingMarketCap"
                type="number"
                inputMode="numeric"
                {...register("endingMarketCap", { valueAsNumber: true })}
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground">Market cap at which fees reach minimum (e.q., 100,000)</p>
            {errors.endingMarketCap && (
              <p className="text-sm text-destructive">{errors.endingMarketCap.message}</p>
            )}
            {feeSchedulerError?.field === "endingMarketCap" && !errors.endingMarketCap && (
              <p className="text-sm text-destructive">{feeSchedulerError.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="feeMarketCapStartRate">Starting Fee Rate (bps)</Label>
            <Input
              id="feeMarketCapStartRate"
              type="number"
              inputMode="numeric"
              {...register("feeMarketCapStartRate", { valueAsNumber: true })}
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">Starting fee in basis points when market cap is at starting value (e.g., 50 = 0.5%)</p>
            {errors.feeMarketCapStartRate && (
              <p className="text-sm text-destructive">{errors.feeMarketCapStartRate.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="feeMarketCapEndRate">Ending Fee Rate (bps)</Label>
            <Input
              id="feeMarketCapEndRate"
              type="number"
              inputMode="numeric"
              {...register("feeMarketCapEndRate", { valueAsNumber: true })}
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">Ending fee in basis points when market cap reaches ending value (e.g., 25 = 0.25%)</p>
            {errors.feeMarketCapEndRate && (
              <p className="text-sm text-destructive">{errors.feeMarketCapEndRate.message}</p>
            )}
            {feeSchedulerError?.field === "feeMarketCapEndRate" && !errors.feeMarketCapEndRate && (
              <p className="text-sm text-destructive">{feeSchedulerError.message}</p>
            )}
          </div>
        </div>

        {/* Dynamic sub-fields: Time-Based */}
          <div className={cn("space-y-4", watchedFeeMode !== 'time-based' && "hidden")}>
            <div className="space-y-2">
              <Label htmlFor="feeStartRate">Fee Start Rate (bps)</Label>
              <Input
                id="feeStartRate"
                type="number"
                inputMode="numeric"
                {...register("feeStartRate", { valueAsNumber: true })}
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground">Starting fee in basis points (e.g., 50 = 0.5%)</p>
              {errors.feeStartRate && (
                <p className="text-sm text-destructive">{errors.feeStartRate.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="feeEndRate">Fee End Rate (bps)</Label>
              <Input
                id="feeEndRate"
                type="number"
                inputMode="numeric"
                {...register("feeEndRate", { valueAsNumber: true })}
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground">Ending fee in basis points (e.g., 25 = 0.25%)</p>
              {errors.feeEndRate && (
                <p className="text-sm text-destructive">{errors.feeEndRate.message}</p>
              )}
              {feeSchedulerError?.field === "feeEndRate" && !errors.feeEndRate && (
                <p className="text-sm text-destructive">{feeSchedulerError.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="feeDurationHours">Fee Duration (hours)</Label>
              <Input
                id="feeDurationHours"
                type="number"
                inputMode="numeric"
                {...register("feeDurationHours", { valueAsNumber: true })}
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground">Total hours for fee decay schedule</p>
              {errors.feeDurationHours && (
                <p className="text-sm text-destructive">{errors.feeDurationHours.message}</p>
              )}
            </div>
          </div>

          {/* Dynamic sub-fields: Fixed Fee */}
          <div className={cn("space-y-4", watchedFeeMode !== 'fixed' && "hidden")}>
            <div className="space-y-2">
              <Label htmlFor="feeFixedRate">Fixed Base Fee (bps)</Label>
              <Input
                id="feeFixedRate"
                type="number"
                inputMode="numeric"
                {...register("feeFixedRate", { valueAsNumber: true })}
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground">Constant fee in basis points (e.g., 25 = 0.25%)</p>
              {errors.feeFixedRate && (
                <p className="text-sm text-destructive">{errors.feeFixedRate.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Socials Section */}
      <Card>
        <CardHeader>
          <CardTitle>Social Links</CardTitle>
          <CardDescription>Optional social media links for your token</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Website URL</Label>
            <Input
              id="websiteUrl"
              type="url"
              placeholder="https://your-website.com"
              {...register("websiteUrl")}
              disabled={isLoading}
            />
            {errors.websiteUrl && (
              <p className="text-sm text-destructive">{errors.websiteUrl.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="twitterUrl">Twitter/X URL</Label>
            <Input
              id="twitterUrl"
              type="url"
              placeholder="https://twitter.com/yourtoken"
              {...register("twitterUrl")}
              disabled={isLoading}
            />
            {errors.twitterUrl && (
              <p className="text-sm text-destructive">{errors.twitterUrl.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telegramUrl">Telegram URL</Label>
            <Input
              id="telegramUrl"
              type="url"
              placeholder="https://t.me/yourtoken"
              {...register("telegramUrl")}
              disabled={isLoading}
            />
            {errors.telegramUrl && (
              <p className="text-sm text-destructive">{errors.telegramUrl.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="discordUrl">Discord URL</Label>
            <Input
              id="discordUrl"
              type="url"
              placeholder="https://discord.gg/yourtoken"
              {...register("discordUrl")}
              disabled={isLoading}
            />
            {errors.discordUrl && (
              <p className="text-sm text-destructive">{errors.discordUrl.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Launch Parameters Section */}
      <Card>
        <CardHeader
          className="cursor-pointer flex flex-row items-center justify-between"
          onClick={() => setIsLaunchParamsOpen(!isLaunchParamsOpen)}
        >
          <div className="flex items-center gap-2">
            <CardTitle>Launch Parameters</CardTitle>
            {!isLaunchParamsOpen && isModified && (
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                Modified
              </span>
            )}
            {!isLaunchParamsOpen && isHighHoldback && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                High Holdback
              </Badge>
            )}
          </div>
          {isLaunchParamsOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </CardHeader>
        <CardContent className={cn("space-y-4", !isLaunchParamsOpen && "hidden")}>
            {/* Total Supply */}
            <div className="space-y-2">
              <Label htmlFor="totalSupply">Total Supply</Label>
              <Controller
                name="totalSupply"
                control={control}
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input
                    id="totalSupply"
                    type="text"
                    inputMode="numeric"
                    value={value ? new Intl.NumberFormat(navigator.language).format(value) : ""}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, "");
                      const num = raw ? parseInt(raw, 10) : 0;
                      onChange(num);
                    }}
                    onBlur={onBlur}
                    disabled={isLoading}
                  />
                )}
              />
              <p className="text-sm text-muted-foreground">Total tokens that will be created</p>
              {errors.totalSupply && (
                <p className="text-sm text-destructive">{errors.totalSupply.message}</p>
              )}
            </div>

            {/* Initial Price */}
            <div className="space-y-2">
              <Label htmlFor="initialPrice">Initial Price</Label>
              <Input
                id="initialPrice"
                type="number"
                step="any"
                {...register("initialPrice", { valueAsNumber: true })}
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground">The starting price of the liquidity pool</p>
              {errors.initialPrice && (
                <p className="text-sm text-destructive">{errors.initialPrice.message}</p>
              )}
            </div>

            {/* Price Range Min */}
            <div className="space-y-2">
              <Label htmlFor="priceRangeMin">Price Range Minimum</Label>
              <Input
                id="priceRangeMin"
                type="number"
                step="any"
                {...register("priceRangeMin", { valueAsNumber: true })}
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground">The lowest price the pool will support</p>
              {errors.priceRangeMin && (
                <p className="text-sm text-destructive">{errors.priceRangeMin.message}</p>
              )}
              {priceError?.field === "priceRangeMin" && !errors.priceRangeMin && (
                <p className="text-sm text-destructive">{priceError.message}</p>
              )}
            </div>

            {/* Price Range Max */}
              <div className="space-y-2">
                <Label htmlFor="priceRangeMax">Price Range Maximum</Label>
                <Input
                  id="priceRangeMax"
                  type="number"
                  step="any"
                  {...register("priceRangeMax", { valueAsNumber: true })}
                  disabled={isLoading}
                />
                <p className="text-sm text-muted-foreground">The highest price the pool will support</p>
                {errors.priceRangeMax && (
                  <p className="text-sm text-destructive">{errors.priceRangeMax.message}</p>
                )}
                {priceError?.field === "priceRangeMax" && !errors.priceRangeMax && (
                  <p className="text-sm text-destructive">{priceError.message}</p>
                )}
              </div>

            {/* Holdback Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="holdbackPercentage">Token Holdback</Label>
                <span className="text-sm font-bold">{watchedHoldback ?? 0}%</span>
              </div>
              <Controller
                name="holdbackPercentage"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Slider
                    id="holdbackPercentage"
                    min={0}
                    max={100}
                    step={1}
                    value={[value ?? 0]}
                    onValueChange={([val]) => onChange(val)}
                    disabled={isLoading}
                  />
                )}
              />
              <p className="text-sm text-muted-foreground">
                Holdback tokens are sent to the creator&apos;s wallet; the remainder goes to the liquidity pool.
              </p>
              {errors.holdbackPercentage && (
                <p className="text-sm text-destructive">{errors.holdbackPercentage.message}</p>
              )}
              {isHighHoldback && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    Holding back more than 10% may be seen as a red flag by traders
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Quote Token Select */}
            <div className="space-y-2">
              <Label htmlFor="quoteTokenMint">Quote Token</Label>
              <Controller
                name="quoteTokenMint"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Select value={value} onValueChange={onChange} disabled={isLoading}>
                    <SelectTrigger id="quoteTokenMint" className="w-full">
                      <SelectValue placeholder="Select quote token" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="So11111111111111111111111111111111111111112">SOL</SelectItem>
                      <SelectItem value="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v">USDC</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-sm text-muted-foreground">
                USDC has 6 decimals per unit; SOL has 9 decimals per unit. Backend handles decimal scaling.
              </p>
            </div>
          </CardContent>
      </Card>

      {/* Custom CA Section */}
      <Card className={enableCustomPrivateKey ? "border-red-500 border-2" : ""}>
        <CardHeader>
          <CardTitle className="text-red-600">⚠️ Custom CA</CardTitle>
          <CardDescription className="text-red-600">
            Use a custom keypair for the token mint address. Warning: requires secure key management.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enableCustomPrivateKey"
              {...register("enableCustomPrivateKey")}
              checked={enableCustomPrivateKey}
              onChange={(e) => setEnableCustomPrivateKey(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4"
            />
            <Label htmlFor="enableCustomPrivateKey" className="font-semibold">
              Use Custom Private Key for Token Mint
            </Label>
          </div>

          {enableCustomPrivateKey && (
            <div className="space-y-2 p-4 bg-red-50 border border-red-300 rounded-md">
              <div className="flex items-start space-x-2 mb-3">
                <span className="text-red-600 font-bold text-lg">⚠️</span>
                <div className="text-sm text-red-700">
                  <p className="font-bold mb-1">SECURITY WARNING:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Only use this if you have a specific private key you want to use</li>
                    <li>Never share your private key with anyone</li>
                    <li>Make sure you are on a secure connection</li>
                    <li>Your private key will not be stored or transmitted anywhere</li>
                  </ul>
                </div>
              </div>

              <Label htmlFor="customPrivateKey" className="font-semibold">
                Private Key (JSON Array or Base58 format)
              </Label>
              <textarea
                id="customPrivateKey"
                placeholder='Either: [1,2,3,...] (64 bytes) OR "5K..." (base58)'
                {...register("customPrivateKey")}
                disabled={isLoading}
                className={`flex min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono ${
                  errors.customPrivateKey
                    ? "border-destructive focus-visible:ring-destructive"
                    : "border-red-300 focus-visible:ring-red-500"
                }`}
              />
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Accepts two formats:
                <br />
                1. JSON array: [1,2,3,4,...] (64 numbers, 0-255)
                <br />
                2. Base58: 5K... (base58-encoded string)
              </p>
              {errors.customPrivateKey && (
                <p className="text-sm text-destructive">{errors.customPrivateKey.message}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Launch Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Launch Confirmation</DialogTitle>
            <DialogDescription>
              Review your launch settings below. Launching a token on-chain is irreversible.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {(() => {
              const sections = buildConfirmContent();
              if (sections.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground">
                    All settings are at default values.
                  </p>
                );
              }
              return sections.map((section) => (
                <div key={section.title}>
                  <h4 className="text-sm font-semibold mb-2">{section.title}</h4>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.label} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="text-red-600 dark:text-destructive font-medium">{item.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ));
            })()}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowConfirmModal(false);
                setPendingSubmitData(null);
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={confirmLaunch}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? "Launching..." : "Confirm Launch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button type="submit" size="lg" className="w-full" disabled={isLoading || !isFormValid || !isValid || isValidating}>
        {isLoading || isValidating ? "Loading..." : "Launch Token"}
      </Button>
    </form>
  );
}
