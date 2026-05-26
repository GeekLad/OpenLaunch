# Debug Session: Fee End Rate Unit Confusion

**Gap:** Fee scheduler sub-fields display correctly and use appropriate units (BPS vs percent)
**Test:** 5 (Fee Scheduler Mode Selection)
**Severity:** minor

## Symptoms

- Time-Based Fee End Rate shows "0.25" instead of "25" (expected BPS value)
- Market-Cap Based mode has no starting/ending fee rate fields

## Root Cause

1. **Unit confusion in defaults:** `config/defaults.ts` line 32 defines:
   ```typescript
   export const DEFAULT_FEE_END_RATE = 0.25;
   ```
   This is 0.25% (percent), but the schema expects basis points (BPS). 25 BPS = 0.25%. The default should be `25`.

2. **Schema mismatch:** `tokenFormSchema` defines:
   ```typescript
   feeEndRate: z.number().min(1).max(9900).optional()
   ```
   This expects BPS (1-9900), but default is 0.25, which violates min(1).

3. **Missing market-cap fee rate fields:** The Market-Cap Based sub-field container (line 770 of TokenLaunchForm.tsx) only shows `startingMarketCap` and `endingMarketCap`, but the SDK `getFeeMarketCapSchedulerParams()` also requires fee rates.

## Evidence

- `config/defaults.ts` line 32: `DEFAULT_FEE_END_RATE = 0.25`
- `config/defaults.ts` line 59: `feeEndRate: DEFAULT_FEE_END_RATE` in DEFAULT_LAUNCH_PARAMS
- `components/forms/TokenLaunchForm.tsx` line 41: `feeEndRate: z.number().min(1).max(9900).optional()`
- `components/forms/TokenLaunchForm.tsx` line 770-798: Market-cap container lacks fee rate inputs

## Fix Direction

1. Change `DEFAULT_FEE_END_RATE` from `0.25` to `25`
2. Add `DEFAULT_MARKET_CAP_FEE_START_RATE` and `DEFAULT_MARKET_CAP_FEE_END_RATE` to defaults
3. Add fee rate inputs inside the market-cap-based sub-field container
4. Update helper text to clarify BPS units consistently
