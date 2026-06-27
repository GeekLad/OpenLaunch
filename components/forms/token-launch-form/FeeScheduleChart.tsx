"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { QUOTE_TOKEN_DECIMALS } from "@/config/defaults";
import { formatSubscript } from "@/lib/format";

type FeeMode = "market-cap-based" | "time-based" | "fixed";
type DecayMode = "linear" | "exponential";

/**
 * X-axis display mode for the market-cap-based scheduler.
 * - `marketCap`: x-axis shows market cap (e.g. 1K, 1M).
 * - `price`:    x-axis shows price per token using subscript-zero notation
 *               (e.g. 0.0₅123) when the value has more than 3 leading zeros.
 */
export type XAxisMode = "marketCap" | "price";
export type XScaleMode = "linear" | "log";

interface FeeScheduleChartProps {
  feeMode: FeeMode | undefined;
  decayMode?: DecayMode;
  // Market-cap-based
  startingMarketCap?: number;
  endingMarketCap?: number;
  feeMarketCapStartRate?: number;
  feeMarketCapEndRate?: number;
  quoteTokenSymbol: string;
  quoteTokenMint?: string;
  totalSupply?: number;
  xAxisMode?: XAxisMode;
  xScaleMode?: XScaleMode;
  // Time-based
  feeStartRate?: number;
  feeEndRate?: number;
  feeDurationHours?: number;
  // Fixed
  feeFixedRate?: number;
}

// Number of fee-scheduler periods. Matches DEFAULT_NUMBER_OF_PERIODS in the
// Meteora SDK (config/defaults.ts) so the chart reproduces the on-chain decay.
const NUM_PERIODS = 60;

/**
 * Compact formatter for market cap values on the x-axis.
 * 1234 -> "1.2K", 1_200_000 -> "1.2M", 800_000_000 -> "800M"
 */
function formatMcapTick(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(value % 1_000_000_000 === 0 ? 0 : 1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)}K`;
  }
  return String(value);
}

/**
 * Format a small price value for chart tick labels using `0.0ₙ1234` subscript
 * notation for tiny values. Delegates to the shared `formatSubscript` helper
 * so the chart axis and the launch-params price readouts render identically.
 *
 * @param value — price per token (price = marketCap / totalSupply)
 * @returns formatted tick label string
 */
function formatPriceTick(value: number): string {
  return formatSubscript(value, 4);
}

interface TimeAxisUnit {
  unit: "min" | "hr" | "day";
  label: string;
  divisor: number;
  tickFormatter: (value: number) => string;
  logTickFormatter: (value: number) => string;
}

/**
 * Pick the most human-readable time unit based on the total duration (in minutes).
 * - <= 60 min  -> minutes
 * - <= 24 h    -> hours
 * - otherwise  -> days
 */
function pickTimeUnit(durationMinutes: number): TimeAxisUnit {
  if (durationMinutes <= 60) {
    return {
      unit: "min",
      label: "Minutes",
      divisor: 1,
      tickFormatter: (v) => `${Math.round(v)}m`,
      logTickFormatter: (v) => (v < 1 ? `${Math.round(v * 100) / 100}m` : `${Math.round(v)}m`),
    };
  }
  if (durationMinutes <= 60 * 24) {
    return {
      unit: "hr",
      label: "Hours",
      divisor: 60,
      tickFormatter: (v) => `${v % 1 === 0 ? v : v.toFixed(1)}h`,
      logTickFormatter: (v) => (v < 1 ? `${Math.round(v * 100) / 100}h` : `${Math.round(v)}h`),
    };
  }
  return {
    unit: "day",
    label: "Days",
    divisor: 60 * 24,
    tickFormatter: (v) => `${v % 1 === 0 ? v : v.toFixed(1)}d`,
    logTickFormatter: (v) => (v < 1 ? `${Math.round(v * 100) / 100}d` : `${Math.round(v)}d`),
  };
}

interface ChartDatum {
  x: number;
  xLabel: string;
  fee: number;
}

/**
 * Compute the fee at a given period `p` (0..numPeriods) using the same math as
 * the Meteora SDK (src/math/poolFees/baseFee/feeScheduler.ts).
 *
 * Exponential: fee(p) = startBps * (endBps/startBps)^(p/N)
 * Linear:      fee(p) = startBps - p * (startBps - endBps) / N
 *
 * @param startRate — starting fee rate (in percent)
 * @param endRate   — ending fee rate (in percent)
 * @param p         — period index, 0..numPeriods
 * @param numPeriods — total number of periods
 * @param decayMode — 'exponential' | 'linear'
 * @returns fee rate (percent) at period p
 */
function feeAtPeriod(
  startRate: number,
  endRate: number,
  p: number,
  numPeriods: number,
  decayMode: DecayMode
): number {
  if (decayMode === "linear") {
    return startRate - (p / numPeriods) * (startRate - endRate);
  }
  // Exponential — mirrors the SDK's reductionFactor / decayBase math.
  // decayBase = (end/start)^(1/N); fee(p) = start * decayBase^p.
  const ratio = startRate > 0 ? endRate / startRate : 0;
  const decayBase = Math.pow(ratio, 1 / numPeriods);
  return startRate * Math.pow(decayBase, p);
}

/**
 * Build the step-curve data points for a market-cap-based schedule.
 *
 * The SDK spaces periods across the **sqrt-price** range, so market cap is
 * mapped exponentially across periods: mcap(p) = start * (end/start)^(p/N).
 * This produces the concave decay curve shown on Meteora's DAMMv2 page.
 *
 * When `xAxisMode` is `"price"`, x is the per-token price. The price matches
 * the SDK's human-readable price (what `getPriceFromSqrtPrice` returns and
 * what Meteora's UI displays):
 *
 *   price = (marketCap / totalSupply) * 10^(baseDecimals - quoteDecimals)
 *
 * The `10^(baseDecimals - quoteDecimals)` factor accounts for the decimal
 * difference between the base token (default 9) and the quote token (SOL=9,
 * USDC=6). Without it, USDC-quoted prices are off by 10^(9-6) = 1000×.
 * Tick labels use `0.0ₙ123` subscript notation for tiny values.
 */
function buildMarketCapData(
  startMcap: number,
  endMcap: number,
  startRate: number,
  endRate: number,
  decayMode: DecayMode,
  xAxisMode: XAxisMode,
  totalSupply: number,
  priceFactor: number
): ChartDatum[] {
  const safeStart = startMcap > 0 ? startMcap : 1;
  const safeEnd = endMcap > safeStart ? endMcap : safeStart + 1;
  const safeStartRate = startRate > 0 ? startRate : 0;
  const safeEndRate = endRate >= 0 ? endRate : 0;
  const safeSupply = totalSupply > 0 ? totalSupply : 1;

  const priceMultiple = safeEnd / safeStart;
  const usePrice = xAxisMode === "price";
  const data: ChartDatum[] = [];
  for (let p = 0; p <= NUM_PERIODS; p++) {
    // Exponential x-axis spacing (SDK uses sqrt-price steps).
    const mcap = safeStart * Math.pow(priceMultiple, p / NUM_PERIODS);
    const fee = feeAtPeriod(safeStartRate, safeEndRate, p, NUM_PERIODS, decayMode);
    if (usePrice) {
      const price = (mcap / safeSupply) * priceFactor;
      data.push({ x: price, xLabel: formatPriceTick(price), fee });
    } else {
      data.push({ x: mcap, xLabel: formatMcapTick(mcap), fee });
    }
  }
  return data;
}

/**
 * Build the step-curve data points for a time-based schedule.
 *
 * The SDK spaces periods evenly in time, so x is the real elapsed time in the
 * chosen unit. When `xScaleMode` is `"log"`, the *axis* is rendered on a log
 * scale (compressing later times) while the data points keep their true time
 * values. Because a log scale cannot plot zero, the first sample (t=0) is
 * clamped to one period so the start of the curve stays visible.
 * `x` is stored in the chosen unit (min/hr/day) for axis tick formatting.
 */
function buildTimeData(
  durationMinutes: number,
  startRate: number,
  endRate: number,
  unit: TimeAxisUnit,
  decayMode: DecayMode,
  xScaleMode: XScaleMode
): ChartDatum[] {
  const safeDuration = durationMinutes > 0 ? durationMinutes : 1;
  const totalInUnit = safeDuration / unit.divisor;
  const safeStartRate = startRate > 0 ? startRate : 0;
  const safeEndRate = endRate >= 0 ? endRate : 0;
  // Smallest positive time we are willing to plot — log(0) is undefined, so
  // the t=0 sample is nudged up to a single period in log mode.
  const minX = totalInUnit / NUM_PERIODS;

  const data: ChartDatum[] = [];
  for (let p = 0; p <= NUM_PERIODS; p++) {
    const progress = p / NUM_PERIODS;
    let xVal = totalInUnit * progress;
    if (xScaleMode === "log" && xVal < minX) xVal = minX;
    const fee = feeAtPeriod(safeStartRate, safeEndRate, p, NUM_PERIODS, decayMode);
    data.push({ x: xVal, xLabel: unit.tickFormatter(xVal), fee });
  }
  return data;
}

function buildFixedData(rate: number): ChartDatum[] {
  const safeRate = rate > 0 ? rate : 0;
  // A flat line across an arbitrary 0..1 axis.
  return [
    { x: 0, xLabel: "0", fee: safeRate },
    { x: 1, xLabel: "1", fee: safeRate },
  ];
}

interface FeeTooltipPayload {
  payload: ChartDatum;
}

interface FeeTooltipProps {
  active?: boolean;
  payload?: FeeTooltipPayload[];
  axisLabel: string;
  quoteTokenSymbol: string;
  feeMode: FeeMode | undefined;
  xAxisMode: XAxisMode;
}

function FeeTooltip({
  active,
  payload,
  axisLabel,
  quoteTokenSymbol,
  feeMode,
  xAxisMode,
}: FeeTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0].payload;
  const usePrice = feeMode === "market-cap-based" && xAxisMode === "price";
  const xDisplay =
    feeMode === "market-cap-based"
      ? usePrice
        ? `${quoteTokenSymbol} ${formatPriceTick(datum.x)}`
        : `${quoteTokenSymbol} ${formatMcapTick(datum.x)}`
      : feeMode === "time-based"
        ? datum.xLabel
        : "";
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">
        {feeMode === "market-cap-based" ? (usePrice ? "Price" : "Market Cap") : feeMode === "time-based" ? axisLabel : "Fee"}
        {xDisplay && `: ${xDisplay}`}
      </p>
      <p className="text-muted-foreground">
        Fee: <span className="font-medium text-foreground">{datum.fee.toFixed(2)}%</span>
      </p>
    </div>
  );
}

export function FeeScheduleChart({
  feeMode,
  decayMode = "exponential",
  startingMarketCap,
  endingMarketCap,
  feeMarketCapStartRate,
  feeMarketCapEndRate,
  quoteTokenSymbol,
  quoteTokenMint,
  totalSupply,
  xAxisMode = "marketCap",
  feeStartRate,
  feeEndRate,
  feeDurationHours,
  feeFixedRate,
  xScaleMode = "log",
}: FeeScheduleChartProps) {
  const { data, xAxisLabel, xDataKey, xTickFormatter, xDomain, xScale } = useMemo(() => {
    const mode: FeeMode = feeMode ?? "fixed";
    if (mode === "market-cap-based") {
      const start = startingMarketCap ?? 0;
      const end = endingMarketCap ?? 0;
      const startRate = feeMarketCapStartRate ?? 0;
      const endRate = feeMarketCapEndRate ?? 0;
      const supply = totalSupply ?? 1;
      const usePrice = xAxisMode === "price";
      const xMinRaw = start > 0 ? start : 1;
      const xMaxRaw = end > start ? end : start + 1;
      // SDK human price = (mcap / supply) * 10^(baseDecimals - quoteDecimals).
      // Base token defaults to 9 decimals (DEFAULT_DECIMALS); quote decimals
      // come from the selected quote-token mint. SOL (9) => factor 1,
      // USDC (6) => factor 1000.
      const quoteDecimals = quoteTokenMint ? (QUOTE_TOKEN_DECIMALS[quoteTokenMint] ?? 9) : 9;
      const priceFactor = Math.pow(10, 9 - quoteDecimals);
      return {
        data: buildMarketCapData(start, end, startRate, endRate, decayMode, xAxisMode, supply, priceFactor),
        xAxisLabel: usePrice ? `Price (${quoteTokenSymbol})` : `Market Cap (${quoteTokenSymbol})`,
        xDataKey: "x" as const,
        xTickFormatter: usePrice ? (v: number) => formatPriceTick(v) : (v: number) => formatMcapTick(v),
        xDomain: [
          usePrice ? (xMinRaw / supply) * priceFactor : xMinRaw,
          usePrice ? (xMaxRaw / supply) * priceFactor : xMaxRaw,
        ] as [number, number],
        xScale: xScaleMode as "log" | "linear",
      };
    }
    if (mode === "time-based") {
      const durationMinutes = (feeDurationHours ?? 1) * 60;
      const startRate = feeStartRate ?? 0;
      const endRate = feeEndRate ?? 0;
      const unit = pickTimeUnit(durationMinutes);
      const totalInUnit = durationMinutes / unit.divisor;
      // Time-based fee schedule is always linear in real time; the log x-axis
      // is intentionally disabled because it distorts the exponential decay curve.
      return {
        data: buildTimeData(durationMinutes, startRate, endRate, unit, decayMode, "linear"),
        xAxisLabel: unit.label,
        xDataKey: "x" as const,
        xTickFormatter: (v: number) => unit.tickFormatter(v),
        xDomain: [0, totalInUnit] as [number, number],
        xScale: "linear" as const,
      };
    }
    // fixed
    return {
      data: buildFixedData(feeFixedRate ?? 0),
      xAxisLabel: "Fixed",
      xDataKey: "x" as const,
      xTickFormatter: () => "",
      xDomain: [0, 1] as [number, number],
      xScale: "linear" as const,
    };
  }, [
    feeMode,
    decayMode,
    startingMarketCap,
    endingMarketCap,
    feeMarketCapStartRate,
    feeMarketCapEndRate,
    feeStartRate,
    feeEndRate,
    feeDurationHours,
    feeFixedRate,
    quoteTokenSymbol,
    quoteTokenMint,
    totalSupply,
    xAxisMode,
    xScaleMode,
  ]);

  // Y-axis domain: pad a small headroom above the max fee.
  const maxFee = useMemo(() => {
    const peak = Math.max(...data.map((d) => d.fee), 1);
    return Math.ceil(peak * 1.1 * 10) / 10;
  }, [data]);

  const gradientId = "feeScheduleGradient";

  return (
    <div className="flex h-full w-full flex-col" aria-label="Fee schedule visualization">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Fee Rate (%)</span>
        <span className="text-xs text-muted-foreground">{xAxisLabel}</span>
      </div>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.35} />
                <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
            <XAxis
              dataKey={xDataKey}
              domain={xDomain}
              scale={xScale}
              type="number"
              tickFormatter={xTickFormatter}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              stroke="hsl(var(--border))"
              tickMargin={8}
              minTickGap={24}
              allowDataOverflow
            />
            <YAxis
              domain={[0, maxFee]}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              stroke="hsl(var(--border))"
              width={36}
              tickFormatter={(v: number) => `${v}%`}
              allowDecimals
            />
            <Tooltip
              content={
                <FeeTooltip
                  axisLabel={xAxisLabel}
                  quoteTokenSymbol={quoteTokenSymbol}
                  feeMode={feeMode}
                  xAxisMode={xAxisMode}
                />
              }
              cursor={{ stroke: "hsl(var(--chart-1))", strokeWidth: 1, strokeDasharray: "3 3" }}
            />
            <Area
              type="step"
              dataKey="fee"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              isAnimationActive={false}
              name="Fee"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}