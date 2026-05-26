# Plan Summary — 03-04

## Objective
Create a server-side validation route that validates launch parameters using Meteora SDK constructors as ground truth before any on-chain work begins.

## Changes Made

### `lib/validation/feeValidation.ts` (new file)
- Exports `validateLaunchParams(params)` that returns `{ valid: boolean; errors: Record<string, string> }`
- Basic bounds checks: holdback (0–100), fee rates (1–9900 bps), market caps (>0), duration (>0), quote token whitelist
- SDK constructor validation:
  - `getFeeTimeSchedulerParams()` for time-based mode
  - `getFeeMarketCapSchedulerParams()` for market-cap-based mode
  - `validatePoolFees()` as top-level pool fee validator
- CollectFeeMode mapping: `quoteOnly` → `OnlyB`, `both` → `BothToken`

### `app/api/tokens/validate/route.ts` (new file)
- `POST /api/tokens/validate` endpoint
- Returns `{ valid: true }` on success, `{ valid: false, errors: {...} }` on failure
- 500 fallback with `[API] Validation error` prefix

### `components/forms/TokenLaunchForm.tsx`
- Added `isValidating` state and async `handleFormSubmit`
- Calls `POST /api/tokens/validate` before opening confirmation modal
- Maps returned errors to RHF field errors via `setError()`
- Shows "Loading..." button text during validation
- Displays generic error on network failure: "Unable to validate. Please check your connection and try again."

## Verification
- `npm run lint` passes (TypeScript + ESLint clean)
- All SDK imports resolve correctly from `@meteora-ag/cp-amm-sdk`
- Validation handles all three fee scheduler modes without unhandled exceptions

## Commits
- `feat(03-04): server-side validation route with SDK ground-truth checks`
