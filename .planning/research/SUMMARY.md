# Project Research Summary

**Project:** OpenLaunch
**Domain:** Solana token launchpad with configurable Meteora DAMMv2 pool parameters
**Researched:** 2026-05-23
**Confidence:** HIGH

## Executive Summary

OpenLaunch is a Next.js-based Solana token launchpad that creates Meteora DAMMv2 pools. The current milestone adds user-configurable launch parameters: fee scheduler modes (market-cap-based as default), token holdback percentage, quote token selection (SOL/USDC), and fee token mode. Research confirms the Meteora SDK natively supports all these features via `createCustomPool`, so the engineering challenge is **parameter routing**—cleanly propagating user choices from the UI through validation, service orchestration, and transaction building to the correct SDK signatures.

The recommended approach is an incremental extension of the existing 4-layer architecture (UI → API → Service → Blockchain), with the critical SDK upgrade to `@meteora-ag/cp-amm-sdk@1.4.3` to unlock market-cap-based fee schedulers. No new runtime dependencies are needed beyond two shadcn/ui primitives (Collapsible, Slider). The biggest risks are not technical integration but **parameter validation gaps** and **economic calculation errors**—holdback percentages, fee scheduler mode mismatches, and quote token decimal mismatches can create unrecoverable or financially damaging on-chain states. Mitigation requires server-side SDK constraint validation, pre-flight transaction simulation, and a single source of truth for all default values.

## Key Findings

### Recommended Stack

The stack is almost entirely unchanged from the existing codebase. The single critical change is upgrading `@meteora-ag/cp-amm-sdk` from `^1.2.3` to `^1.4.3`, which adds `FeeMarketCapSchedulerLinear` (mode 3), `FeeMarketCapSchedulerExponential` (mode 4), and the `getFeeMarketCapSchedulerParams()` helper. All other dependencies (Next.js 16, React 19, Drizzle ORM, better-sqlite3, react-hook-form, zod) remain at current versions. UI enhancements use existing shadcn/ui primitives added via `npx shadcn add collapsible slider`—no new npm packages. This minimal stack delta reflects that the milestone is about exposing existing SDK capabilities, not adopting new technologies.

**Core technologies:**
- **Next.js 16.0.1 + React 19.2.0**: Existing full-stack framework; no migration needed
- **Tailwind CSS 3.4.18 + shadcn/ui**: Existing design system; Collapsible and Slider primitives added for advanced options UI
- **Drizzle ORM 0.44.7 + better-sqlite3 12.4.1**: Existing database layer; schema extension needed for launch parameters
- **@meteora-ag/cp-amm-sdk 1.4.3**: **Upgrade required** for market-cap fee scheduler constructors and validation helpers
- **@solana/web3.js 1.98.4 + @solana/spl-token 0.4.14**: Existing blockchain SDKs; forward-compatible with SDK 1.4.3
- **react-hook-form 7.66.0 + zod 3.25.76**: Existing form stack; sufficient for conditional validation of new fields

### Expected Features

**Must have (table stakes):**
- **Total Supply Configuration** — creators expect control over token supply; trivial mint parameter
- **Initial Price + Price Range Min/Max** — defines launch valuation and concentrated liquidity bounds; requires validation that min < initial < max
- **Quote Token Selection (SOL/USDC)** — fundamental choice affecting all price math and fee economics
- **Fee Token Mode (Collect Fee Mode)** — determines what LPs earn fees in; default "quote-only" (`OnlyB`), option for "both tokens"
- **Fee Scheduler Enable/Disable** — users expect to opt out of anti-sniper; SDK supports fixed-fee mode with no scheduler

**Should have (differentiators):**
- **Fee Scheduler Mode Selection with Market-Cap Default** — market-cap-based fee drop is novel vs standard time-based; aligns fees with price action
- **Token Holdback Percentage with Red-Flag Warning (>10%)** — creator retains tokens outside pool; warning builds trader trust and signals anti-rug transparency
- **Advanced Options Collapsible Section** — progressive disclosure keeps default flow simple while giving power users full control
- **Dynamic Fee Toggle** — volatility-adjusted fees bolster anti-sniper defense; use SDK default config, expose on/off only

**Defer (v2+):**
- **Rate Limiter mode** — trade-size-based fees are confusing for average creators; add only if explicitly requested
- **Compounding fee mode as default** — requires full-range pools and balanced liquidity; conflicts with one-sided launch pattern
- **Custom dynamic fee config** — SDK default is sufficient; custom parameters add complexity without clear user value
- **Quote tokens beyond SOL/USDC** — requires broader oracle integration; not justified for v1
- **Vesting/locking in launch flow** — significant UI and conceptual complexity; defer to post-launch position management
- **Alpha Vault integration** — whitelist management and merkle proofs are out of scope
- **Token 2022 support** — transfer fee extensions add complexity; stick to standard SPL for v1

### Architecture Approach

The existing 4-layer architecture (UI → API → Service → Blockchain → Meteora SDK) is the correct foundation. The milestone requires extending four integration points: form validation, service orchestration, transaction building, and data persistence. The most architecturally invasive parameter is **holdback percentage**, which splits token supply between the pool and creator wallet and requires careful coordination with liquidity distribution math. **Fee scheduler modes** require discriminated union types to prevent mutually exclusive parameter flattening. The build order should follow dependency chains: types/schema first, then validation layer, then blockchain layer (pool utils), then service orchestration, then persistence.

**Major components:**
1. **TokenLaunchForm (UI)** — Default view + Advanced Options collapsible; client-side validation with react-hook-form + Zod; red-flag warnings (holdback >10%) must be elevated outside collapsible section
2. **Zod Schema + Types** — Conditional validation rules with `.superRefine()`; discriminated unions for fee scheduler modes; single shared schema between frontend and backend
3. **TokenLaunchService (Orchestration)** — 3-transaction flow unchanged; calculates token amount after holdback deduction; maps form choices to SDK enums; builds `FeeConfig` discriminated union
4. **poolUtils.ts (Blockchain)** — Pure transaction building; switch on `feeConfig.mode` to call correct `getBaseFeeParams` overload; adjusts price math for token B decimals (SOL=9, USDC=6)
5. **DB Layer (SQLite + Drizzle)** — Extend `tokens` table with launch parameter columns; recommendation is extend existing table (1:1, avoids joins)

### Critical Pitfalls

1. **Parameter Validation Bypass at Smart Contract Boundary** — Frontend Zod validation checks UX ranges but doesn't enforce SDK-specific constraints (e.g., `startingFeeBps >= endingFeeBps`, liquidity percentages sum to 100%). If the pool creation tx fails after mint/setup txs succeed, the token is orphaned on-chain. **Avoid by:** dual-layer validation (frontend + server-side), pre-flight `connection.simulateTransaction()` on pool tx before submitting mint tx, single source of truth mapping form fields to SDK constraints.

2. **Holdback Percentage Miscalculating Liquidity Distribution** — When holdback reduces tokens sent to pool, the graduated pool's LP distribution percentages must still sum to 100%. Current code hardcodes `POOL_LIQUIDITY_PERCENTAGE = 1.0`. **Avoid by:** creating a `LaunchMath` module that computes both pool token amount and LP distribution percentages; invariant assertion before building pool tx; UI preview showing exact token split and LP distribution.

3. **Fee Scheduler Mode Confusion (Market-Cap vs Time-Based)** — These modes use entirely different parameter names and `baseFeeMode` enum values. The current code only supports time-based exponential. Market-cap requires `FeeMarketCapSchedulerLinear/Exponential` (modes 3/4) and `getFeeMarketCapSchedulerParams()`. **Avoid by:** strictly separated TypeScript types (`TimeBasedFeeSchedule` vs `MarketCapFeeSchedule`), exhaustive switch with TypeScript exhaustiveness check, SDK version lock to 1.4.3+.

4. **Quote Token Switch Breaking Price Math** — USDC has 6 decimals vs SOL's 9. Current code hardcodes `tokenBDecimals: 9`. Switching to USDC without adjusting decimals causes 1000x price error. **Avoid by:** hardcoded quote token registry with decimals/program IDs; dynamic decimal passing into `priceToSqrtPrice()`; price preview before launch; test both paths.

5. **Fee Token Mode Creating Accounting Errors** — Current cron job and fee updater assume quote-token-only fees (`CollectFeeMode.OnlyB`). Switching to "both tokens" causes under-reported fees and incorrect APY. **Avoid by:** storing `collectFeeMode` in DB; dual-path fee tracking for "both tokens" mode; feature-flag guard—don't enable "both tokens" UI until fee tracking infrastructure supports it.

6. **Default Value Drift When Moving from ENV to Form Fields** — Defaults currently exist in ENV, form `defaultValues`, Zod schema, and service layer. Any mismatch causes silent parameter substitution. **Avoid by:** single `DEFAULTS` config object imported by all layers; form always sends explicit values; server rejects `undefined` for required fields.

7. **Hidden Critical Warnings in Collapsible Section** — Red-flag warnings (e.g., 50% holdback) buried inside collapsed Advanced Options are invisible to users. **Avoid by:** elevated persistent banner at top of form; token detail page prominently displays holdback %, fee mode, and fee token mode; launch confirmation modal highlighting non-default advanced options in red.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation, Form & Validation
**Rationale:** All downstream work depends on types, schema, and DB structure. This phase also addresses the highest concentration of critical pitfalls (validation bypass, holdback math, default drift, hidden warnings, DB schema lag, logging leaks).
**Delivers:** Extended TypeScript types, Zod schema with conditional validation, Drizzle DB migration, Advanced Options form UI with red-flag warnings, server-side SDK constraint validation, single `DEFAULTS` config object, `LaunchMath` module with unit tests.
**Addresses (from FEATURES.md):** Total Supply, Initial Price + Price Range, Quote Token Selection, Fee Scheduler Enable/Disable, Collect Fee Mode, Holdback % with Warning, Advanced Options Collapsible Section.
**Avoids (from PITFALLS.md):** Pitfall 1 (validation bypass), Pitfall 2 (holdback math), Pitfall 6 (default drift), Pitfall 7 (hidden warnings), Pitfall 10 (DB schema lag), Pitfall 12 (logging leaks).
**Research flag:** Standard patterns—Zod, Drizzle, shadcn/ui are well-documented. Skip deep research. However, the `LaunchMath` module for holdback + LP distribution needs careful design review.

### Phase 2: Blockchain Layer & Fee Scheduler Modes
**Rationale:** Requires Phase 1 types and schema to be stable. This is where the actual SDK integration happens—upgrading to 1.4.3, implementing market-cap scheduler, handling quote token decimal math, and making the cron job mode-aware.
**Delivers:** Upgraded `@meteora-ag/cp-amm-sdk@1.4.3`, refactored `poolUtils.ts` with discriminated `FeeConfig` union, parameter mapping for all 5 fee scheduler modes, quote token decimal handling, pre-flight transaction simulation, mode-aware cron job fee updater.
**Uses (from STACK.md):** `@meteora-ag/cp-amm-sdk@1.4.3`, `shadcn/ui Collapsible/Slider` (already added in Phase 1).
**Implements (from ARCHITECTURE.md):** Blockchain layer extension, `createDAMMv2Pool()` refactoring, price math with dynamic `tokenBDecimals`.
**Avoids (from PITFALLS.md):** Pitfall 3 (fee scheduler mode confusion), Pitfall 4 (quote token decimal mismatch), Pitfall 8 (market-cap race condition), Pitfall 13 (cron job mode awareness).
**Research flag:** Needs research—market-cap scheduler is newer in SDK 1.4.3 with limited production usage data. Recommend `/gsd-plan-phase --research-phase 2` to verify exact parameter shapes and on-chain behavior before implementation.

### Phase 3: Service Orchestration & Persistence
**Rationale:** Builds on Phase 2 blockchain layer to wire the full flow. Connects form → service → blockchain → database. Also handles the fee token mode accounting changes.
**Delivers:** Extended `TokenLaunchService.launchToken()` with holdback calculation and parameter mapping, DB service updates to persist launch parameters, `POST /api/tokens/create` accepting new fields, token detail page displaying launch parameters, fee updater supporting "both tokens" mode.
**Implements (from ARCHITECTURE.md):** Service layer extension, data layer extension, API route extension.
**Avoids (from PITFALLS.md):** Pitfall 5 (fee token mode accounting), Pitfall 9 (type schema mismatch—enforced by shared Zod schema), Pitfall 10 (DB schema lag).
**Research flag:** Standard patterns—Next.js API routes, Drizzle CRUD, service orchestration are well-documented. Skip deep research.

### Phase 4: Integration, Testing & Hardening
**Rationale:** The codebase currently has zero automated tests. Adding 4+ configurable parameters creates combinatorial explosion that cannot be manually tested. This phase establishes test infrastructure and covers critical path combinations.
**Delivers:** Property-based or matrix integration tests for critical parameter combinations (8–10 paths), boundary tests for numeric parameters, integration tests with `solana-test-validator` or `bankrun`, logging cleanup (replace `console.log` with structured logger), final UX audit for red-flag visibility.
**Avoids (from PITFALLS.md):** Pitfall 9 (type schema mismatch—CI verification), Pitfall 11 (unbounded test combinations), Pitfall 12 (logging leaks—final sweep).
**Research flag:** Needs research—testing Solana transactions requires `bankrun` or `solana-test-validator` setup, which the project currently lacks. Recommend `/gsd-plan-phase --research-phase 4` to determine best testing approach and CI integration.

### Phase Ordering Rationale

- **Dependency chain:** Types/schema must exist before validation, validation before blockchain integration, blockchain before service wiring, and everything before comprehensive testing.
- **Pitfall concentration:** Phase 1 addresses 6 of 13 pitfalls—including the most financially dangerous ones (validation bypass, holdback miscalculation, hidden warnings). Getting the foundation right prevents unrecoverable on-chain errors.
- **SDK upgrade isolation:** Phase 2 isolates the SDK upgrade and fee scheduler complexity. If market-cap scheduler behavior differs from documentation, only Phase 2 is affected.
- **Fee tracking deferred:** Phase 3 handles fee token mode accounting because it requires DB schema (Phase 1) and mode-aware infrastructure (Phase 2) to be in place first.
- **Testing last but planned early:** Phase 4 builds test infrastructure, but the critical path matrix and boundary cases should be identified during Phase 1 planning so developers know what combinations to protect against as they build.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** Market-cap scheduler is new in SDK 1.4.3; verify exact parameter shapes, on-chain validation behavior, and production usage before committing to implementation.
- **Phase 4:** Project has zero tests; research best Solana testing approach (`bankrun` vs `solana-test-validator`), CI setup, and property-based testing libraries.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Zod conditional validation, Drizzle schema extensions, shadcn/ui Collapsible/Slider, and single-source-of-truth config are well-documented, established patterns.
- **Phase 3:** Next.js API routes, service orchestration, and Drizzle CRUD are standard patterns already used in the codebase.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified via NPM registry inspection of SDK 1.4.3 tarball, peer dependency checks, and codebase audit. Only one package upgrade needed. |
| Features | HIGH | Directly mapped to Meteora SDK docs and `createCustomPool` parameter shapes. Every feature has a clear SDK counterpart. |
| Architecture | HIGH | Verified against existing codebase (`poolUtils.ts`, `launchService.ts`, `TokenLaunchForm.tsx`) and Meteora SDK docs. Extension points are well-defined. |
| Pitfalls | HIGH | Based on codebase audit (`CONCERNS.md`), SDK constraint documentation, and Solana ecosystem patterns. 7 critical pitfalls identified with specific prevention strategies. |

**Overall confidence:** HIGH

### Gaps to Address

- **No existing test infrastructure:** The codebase has zero automated tests. Phase 4 must establish testing from scratch. This is a known gap but requires research during Phase 4 planning to choose between `bankrun` (faster, lighter) and `solana-test-validator` (more realistic).
- **Fee token mode "both tokens" requires dual-path tracking:** The current fee updater and leaderboard assume quote-token-only fees. Supporting "both tokens" requires fetching and summing both base and quote fees. This is feasible but not trivial—needs explicit scoping in Phase 3.
- **Market-cap scheduler production usage:** SDK 1.4.3 was published ~1 month ago. While type definitions confirm the API exists, real-world usage data is sparse. Phase 2 research should verify on-chain behavior with a test pool.
- **Liquidity distribution math for holdback:** The relationship between "tokens held back" and "LP distribution percentages" is non-obvious. The `LaunchMath` module needs careful design and may require Meteora docs review on `liquidityDistribution` parameters.

## Sources

### Primary (HIGH confidence)
- `@meteora-ag/cp-amm-sdk` NPM registry v1.4.3 — `getFeeMarketCapSchedulerParams`, `BaseFeeMode`, `CollectFeeMode`, `createCustomPool` signatures verified via tarball type definitions
- Meteora official docs (`https://docs.meteora.ag/`) — Fee Market Cap Scheduler, Fee Time Scheduler, Collect Fee Modes, DAMM v2 Launch Pool Guide
- OpenLaunch codebase audit — `lib/solana/poolUtils.ts`, `lib/services/launchService.ts`, `components/forms/TokenLaunchForm.tsx`, `types/token.ts`, `config/environment.ts` (HIGH confidence)

### Secondary (MEDIUM confidence)
- `CONCERNS.md` (OpenLaunch codebase audit) — Identified zero tests, console logging issues, migration script chaos, race conditions, sequential cron job (MEDIUM confidence, internal audit)
- Solana ecosystem knowledge — USDC mint addresses (`EPjFW...`, `4zMMC...`) are public constants (HIGH confidence)

### Tertiary (LOW confidence)
- Production usage of SDK 1.4.3 market-cap scheduler — Limited real-world data due to recent release; verified via types but not production pools (LOW confidence, needs Phase 2 validation)

---

*Research completed: 2026-05-23*
*Ready for roadmap: yes*
