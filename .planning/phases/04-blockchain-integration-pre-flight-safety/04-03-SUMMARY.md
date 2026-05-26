# Plan 04-03 Summary: Pre-flight Validation and Error Handling

## Objective

Replace the skipped pre-flight transaction simulation with strengthened server-side validation that runs before any transactions are built. Validation failures produce structured field-level errors and hard-stop the launch flow.

## What Changed

### lib/validation/launch.ts (new)
- Created comprehensive pre-flight validator exporting:
  - `LaunchValidationError` interface (`{ field, message, code }`)
  - `ValidationError` class (extends `Error` with `errors: LaunchValidationError[]`)
  - `validateLaunchParams(formData)` — returns ALL failures, not just first
  - `isValidSolanaAddress(address)` — base58 sanity check for known mint validation
- Validation checks implemented:
  1. **Supply** — `> 0`, integer, `≤ Number.MAX_SAFE_INTEGER`
  2. **Holdback** — `0 ≤ holdbackPercentage ≤ 100`
  3. **Price range** — `priceRangeMin > 0`, `initialPrice > priceRangeMin`, `priceRangeMax > initialPrice`
  4. **Base fee** — `0 ≤ baseFeeBps ≤ 10000`
  5. **Market cap** — `startingMarketCap > 0`, `endingMarketCap > startingMarketCap` (market-cap mode only)
  6. **Duration** — `durationMinutes > 0` (time-based mode only)
  7. **Quote token** — valid base58 Solana address, must be SOL or USDC
  8. **Decay periods** — `> 0` and `≤ 1000`
- All checks use type-safe discriminated union narrowing (`MarketCapConfig` / `TimeBasedConfig` extract types) instead of `any` casts.

### lib/services/launchService.ts
- Imported `validateLaunchParams` and `ValidationError`.
- Added validation call at the **very top** of `launchToken()` (before any transaction-building code).
- Throws `ValidationError` on any failures — hard stop before mint creation.
- Existing catch block already calls `updateStatus({ step: "error" })` and re-throws, preserving `ValidationError.errors`.

### app/api/tokens/create/route.ts
- Verified the route already accepts and persists all configurable parameters (`holdbackPercentage`, `quoteTokenMint`, `feeSchedulerMode`, `feeTokenMode`, etc.). No changes needed.

## Verification

| Check | Result |
|-------|--------|
| `npm run lint` | ✓ Pass |
| `npx tsc --noEmit` | ✓ Zero type errors |
| `validateLaunchParams` called before any tx code | ✓ (top of `launchToken`) |
| `ValidationError` class with `errors` property | ✓ |
| `isValidSolanaAddress` exported | ✓ |
| No `any` casts in `launch.ts` | ✓ (used Extract types) |

## Files Modified

- `lib/validation/launch.ts` (created)
- `lib/services/launchService.ts`

## Commits

- `b38b34d` feat(phase-04): fix holdback math, wire fee scheduler modes, add pre-flight validation
