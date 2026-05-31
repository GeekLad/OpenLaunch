"use client";

import { Controller, Control } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { NumberInput } from "@/components/ui/number-input";
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { TokenFormSchemaType } from "./schema";

interface FeeScheduleSectionProps {
  control: Control<TokenFormSchemaType>;
  isLoading: boolean;
  watchedQuoteToken: string | undefined;
  watchedFeeMode: "market-cap-based" | "time-based" | "fixed" | undefined;
  symbol: string | undefined;
  allFieldErrors: Record<string, string>;
  isFeeScheduleOpen: boolean;
  setIsFeeScheduleOpen: (open: boolean) => void;
  isFeeModified: boolean;
  resetFeeSchedule: () => void;
}

export function FeeScheduleSection({
  control,
  isLoading,
  watchedQuoteToken,
  watchedFeeMode,
  symbol,
  allFieldErrors,
  isFeeScheduleOpen,
  setIsFeeScheduleOpen,
  isFeeModified,
  resetFeeSchedule,
}: FeeScheduleSectionProps) {
  return (
    <Card>
      <CardHeader
        className="cursor-pointer flex flex-row items-center justify-between"
        onClick={() => setIsFeeScheduleOpen(!isFeeScheduleOpen)}
      >
        <div className="flex items-center gap-2">
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
        {isFeeScheduleOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </CardHeader>
      <CardContent className={cn("space-y-4", !isFeeScheduleOpen && "hidden")}>
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
        </div>

        {/* Fixed Fee sub-fields */}
        <div className={cn("space-y-4", watchedFeeMode !== "fixed" && "hidden")}>
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
      </CardContent>
    </Card>
  );
}
