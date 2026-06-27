"use client";

import { useState } from "react";
import { Controller, Control } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { NumberInput } from "@/components/ui/number-input";
import { Percent, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { TokenFormSchemaType } from "./schema";
import { FeeScheduleChart, type XAxisMode, type XScaleMode } from "./FeeScheduleChart";

interface FeeScheduleSectionProps {
  control: Control<TokenFormSchemaType>;
  isLoading: boolean;
  watchedQuoteToken: string | undefined;
  watchedFeeMode: "market-cap-based" | "time-based" | "fixed" | undefined;
  symbol: string | undefined;
  allFieldErrors: Record<string, string>;
  isFeeModified: boolean;
  resetFeeSchedule: () => void;
  watchedFeeMcapStartRate: number | undefined;
  watchedFeeMcapEndRate: number | undefined;
  watchedTimeStartRate: number | undefined;
  watchedTimeEndRate: number | undefined;
  watchedFeeDuration: number | undefined;
  watchedFeeFixed: number | undefined;
  watchedSupply: number | undefined;
  watchedStartMcap: number | undefined;
  watchedEndMcap: number | undefined;
}

export function FeeScheduleSection({
  control,
  isLoading,
  watchedQuoteToken,
  watchedFeeMode,
  symbol,
  allFieldErrors,
  isFeeModified,
  resetFeeSchedule,
  watchedFeeMcapStartRate,
  watchedFeeMcapEndRate,
  watchedTimeStartRate,
  watchedTimeEndRate,
  watchedFeeDuration,
  watchedFeeFixed,
  watchedSupply,
  watchedStartMcap,
  watchedEndMcap,
}: FeeScheduleSectionProps) {
  const quoteTokenSymbol = watchedQuoteToken === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" ? "USDC" : "SOL";
  const showChart = watchedFeeMode === "market-cap-based" || watchedFeeMode === "time-based" || watchedFeeMode === "fixed";
  const [xAxisMode, setXAxisMode] = useState<XAxisMode>("marketCap");
  const [xScaleMode, setXScaleMode] = useState<XScaleMode>("log");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Percent className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Fee Schedule</CardTitle>
          {isFeeModified && (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
              Modified
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  resetFeeSchedule();
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
        {watchedFeeMode === "fixed" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                render={({ field: { onChange, value } }) => {
                  const quoteSymbol = watchedQuoteToken === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" ? "USDC" : "SOL";
                  const baseLabel = symbol?.trim() || "Token";
                  return (
                    <Select value={value} onValueChange={onChange} disabled={isLoading}>
                      <SelectTrigger id="feeTokenMode" className="w-full">
                        <SelectValue placeholder="Select fee token mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quoteOnly">{quoteSymbol} Only</SelectItem>
                        <SelectItem value="both">{quoteSymbol} + {baseLabel}</SelectItem>
                      </SelectContent>
                    </Select>
                  );
                }}
              />
            </div>
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
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-stretch">
            {/* Column 1: Fee Scheduler Mode + Fee Token Mode */}
            <div className="flex flex-col gap-4">
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
                  render={({ field: { onChange, value } }) => {
                    const quoteSymbol = watchedQuoteToken === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" ? "USDC" : "SOL";
                    const baseLabel = symbol?.trim() || "Token";
                    return (
                      <Select value={value} onValueChange={onChange} disabled={isLoading}>
                        <SelectTrigger id="feeTokenMode" className="w-full">
                          <SelectValue placeholder="Select fee token mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="quoteOnly">{quoteSymbol} Only</SelectItem>
                          <SelectItem value="both">{quoteSymbol} + {baseLabel}</SelectItem>
                        </SelectContent>
                      </Select>
                    );
                  }}
                />
              </div>
            </div>

          {/* Column 2: Live fee schedule visualization */}
          {showChart && (
            <div className="flex flex-col rounded-md border border-border bg-card/40 p-3">
              {watchedFeeMode === "market-cap-based" && (
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setXAxisMode("marketCap")}
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                        xAxisMode === "marketCap"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      Market Cap
                    </button>
                    <button
                      type="button"
                      onClick={() => setXAxisMode("price")}
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                        xAxisMode === "price"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      Price
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setXScaleMode("linear")}
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                        xScaleMode === "linear"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      Linear
                    </button>
                    <button
                      type="button"
                      onClick={() => setXScaleMode("log")}
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                        xScaleMode === "log"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      Log
                    </button>
                  </div>
                </div>
              )}
              <div className="h-[200px] sm:h-[250px]">
                <FeeScheduleChart
                  feeMode={watchedFeeMode}
                  startingMarketCap={watchedStartMcap}
                  endingMarketCap={watchedEndMcap}
                  feeMarketCapStartRate={watchedFeeMcapStartRate}
                  feeMarketCapEndRate={watchedFeeMcapEndRate}
                  quoteTokenSymbol={quoteTokenSymbol}
                  quoteTokenMint={watchedQuoteToken}
                  feeStartRate={watchedTimeStartRate}
                  feeEndRate={watchedTimeEndRate}
                  feeDurationHours={watchedFeeDuration}
                  feeFixedRate={watchedFeeFixed}
                  totalSupply={watchedSupply}
                  xAxisMode={watchedFeeMode === "market-cap-based" ? xAxisMode : undefined}
                  xScaleMode={xScaleMode}
                />
              </div>
            </div>
          )}
        </div>
        )}

        {/* Market-Cap Based sub-fields */}
        <div className={cn("space-y-4", watchedFeeMode !== "market-cap-based" && "hidden")}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startingMarketCap">
                Starting Market Cap {watchedQuoteToken === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" ? "(in USDC)" : "(in SOL)"}
              </Label>
              <Controller
                name="startingMarketCap"
                control={control}
                render={({ field: { onChange, value, onBlur } }) => (
                  <NumberInput value={value ?? 0} onChangeValue={onChange} integer onBlur={onBlur} disabled={isLoading} />
                )}
              />
              <p className="text-sm text-muted-foreground">Must be &gt;= initial market cap</p>
              {allFieldErrors["startingMarketCap"] && <p className="text-sm text-destructive">{allFieldErrors["startingMarketCap"]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endingMarketCap">
                Ending Market Cap {watchedQuoteToken === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" ? "(in USDC)" : "(in SOL)"}
              </Label>
              <Controller
                name="endingMarketCap"
                control={control}
                render={({ field: { onChange, value, onBlur } }) => (
                  <NumberInput value={value ?? 0} onChangeValue={onChange} integer onBlur={onBlur} disabled={isLoading} />
                )}
              />
              <p className="text-sm text-muted-foreground">Must be &lt;= pool max market cap</p>
              {allFieldErrors["endingMarketCap"] && <p className="text-sm text-destructive">{allFieldErrors["endingMarketCap"]}</p>}
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
              <p className="text-sm text-muted-foreground">Max fee at starting market cap (e.g., 50%)</p>
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
              <p className="text-sm text-muted-foreground">Min fee at ending market cap (e.g., 0.5%)</p>
            </div>
          </div>
        </div>

        {/* Time-Based sub-fields */}
        <div className={cn("space-y-4", watchedFeeMode !== "time-based" && "hidden")}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="feeStartRate">Fee Start Rate (%)</Label>
              <Controller
                name="feeStartRate"
                control={control}
                render={({ field: { onChange, value, onBlur } }) => (
                  <NumberInput value={value ?? 0} onChangeValue={onChange} decimalPlaces={2} suffix="%" onBlur={onBlur} disabled={isLoading} />
                )}
              />
              <p className="text-sm text-muted-foreground">Starting fee (e.g., 50%)</p>
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
              <p className="text-sm text-muted-foreground">Ending fee (e.g., 0.5%)</p>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
