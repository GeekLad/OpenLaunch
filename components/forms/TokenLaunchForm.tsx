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
import { NumberInput } from "@/components/ui/number-input";
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
  initialMarketCap: z.number().min(1, "Initial market cap is required"),
  marketCapRangeMin: z.number().min(1),
  marketCapRangeMax: z.number().min(1),
  lockedLiquidityPercentage: z.number().min(0).max(100).optional(),
  quoteTokenMint: z.string().optional(),
  feeSchedulerMode: z.enum(['market-cap-based', 'time-based', 'fixed']).optional(),
  feeTokenMode: z.enum(['quoteOnly', 'both']).optional(),
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
  if (data.marketCapRangeMin >= data.initialMarketCap) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Minimum market cap must be less than initial market cap",
      path: ["marketCapRangeMin"],
    });
  }
  if (data.initialMarketCap >= data.marketCapRangeMax) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Initial market cap must be less than maximum market cap",
      path: ["marketCapRangeMax"],
    });
  }
  if (data.marketCapRangeMin >= data.marketCapRangeMax) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Minimum market cap must be less than maximum market cap",
      path: ["marketCapRangeMin"],
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
      initialMarketCap: DEFAULT_LAUNCH_PARAMS.initialMarketCap,
      marketCapRangeMin: DEFAULT_LAUNCH_PARAMS.marketCapRangeMin,
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
    },
  });

  const logoFile = watch("logoFile");
  const symbol = watch("symbol");
  const name = watch("name");

  const watchedSupply = watch("totalSupply");
  const watchedInitialMcap = watch("initialMarketCap");
  const watchedMin = watch("marketCapRangeMin");
  const watchedMax = watch("marketCapRangeMax");
  const watchedLocked = watch("lockedLiquidityPercentage");
  const watchedQuoteToken = watch("quoteTokenMint");
  const watchedFeeMode = watch("feeSchedulerMode");
  const watchedFeeToken = watch("feeTokenMode");

  const isModified = useMemo(() => {
    return (
      watchedSupply !== DEFAULT_LAUNCH_PARAMS.totalSupply ||
      watchedInitialMcap !== DEFAULT_LAUNCH_PARAMS.initialMarketCap ||
      watchedMin !== DEFAULT_LAUNCH_PARAMS.marketCapRangeMin ||
      watchedMax !== DEFAULT_LAUNCH_PARAMS.marketCapRangeMax ||
      watchedLocked !== DEFAULT_LAUNCH_PARAMS.lockedLiquidityPercentage ||
      watchedQuoteToken !== DEFAULT_LAUNCH_PARAMS.quoteTokenMint ||
      watchedFeeMode !== 'market-cap-based' ||
      watchedFeeToken !== 'quoteOnly'
    );
  }, [watchedSupply, watchedInitialMcap, watchedMin, watchedMax, watchedLocked, watchedQuoteToken, watchedFeeMode, watchedFeeToken]);

  const isLowLockedLiquidity = useMemo(() => {
    return (watchedLocked ?? 100) < 90;
  }, [watchedLocked]);

  const marketCapError = useMemo(() => {
    if (watchedMin >= watchedInitialMcap) {
      return { field: "marketCapRangeMin", message: "Minimum market cap must be less than initial market cap" };
    }
    if (watchedMin >= watchedMax) {
      return { field: "marketCapRangeMin", message: "Minimum market cap must be less than maximum market cap" };
    }
    if (watchedInitialMcap >= watchedMax) {
      return { field: "marketCapRangeMax", message: "Initial market cap must be less than maximum market cap" };
    }
    return null;
  }, [watchedMin, watchedInitialMcap, watchedMax]);

  const feeSchedulerError = useMemo(() => {
    if (watchedFeeMode === 'market-cap-based') {
      const startMcap = watch("startingMarketCap") ?? 0;
      const endMcap = watch("endingMarketCap") ?? 0;
      const startRate = watch("feeMarketCapStartRate") ?? 0;
      const endRate = watch("feeMarketCapEndRate") ?? 0;

      if (endMcap <= startMcap) {
        return { field: "endingMarketCap", message: "Ending market cap must be greater than starting market cap" };
      }
      if (endRate > startRate) {
        return { field: "feeMarketCapEndRate", message: "Ending fee rate must be less than or equal to starting fee rate" };
      }
      // Validate fee scheduler caps >= launch market cap
      if (watchedInitialMcap > 0 && startMcap > 0 && startMcap < watchedInitialMcap) {
        return { field: "startingMarketCap", message: `Starting market cap must be >= initial market cap (${watchedInitialMcap})` };
      }
      if (watchedInitialMcap > 0 && endMcap > 0 && endMcap < watchedInitialMcap) {
        return { field: "endingMarketCap", message: `Ending market cap must be >= initial market cap (${watchedInitialMcap})` };
      }
    }
    if (watchedFeeMode === 'time-based') {
      const startRate = watch("feeStartRate") ?? 0;
      const endRate = watch("feeEndRate") ?? 0;
      if (endRate > startRate) {
        return { field: "feeEndRate", message: "Ending fee rate must be less than or equal to starting fee rate" };
      }
    }
    return null;
  }, [watchedFeeMode, watchedInitialMcap, watch]);

  const isFormValid = !!(symbol && name && logoFile && !fileSizeWarning);

  const getLocalDateString = (date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const updateDateTime = (dateStr: string, hourStr: string, minuteStr: string, period: "AM" | "PM") => {
    if (!dateStr || hourStr === "" || minuteStr === "") return;
    const hour = parseInt(hourStr);
    const minute = parseInt(minuteStr);
    if (isNaN(hour) || isNaN(minute) || hour < 1 || hour > 12 || minute < 0 || minute > 59) return;

    let hour24 = hour;
    if (period === "AM") { if (hour === 12) hour24 = 0; }
    else { if (hour !== 12) hour24 = hour + 12; }

    const [year, month, day] = dateStr.split('-').map(Number);
    const newDate = new Date(year, month - 1, day, hour24, minute, 0, 0);
    if (newDate < new Date()) return;
    setValue("launchDateTime", newDate);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          setError(field as keyof TokenFormSchemaType, { type: 'server', message: message as string }, { shouldFocus: false });
        });
        setIsValidating(false);
        return;
      }

      setPendingSubmitData(data);
      setShowConfirmModal(true);
    } catch {
      setError('symbol', { type: 'server', message: 'Unable to validate. Please check your connection and try again.' });
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
        feeMarketCapStartRatePercent: pendingSubmitData.feeMarketCapStartRate ?? DEFAULT_LAUNCH_PARAMS.feeMarketCapStartPercent,
        feeMarketCapEndRatePercent: pendingSubmitData.feeMarketCapEndRate ?? DEFAULT_LAUNCH_PARAMS.feeMarketCapEndPercent,
      };
    } else if (pendingSubmitData.feeSchedulerMode === 'time-based') {
      feeSchedulerConfig = {
        mode: 'time-based',
        startRatePercent: pendingSubmitData.feeStartRate ?? DEFAULT_LAUNCH_PARAMS.feeStartPercent,
        endRatePercent: pendingSubmitData.feeEndRate ?? DEFAULT_LAUNCH_PARAMS.feeEndPercent,
        durationMinutes: (pendingSubmitData.feeDurationHours ?? 1) * 60,
      };
    } else {
      feeSchedulerConfig = {
        mode: 'fixed',
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
      marketCapRangeMin: pendingSubmitData.marketCapRangeMin,
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
  };

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
      ['Symbol', values.symbol],
      ['Name', values.name],
      ['Description', values.description],
    ]);

    addSection('Launch Parameters', [
      ['Total Supply', values.totalSupply !== DEFAULT_LAUNCH_PARAMS.totalSupply ? new Intl.NumberFormat().format(values.totalSupply) : undefined],
      ['Initial Market Cap', values.initialMarketCap !== DEFAULT_LAUNCH_PARAMS.initialMarketCap ? values.initialMarketCap : undefined],
      ['Market Cap Range', values.marketCapRangeMin !== DEFAULT_LAUNCH_PARAMS.marketCapRangeMin || values.marketCapRangeMax !== DEFAULT_LAUNCH_PARAMS.marketCapRangeMax ? `${values.marketCapRangeMin} – ${values.marketCapRangeMax}` : undefined],
      ['Locked Liquidity', values.lockedLiquidityPercentage !== DEFAULT_LAUNCH_PARAMS.lockedLiquidityPercentage ? `${values.lockedLiquidityPercentage}%` : undefined],
      ['Quote Token', values.quoteTokenMint !== DEFAULT_LAUNCH_PARAMS.quoteTokenMint ? (values.quoteTokenMint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' ? 'USDC' : 'SOL') : undefined],
    ]);

    addSection('Fee Configuration', [
      ['Fee Mode', values.feeSchedulerMode !== DEFAULT_LAUNCH_PARAMS.feeSchedulerMode ? values.feeSchedulerMode : undefined],
      ['Fee Token Mode', values.feeTokenMode !== DEFAULT_LAUNCH_PARAMS.feeTokenMode ? values.feeTokenMode : undefined],
      ['Starting Market Cap', values.startingMarketCap !== DEFAULT_LAUNCH_PARAMS.startingMarketCap ? values.startingMarketCap : undefined],
      ['Ending Market Cap', values.endingMarketCap !== DEFAULT_LAUNCH_PARAMS.endingMarketCap ? values.endingMarketCap : undefined],
      ['Fee Start Rate', values.feeStartRate !== DEFAULT_LAUNCH_PARAMS.feeStartPercent ? `${values.feeStartRate}%` : undefined],
      ['Fee End Rate', values.feeEndRate !== DEFAULT_LAUNCH_PARAMS.feeEndPercent ? `${values.feeEndRate}%` : undefined],
      ['Fee Duration (hrs)', values.feeDurationHours !== 1 ? values.feeDurationHours : undefined],
      ['Fixed Fee Rate', values.feeFixedRate !== DEFAULT_LAUNCH_PARAMS.feeFixedPercent ? `${values.feeFixedRate}%` : undefined],
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
              <Input id="symbol" placeholder="e.g., DOGE" {...register("symbol")} disabled={isLoading} />
              {errors.symbol && <p className="text-sm text-destructive">{errors.symbol.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Token Name *</Label>
              <Input id="name" placeholder="e.g., Dogecoin" {...register("name")} disabled={isLoading} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoFile">Logo Image *</Label>
            <Input id="logoFile" type="file" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp" onChange={handleLogoChange} disabled={isLoading} />
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
            {errors.logoFile && <p className="text-sm text-destructive">{errors.logoFile.message}</p>}
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
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website URL</Label>
              <Input id="websiteUrl" type="url" placeholder="https://your-website.com" {...register("websiteUrl")} disabled={isLoading} />
              {errors.websiteUrl && <p className="text-sm text-destructive">{errors.websiteUrl.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="twitterUrl">Twitter/X URL</Label>
              <Input id="twitterUrl" type="url" placeholder="https://twitter.com/yourtoken" {...register("twitterUrl")} disabled={isLoading} />
              {errors.twitterUrl && <p className="text-sm text-destructive">{errors.twitterUrl.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telegramUrl">Telegram URL</Label>
              <Input id="telegramUrl" type="url" placeholder="https://t.me/yourtoken" {...register("telegramUrl")} disabled={isLoading} />
              {errors.telegramUrl && <p className="text-sm text-destructive">{errors.telegramUrl.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="discordUrl">Discord URL</Label>
              <Input id="discordUrl" type="url" placeholder="https://discord.gg/yourtoken" {...register("discordUrl")} disabled={isLoading} />
              {errors.discordUrl && <p className="text-sm text-destructive">{errors.discordUrl.message}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Launch Parameters (Advanced Options) */}
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
            {!isLaunchParamsOpen && isLowLockedLiquidity && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Low Liquidity Lock
              </Badge>
            )}
          </div>
          {isLaunchParamsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </CardHeader>
        <CardContent className={cn("space-y-4", !isLaunchParamsOpen && "hidden")}>
          {/* Total Supply + Quote Token (side by side) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalSupply">Total Supply</Label>
              <Controller
                name="totalSupply"
                control={control}
                render={({ field: { onChange, value, onBlur } }) => (
                  <NumberInput
                    value={value}
                    onChangeValue={onChange}
                    integer
                    onBlur={onBlur}
                    disabled={isLoading}
                  />
                )}
              />
              <p className="text-sm text-muted-foreground">Total tokens that will be created</p>
              {errors.totalSupply && <p className="text-sm text-destructive">{errors.totalSupply.message}</p>}
            </div>
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
            </div>
          </div>

          {/* Initial Market Cap */}
          <div className="space-y-2">
            <Label htmlFor="initialMarketCap">Initial Market Cap</Label>
            <Controller
              name="initialMarketCap"
              control={control}
              render={({ field: { onChange, value, onBlur } }) => (
                <NumberInput
                  value={value}
                  onChangeValue={onChange}
                  integer
                  onBlur={onBlur}
                  disabled={isLoading}
                />
              )}
            />
            <p className="text-sm text-muted-foreground">Target market cap at launch (in quote token value)</p>
            {errors.initialMarketCap && <p className="text-sm text-destructive">{errors.initialMarketCap.message}</p>}
          </div>

          {/* Market Cap Range (side by side) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="marketCapRangeMin">Min Market Cap</Label>
              <Controller
                name="marketCapRangeMin"
                control={control}
                render={({ field: { onChange, value, onBlur } }) => (
                  <NumberInput
                    value={value}
                    onChangeValue={onChange}
                    integer
                    onBlur={onBlur}
                    disabled={isLoading}
                  />
                )}
              />
              {errors.marketCapRangeMin && <p className="text-sm text-destructive">{errors.marketCapRangeMin.message}</p>}
              {marketCapError?.field === "marketCapRangeMin" && !errors.marketCapRangeMin && <p className="text-sm text-destructive">{marketCapError.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="marketCapRangeMax">Max Market Cap</Label>
              <Controller
                name="marketCapRangeMax"
                control={control}
                render={({ field: { onChange, value, onBlur } }) => (
                  <NumberInput
                    value={value}
                    onChangeValue={onChange}
                    integer
                    onBlur={onBlur}
                    disabled={isLoading}
                  />
                )}
              />
              {errors.marketCapRangeMax && <p className="text-sm text-destructive">{errors.marketCapRangeMax.message}</p>}
              {marketCapError?.field === "marketCapRangeMax" && !errors.marketCapRangeMax && <p className="text-sm text-destructive">{marketCapError.message}</p>}
            </div>
          </div>

          {/* Locked Liquidity Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="lockedLiquidityPercentage">Locked Liquidity</Label>
              <span className="text-sm font-bold">{watchedLocked ?? 100}%</span>
            </div>
            <Controller
              name="lockedLiquidityPercentage"
              control={control}
              render={({ field: { onChange, value } }) => (
                <Slider
                  id="lockedLiquidityPercentage"
                  min={0}
                  max={100}
                  step={1}
                  value={[value ?? 100]}
                  onValueChange={([val]) => onChange(val)}
                  disabled={isLoading}
                />
              )}
            />
            <p className="text-sm text-muted-foreground">
              Percentage of supply sent to the liquidity pool. Remainder goes to the creator&apos;s wallet.
            </p>
            {isLowLockedLiquidity && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Locking less than 90% of liquidity may be seen as a red flag by traders
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fee Schedule Section */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Schedule</CardTitle>
          <CardDescription>Configure dynamic fee scheduling for your token</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Fee Scheduler Mode + Fee Token Mode (side by side) */}
          <div className="grid grid-cols-2 gap-4">
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="feeTokenMode">Fee Token Mode</Label>
              <Controller
                name="feeTokenMode"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Select value={value} onValueChange={onChange} disabled={isLoading}>
                    <SelectTrigger id="feeTokenMode" className="w-full">
                      <SelectValue placeholder="Select fee token mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quoteOnly">Quote Token Only</SelectItem>
                      <SelectItem value="both">Both Quote + Base Token</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Market-Cap Based sub-fields */}
          <div className={cn("space-y-4", watchedFeeMode !== 'market-cap-based' && "hidden")}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startingMarketCap">Starting Market Cap</Label>
                <Controller
                  name="startingMarketCap"
                  control={control}
                  render={({ field: { onChange, value, onBlur } }) => (
                    <NumberInput value={value ?? 0} onChangeValue={onChange} integer onBlur={onBlur} disabled={isLoading} />
                  )}
                />
                <p className="text-sm text-muted-foreground">Must be &gt;= initial market cap</p>
                {errors.startingMarketCap && <p className="text-sm text-destructive">{errors.startingMarketCap.message}</p>}
                {feeSchedulerError?.field === "startingMarketCap" && !errors.startingMarketCap && <p className="text-sm text-destructive">{feeSchedulerError.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="endingMarketCap">Ending Market Cap</Label>
                <Controller
                  name="endingMarketCap"
                  control={control}
                  render={({ field: { onChange, value, onBlur } }) => (
                    <NumberInput value={value ?? 0} onChangeValue={onChange} integer onBlur={onBlur} disabled={isLoading} />
                  )}
                />
                <p className="text-sm text-muted-foreground">Must be &gt;= initial market cap</p>
                {errors.endingMarketCap && <p className="text-sm text-destructive">{errors.endingMarketCap.message}</p>}
                {feeSchedulerError?.field === "endingMarketCap" && !errors.endingMarketCap && <p className="text-sm text-destructive">{feeSchedulerError.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="feeMarketCapStartRate">Starting Fee Rate (%)</Label>
                <Controller
                  name="feeMarketCapStartRate"
                  control={control}
                  render={({ field: { onChange, value, onBlur } }) => (
                    <NumberInput value={value ?? 0} onChangeValue={onChange} decimalPlaces={2} suffix="%" onBlur={onBlur} disabled={isLoading} />
                  )}
                />
                <p className="text-sm text-muted-foreground">Max fee at starting market cap (e.g., 0.5%)</p>
                {errors.feeMarketCapStartRate && <p className="text-sm text-destructive">{errors.feeMarketCapStartRate.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="feeMarketCapEndRate">Ending Fee Rate (%)</Label>
                <Controller
                  name="feeMarketCapEndRate"
                  control={control}
                  render={({ field: { onChange, value, onBlur } }) => (
                    <NumberInput value={value ?? 0} onChangeValue={onChange} decimalPlaces={2} suffix="%" onBlur={onBlur} disabled={isLoading} />
                  )}
                />
                <p className="text-sm text-muted-foreground">Min fee at ending market cap (e.g., 0.25%)</p>
                {errors.feeMarketCapEndRate && <p className="text-sm text-destructive">{errors.feeMarketCapEndRate.message}</p>}
                {feeSchedulerError?.field === "feeMarketCapEndRate" && !errors.feeMarketCapEndRate && <p className="text-sm text-destructive">{feeSchedulerError.message}</p>}
              </div>
            </div>
          </div>

          {/* Time-Based sub-fields */}
          <div className={cn("space-y-4", watchedFeeMode !== 'time-based' && "hidden")}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="feeStartRate">Fee Start Rate (%)</Label>
                <Controller
                  name="feeStartRate"
                  control={control}
                  render={({ field: { onChange, value, onBlur } }) => (
                    <NumberInput value={value ?? 0} onChangeValue={onChange} decimalPlaces={2} suffix="%" onBlur={onBlur} disabled={isLoading} />
                  )}
                />
                <p className="text-sm text-muted-foreground">Starting fee (e.g., 0.5%)</p>
                {errors.feeStartRate && <p className="text-sm text-destructive">{errors.feeStartRate.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="feeEndRate">Fee End Rate (%)</Label>
                <Controller
                  name="feeEndRate"
                  control={control}
                  render={({ field: { onChange, value, onBlur } }) => (
                    <NumberInput value={value ?? 0} onChangeValue={onChange} decimalPlaces={2} suffix="%" onBlur={onBlur} disabled={isLoading} />
                  )}
                />
                <p className="text-sm text-muted-foreground">Ending fee (e.g., 0.25%)</p>
                {errors.feeEndRate && <p className="text-sm text-destructive">{errors.feeEndRate.message}</p>}
                {feeSchedulerError?.field === "feeEndRate" && !errors.feeEndRate && <p className="text-sm text-destructive">{feeSchedulerError.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="feeDurationHours">Fee Duration (hours)</Label>
              <Controller
                name="feeDurationHours"
                control={control}
                render={({ field: { onChange, value, onBlur } }) => (
                  <NumberInput value={value ?? 1} onChangeValue={onChange} integer onBlur={onBlur} disabled={isLoading} />
                )}
              />
              <p className="text-sm text-muted-foreground">Total hours for fee decay schedule</p>
              {errors.feeDurationHours && <p className="text-sm text-destructive">{errors.feeDurationHours.message}</p>}
            </div>
          </div>

          {/* Fixed Fee sub-fields */}
          <div className={cn("space-y-4", watchedFeeMode !== 'fixed' && "hidden")}>
            <div className="space-y-2">
              <Label htmlFor="feeFixedRate">Fixed Base Fee (%)</Label>
              <Controller
                name="feeFixedRate"
                control={control}
                render={({ field: { onChange, value, onBlur } }) => (
                  <NumberInput value={value ?? 0} onChangeValue={onChange} decimalPlaces={2} suffix="%" onBlur={onBlur} disabled={isLoading} />
                )}
              />
              <p className="text-sm text-muted-foreground">Constant fee (e.g., 0.25%)</p>
              {errors.feeFixedRate && <p className="text-sm text-destructive">{errors.feeFixedRate.message}</p>}
            </div>
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
                  <Input id="launchDate" type="date" value={launchDate} min={getLocalDateString()} onChange={(e) => { setLaunchDate(e.target.value); updateDateTime(e.target.value, launchHour, launchMinute, launchPeriod); }} disabled={isLoading} />
                </div>
                <div className="w-16">
                  <Input id="launchHour" type="number" min="1" max="12" value={launchHour} placeholder="HH" onChange={(e) => setLaunchHour(e.target.value)} disabled={isLoading} className="text-center" />
                </div>
                <span className="text-lg font-bold pb-2">:</span>
                <div className="w-16">
                  <Input id="launchMinute" type="number" min="0" max="59" value={launchMinute} placeholder="MM" onChange={(e) => setLaunchMinute(e.target.value)} disabled={isLoading} className="text-center" />
                </div>
                <div className="w-16">
                  <select id="launchPeriod" value={launchPeriod} onChange={(e) => { const p = e.target.value as "AM" | "PM"; setLaunchPeriod(p); updateDateTime(launchDate, launchHour, launchMinute, p); }} disabled={isLoading} className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-center font-medium">
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            </div>
          )}
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
            <input type="checkbox" id="enableCustomPrivateKey" {...register("enableCustomPrivateKey")} checked={enableCustomPrivateKey} onChange={(e) => setEnableCustomPrivateKey(e.target.checked)} disabled={isLoading} className="h-4 w-4" />
            <Label htmlFor="enableCustomPrivateKey" className="font-semibold">Use Custom Private Key for Token Mint</Label>
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

              <Label htmlFor="customPrivateKey" className="font-semibold">Private Key (JSON Array or Base58 format)</Label>
              <textarea
                id="customPrivateKey"
                placeholder='Either: [1,2,3,...] (64 bytes) OR "5K..." (base58)'
                {...register("customPrivateKey")}
                disabled={isLoading}
                className={`flex min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono ${
                  errors.customPrivateKey ? "border-destructive focus-visible:ring-destructive" : "border-red-300 focus-visible:ring-red-500"
                }`}
              />
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Accepts two formats:<br />
                1. JSON array: [1,2,3,4,...] (64 numbers, 0-255)<br />
                2. Base58: 5K... (base58-encoded string)
              </p>
              {errors.customPrivateKey && <p className="text-sm text-destructive">{errors.customPrivateKey.message}</p>}
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
            <Button type="button" variant="outline" onClick={() => { setShowConfirmModal(false); setPendingSubmitData(null); }} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="button" variant="default" onClick={confirmLaunch} disabled={isLoading} className="w-full sm:w-auto">
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
