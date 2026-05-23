# Domain Pitfalls: Solana Token Launchpad — Configurable Parameters

**Project:** OpenLaunch
**Domain:** Solana token launchpad with user-configurable pool parameters (holdback %, fee scheduler mode, quote token selection, fee token mode)
**Researched:** 2026-05-23
**Confidence:** HIGH (based on Meteora SDK documentation, codebase audit, and Solana ecosystem patterns)

---

## Critical Pitfalls

### Pitfall 1: Parameter Validation Bypass at the Smart Contract Boundary

**What goes wrong:**
User-configurable parameters (holdback %, fee rates, price ranges) pass frontend validation but violate Meteora SDK or on-chain constraints, causing transactions to fail after the user has already paid for prior steps (mint creation, token setup). The launch becomes partially complete and unrecoverable.

**Why it happens:**
- Frontend validation (Zod schemas) checks human-friendly ranges (e.g., "0–100%") but doesn't enforce SDK-specific constraints.
- Meteora SDK has hidden invariants: `endingBaseFeeBps` must be < bonding curve's `endingFeeBps`; liquidity percentages must sum to exactly 100%; `startingFeeBps >= endingFeeBps`; `totalDuration >= numberOfPeriod`.
- The three-transaction launch sequence (mint → setup → pool) is not atomic. If pool creation fails, the token exists on-chain with no liquidity pool.

**How to avoid:**
1. **Dual-layer validation:** Frontend validates UX ranges; server-side API validates SDK constraints before any on-chain transaction is built.
2. **Pre-flight simulation:** Use `connection.simulateTransaction()` on the pool creation tx before submitting the mint transaction. If simulation fails, abort the entire launch.
3. **SDK constraint mapping:** Maintain a single source of truth mapping each form field to its SDK constraint and validate against it server-side.

**Warning signs:**
- Users report "launch failed at pool step" with prior transactions already on-chain.
- Sentry/logs show `InvalidPoolConfig` or custom program errors after successful mints.
- Support tickets about tokens with no liquidity pool.

**Phase to address:** Phase 1 (Advanced Options Form + Server Validation)

---

### Pitfall 2: Holdback Percentage Miscalculating Liquidity Distribution

**What goes wrong:**
A user sets a 15% holdback. The UI subtracts 15% from the pool amount but fails to update the Meteora `liquidityDistribution` parameters (partner/creator percentages), causing a `LiquidityPercentageSumError` on-chain or silently creating a pool with incorrect LP token distribution.

**Why it happens:**
- Current code hardcodes `POOL_LIQUIDITY_PERCENTAGE = 1.0` (100%) and doesn't touch Meteora's liquidity distribution config.
- When holdback is introduced, the token amount sent to the pool decreases, but the graduated pool's LP distribution must still sum to 100%.
- The relationship between "tokens held back" and "LP distribution percentages" is non-obvious: holdback affects pre-migration token amounts; liquidity distribution affects post-migration LP tokens.

**How to avoid:**
1. **Explicit modeling:** Create a `LaunchMath` module that, given holdback %, computes both (a) token amount to pool and (b) liquidity distribution percentages that sum to 100%.
2. **Invariant assertion:** Before building the pool transaction, assert that `partnerLiquidityPercentage + creatorLiquidityPercentage + partnerPermanentLockedLiquidityPercentage + creatorPermanentLockedLiquidityPercentage === 100`.
3. **UI clarity:** Show the user a preview of exactly how many tokens go to the pool vs. held back, and what LP distribution looks like post-migration.

**Warning signs:**
- Pool creation fails with percentage sum errors.
- Post-migration LP token amounts don't match user expectations.
- Creator receives 0 LP tokens despite holding back tokens.

**Phase to address:** Phase 1 (Holdback Parameter + Liquidity Math)

---

### Pitfall 3: Fee Scheduler Mode Confusion (Market-Cap vs. Time-Based)

**What goes wrong:**
User selects "market-cap-based fee scheduler" but the backend still sends time-based `feeSchedulerParam` (with `totalDuration`, `numberOfPeriod`), causing a type mismatch or silent fallback to time-based behavior. Alternatively, market-cap parameters (`startingMarketCap`, `endingMarketCap`) are sent to a time-based scheduler and ignored.

**Why it happens:**
- Current code only supports time-based exponential scheduler (`BaseFeeMode.FeeSchedulerExponential`).
- Market-cap scheduler uses entirely different parameter names and `baseFeeMode` enum values (`FeeMarketCapSchedulerLinear = 3`, `FeeMarketCapSchedulerExponential = 4`).
- The Meteora SDK's `getFeeSchedulerParams` helper is only for time-based; market-cap scheduler requires manual `marketCapFeeSchedulerParams` construction.
- If the UI presents these as "modes" of the same feature, developers may conflate their parameter schemas.

**How to avoid:**
1. **Strictly separated types:** Define `TimeBasedFeeSchedule` and `MarketCapFeeSchedule` as disjoint TypeScript types, not optional fields on the same object.
2. **Exhaustive switch:** The pool builder must have an exhaustive `switch (feeSchedule.mode)` with no shared fallback.
3. **Parameter disambiguation:** Market-cap mode must never accept `totalDuration` or `numberOfPeriod`; time-based must never accept `startingMarketCap`.
4. **SDK version lock:** Market-cap scheduler is newer; verify the installed `@meteora-ag/cp-amm-sdk` version supports it.

**Warning signs:**
- Pool fees don't decrease as market cap grows (time-based behavior observed instead).
- `createCustomPool` throws `InvalidFeeConfig` or similar.
- Fee leaderboard shows constant fees for market-cap-scheduled pools.

**Phase to address:** Phase 2 (Fee Scheduler Modes)

---

### Pitfall 4: Quote Token Switch Breaking Price Math and Fee Denominations

**What goes wrong:**
User switches quote token from SOL to USDC. The `initialPrice` (e.g., 0.00001 SOL/token) is interpreted as 0.00001 USDC/token without decimal adjustment. Since USDC has 6 decimals vs. SOL's 9, the sqrt price calculation is off by 1000x, creating a pool with a wildly incorrect initial price.

**Why it happens:**
- `priceToSqrtPrice()` in `poolUtils.ts` accepts `tokenBDecimals` but current code hardcodes `tokenBDecimals: 9` (SOL).
- The `ENV.QUOTE_TOKEN_MINT` is used but `ENV` doesn't expose quote token decimals.
- USDC (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`) has 6 decimals. If the code still passes `9`, the price math is wrong.
- Fee rates are denominated in basis points of the quote token; switching quote token changes fee economics silently.

**How to avoid:**
1. **Quote token registry:** Maintain a hardcoded registry of supported quote tokens with their decimals, program IDs, and metadata.
2. **Dynamic decimal passing:** Pass the correct `tokenBDecimals` from the registry into `createDAMMv2Pool()` based on user selection.
3. **Price preview:** Before launch, show the user the actual quote-token-denominated price and market cap.
4. **Test both paths:** Every price calculation test must run with both SOL (9 decimals) and USDC (6 decimals).

**Warning signs:**
- Pools created with USDC quote token have initial prices 1000x off.
- `sqrtPriceToPrice()` returns incorrect values when reading pool state.
- Users complain tokens launched with USDC are "worth nothing" or "worth too much."

**Phase to address:** Phase 2 (Quote Token Selection)

---

### Pitfall 5: Fee Token Mode Switch Creating Accounting Errors in Fee Tracking

**What goes wrong:**
User selects "Quote + Base" fee collection mode (`CollectFeeMode.BothTokens` or `CollectFeeMode.OnlyTokenA` depending on SDK version). The existing cron job and fee updater assume fees are always collected in the quote token (SOL/USDC) and ignore base token fees. The fee leaderboard under-reports total fees, and the UI shows incorrect APY.

**Why it happens:**
- Current code hardcodes `collectFeeMode: CollectFeeMode.OnlyB` (quote token only).
- The fee updater (`lib/cron/fee-updater.ts`) and API (`app/api/tokens/update-fees/route.ts`) query Meteora for cumulative fees but don't know which token(s) to query or how to combine them.
- `updateCumulativeFeesSnapshot` takes a `mintAddress` but the DB schema doesn't track fee token mode per pool.

**How to avoid:**
1. **Store fee mode in DB:** Add `collectFeeMode` column to the tokens table so the fee updater knows which token(s) to track.
2. **Dual-path fee tracking:** If mode is "both tokens," the updater must fetch and sum both base-token fees and quote-token fees (converting to a common denomination if needed).
3. **Feature flag guard:** Don't enable "Quote + Base" mode in the UI until the fee tracking infrastructure supports it.

**Warning signs:**
- Fee leaderboard shows $0 fees for pools with active trading.
- Cron job logs show fee queries returning values that are ignored.
- `update-fees` API returns 200 but doesn't update the database.

**Phase to address:** Phase 3 (Fee Token Mode)

---

### Pitfall 6: Default Value Drift When Moving from ENV to Form Fields

**What goes wrong:**
When hardcoded env values (`TOTAL_SUPPLY`, `INITIAL_PRICE`, etc.) become form fields with defaults, the defaults in the UI diverge from the defaults in the backend API or in `ENV`. A user leaves all fields at default, but the frontend sends `undefined` and the backend falls back to a different value, creating a pool with unexpected parameters.

**Why it happens:**
- Current `ENV` object has `parseInt`/`parseFloat` fallbacks (e.g., `TOTAL_SUPPLY: parseInt(process.env.NEXT_PUBLIC_TOTAL_SUPPLY || '1000000000')`).
- When form fields are added, developers often duplicate defaults in the React component (`defaultValues` in `useForm`), the Zod schema, the API route, and the service layer.
- Any mismatch between these four locations causes silent parameter substitution.

**How to avoid:**
1. **Single source of truth:** The `ENV` config (or a new `DEFAULTS` config object) must be the only place with default values. UI, API, and service all import from it.
2. **Explicit over implicit:** Form fields must always send explicit values to the API; never rely on "omitted = default" behavior.
3. **Validation assertion:** The server API must reject `undefined` for required fields, even if they have env defaults. Defaults are for UI presentation only.

**Warning signs:**
- Two users with "same defaults" get different total supplies.
- Database records show values that don't match what the user saw in the form.
- Regression tests pass individually but fail in integration because different layers supply different defaults.

**Phase to address:** Phase 1 (Exposing ENV Values as Form Fields)

---

### Pitfall 7: Advanced Options Collapsible Section Hiding Critical Warnings

**What goes wrong:**
Users open "Advanced Options," configure a 50% holdback and market-cap scheduler, but don't see the red-flag warning because it's buried inside the collapsed section. They launch a token that appears legitimate to traders but has extreme anti-trader mechanics.

**Why it happens:**
- The requirement says "red-flag warning at >10% holdback" but if the warning is inside the advanced section, users who never expand it don't see it.
- Collapsible sections are designed to reduce cognitive load, but they also hide risk signals.
- Traders reviewing the token later have no visibility into the holdback percentage or fee scheduler mode from the listing page.

**How to avoid:**
1. **Elevated warnings:** Any parameter that triggers a red-flag must show a persistent, non-dismissible banner at the top of the form, outside the collapsible section.
2. **Token detail transparency:** The token listing/detail page must prominently display holdback %, fee scheduler mode, and fee token mode. Traders should see these as clearly as the token symbol.
3. **Launch confirmation modal:** Before signing, show a summary modal with all non-default advanced options highlighted in red, requiring explicit acknowledgment.

**Warning signs:**
- Users post-launch: "I didn't know I set a 50% holdback."
- Trader complaints about hidden fee mechanics.
- Social media accusations of "rug pull" due to undisclosed holdback.

**Phase to address:** Phase 1 (UI/UX for Advanced Options)

---

### Pitfall 8: Race Condition Between Parameter Validation and Transaction Signing

**What goes wrong:**
A user configures a timed launch with a market-cap scheduler. Between clicking "Launch" and the wallet popup appearing, the market-cap scheduler's `startingMarketCap` becomes invalid (e.g., token price moves, making the configured cap unreachable). The transaction fails after the user has already approved and paid for the mint.

**Why it happens:**
- The existing codebase already has a race condition for `InvalidActivationPoint` (timed launch within 2 minutes).
- Adding market-cap scheduler introduces a new time-dependent parameter: the market cap is evaluated relative to current price at pool creation time.
- There is no pre-signing validation of market-cap feasibility.

**How to avoid:**
1. **Re-validation at signing time:** Right before calling `signAllTransactions`, re-validate all time- and price-dependent parameters against current on-chain state.
2. **Graceful degradation:** If market-cap scheduler becomes invalid, offer to switch to time-based or fixed fee mode in the signing modal, rather than failing.
3. **Atomic batch reconsideration:** The three-transaction batch should be re-simulated as a whole if any parameter changed since form submission.

**Warning signs:**
- Increased rate of `InvalidActivationPoint` or similar errors after introducing market-cap scheduler.
- Users report paying for mint but pool creation failing.
- Logs show parameter validation passed but pool creation failed seconds later.

**Phase to address:** Phase 2 (Fee Scheduler Modes + Transaction Robustness)

---

## Moderate Pitfalls

### Pitfall 9: Type Schema Mismatch Between Form, API, and SDK

**What goes wrong:**
The `TokenFormData` type gets new optional fields (`holdbackPercentage`, `feeSchedulerMode`, `quoteTokenMint`). The API route uses a different Zod schema. The service layer destructures fields that might be `undefined`. TypeScript compiles but runtime crashes with "cannot read property of undefined."

**Why it happens:**
- Current `TokenFormData` (in `types/token.ts`) lacks all new fields.
- The form, API, and service types will be edited by different developers across phases.
- SDK types (`CreatePoolParams`) will also gain new fields.

**How to avoid:**
1. **Single shared schema:** Use a Zod schema that is shared between frontend and backend (in a shared package or via TypeScript project references).
2. **Strict parsing:** The API must use `.parse()` (not `.safeParse()`) so malformed requests fail fast with 400, not 500.
3. **Type generation:** Generate TypeScript types from the Zod schema, never hand-maintain parallel type definitions.

**Warning signs:**
- `TypeError: Cannot read properties of undefined` in production.
- API 500s for edge cases not covered by happy-path testing.
- Frontend sends `feeSchedulerMode: "marketCap"` but backend expects `0 | 1 | 2 | 3`.

**Phase to address:** All phases (ongoing type discipline)

---

### Pitfall 10: Database Schema Lagging Behind Configurable Parameters

**What goes wrong:**
New parameters are added to the form and SDK call but not to the database schema. After launch, the token detail page can't display the actual holdback % or fee mode because it was never persisted. The cron job fee updater also lacks the data it needs.

**Why it happens:**
- Current SQLite schema (via Drizzle) tracks basic token info but not pool configuration details.
- The `tokens` table will need new columns for `holdbackPercentage`, `feeSchedulerMode`, `quoteTokenMint`, `collectFeeMode`, etc.
- Ad-hoc migration scripts (`lib/db/migrate-fee-schedules.ts`) exist but aren't reliable.

**How to avoid:**
1. **Schema-first design:** Update the Drizzle schema before writing any UI or service code.
2. **Migration discipline:** Use `drizzle-kit generate` for every schema change. Remove ad-hoc `.ts` migration scripts.
3. **Default handling:** New columns must have sensible defaults so existing tokens remain valid.

**Warning signs:**
- Token detail pages show "N/A" for new parameters.
- Fee updater cron fails because it can't determine a token's fee collection mode.
- Database errors after deploying schema changes.

**Phase to address:** Phase 1 (Database Schema Update)

---

### Pitfall 11: Unbounded Parameter Combinations in Testing

**What goes wrong:**
With 4+ new configurable parameters, the combinatorial explosion of test cases (holdback % × fee mode × quote token × fee token mode × price params) makes it impossible to manually test all paths. Edge case combinations (e.g., 0% holdback + market-cap scheduler + USDC + both-token fees) are never tested and break in production.

**Why it happens:**
- The codebase currently has **zero automated tests** (no unit, integration, or E2E tests).
- Manual testing of every combination is infeasible.
- The most dangerous bugs hide at parameter extremes (0%, 100%, minimum values).

**How to avoid:**
1. **Property-based testing:** Use a library like `fast-check` to generate random valid parameter combinations and assert invariants (e.g., "liquidity distribution always sums to 100%").
2. **Critical path matrix:** Identify the 8–10 most important combinations and add integration tests for each using `solana-test-validator` or `bankrun`.
3. **Boundary testing:** Every numeric parameter must have tests at min, max, and just-outside-boundary values.

**Warning signs:**
- Bugs reported only for specific parameter combinations.
- "It worked in my manual test" but fails for a user's edge case.
- Increasing regression rate as more parameters are added.

**Phase to address:** Phase 3+ (Test Infrastructure — but start planning in Phase 1)

---

## Minor Pitfalls

### Pitfall 12: Logging Leaked Configurable Parameters

**What goes wrong:**
The existing codebase has 178+ `console.log` calls, some logging entire form data objects. When configurable parameters include sensitive or economically significant values (e.g., holdback %), these leak into server logs, browser consoles, and error reporting services.

**Why it happens:**
- `console.log` is used for debugging throughout `launchService.ts`, `poolUtils.ts`, etc.
- New parameters will be logged alongside existing ones.
- No logging abstraction exists.

**How to avoid:**
1. **Redaction list:** Maintain a list of fields that must never be logged (private keys already are, but holdback % and fee rates are economically sensitive).
2. **Structured logging:** Replace `console.log` with a logger that supports log levels and redaction (e.g., `pino`).

**Warning signs:**
- Server logs contain user-specific parameter choices.
- Browser console exposes full launch configuration.

**Phase to address:** Phase 1 (Infrastructure — Logging Cleanup)

---

### Pitfall 13: Cron Job Fee Updater Breaks for Mixed Fee Modes

**What goes wrong:**
The fee updater cron job (`lib/cron/fee-updater.ts`) was built for time-based exponential schedulers. When some pools use market-cap schedulers, the updater's interval logic (which changes update frequency based on time since launch) is irrelevant. It either over-queries or under-queries market-cap-scheduled pools.

**Why it happens:**
- The cron job uses time-since-launch to determine update intervals (`FEE_UPDATE_INTERVAL_0_1H`, etc.).
- Market-cap scheduler fees change based on price/volume, not time.
- The job processes all tokens sequentially with no mode-aware logic.

**How to avoid:**
1. **Mode-aware scheduling:** The cron job must read each token's `feeSchedulerMode` and apply appropriate update logic:
   - Time-based: use existing interval schedule.
   - Market-cap: update on a fixed interval (e.g., every 5 minutes) since fees depend on current market cap, not elapsed time.
2. **Parallel processing:** Replace the sequential loop with batched parallel updates.

**Warning signs:**
- Fee leaderboard shows stale fees for market-cap-scheduled pools.
- Cron job logs show updates for time-based pools but skips for market-cap pools.
- API timeouts as token list grows.

**Phase to address:** Phase 2 (Fee Scheduler Modes)

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|------------|
| **1. Parameter Validation Bypass** | Phase 1 | Server-side integration tests simulate invalid SDK parameters and assert pre-flight rejection. |
| **2. Holdback Liquidity Miscalculation** | Phase 1 | Unit tests for `LaunchMath` module with 0%, 10%, 50%, 100% holdback; invariant assertions. |
| **6. Default Value Drift** | Phase 1 | Single `DEFAULTS` object imported by form, API, and service; no hardcoded numbers outside it. |
| **7. Hidden Critical Warnings** | Phase 1 | UX audit: red-flag banner must be visible without expanding Advanced Options; confirmation modal review. |
| **10. Database Schema Lag** | Phase 1 | Drizzle schema diff reviewed in PR; `drizzle-kit generate` output inspected. |
| **12. Logging Leakage** | Phase 1 | Code review: no `console.log` of form data; logger redaction configured. |
| **3. Fee Scheduler Mode Confusion** | Phase 2 | Exhaustive `switch` statement with TypeScript exhaustiveness check; unit tests for each mode. |
| **4. Quote Token Decimal Mismatch** | Phase 2 | Price math tests with both SOL (9 dec) and USDC (6 dec); pool creation simulation for each. |
| **8. Market-Cap Race Condition** | Phase 2 | Integration test: simulate price movement between form submission and signing; assert graceful fallback. |
| **13. Cron Job Mode Awareness** | Phase 2 | Cron job unit test with mocked tokens of each fee mode; verify correct update intervals. |
| **5. Fee Token Mode Accounting** | Phase 3 | Fee updater fetches both token fees for "both" mode; leaderboard sums correctly in test. |
| **9. Type Schema Mismatch** | All phases | CI check: generated types match Zod schema; no hand-written parallel types. |
| **11. Unbounded Test Combinations** | Phase 3+ | Property-based tests run in CI; integration test matrix covers critical paths. |

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| **1. Partial Launch (mint exists, no pool)** | HIGH (user lost SOL, token is orphaned) | Build a "recover launch" flow that allows attaching a pool to an existing mint. Requires UI for mint address input and pool-only creation. |
| **2. Incorrect Liquidity Distribution** | MEDIUM (pool exists but LP is wrong) | No automatic fix; creator must manually manage LP tokens. Document the correct distribution in the launch preview to prevent this. |
| **3. Wrong Fee Scheduler Mode** | LOW-MEDIUM (relaunch required) | If caught before trading begins, creator can abandon the pool and relaunch. If trading has started, fees are locked in. |
| **4. Wrong Initial Price** | HIGH (traders may have bought at wrong price) | Pool cannot be edited. Consider a "pool migration" feature (advanced) or force relaunch. |
| **5. Under-Reported Fees** | LOW (data issue, not financial) | Backfill fee data from on-chain history once tracking is fixed. |
| **8. Race Condition Failure** | LOW (handled by existing retry) | Existing retry logic recreates pool with immediate activation. Ensure this also works for market-cap scheduler. |

---

## "Looks Done But Isn't" Checklist

- [ ] **Holdback UI:** Red-flag warning is visible without expanding Advanced Options.
- [ ] **Holdback Math:** `LaunchMath` module has unit tests for 0%, 10%, 50%, 99% holdback.
- [ ] **Fee Scheduler Modes:** Exhaustive `switch` over all modes with TypeScript exhaustiveness check.
- [ ] **Quote Token Switch:** Price math tested with both SOL (9 dec) and USDC (6 dec).
- [ ] **Fee Token Mode:** Database stores mode; fee updater reads it; leaderboard handles "both tokens."
- [ ] **Server Validation:** API rejects SDK-invalid parameter combinations before building transactions.
- [ ] **Pre-flight Simulation:** Pool transaction is simulated before mint transaction is sent.
- [ ] **Default Consistency:** One `DEFAULTS` object used by form, API, and service.
- [ ] **Token Detail Page:** Shows holdback %, fee scheduler mode, and fee token mode prominently.
- [ ] **Logging:** No `console.log` of user parameter choices in production.
- [ ] **Cron Job:** Mode-aware update intervals; parallel processing.
- [ ] **Database Migrations:** Only `drizzle-kit generate`; no ad-hoc scripts.

---

## Sources

- Meteora CP-AMM SDK documentation (Context7): `getFeeSchedulerParams` constraints, `marketCapFeeSchedulerParams` requirements, `liquidityDistribution` percentage rules.
- Meteora Dynamic Bonding Curve SDK (Context7): `buildCurve` with market-cap scheduler, `endingBaseFeeBps` < `endingFeeBps` invariant.
- OpenLaunch codebase audit (`CONCERNS.md`): Zero tests, console logging, migration script chaos, race conditions, sequential cron job.
- OpenLaunch `PROJECT.md`: Requirements for holdback, fee scheduler modes, quote token, fee token mode.
- OpenLaunch source files: `launchService.ts` (transaction sequencing, hardcoded ENV), `poolUtils.ts` (price math, hardcoded collectFeeMode), `TokenLaunchForm.tsx` (validation gaps), `environment.ts` (env-based defaults), `types/token.ts` (missing new fields).

---
*Pitfalls research for: Solana token launchpad with configurable parameters*
*Researched: 2026-05-23*
