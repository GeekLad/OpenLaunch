# Phase 1: Types, Schema & Defaults Foundation - Context

**Gathered:** 2026-05-23
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the data structures, database schema, and single source of truth for all configurable launch parameters. It is the foundation that Phases 2–6 build upon.

Specifically:
- Discriminated union TypeScript types for fee scheduler modes (market-cap-based, time-based, fixed)
- Extended database schema with columns for all new launch parameters
- Centralized defaults configuration object used by both frontend and backend
- Migration strategy that preserves existing tokens
- SDK upgrade to @meteora-ag/cp-amm-sdk v1.4.3 for market-cap scheduler support

**Out of phase scope:** Form UI changes, blockchain transaction integration, cron job modifications, or detail page rendering. Those belong in Phases 2–6.

</domain>

<decisions>
## Implementation Decisions

### Schema Migration Strategy
- **D-01:** Three migrations organized by feature group:
  1. Core launch params (totalSupply, initialPrice, priceRangeMin, priceRangeMax)
  2. Fee configuration (feeSchedulerMode, feeTokenMode, scheduler-specific params)
  3. Pool configuration (holdbackPercentage, quoteTokenMint)
- **D-02:** Existing tokens receive retroactive defaults via migration. New columns are NOT nullable — all rows have values.
- **D-03:** Fee scheduler configuration stored as flat columns (one per possible param) rather than JSON or a separate table. Example columns: `fee_scheduler_mode`, `starting_market_cap`, `ending_market_cap`, `start_rate`, `end_rate`, `decay_duration_minutes`, `fixed_base_fee_bps`.
- **D-04:** No new SQLite indexes added in Phase 1. Indexes deferred to later phases if query performance issues arise.

### Fee Scheduler Discriminated Union Design
- **D-05:** Union tag field name: `mode` with values `'market-cap-based' | 'time-based' | 'fixed'`.
- **D-06:** Mode-specific parameter naming uses UI-aligned names:
  - Market-Cap Based: `{ startingMarketCap: number, endingMarketCap: number }`
  - Time-Based: `{ startRate: number, endRate: number, durationMinutes: number }`
  - Fixed (Disabled): `{ baseFeeBps: number }`
- **D-07:** Replace existing flat `feeSchedule` fields in `TokenFormData` and `TokenLaunchConfig` immediately. Clean break — no gradual migration or backward-compat wrapper.
- **D-08:** Fee types live in a dedicated `types/fee.ts` file, exported alongside existing token types.

### Defaults Object Architecture
- **D-09:** New `config/defaults.ts` file exports individual named constants (e.g., `DEFAULT_TOTAL_SUPPLY`, `DEFAULT_INITIAL_PRICE`, `DEFAULT_FEE_SCHEDULER_MODE`).
- **D-10:** Defaults are hardcoded in TypeScript — no environment variable overrides for business defaults. Infrastructure config (RPC, IPFS) remains in `config/environment.ts`.
- **D-11:** Defaults object contains ALL launch-relevant values, both new and existing: totalSupply, initialPrice, priceRangeMin, priceRangeMax, decimals, poolLiquidityPercentage, baseFeeBps, holdbackPercentage, quoteToken, feeSchedulerMode, feeTokenMode.

### Backward Compatibility for Existing Tokens
- **D-12:** No legacy tracking flag (`hasConfigurableParams`). All tokens display uniformly in the detail page.
- **D-13:** Retroactive defaults on existing tokens: infer from existing data where possible (totalSupply, initialPrice from the token row), apply hardcoded defaults only for truly new fields (holdback=0%, feeScheduler='time-based', quoteToken='SOL', feeTokenMode='quoteOnly').

### SDK Upgrade (Hard Requirement)
- **D-14:** Upgrade `@meteora-ag/cp-amm-sdk` to version `1.4.3` as part of this phase. This is required for market-cap-based fee scheduler support.
- **D-15:** Default fee scheduler mode is `'market-cap-based'` (not `'time-based'`). The SDK upgrade makes this possible.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements & Roadmap
- `.planning/PROJECT.md` — Project overview, key decisions, constraints
- `.planning/REQUIREMENTS.md` — Full v1 requirements mapped to phases (PERS-01, PERS-03 for this phase)
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, boundaries

### Existing Database Schema
- `lib/db/schema/tokens.ts` — Current tokens table (will be extended with new columns)
- `lib/db/schema/fee-update-schedule.ts` — Fee update polling schedule
- `lib/db/schema/pool-stats-history.ts` — Pool statistics history
- `lib/db/schema/index.ts` — Schema barrel exports

### Existing Types & Config
- `types/token.ts` — `TokenFormData`, `TokenLaunchConfig`, `TokenMetadata` (to be refactored)
- `config/environment.ts` — Current env-based configuration (to be split: infrastructure stays, business defaults move to `config/defaults.ts`)

### Existing Service & SDK Integration
- `lib/solana/poolUtils.ts` — Meteora pool creation with current fee scheduler (`FeeSchedulerExponential`, `CollectFeeMode.OnlyB`). MUST be updated for SDK v1.4.3 API changes.
- `lib/services/launchService.ts` — Token launch orchestration (uses current flat `feeSchedule`)
- `components/forms/TokenLaunchForm.tsx` — Current form schema and validation (uses old flat fee fields)

### New Files to Create
- `types/fee.ts` — `FeeSchedulerConfig` discriminated union, `FeeTokenMode` enum/type
- `config/defaults.ts` — Individual named default constants

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Drizzle ORM schema pattern** (`lib/db/schema/*.ts`): Column definitions with `.notNull().default()`, inline indexes via `(table) => ({...})`. Follow this pattern for new columns.
- **Type inference pattern**: `export type Token = typeof tokens.$inferSelect;` — use the same for any new tables.
- **Barrel export pattern** (`lib/db/schema/index.ts`): Re-export all schema modules. New schema files must be added here.

### Established Patterns
- **String columns for large numbers**: `totalSupply: text('total_supply').notNull()` — use `text` not `integer` or `real` for token amounts to preserve precision.
- **Real columns for prices**: `initialPrice: real('initial_price').notNull()` — acceptable for human-scale prices.
- **Boolean columns**: `integer('featured', { mode: 'boolean' })` — Drizzle SQLite boolean pattern.
- **Timestamp columns**: `integer('launch_date', { mode: 'timestamp' })` — use this for any new date fields.

### Integration Points
- **Zod schema in `TokenLaunchForm.tsx`**: The form validation schema must be updated to use the new `FeeSchedulerConfig` discriminated union instead of the flat `enableFeeScheduler / startingFeeRate / endingFeeRate` fields.
- **Service layer in `launchService.ts`**: `TokenLaunchConfig` and `TokenCreateInput` types must be updated to match the new schema.
- **Database service in `lib/db/service.ts`**: `TokenCreateInput` interface and insert operations must include all new fields.
- **API route `app/api/tokens/create/route.ts`**: Must accept and validate the new parameters before persisting.

</code_context>

<specifics>
## Specific Ideas

- **Fee scheduler default**: Market-cap-based is the default mode, matching the latest Meteora feature. This was a conscious decision in PROJECT.md.
- **Holdback red-flag**: Holdback >10% triggers a UI warning in Phase 3. The schema stores it as a simple percentage (0–100).
- **Quote token**: SOL and USDC only. Schema stores the mint address string, not an enum.
- **Fee token mode**: Quote Token Only (default) or Both Quote + Base Token. Maps to Meteora SDK `CollectFeeMode` enum.
- **SDK upgrade target**: `@meteora-ag/cp-amm-sdk` v1.4.3 — this is a hard requirement. The planner/researcher must verify the exact API changes from the current version to 1.4.3, particularly:
  - New fee scheduler constructor/parameters for market-cap-based mode
  - Any breaking changes in `CpAmm` class or pool creation methods
  - New `CollectFeeMode` variants if both-token mode is supported in 1.4.3

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Types, Schema & Defaults Foundation*
*Context gathered: 2026-05-23*
