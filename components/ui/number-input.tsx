"use client";

import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface NumberInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Current numeric value */
  value: number;
  /** Called with the parsed number */
  onChangeValue: (value: number) => void;
  /** Whether to format as integer (no decimals) or allow decimals */
  integer?: boolean;
  /** Number of decimal places to allow (when not integer) */
  decimalPlaces?: number;
  /** Additional formatting suffix, e.g. "%" */
  suffix?: string;
  className?: string;
}

/**
 * Reusable number input with locale-based thousands separators.
 * Displays formatted numbers (e.g., "1,000,000") while maintaining
 * numeric values internally.
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChangeValue, integer = false, decimalPlaces = 4, suffix, className, disabled, ...props }, ref) => {
    const locale = typeof navigator !== "undefined" ? navigator.language : "en-US";

    const formatNumber = (num: number): string => {
      if (integer) {
        return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(num));
      }
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimalPlaces,
      }).format(num);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^\d.]/g, "");
      // Only allow one decimal point
      const parts = raw.split(".");
      const clean = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : raw;
      const num = clean === "" || clean === "." ? 0 : parseFloat(clean);
      onChangeValue(Number.isNaN(num) ? 0 : num);
    };

    const displayValue = value ? formatNumber(value) + (suffix || "") : (suffix || "");

    return (
      <Input
        ref={ref}
        type="text"
        inputMode={integer ? "numeric" : "decimal"}
        value={displayValue}
        onChange={handleChange}
        disabled={disabled}
        className={cn("font-mono", className)}
        {...props}
      />
    );
  }
);

NumberInput.displayName = "NumberInput";
