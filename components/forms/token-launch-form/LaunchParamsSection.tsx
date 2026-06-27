"use client";

import { Controller, Control, FieldErrors } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { NumberInput } from "@/components/ui/number-input";
import { cn } from "@/lib/utils";
import { formatSubscript } from "@/lib/format";
import { AlertTriangle, CheckCircle2, RotateCcw, SlidersHorizontal } from "lucide-react";
import { TokenFormSchemaType } from "./schema";

interface LaunchParamsSectionProps {
  control: Control<TokenFormSchemaType>;
  errors: FieldErrors<TokenFormSchemaType>;
  isLoading: boolean;
  watchedQuoteToken: string | undefined;
  watchedLocked: number | undefined;
  allFieldErrors: Record<string, string>;
  isModified: boolean;
  isLowLockedLiquidity: boolean;
  resetLaunchParams: () => void;
  watchedSupply: number | undefined;
  watchedInitialMcap: number | undefined;
  watchedMax: number | undefined;
}

/**
 * Format a market-cap value as a per-token price readout, using the shared
 * `0.0ₙ1234` subscript notation for tiny prices so the field matches the
 * fee-schedule chart's price axis exactly.
 */
function formatPricePerToken(marketCap: number | undefined, supply: number | undefined, quoteSymbol: string): string {
  const safeSupply = supply && supply > 0 ? supply : 1;
  const price = (marketCap ?? 0) / safeSupply;
  if (price === 0) return `≈ 0 ${quoteSymbol} / token`;
  return `≈ ${formatSubscript(price, 4)} ${quoteSymbol} / token`;
}

function formatMultiplier(initial: number | undefined, max: number | undefined): string {
  const safeInitial = initial && initial > 0 ? initial : 1;
  const multiple = (max ?? 0) / safeInitial;
  if (multiple < 1) return "";
  if (multiple >= 1000) return `${Math.round(multiple).toLocaleString()}×`;
  if (Number.isInteger(multiple)) return `${multiple}×`;
  return `${multiple.toFixed(1)}×`;
}

export function LaunchParamsSection({
  control,
  errors,
  isLoading,
  watchedQuoteToken,
  watchedLocked,
  allFieldErrors,
  isModified,
  isLowLockedLiquidity,
  resetLaunchParams,
  watchedSupply,
  watchedInitialMcap,
  watchedMax,
}: LaunchParamsSectionProps) {
  const quoteSymbol = watchedQuoteToken === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" ? "USDC" : "SOL";
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Launch Parameters</CardTitle>
          {isModified && (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
              Modified
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  resetLaunchParams();
                }}
                className="ml-1 rounded-sm hover:bg-slate-200 p-0.5 transition-colors"
                title="Reset to defaults"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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

        {/* Initial Market Cap + Max Market Cap (side by side) */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="initialMarketCap">
              Initial Market Cap {watchedQuoteToken === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" ? "(in USDC)" : "(in SOL)"}
            </Label>
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
            <p className="text-sm text-blue-500">{formatPricePerToken(watchedInitialMcap, watchedSupply, quoteSymbol)}</p>
            {errors.initialMarketCap && <p className="text-sm text-destructive">{errors.initialMarketCap.message}</p>}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="marketCapRangeMax">
                Max Market Cap {watchedQuoteToken === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" ? "(in USDC)" : "(in SOL)"}
              </Label>
              {watchedInitialMcap && watchedMax && watchedMax >= watchedInitialMcap && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  {formatMultiplier(watchedInitialMcap, watchedMax)}
                </span>
              )}
            </div>
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
            <p className="text-sm text-blue-500">{formatPricePerToken(watchedMax, watchedSupply, quoteSymbol)}</p>
            {allFieldErrors["marketCapRangeMax"] && <p className="text-sm text-destructive">{allFieldErrors["marketCapRangeMax"]}</p>}
          </div>
        </div>

        {/* Locked Liquidity Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="lockedLiquidityPercentage">Locked Liquidity</Label>
            <span className={`text-sm font-bold ${isLowLockedLiquidity ? "text-red-500" : "text-green-500"}`}>
              {watchedLocked ?? 100}%
            </span>
          </div>
          <Controller
            name="lockedLiquidityPercentage"
            control={control}
            render={({ field: { onChange, value } }) => (
              <Slider
                id="lockedLiquidityPercentage"
                min={50}
                max={100}
                step={1}
                value={[value ?? 100]}
                onValueChange={([val]) => onChange(val)}
                disabled={isLoading}
                trackClassName="bg-secondary"
                rangeClassName={isLowLockedLiquidity ? "bg-red-500" : "bg-green-500"}
                thumbClassName={isLowLockedLiquidity ? "bg-red-500" : "bg-green-500"}
              />
            )}
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>50%</span>
            <span>60%</span>
            <span>70%</span>
            <span>80%</span>
            <span>90%</span>
            <span>100%</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Percentage of supply sent to the liquidity pool. Remainder goes to the creator&apos;s wallet.
          </p>
          <Alert
            className={cn(
              "flex items-start gap-3",
              isLowLockedLiquidity
                ? "border-red-500/30 bg-red-950/40 text-red-400"
                : "border-green-500/30 bg-green-950/40 text-green-400"
            )}
          >
            {isLowLockedLiquidity ? (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
            )}
            <div>
              <AlertTitle className={isLowLockedLiquidity ? "text-red-500" : "text-green-500"}>
                {isLowLockedLiquidity
                  ? "Locking less than 90% of liquidity may be seen as a red flag by traders"
                  : `Liquidity locked at ${watchedLocked ?? 100}% — meets the recommended threshold.`}
              </AlertTitle>
              <AlertDescription className={isLowLockedLiquidity ? "text-red-400" : "text-green-400"}>
                {isLowLockedLiquidity
                  ? "Raise to 90% or above to meet the standard threshold for trusted launches."
                  : "Traders will see this as a strong trust signal."}
              </AlertDescription>
            </div>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}
