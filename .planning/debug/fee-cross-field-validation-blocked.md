# Debug Session: Fee Cross-Field Validation Blocked

**Gap:** Cross-field validation errors display immediately without requiring all required fields to be filled first
**Test:** 8 (Cross-Field Validation)
**Severity:** major

## Symptoms

- Ending Market Cap <= Starting Market Cap shows no error until name/symbol/logo are filled
- Fee End Rate > Fee Start Rate shows no error until name/symbol/logo are filled

## Root Cause

Zod `superRefine` is a post-processing step that runs **after** the base `.object()` schema passes. The base schema has `.min(1)` on `symbol` and `name`, and `z.instanceof(File)` on `logoFile`. When these are empty:

1. Base schema fails with required-field errors
2. `superRefine` never executes
3. Cross-field validation errors (market cap ordering, fee rate ordering) are silently skipped

**Phase 2 already solved this for price range** with the `priceError` useMemo pattern (lines 206-217), which watches `watchedMin`, `watchedInitial`, `watchedMax` and displays inline errors completely outside react-hook-form's error object. But Phase 3 did not apply the same pattern to fee scheduler cross-field validations.

## Evidence

- `components/forms/TokenLaunchForm.tsx` lines 53-117: `superRefine` with fee scheduler checks
- `components/forms/TokenLaunchForm.tsx` lines 206-217: `priceError` useMemo — the working pattern
- `components/forms/TokenLaunchForm.tsx` lines 100-116: market cap and fee rate checks inside superRefine (never run when required fields empty)

## Fix Direction

1. Create `feeSchedulerError` useMemo (following `priceError` pattern) that watches:
   - `watchedStartingMarketCap`, `watchedEndingMarketCap` (for market-cap mode)
   - `watchedFeeStartRate`, `watchedFeeEndRate` (for time-based mode)
2. Display `feeSchedulerError` inline next to relevant fields via conditional JSX (like `priceError`)
3. Consider removing fee scheduler checks from `superRefine` to avoid double-validation, OR keep them as a second line of defense for submit-time validation only
