# Phase 4 Research: Blockchain Integration & Pre-flight Safety

**Phase:** 04 — Blockchain Integration & Pre-flight Safety  
**Researched:** 2026-05-26  
**Focus:** On-chain parameter mapping, holdback math, quote token decimals, fee scheduler SDK constructors, and pre-flight validation  

---

## 1. Meteora SDK v1.4.3 Fee Scheduler APIs

### 1.1 `getFeeMarketCapSchedulerParams`

**SDK signature (from `@meteora-ag/cp-amm-sdk`):**

```typescript
getFeeMarketCapSchedulerParams(
  startingBaseFeeBps: number,      // Start fee in basis points
  endingBaseFeeBps: number,        // End fee in basis points
  baseFeeMode: BaseFeeMode,        // FeeMarketCapSchedulerLinear | FeeMarketCapSchedulerExponential
  numberOfPeriod: number,          // Number of adjustment periods
  priceMultiple: number,           // Price multiplier per period (e.g., 2.0)
  schedulerExpirationDuration: number  // Duration in seconds until scheduler expires
): PoolFeesParams['baseFee']
```

**Mapping from user inputs:**

| User Input | SDK Parameter | Transform |
|-----------|---------------|-----------|
| `feeMarketCapStartRate` | `startingBaseFeeBps` | `startRate * 100` (percent → bps) |
| `feeMarketCapEndRate` | `endingBaseFeeBps` | `endRate * 100` (percent → bps) |
| `feeSchedulerDecayMode` (new UI field) | `baseFeeMode` | `FeeMarketCapSchedulerLinear` or `FeeMarketCapSchedulerExponential` |
| `DEFAULT_NUMBER_OF_PERIODS` | `numberOfPeriod` | `60` (from config) |
| `(endingMarketCap / startingMarketCap)^(1/numberOfPeriod)` | `priceMultiple` | Computed from market cap ratio |
| `365 * 24 * 60 * 60 = 31,536,000` | `schedulerExpirationDuration` | Fixed 1-year default |

**Key finding:** The SDK requires `schedulerExpirationDuration` even though the UI does not collect it. A sensible fixed default (365 days) is appropriate for v1.

### 1.2 `getFeeTimeSchedulerParams`

Already used in current code for time-based and fixed modes. No API change needed — just wiring existing user inputs correctly.

### 1.3 `CollectFeeMode` Enum

**SDK values:**
- `CollectFeeMode.OnlyB` = `1` — fees collected in quote token only
- `CollectFeeMode.BothToken` = `0` — fees collected in both base and quote tokens

**Current state:** `poolUtils.ts` line 290 hardcodes `CollectFeeMode.OnlyB`. Must be parameterized.

**Risk note:** `BothToken` with single-sided pools (token A only, 0 token B) should be verified at integration-test time. The SDK documentation does not explicitly restrict this, but it's an uncommon configuration.

---

## 2. Quote Token Decimal Handling

### 2.1 Supported Quote Tokens

| Token | Mint | Decimals |
|-------|------|----------|
| SOL (wrapped) | `So11111111111111111111111111111111111111112` | 9 |
| USDC | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | 6 |

### 2.2 Current Hardcoding

`launchService.ts` lines 220, 285, 432 hardcode `tokenBDecimals: 9`. `poolUtils.ts` line 290 also assumes 9 decimals in some log output.

**Fix strategy:** Add `QUOTE_TOKEN_DECIMALS` mapping in `config/defaults.ts` or derive from a known-mint lookup table. Pass `tokenBDecimals` through `CreatePoolParams` from `launchService.ts`.

### 2.3 Price Math

`priceToSqrtPrice` and `sqrtPriceToPrice` in `poolUtils.ts` already accept `tokenADecimals` and `tokenBDecimals` as parameters. No changes needed to the math functions themselves — just pass the correct value.

### 2.4 SOL/USDC Exchange Rate

**Decision from CONTEXT.md:** Hardcoded constant `SOL_USDC_RATE = 140` in `config/defaults.ts`. Used for auto-rescaling price inputs when quote token changes.

**Implementation note:** This constant is only relevant for UI price rescaling (Phase 3 UI already handles display). The backend uses the actual token decimals for on-chain math, not the exchange rate.

---

## 3. Holdback Supply Split

### 3.1 Correct Math

- **Holdback %** = percentage creator keeps
- **Pool %** = `100 - holdbackPercentage`
- **Pool token amount** = `totalSupply * (100 - holdbackPercentage) / 100`

### 3.2 Current Bug

`launchService.ts` line 188:
```typescript
const poolTokenAmount = Math.floor((formData.totalSupply ?? DEFAULT_LAUNCH_PARAMS.totalSupply) * (formData.holdbackPercentage ?? DEFAULT_LAUNCH_PARAMS.holdbackPercentage) / 100);
```

This sends the holdback amount to the pool — backwards. Must be `(100 - holdbackPercentage)`.

### 3.3 Distribution Method

**Chosen approach:** Mint full `totalSupply` to creator's wallet. Pool creation transaction deposits the pool's share from creator's wallet into the pool vault. Remaining tokens stay in creator's wallet.

**Rationale:** Simpler — one mint instruction, one pool deposit. The current `mintTokens` call already mints to `walletPublicKey` (line 164). The pool creation SDK call (`createCustomPool`) handles depositing `tokenAAmount` from the creator's associated token account into the pool vault.

**No changes needed to `tokenUtils.ts`:** The existing `mintTokens` function mints to a single destination. No split-mint required.

---

## 4. Fee Scheduler Mode Mapping

### 4.1 Mapping Matrix

| UI Mode | SDK Constructor | Parameters |
|---------|----------------|------------|
| `market-cap-based` | `getFeeMarketCapSchedulerParams` | `startingBaseFeeBps`, `endingBaseFeeBps`, `baseFeeMode`, `numberOfPeriod`, `priceMultiple`, `schedulerExpirationDuration` |
| `time-based` | `getFeeTimeSchedulerParams` | `startBps`, `endBps`, `FeeTimeSchedulerExponential`, `numberOfPeriods`, `durationSeconds` |
| `fixed` | `getFeeTimeSchedulerParams` | `fixedBps`, `fixedBps`, `FeeTimeSchedulerLinear`, `0`, `0` |

### 4.2 Market-Cap Decay Sub-Modes

Within `market-cap-based`, user selects:
- **Linear:** `BaseFeeMode.FeeMarketCapSchedulerLinear`
- **Exponential:** `BaseFeeMode.FeeMarketCapSchedulerExponential` (default)

This requires adding `feeSchedulerDecayMode: 'linear' | 'exponential'` to the `FeeSchedulerConfig` union for `market-cap-based` mode, or storing it separately.

**Decision:** Add `decayMode?: 'linear' | 'exponential'` to the market-cap branch of the discriminated union. Default: `'exponential'`.

### 4.3 Current Fallback Removal

`launchService.ts` lines 200-211 currently falls back to `50% → 0.25%` for market-cap mode. This must be replaced with real user inputs.

---

## 5. Pre-flight Safety Strategy

### 5.1 Why Simulation Is Skipped for Pool Tx

The pool creation transaction references the mint account created in Transaction 1. At simulation time, this account does not exist on-chain yet. Solana's `simulateTransaction` requires all referenced accounts to exist, so the pool tx cannot be simulated before submission.

**Transactions 1 and 2 CAN be simulated** (they don't reference not-yet-created accounts in a way that breaks simulation), but simulating only them provides limited value since the pool tx is the most complex.

### 5.2 Strengthened Server-Side Validation (Replacement)

A new validation function (e.g., `validateLaunchParams` in `lib/validation/launch.ts`) checks:

1. **Supply:** `totalSupply > 0`, integer, within SPL max (`u64`)
2. **Holdback:** `0 ≤ holdbackPercentage ≤ 100`
3. **Price range:** `0 < minPrice < initialPrice < maxPrice`
4. **Fee rates:** `0 ≤ startRate, endRate, baseFeeBps ≤ 10000` (0–100% in bps)
5. **Market cap:** `startingMarketCap > 0`, `endingMarketCap > startingMarketCap`
6. **Duration:** `durationMinutes > 0` (when time-based)
7. **Quote token:** Must be known mint (SOL or USDC)
8. **Number of periods:** `> 0` and reasonable (≤ 1000)

**Validation runs** as a dedicated step at the start of `TokenLaunchService.launchToken()`. Hard stop on failure — no transactions built.

### 5.3 Validation Error Format

```typescript
interface LaunchValidationError {
  field: string;
  message: string;
  code: string;
}
```

Returned as an array so the UI can map field-level errors to form inputs.

---

## 6. SDK Upgrade Verification

### 6.1 Current Version

`package.json` shows `@meteora-ag/cp-amm-sdk` installed. The CONTEXT.md states v1.4.3 is the target. Need to verify current installed version supports:
- `getFeeMarketCapSchedulerParams` (confirmed: imported in `poolUtils.ts`)
- `CollectFeeMode.BothToken` (confirmed: imported in `poolUtils.ts`)
- `BaseFeeMode.FeeMarketCapSchedulerLinear` / `Exponential` (confirmed: imported)

### 6.2 API Compatibility Check

The `poolUtils.ts` file already imports these symbols (line 2), confirming the SDK version supports them. No SDK upgrade transaction is needed — the symbols are already available.

---

## 7. Integration Points Summary

| Change | File | Line(s) | Action |
|--------|------|---------|--------|
| Fix holdback math | `launchService.ts` | 188 | Change `* holdback / 100` → `* (100 - holdback) / 100` |
| Dynamic `tokenBDecimals` | `launchService.ts` | 220, 285, 432 | Derive from `quoteTokenMint` (9 for SOL, 6 for USDC) |
| Fee scheduler mapping | `launchService.ts` | 200-211 | Replace fallback with real `getFeeMarketCapSchedulerParams` call |
| `CollectFeeMode` param | `launchService.ts` | — | Pass `feeTokenMode` through to `createDAMMv2Pool` |
| `CollectFeeMode` usage | `poolUtils.ts` | 290 | Use param instead of hardcoded `OnlyB` |
| Fee scheduler params | `poolUtils.ts` | 180-247 | Add market-cap branch to fee configuration block |
| Add `decayMode` to types | `types/fee.ts` | 17 | Extend market-cap union branch |
| Add `SOL_USDC_RATE` | `config/defaults.ts` | — | Add constant (default 140) |
| Add quote token decimals map | `config/defaults.ts` | — | Add `QUOTE_TOKEN_DECIMALS` lookup |
| Add pre-flight validation | `lib/validation/launch.ts` | — | New file: comprehensive parameter validation |
| Integrate validation | `launchService.ts` | ~44 | Call `validateLaunchParams` at start of `launchToken` |

---

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `CollectFeeMode.BothToken` unsupported in single-sided pools | Medium | High | Test on devnet; fallback to `OnlyB` with warning |
| `getFeeMarketCapSchedulerParams` behavior differs from expectations | Low | High | Verify with SDK docs; test on devnet |
| Holdback math fix changes existing behavior for 0% holdback | Low | Low | 0% holdback is unaffected; only non-zero changes |
| USDC pool creation fails due to decimal scaling | Medium | High | Test both SOL and USDC pools on devnet |
| Validation misses edge case | Medium | Medium | Iterative testing; add UAT cases |

---

## RESEARCH COMPLETE

Key deliverables for planning:
1. SDK APIs confirmed available and signature-mapped
2. Holdback math fix is a single-line change with large behavioral impact
3. Fee scheduler mapping requires adding a new branch to `poolUtils.ts` fee configuration
4. Pre-flight simulation is infeasible; strengthened validation is the correct replacement
5. `tokenBDecimals` dynamic lookup is straightforward (known mint → known decimals)
6. `CollectFeeMode.BothToken` needs runtime verification but API is available

