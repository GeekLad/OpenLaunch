# Phase 4: Blockchain Integration & Pre-flight Safety - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the on-chain transaction integration for all configurable parameters from Phases 2–3, with pre-flight safety checks.

Specifically:
- Pool creation transactions correctly use the user's selected quote token (SOL or USDC) with proper decimal handling (9 vs 6)
- Holdback percentage correctly splits the minted token supply between the creator's wallet and the liquidity pool
- Fee scheduler mode and its parameters are correctly mapped to the appropriate Meteora SDK constructor (market-cap, time-based, or fixed fee)
- Fee token mode is correctly passed to the Meteora SDK's `CollectFeeMode` enum
- Pre-flight safety: strengthened server-side validation replaces transaction simulation (since pool tx references not-yet-created mint account)

**Out of phase scope:** UI form changes (Phases 2–3 handled those), database persistence updates (Phase 5), cron job fee tracking (Phase 6).

</domain>

<decisions>
## Implementation Decisions

### Holdback Supply Split (LAUN-06, LAUN-08)
- **D-01:** Creator keeps the holdback percentage; the remainder goes to the pool. Example: 10% holdback → creator receives 10% of total supply, pool receives 90%.
- **D-02:** Holdback tokens are sent to the creator's connected wallet (the wallet launching the token). No custom holdback wallet address.
- **D-03:** Implementation: mint the entire total supply to the creator's wallet first. The pool creation transaction then deposits the pool's share from the creator's wallet into the pool vault. The remaining tokens stay in the creator's wallet.
- **D-04:** Pool token amount = totalSupply * (100 - holdbackPercentage) / 100. This reverses the current backwards code (`poolTokenAmount = totalSupply * holdback / 100`).

### Quote Token Decimal Math (LAUN-09, LAUN-10)
- **D-05:** When the user switches quote token (e.g., SOL → USDC), price inputs (initial price, min, max) auto-rescale to equivalent values in the new token's terms.
- **D-06:** Exchange rate used for rescaling is a hardcoded config constant `SOL_USDC_RATE` in `config/defaults.ts` (default: ~140). Updated by redeploying.
- **D-07:** Backend (`poolUtils.ts` / `launchService.ts`) handles all decimal scaling transparently. `tokenBDecimals` is no longer hardcoded to 9 — it is derived from the selected quote token (9 for SOL, 6 for USDC).
- **D-08:** Price math (`priceToSqrtPrice`, `sqrtPriceToPrice`) already supports arbitrary decimal pairs. The fix is to pass the correct `tokenBDecimals` instead of hardcoding 9.

### Fee Scheduler SDK Mapping (FEE-01, FEE-02, FEE-03, FEE-04, FEE-06)
- **D-09:** Market-cap based mode: user's `startingMarketCap` and `endingMarketCap` drive the fee schedule boundaries. When market cap reaches `startingMarketCap`, fees are at `startRate`. When it reaches `endingMarketCap`, fees are at `endRate`. The SDK interpolates between them.
- **D-10:** `priceMultiple` for market-cap scheduler is derived from the market cap ratio: `(endingMarketCap / startingMarketCap)^(1/numberOfPeriod)`. This connects the user's market cap inputs directly to SDK behavior.
- **D-11:** Market-cap scheduler supports both Linear (`FeeMarketCapSchedulerLinear`) and Exponential (`FeeMarketCapSchedulerExponential`) decay. UI adds a sub-selector for this within market-cap mode (default: Exponential).
- **D-12:** Time-based mode continues using `getFeeTimeSchedulerParams(startRate, endRate, BaseFeeMode.FeeTimeSchedulerExponential, numberOfPeriods, durationSeconds)`.
- **D-13:** Fixed (disabled) mode uses `getFeeTimeSchedulerParams(fixedRate, fixedRate, BaseFeeMode.FeeTimeSchedulerLinear, 0, 0)` — same as current behavior.
- **D-14:** Fee token mode maps directly to SDK `CollectFeeMode`: "Quote Token Only" → `CollectFeeMode.OnlyB`, "Both Quote + Base Token" → `CollectFeeMode.BothToken`.
- **D-15:** The existing fallback logic in `launchService.ts` that hardcodes 50%→0.25% for market-cap mode is removed. All fee scheduler modes now use the user's actual inputs.

### Pre-flight Safety / Validation (VALID-03)
- **D-16:** Pre-flight transaction simulation is **skipped** for the pool creation transaction because it references the mint account created in Transaction 1, which does not exist on-chain yet at simulation time.
- **D-17:** In place of simulation, **strengthened server-side validation** is used. A new validation function checks all parameter combinations against SDK constraints (fee rates within bounds, market-cap ranges > 0, holdback within 0–100%, duration > 0, price ranges valid) before any transactions are built.
- **D-18:** Validation runs in a dedicated step inside `TokenLaunchService.launchToken()` before transaction construction. If validation fails, it is a **hard stop** — no transactions are submitted, user sees the error and returns to the form.
- **D-19:** Validation errors are returned in a structured format (field-level errors, human-friendly messages) so the UI can display them uniformly.

### the agent's Discretion
- No areas deferred to agent discretion in this discussion.

### Folded Todos
- None

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements & Roadmap
- `.planning/PROJECT.md` — Project overview, key decisions, constraints
- `.planning/REQUIREMENTS.md` — Full v1 requirements mapped to phases (LAUN-10, FEE-06, VALID-03 for this phase)
- `.planning/ROADMAP.md` — Phase 4 goal, success criteria, boundaries

### Phase 3 Context (Advanced UI & Validation)
- `.planning/phases/03-advanced-params-fee-modes-complex-validation/03-CONTEXT.md` — Fee scheduler UI patterns, validation patterns, server-side validation route design

### Phase 2 Context (Core Form & Patterns)
- `.planning/phases/02-core-form-basic-ui/02-CONTEXT.md` — Section naming, collapsible behavior, badge patterns

### Phase 1 Context (Types & Schema)
- `.planning/phases/01-types-schema-defaults-foundation/01-CONTEXT.md` — Schema, discriminated unions, defaults

### Database Schema (Already Extended in Phase 1)
- `lib/db/schema/tokens.ts` — All launch parameter columns already present

### Types & Config (Already Created in Phase 1)
- `types/token.ts` — `TokenFormData`, `TokenLaunchConfig`
- `types/fee.ts` — `FeeSchedulerConfig` (discriminated union), `CollectFeeMode`
- `config/defaults.ts` — DEFAULTS object with all fields pre-filled

### Primary Target Files for Changes
- `lib/services/launchService.ts` — Orchestrates full launch flow; needs holdback math fix, decimal handling, fee scheduler mapping, validation hook
- `lib/solana/poolUtils.ts` — Meteora pool creation; needs `tokenBDecimals` from params, fee scheduler constructor mapping, `CollectFeeMode` from params
- `lib/solana/tokenUtils.ts` — SPL token minting; may need to support minting to two destinations (creator wallet + pool vault) if pool creation requires pre-funding

### SDK Reference
- `@meteora-ag/cp-amm-sdk` v1.4.3 — `getFeeMarketCapSchedulerParams(startingBaseFeeBps, endingBaseFeeBps, baseFeeMode, numberOfPeriod, priceMultiple, schedulerExpirationDuration)`, `CollectFeeMode.BothToken`, `CollectFeeMode.OnlyB`, `BaseFeeMode.FeeMarketCapSchedulerLinear`, `BaseFeeMode.FeeMarketCapSchedulerExponential`

### Validation Schema
- `components/forms/TokenLaunchForm.tsx` — existing Zod schema with `superRefine` pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`priceToSqrtPrice` / `sqrtPriceToPrice` in `poolUtils.ts`**: Already handle arbitrary `tokenADecimals` and `tokenBDecimals`. No change needed to the math functions — just pass the correct `tokenBDecimals` value.
- **`CollectFeeMode` enum in SDK**: Already supports `OnlyB` (1) and `BothToken` (0). The planner must verify `BothToken` works with single-sided pools in v1.4.3.
- **`getFeeMarketCapSchedulerParams` in SDK**: Available in v1.4.3. Constructor signature: `(startingBaseFeeBps, endingBaseFeeBps, baseFeeMode, numberOfPeriod, priceMultiple, schedulerExpirationDuration)`.

### Established Patterns
- **Three-transaction signing flow in `launchService.ts`**: Tx 1 (mint), Tx 2 (mint tokens + metadata + revoke authorities), Tx 3 (pool). This flow must be preserved.
- **Pool creation uses `createCustomPool`**: The SDK method supports `collectFeeMode`, `poolFees`, `tokenBProgram`, `tokenBDecimals` via the `CpAmm` class.
- **Hardcoded `tokenBDecimals: 9` in `launchService.ts`**: Currently hardcoded at line 220. This must become dynamic based on `formData.quoteTokenMint`.

### Integration Points
- **`launchService.ts` line 188**: `poolTokenAmount = Math.floor((formData.totalSupply ?? DEFAULT_LAUNCH_PARAMS.totalSupply) * (formData.holdbackPercentage ?? DEFAULT_LAUNCH_PARAMS.holdbackPercentage) / 100)` — This is backwards. Must be changed to `(100 - holdbackPercentage) / 100`.
- **`poolUtils.ts` line 220**: `tokenBDecimals: 9` is hardcoded. Must derive from quote token selection.
- **`poolUtils.ts` line 171/290**: `collectFeeMode: CollectFeeMode.OnlyB` is hardcoded. Must pass `CollectFeeMode` from params.
- **`launchService.ts` lines 200-211**: Fee scheduler mapping currently falls back to 50%→0.25% for market-cap mode. Must be replaced with real `getFeeMarketCapSchedulerParams` call.

### Known Landmines
- **Holdback math is backwards in current code**: `poolTokenAmount` currently equals `totalSupply * holdback / 100`, which sends the holdback amount to the pool. The fix is `totalSupply * (100 - holdback) / 100`.
- **Pool tx cannot be simulated pre-flight**: The pool tx references the mint account created in Tx 1. Any pre-flight simulation plan must account for this on-chain sequencing constraint.
- **SDK `getFeeMarketCapSchedulerParams` requires `schedulerExpirationDuration`**: The user's market cap inputs don't map 1:1. The planner must decide how `schedulerExpirationDuration` is derived (e.g., fixed default or computed from market cap ratio).

</code_context>

<specifics>
## Specific Ideas

- **Holdback math fix**: `poolTokenAmount = totalSupply * (100 - holdbackPercentage) / 100` — the creator keeps the holdback, the pool gets the rest.
- **Mint all to creator first**: In `launchService.ts`, the `mintTokens` call should mint the full `totalSupply` to the creator's wallet. The pool creation tx then transfers the pool share. (Alternative: mint directly to pool vault if the SDK supports it — researcher should verify.)
- **SOL/USDC rate constant**: Add `SOL_USDC_RATE` to `config/defaults.ts` (default 140). Used for price auto-rescaling when quote token changes.
- **Market-cap schedulerExpirationDuration**: The SDK requires this parameter but the user doesn't input it. Use a sensible default (e.g., 365 days in seconds = 31,536,000) or derive from market cap ratio. Researcher should check SDK docs for recommended values.
- **Fee token mode "BothToken"**: Verify with SDK that `CollectFeeMode.BothToken` (0) works with `createCustomPool` and single-sided liquidity. If not, fall back to `OnlyB` and log a warning.

</specifics>

<deferred>
## Deferred Ideas

- **Dynamic SOL/USDC rate fetching**: User chose hardcoded config constant for v1. Dynamic fetching from CoinGecko could be added in a future phase.
- **Custom holdback wallet**: User chose connected wallet only. Support for a separate treasury/team wallet could be a future phase feature.
- **Pre-flight simulation with account creation stubs**: Advanced technique where simulation creates stub accounts first. Too complex for v1 — deferred.
- **Vesting/locking for holdback tokens**: v2 requirement (LAUN-11).

### Reviewed Todos (not folded)
- None

</deferred>

---

*Phase: 4-Blockchain Integration & Pre-flight Safety*
*Context gathered: 2026-05-26*
