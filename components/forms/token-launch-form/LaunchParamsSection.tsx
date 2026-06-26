"use client";

import { Controller, Control, FieldErrors } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { NumberInput } from "@/components/ui/number-input";
import { AlertTriangle, RotateCcw, SlidersHorizontal } from "lucide-react";
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
}: LaunchParamsSectionProps) {
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
            <p className="text-sm text-muted-foreground">Market cap at launch</p>
            {errors.initialMarketCap && <p className="text-sm text-destructive">{errors.initialMarketCap.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="marketCapRangeMax">
              Max Market Cap {watchedQuoteToken === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" ? "(in USDC)" : "(in SOL)"}
            </Label>
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
            <p className="text-sm text-muted-foreground">Max market cap for pool liquidity</p>
            {allFieldErrors["marketCapRangeMax"] && <p className="text-sm text-destructive">{allFieldErrors["marketCapRangeMax"]}</p>}
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
  );
}
