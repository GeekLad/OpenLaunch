# Plan 04-02 Summary: Wire Fee Scheduler Modes and CollectFeeMode

## Objective

Map the user's `FeeSchedulerConfig` discriminated union to the correct Meteora SDK constructors (`getFeeMarketCapSchedulerParams` or `getFeeTimeSchedulerParams`), pass `feeTokenMode` through to `CollectFeeMode`, and add `decayMode` sub-field to market-cap-based branch.

## What Changed

### types/fee.ts
- Added `decayMode?: 'linear' | 'exponential'` (default `'exponential'`) to `market-cap-based` branch of `FeeSchedulerConfig`.

### lib/solana/poolUtils.ts
- Added `getFeeMarketCapSchedulerParams` and `CollectFeeMode` imports from `@meteora-ag/cp-amm-sdk`.
- Added `FeeSchedulerConfig` import from `@/types/fee`.
- Replaced legacy `CreatePoolParams.feeSchedule` with `feeSchedulerConfig?: FeeSchedulerConfig` and `collectFeeMode?: CollectFeeMode`.
- Replaced the old `if (feeSchedule?.enabled)` block with branching logic:
  - `market-cap-based`: calls `getFeeMarketCapSchedulerParams(startBps, endBps, baseFeeMode, numberOfPeriod, priceMultiple, schedulerExpirationDuration)` with computed `priceMultiple` and 1-year default `schedulerExpirationDuration`.
  - `time-based`: calls `getFeeTimeSchedulerParams(...)` with user inputs.
  - `fixed`: calls `getFeeTimeSchedulerParams(fixedBps, fixedBps, FeeTimeSchedulerLinear, 0, 0)`.
- `createCustomPool` now uses `collectFeeMode ?? CollectFeeMode.OnlyB` instead of hardcoded `CollectFeeMode.OnlyB`.

### lib/services/launchService.ts
- Removed `feeSchedule` mapping shim (the old fallback).
- All 3 `createDAMMv2Pool` calls now pass:
  - `feeSchedulerConfig: formData.feeSchedulerConfig`
  - `collectFeeMode: formData.feeTokenMode === 'both' ? CollectFeeMode.BothToken : CollectFeeMode.OnlyB`
- Added `CollectFeeMode` import from `@meteora-ag/cp-amm-sdk`.

## Verification

| Check | Result |
|-------|--------|
| `npm run lint` | ✓ Pass |
| `npx tsc --noEmit` | ✓ Zero type errors |
| `getFeeMarketCapSchedulerParams` called in `poolUtils.ts` | ✓ (6 args) |
| `CollectFeeMode.OnlyB` not hardcoded in `createCustomPool` | ✓ (uses `collectFeeMode ?? CollectFeeMode.OnlyB`) |
| `feeSchedulerConfig` passed from `launchService.ts` | ✓ (3 call sites) |
| No remaining `feeSchedule:` in `launchService.ts` | ✓ (0 matches) |

## Files Modified

- `lib/solana/poolUtils.ts`
- `lib/services/launchService.ts`
- `types/fee.ts`

## Commits

- `b38b34d` feat(phase-04): fix holdback math, wire fee scheduler modes, add pre-flight validation
