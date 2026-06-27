/**
 * Subscript digits used for compact `0.0ₙ1234` notation of tiny numbers.
 */
export const SUBSCRIPT_DIGITS = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"];

/**
 * Format a (possibly tiny) number using `0.0ₙ1234` subscript notation when it
 * has more than 3 leading zeros after the decimal point. Otherwise render as a
 * plain decimal with up to `sigFigs` significant figures.
 *
 * The subscript `ₙ` is a subscript digit representing the count of leading
 * zeros after the decimal point. Used for per-token prices that are often
 * extremely small (e.g. 0.000001234).
 *
 * Rules:
 * - `value <= 0` or not finite  -> `"0"`
 * - `value >= 1`                -> compact plain decimal (no subscript)
 * - leading zeros `<= 3`        -> plain decimal, `sigFigs` significant figures
 * - leading zeros `> 3`         -> `0.0ₙ<sig-digits>` (ₙ = subscript zero count)
 *
 * Examples (sigFigs = 4):
 *   0.001        -> "0.001"
 *   0.0001234    -> "0.0001234"
 *   0.00001234   -> "0.0₄1234"
 *   0.000001234  -> "0.0₅1234"
 *   12.34        -> "12.34"
 *
 * @param value — number to format (typically a per-token price)
 * @param sigFigs — significant digits to keep in both the plain and subscript
 *                  branches. Defaults to 4.
 * @returns formatted string using subscript-zero notation for tiny values
 */
export function formatSubscript(value: number, sigFigs: number = 4): string {
  if (!isFinite(value) || value <= 0) return "0";

  if (value >= 1) {
    if (value >= 1000) return value.toExponential(2);
    if (value >= 100) return value.toFixed(0);
    if (value >= 10) return value.toFixed(1);
    return value.toFixed(2);
  }

  // Count leading zeros after the decimal point.
  const str = value.toFixed(20);
  const fractional = str.split(".")[1] ?? "";
  let leadingZeros = 0;
  for (const ch of fractional) {
    if (ch === "0") leadingZeros++;
    else break;
  }

  if (leadingZeros <= 3) {
    // Plain decimal — up to `sigFigs` significant figures, trailing zeros trimmed.
    return value.toPrecision(sigFigs).replace(/0+$/, "").replace(/\.$/, "");
  }

  // Subscript notation: 0.0ₙ followed by significant digits.
  const significant = fractional.slice(leadingZeros).replace(/0+$/, "").slice(0, sigFigs);
  const subscript = String(leadingZeros)
    .split("")
    .map((d) => SUBSCRIPT_DIGITS[Number(d)] ?? d)
    .join("");
  return `0.0${subscript}${significant}`;
}