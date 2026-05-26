# Plan 03-05 Summary: Phase 3 Gap Closure — Fix UAT Issues

## Objective

Address all three UAT gaps identified in `03-UAT.md` so that the Fee Scheduler section uses correct BPS units, displays cross-field validation errors immediately without requiring all required fields first, and enables the Launch Token button when the form is valid.

## What Was Built

### 1. Fixed Defaults and Added Market-Cap Fee Rate Fields
- **`config/defaults.ts`**:
  - Changed `DEFAULT_FEE_END_RATE` from `0.25` (percent) to `25` (basis points).
  - Added `DEFAULT_MARKET_CAP_FEE_START_RATE = 50` and `DEFAULT_MARKET_CAP_FEE_END_RATE = 25`.
  - Spread both new constants into `DEFAULT_LAUNCH_PARAMS`.
- **`components/forms/TokenLaunchForm.tsx`**:
  - Extended `tokenFormSchema` with `feeMarketCapStartRate` and `feeMarketCapEndRate` (`.min(1).max(9900).optional()`).
  - Added both fields to `useForm` `defaultValues`.
  - Rendered two new input groups inside the market-cap-based sub-fields container: **Starting Fee Rate (bps)** and **Ending Fee Rate (bps)** with appropriate helper text, `type="number"`, `inputMode="numeric"`, and error display.
- **`types/fee.ts`**:
  - Added `feeMarketCapStartRate: number` and `feeMarketCapEndRate: number` to the `market-cap-based` arm of `FeeSchedulerConfig`.
- **`confirmLaunch` mapping**:
  - Updated the `market-cap-based` branch to include `feeMarketCapStartRate` and `feeMarketCapEndRate` in the constructed `FeeSchedulerConfig` object.

### 2. Fixed Cross-Field Validation Display
- Added six new `watch()` declarations for fee scheduler fields (`startingMarketCap`, `endingMarketCap`, `feeStartRate`, `feeEndRate`, `feeMarketCapStartRate`, `feeMarketCapEndRate`).
- Created `feeSchedulerError` `useMemo` that computes cross-field errors directly from watched values, bypassing react-hook-form's resolver (mirroring the proven Phase 2 `priceError` pattern):
  - **Market-cap mode**: endingMarketCap ≤ startingMarketCap, and feeMarketCapEndRate > feeMarketCapStartRate.
  - **Time-based mode**: feeEndRate > feeStartRate.
- Added inline JSX conditional rendering next to each affected input to display `feeSchedulerError.message` when the corresponding error condition is met.
- Removed duplicate fee scheduler validation blocks from `superRefine` (lines 99–118), keeping only private-key and price-range validations.

### 3. Audited Defaults Against Schema Constraints
- Manually verified every value in `DEFAULT_LAUNCH_PARAMS` against its corresponding Zod schema constraint.
- Confirmed `feeEndRate = 25` now satisfies `.min(1)` (previously `0.25` violated it, permanently disabling `isValid` and thus the Launch button).
- `npm run build` and `npm run lint` both pass with zero errors.

## Decisions Made

- Replicated the Phase 2 `priceError` bypass pattern for fee scheduler cross-field validation because `superRefine` only runs when the base schema passes. With `mode: "onBlur"`, empty required fields trigger base validation errors, which prevents `superRefine` from ever executing. The `useMemo` approach watches values directly and displays errors immediately.
- Kept the `superRefine` private-key and price-range checks intact — those do not suffer from the same issue because price fields have defaults (they're never empty on first render) and private-key is opt-in.

## Issues Encountered

- None. All changes were surgical and targeted. The root cause (0.25 vs 25) was identified in the UAT phase and confirmed before execution.

## Verification Results

- [x] `DEFAULT_FEE_END_RATE` is `25` (not `0.25`) in `config/defaults.ts`.
- [x] `DEFAULT_LAUNCH_PARAMS` includes `feeMarketCapStartRate: 50` and `feeMarketCapEndRate: 25`.
- [x] The market-cap-based fee scheduler sub-fields show **Starting Fee Rate (bps)** and **Ending Fee Rate (bps)** inputs.
- [x] The `feeSchedulerError` useMemo exists and returns `{ field, message }` objects for:
  - `endingMarketCap ≤ startingMarketCap` (market-cap mode)
  - `feeMarketCapEndRate > feeMarketCapStartRate` (market-cap mode)
  - `feeEndRate > feeStartRate` (time-based mode)
- [x] Inline JSX displays `feeSchedulerError` next to the correct field, matching the `priceError` pattern.
- [x] The `superRefine` fee scheduler blocks are removed; only private-key and price-range validations remain in `superRefine`.
- [x] The Launch Token button (`disabled={isLoading || !isFormValid || !isValid || isValidating}`) is no longer permanently disabled due to a default value failing schema validation.
- [x] `npm run build` completes with zero errors.
- [x] `npm run lint` completes with zero errors.

## Next Phase Readiness

- Phase 3 is now **COMPLETE**.
- All 5 plans (03-01 through 03-05) have been executed and verified.
- Phase 4 (On-Chain Transaction Integration) can begin once planning is complete.
- No blockers remain.

## Self-Check: PASSED

All acceptance criteria from the plan file have been verified and pass.
