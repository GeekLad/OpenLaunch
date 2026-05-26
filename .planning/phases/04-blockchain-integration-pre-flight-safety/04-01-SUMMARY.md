# Plan 04-01 Summary: Fix Holdback Math and Quote Token Decimals

## Objective

Correct the backwards holdback calculation and replace hardcoded `tokenBDecimals: 9` with dynamic lookup based on the selected quote token.

## What Changed

### holdback math
- `lib/services/launchService.ts` line 188: changed
  `Math.floor(totalSupply * holdbackPercentage / 100)`
  → `Math.floor(totalSupply * (100 - holdbackPercentage) / 100)`
- This means the **pool receives the remainder**; the creator keeps the holdback.
- Updated console log to show both "Token amount (to pool)" and "Holdback amount (creator keeps)".

### quote token decimals
- `config/defaults.ts`: added `QUOTE_TOKEN_DECIMALS` mapping and `getQuoteTokenDecimals(mintAddress)` helper.
- `lib/services/launchService.ts`: replaced all 3 hardcoded `tokenBDecimals: 9` with `getQuoteTokenDecimals(...)`.
- Throws a clear error for unknown mints instead of silent mis-decimalization.

## Verification

| Check | Result |
|-------|--------|
| `npm run lint` | ✓ Pass |
| `npx tsc --noEmit` | ✓ Zero type errors |
| No `tokenBDecimals: 9` in launchService.ts | ✓ (0 matches) |
| Pool formula includes `(100 - holdbackPercentage)` | ✓ |

## Files Modified

- `lib/services/launchService.ts`
- `lib/solana/poolUtils.ts` (prepared `collectFeeMode` param)
- `config/defaults.ts`
- `types/fee.ts` (prepared `decayMode` field)

## Commits

- `b38b34d` feat(phase-04): fix holdback math, wire fee scheduler modes, add pre-flight validation
