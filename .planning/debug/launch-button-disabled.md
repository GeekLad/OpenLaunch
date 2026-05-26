# Debug Session: Launch Button Disabled

**Gap:** Launch Token button is enabled when form is valid, allowing user to open confirmation modal
**Test:** 9 (Launch Confirmation Modal)
**Severity:** blocker

## Symptoms

- Launch Token button is permanently disabled
- Cannot proceed to confirmation modal
- Server-side validation flow (Test 10) is blocked

## Root Cause

**Cascading failure from Gap 1:**

1. `DEFAULT_FEE_END_RATE = 0.25` in `config/defaults.ts` (line 32)
2. Form defaultValues sets `feeEndRate: DEFAULT_LAUNCH_PARAMS.feeEndRate` (0.25)
3. Schema constraint: `feeEndRate: z.number().min(1).max(9900).optional()`
4. `0.25 < 1` → schema validation **permanently fails**
5. `formState.isValid` is always `false`
6. Button is `disabled={!isValid}` → permanently disabled

**Secondary issue:** Even if the default is fixed, the button also uses `disabled={!isFormValid || !isValid || isValidating}`. `isFormValid` checks `symbol && name && logoFile && !fileSizeWarning`, but `isValid` from react-hook-form is the gatekeeper.

## Evidence

- `config/defaults.ts` line 32: `DEFAULT_FEE_END_RATE = 0.25`
- `components/forms/TokenLaunchForm.tsx` line 166: `feeEndRate: DEFAULT_LAUNCH_PARAMS.feeEndRate` in defaultValues
- `components/forms/TokenLaunchForm.tsx` line 42: `feeEndRate: z.number().min(1).max(9900).optional()`
- `components/forms/TokenLaunchForm.tsx` line 1233: `disabled={isLoading || !isFormValid || !isValid || isValidating}`

## Fix Direction

1. **Primary fix:** Change `DEFAULT_FEE_END_RATE` from `0.25` to `25`
2. **Verification:** Check all other defaults against their schema constraints:
   - `feeStartRate` (50) — passes min(1).max(9900) ✅
   - `feeFixedRate` (25) — passes min(1).max(9900) ✅
   - `holdbackPercentage` (0) — passes min(0).max(100) ✅
   - `startingMarketCap` (1000) — passes min(0) ✅
   - `endingMarketCap` (100000) — passes min(0) ✅
   - `feeDurationHours` (1) — passes min(1) ✅
3. **Defensive:** Consider adding a runtime check or unit test that verifies all DEFAULT_LAUNCH_PARAMS values pass the schema
