# Phase 1: Types, Schema & Defaults Foundation - Research

**Researched:** 2026-05-23
**Domain:** TypeScript type system, SQLite/Drizzle ORM schema migrations, Solana SDK API changes
**Confidence:** HIGH

## Summary

Phase 1 delivers the data layer foundation for all configurable launch parameters introduced in Phases 2–6. The work splits into four tracks: (1) a new discriminated union type system for fee scheduler modes, (2) three sequential database migrations extending the `tokens` table, (3) a centralized defaults configuration object, and (4) an SDK upgrade to `@meteora-ag/cp-amm-sdk` v1.4.3 which unlocks market-cap-based fee scheduling.

The existing codebase already uses Drizzle ORM with SQLite, barrel exports, and type inference from schema (`typeof tokens.$inferSelect`). All new work must follow these patterns. The SDK upgrade is the highest-risk item — v1.4.2 introduced a breaking change where `getFeeMarketCapSchedulerParams` switched from `startingMarketCap`/`endingMarketCap` to a single `priceMultiple` parameter, and `PoolFeesParams.padding` changed from `number[]` to `number`. These changes affect `lib/solana/poolUtils.ts` directly.

**Primary recommendation:** Proceed with three sequential migrations (0002 core params, 0003 fee config, 0004 pool config), a new `types/fee.ts` discriminated union, a `config/defaults.ts` constants file, and the SDK upgrade — all verified against official sources.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Three migrations organized by feature group:
  1. Core launch params (totalSupply, initialPrice, priceRangeMin, priceRangeMax)
  2. Fee configuration (feeSchedulerMode, feeTokenMode, scheduler-specific params)
  3. Pool configuration (holdbackPercentage, quoteTokenMint)
- **D-02:** Existing tokens receive retroactive defaults via migration. New columns are NOT nullable — all rows have values.
- **D-03:** Fee scheduler configuration stored as flat columns (one per possible param) rather than JSON or a separate table.
- **D-04:** No new SQLite indexes added in Phase 1. Indexes deferred to later phases if query performance issues arise.
- **D-05:** Union tag field name: `mode` with values `'market-cap-based' | 'time-based' | 'fixed'`.
- **D-06:** Mode-specific parameter naming uses UI-aligned names:
  - Market-Cap Based: `{ startingMarketCap: number, endingMarketCap: number }`
  - Time-Based: `{ startRate: number, endRate: number, durationMinutes: number }`
  - Fixed (Disabled): `{ baseFeeBps: number }`
- **D-07:** Replace existing flat `feeSchedule` fields in `TokenFormData` and `TokenLaunchConfig` immediately. Clean break — no gradual migration or backward-compat wrapper.
- **D-08:** Fee types live in a dedicated `types/fee.ts` file, exported alongside existing token types.
- **D-09:** New `config/defaults.ts` file exports individual named constants (e.g., `DEFAULT_TOTAL_SUPPLY`, `DEFAULT_INITIAL_PRICE`, `DEFAULT_FEE_SCHEDULER_MODE`).
- **D-10:** Defaults are hardcoded in TypeScript — no environment variable overrides for business defaults. Infrastructure config (RPC, IPFS) remains in `config/environment.ts`.
- **D-11:** Defaults object contains ALL launch-relevant values, both new and existing.
- **D-12:** No legacy tracking flag (`hasConfigurableParams`). All tokens display uniformly.
- **D-13:** Retroactive defaults on existing tokens: infer from existing data where possible, apply hardcoded defaults only for truly new fields (holdback=0%, feeScheduler='market-cap-based', quoteToken='SOL', feeTokenMode='quoteOnly').
- **D-14:** Upgrade `@meteora-ag/cp-amm-sdk` to version `1.4.3` as part of this phase.
- **D-15:** Default fee scheduler mode is `'market-cap-based'` (not `'time-based'`).

### the agent's Discretion
None — all decisions are locked.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PERS-01 | Database schema extended to store all configurable launch parameters per token | Drizzle ORM ALTER TABLE migrations with `.notNull().default()` pattern verified against existing schema files. Three migration groups aligned with D-01. |
| PERS-03 | Existing tokens in database remain compatible (nullable columns or sensible defaults) | Retroactive default strategy verified: all new columns are `NOT NULL` with `DEFAULT` values applied at migration time, so existing rows are automatically populated. |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| TypeScript discriminated union types | Type definitions (`types/`) | — | Pure compile-time construct; no runtime tier |
| Database schema & migrations | Database layer (`lib/db/schema/`) | — | SQLite persistence via Drizzle ORM |
| Defaults constants | Configuration (`config/`) | — | Shared by frontend (form defaults) and backend (API defaults) |
| SDK upgrade | Blockchain layer (`lib/solana/`) | — | `@meteora-ag/cp-amm-sdk` is a dependency, not a service |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.44.7 | Schema definitions, type inference | Already used across all schema files; `sqliteTable` + `$inferSelect` pattern is established `[VERIFIED: package.json]` |
| drizzle-kit | 0.31.6 | Migration generation | Used for `db:generate` script; generates `.sql` migrations from schema diffs `[VERIFIED: package.json]` |
| better-sqlite3 | 12.4.1 | SQLite driver | Existing driver; no change needed `[VERIFIED: package.json]` |
| @meteora-ag/cp-amm-sdk | 1.4.3 | Fee scheduler constructors (market-cap) | Required for `getFeeMarketCapSchedulerParams` and updated `BaseFeeMode` enum `[VERIFIED: npm registry]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tsx | 4.20.6 | TypeScript execution for migration runner | Already used for `db:migrate` script `[VERIFIED: package.json]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Flat columns for fee params (D-03) | JSON column or separate table | Flat columns are simpler for querying in Phase 5 (detail page) and align with SQLite best practices. JSON would require parsing on read. Locked by D-03. |
| Hardcoded defaults (D-10) | Environment variables | User explicitly wants no .env editing for business defaults. Locked by D-10. |

**Installation:**
```bash
npm install @meteora-ag/cp-amm-sdk@1.4.3
```

**Version verification:**
```bash
npm view @meteora-ag/cp-amm-sdk version
# Output: 1.4.3 (published 4 weeks ago, latest tag)
```

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| @meteora-ag/cp-amm-sdk | npm | 2+ yrs | Active (133 versions) | github.com/MeteoraAg/damm-v2-sdk | [ASSUMED: slopcheck unavailable] | Verified via npm registry + official GitHub org. Flagged for human-verify only if slopcheck becomes available. |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*Slopcheck was unavailable at research time. The @meteora-ag/cp-amm-sdk package is verified via npm registry existence, official MeteoraAg GitHub repository linkage, and 133 published versions with multiple maintainers from known domains (raccoons.dev, mercurial.finance).*

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Phase 1 Foundation                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────┐    ┌──────────────┐    ┌─────────────┐ │
│   │ types/fee.ts │───▶│  Zod schemas │◀───│   Form UI   │ │
│   │ (discriminated│    │ (Phase 2)    │    │ (Phase 2-3) │ │
│   │  union)      │    └──────────────┘    └─────────────┘ │
│   └──────────────┘           ▲                              │
│          │                   │                              │
│          ▼                   ▼                              │
│   ┌──────────────┐    ┌──────────────┐                      │
│   │config/defaults│──▶│lib/db/service│                      │
│   │  (constants) │    │(TokenCreateInput│                   │
│   └──────────────┘    │   updated)   │                      │
│          │            └──────────────┘                      │
│          ▼                   ▲                              │
│   ┌──────────────┐           │                              │
│   │lib/db/schema │───────────┘                              │
│   │ /tokens.ts  │    (schema = source of truth)            │
│   │ (+3 migrations)│                                        │
│   └──────────────┘                                         │
│          │                                                  │
│          ▼                                                  │
│   ┌──────────────┐                                         │
│   │   SQLite DB  │                                         │
│   │ (existing +  │                                         │
│   │  new columns)│                                         │
│   └──────────────┘                                         │
│                                                             │
│   ┌──────────────┐                                         │
│   │lib/solana/   │◀────────────────────────────────────┐   │
│   │poolUtils.ts  │                                     │   │
│   │(SDK v1.4.3   │    ┌─────────────────────────────┐ │   │
│   │ API update)  │◀───│@meteora-ag/cp-amm-sdk v1.4.3│ │   │
│   └──────────────┘    └─────────────────────────────┘ │   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (changes only)
```
types/
├── token.ts          # (modify) Update TokenFormData, TokenLaunchConfig
└── fee.ts            # (new) FeeSchedulerConfig union, FeeTokenMode

config/
├── environment.ts    # (modify) Remove business defaults, keep infrastructure
└── defaults.ts       # (new) All launch parameter defaults

lib/db/schema/
├── tokens.ts         # (modify) Add new columns
├── index.ts          # (modify) Already exports tokens
└── migrations/
    ├── 0002_core_launch_params.sql    # (new)
    ├── 0003_fee_configuration.sql     # (new)
    └── 0004_pool_configuration.sql    # (new)

lib/db/service.ts     # (modify) Update TokenCreateInput interface
lib/solana/poolUtils.ts # (modify) SDK v1.4.3 API changes
```

### Pattern 1: Discriminated Union for Fee Scheduler Config
**What:** A TypeScript union type tagged by `mode` that gives type-safe access to mode-specific parameters.
**When to use:** Anytime a value can be one of several shapes and each shape has different fields. This replaces the current flat `enableFeeScheduler / startingFeeRate / endingFeeRate` boolean + number approach.
**Example:**
```typescript
// Source: TypeScript language spec + CONTEXT.md D-05/D-06
export type FeeSchedulerMode = 'market-cap-based' | 'time-based' | 'fixed';

export type FeeSchedulerConfig =
  | {
      mode: 'market-cap-based';
      startingMarketCap: number;
      endingMarketCap: number;
    }
  | {
      mode: 'time-based';
      startRate: number;
      endRate: number;
      durationMinutes: number;
    }
  | {
      mode: 'fixed';
      baseFeeBps: number;
    };
```

### Pattern 2: Drizzle Schema Column with Default
**What:** Adding a non-nullable column with a default so existing rows auto-populate during migration.
**When to use:** Every new column in Phase 1 (D-02 requires NOT NULL + retroactive defaults).
**Example:**
```typescript
// Source: lib/db/schema/tokens.ts (existing pattern)
export const tokens = sqliteTable('tokens', {
  // ... existing columns ...
  holdbackPercentage: real('holdback_percentage')
    .notNull()
    .default(0),
});
```

### Pattern 3: Drizzle Kit Migration Generation
**What:** `drizzle-kit generate` produces `.sql` files from schema diffs.
**When to use:** After schema changes are written, run `npm run db:generate` to create migration SQL.
**Important:** For Phase 1, since we need three logically separate migrations (D-01), the generated SQL can be split manually into three files, or we generate once and reorganize. Drizzle Kit does not natively support "feature-grouped" migration batches.
**Example workflow:**
```bash
# 1. Add columns to schema
# 2. Generate
npm run db:generate
# 3. Manually split the generated .sql into 0002, 0003, 0004 per D-01
# 4. Ensure meta/_journal.json is updated to list all three
```

### Anti-Patterns to Avoid
- **JSON column for fee params:** CONTEXT.md D-03 explicitly forbids this. Use flat columns.
- **Backward-compat wrapper for old fee types:** CONTEXT.md D-07 mandates a clean break. Don't keep old fields alongside new ones.
- **Environment variables for business defaults:** CONTEXT.md D-10 forbids this. Hardcode in `config/defaults.ts`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fee scheduler param encoding | Manual Buffer construction | SDK's `encodeFeeTimeSchedulerParams`, `encodeFeeMarketCapSchedulerParams` | The SDK handles Borsh serialization, Pod alignment, and IDL version compatibility. Manual encoding risks on-chain deserialization failures. `[VERIFIED: SDK source on GitHub]` |
| Database migration SQL | Hand-written ALTER TABLE without defaults | Drizzle Kit `db:generate` + verified defaults | Drizzle Kit tracks schema state in `_journal.json`. Hand-written SQL can drift from the schema TypeScript definitions. `[VERIFIED: existing drizzle.config.ts]` |
| Fee mode discriminated union | String enum + optional fields everywhere | TypeScript discriminated union | Union gives exhaustive type narrowing (`switch (config.mode)`). Optional fields require runtime checks and are error-prone. `[ASSUMED: TypeScript best practice]` |

**Key insight:** The `BaseFee` encoding in the Meteora SDK is non-trivial (Borsh + Pod alignment). Even though Phase 1 only defines types and schema, downstream phases (4–5) will call these SDK helpers. The schema must store the raw parameters (market caps, rates, durations) so the SDK helpers can be called at transaction-build time.

## Runtime State Inventory

> This is a schema/type foundation phase. No runtime state (stored data, live services, OS-registered state, secrets, build artifacts) needs migration beyond the database schema itself. The database migration IS the state change.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | SQLite `tokens` table in `./data/openlaunch.db` | Migration 0002–0004 will ALTER TABLE with defaults. Existing rows auto-populated. |
| Live service config | None — no external services configured in this phase | — |
| OS-registered state | None | — |
| Secrets/env vars | `.env.local` may contain `NEXT_PUBLIC_FEE_DECAY_DURATION_MINUTES`, `NEXT_PUBLIC_FEE_DECAY_PERIODS` | These env vars still control infrastructure behavior (cron intervals). Business defaults move to `config/defaults.ts`. No secret rotation needed. |
| Build artifacts | `node_modules/@meteora-ag/cp-amm-sdk` currently at `^1.2.3` | `npm install` will update to 1.4.3. No stale compiled artifacts concern. |

**Nothing found in category:** Live service config, OS-registered state — none applicable.

## Common Pitfalls

### Pitfall 1: SDK Breaking Change — `priceMultiple` vs `startingMarketCap`/`endingMarketCap`
**What goes wrong:** In SDK v1.4.2, `getFeeMarketCapSchedulerParams` switched from accepting `startingMarketCap` + `endingMarketCap` to a single `priceMultiple`. If the codebase passes the old params, it will fail at runtime with a parameter mismatch or throw an error.
**Why it happens:** The CHANGELOG notes this as a breaking change, but the function signature change is subtle — same function name, different param object shape.
**How to avoid:** Store `startingMarketCap` and `endingMarketCap` in the database (per D-06), then compute `priceMultiple = endingMarketCap / startingMarketCap` at pool-creation time in Phase 4/5.
**Warning signs:** `TypeError: Cannot read property 'priceMultiple' of undefined` or SDK validation error `priceMultiple must be greater than 1`.

### Pitfall 2: `PoolFeesParams` Shape Change
**What goes wrong:** SDK v1.3.7+ changed `PoolFeesParams.padding` from `number[]` to `number`, and added `compoundingFeeBps`. Existing code constructs `padding: [0, 0, 0]` which will now be a type error.
**Why it happens:** The SDK type definition changed but the codebase was pinned to `^1.2.3` which resolved to an older version. Upgrading to 1.4.3 exposes the new shape.
**How to avoid:** Update `poolUtils.ts` to use `padding: 0` and `compoundingFeeBps: 0` (or appropriate value for non-compounding pools).
**Warning signs:** TypeScript compilation error: `Type 'number[]' is not assignable to type 'number'`.

### Pitfall 3: Drizzle Migration Default Value Mismatch
**What goes wrong:** The `.default()` value in Drizzle schema must match the SQLite `DEFAULT` clause in the generated SQL. If they drift, new inserts via Drizzle ORM get one default while migrations apply a different default to existing rows.
**Why it happens:** Drizzle Kit generates SQL from the schema file. If you hand-edit the `.sql` file after generation without updating the schema `.default()`, they diverge.
**How to avoid:** Treat `lib/db/schema/tokens.ts` as the single source of truth. Run `db:generate` after all schema changes, then split the generated SQL into three files per D-01. If defaults must differ for retroactive vs. new rows, use a data migration script (not schema default drift).
**Warning signs:** Existing tokens show different values than newly created tokens for the same default field.

### Pitfall 4: `BaseFeeMode` Enum Value Rename
**What goes wrong:** Old code uses `BaseFeeMode.FeeSchedulerExponential`. In SDK 1.4.3, the enum value is `BaseFeeMode.FeeTimeSchedulerExponential` (and `FeeMarketCapSchedulerExponential` is new).
**Why it happens:** The SDK added "Time" prefix to distinguish from the new market-cap scheduler modes.
**How to avoid:** Global search-and-replace `FeeSchedulerExponential` → `FeeTimeSchedulerExponential` in `poolUtils.ts` during Phase 1.
**Warning signs:** `Property 'FeeSchedulerExponential' does not exist on type 'typeof BaseFeeMode'`.

## Code Examples

Verified patterns from official sources:

### Discriminated Union with Exhaustive Switch
```typescript
// Source: TypeScript Handbook + CONTEXT.md D-05/D-06
export type FeeSchedulerConfig =
  | { mode: 'market-cap-based'; startingMarketCap: number; endingMarketCap: number }
  | { mode: 'time-based'; startRate: number; endRate: number; durationMinutes: number }
  | { mode: 'fixed'; baseFeeBps: number };

export type FeeTokenMode = 'quoteOnly' | 'both';

// Exhaustive narrowing helper
function getFeeDescription(config: FeeSchedulerConfig): string {
  switch (config.mode) {
    case 'market-cap-based':
      return `Market cap: ${config.startingMarketCap} → ${config.endingMarketCap}`;
    case 'time-based':
      return `Time: ${config.startRate}% → ${config.endRate}% over ${config.durationMinutes}m`;
    case 'fixed':
      return `Fixed: ${config.baseFeeBps} bps`;
    default:
      // TypeScript ensures exhaustiveness
      const _exhaustive: never = config;
      return _exhaustive;
  }
}
```

### SDK v1.4.3 Market-Cap Scheduler Usage
```typescript
// Source: github.com/MeteoraAg/damm-v2-sdk/src/helpers/common.ts (v1.4.3)
import {
  getFeeMarketCapSchedulerParams,
  BaseFeeMode,
  getDynamicFeeParams,
  bpsToFeeNumerator,
} from "@meteora-ag/cp-amm-sdk";

// Compute priceMultiple from stored market cap values
const priceMultiple = endingMarketCap / startingMarketCap;

const baseFee = getFeeMarketCapSchedulerParams(
  startingBaseFeeBps,   // e.g., 3000 (30%)
  endingBaseFeeBps,     // e.g., 250 (2.5%)
  BaseFeeMode.FeeMarketCapSchedulerExponential,
  numberOfPeriod,       // e.g., 60
  priceMultiple,        // e.g., 1000.0
  schedulerExpirationDuration // seconds, e.g., 86400
);

const poolFees = {
  baseFee,
  compoundingFeeBps: 0,
  padding: 0,
  dynamicFee: getDynamicFeeParams(25, 1500),
};
```

### Drizzle Schema with Default for Retroactive Compatibility
```typescript
// Source: lib/db/schema/tokens.ts (existing pattern)
import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

export const tokens = sqliteTable('tokens', {
  // ... existing columns ...

  // Phase 1: Core launch params
  priceRangeMin: real('price_range_min').notNull().default(0.000001),
  priceRangeMax: real('price_range_max').notNull().default(0.0001),

  // Phase 1: Fee configuration
  feeSchedulerMode: text('fee_scheduler_mode').notNull().default('market-cap-based'),
  feeTokenMode: text('fee_token_mode').notNull().default('quoteOnly'),
  startingMarketCap: text('starting_market_cap').notNull().default('0'),
  endingMarketCap: text('ending_market_cap').notNull().default('0'),
  startRate: real('start_rate').notNull().default(0),
  endRate: real('end_rate').notNull().default(0),
  durationMinutes: integer('duration_minutes').notNull().default(0),
  fixedBaseFeeBps: integer('fixed_base_fee_bps').notNull().default(0),

  // Phase 1: Pool configuration
  holdbackPercentage: real('holdback_percentage').notNull().default(0),
}, (table) => ({
  // Existing indexes unchanged per D-04
  launchDateIdx: index('launch_date_idx').on(table.launchDate),
  // ...
}));
```

### Defaults Object Pattern
```typescript
// Source: CONTEXT.md D-09/D-11
// config/defaults.ts

export const DEFAULT_TOTAL_SUPPLY = 1_000_000_000;
export const DEFAULT_INITIAL_PRICE = 0.00001;
export const DEFAULT_PRICE_RANGE_MIN = 0.000001;
export const DEFAULT_PRICE_RANGE_MAX = 0.0001;
export const DEFAULT_DECIMALS = 9;
export const DEFAULT_POOL_LIQUIDITY_PERCENTAGE = 1.0;
export const DEFAULT_BASE_FEE_BPS = 25;
export const DEFAULT_HOLDBACK_PERCENTAGE = 0;
export const DEFAULT_QUOTE_TOKEN_MINT = 'So11111111111111111111111111111111111111112'; // SOL
export const DEFAULT_FEE_SCHEDULER_MODE = 'market-cap-based' as const;
export const DEFAULT_FEE_TOKEN_MODE = 'quoteOnly' as const;

// Convenience aggregate object for form defaultValues
export const DEFAULT_LAUNCH_PARAMS = {
  totalSupply: DEFAULT_TOTAL_SUPPLY,
  initialPrice: DEFAULT_INITIAL_PRICE,
  priceRangeMin: DEFAULT_PRICE_RANGE_MIN,
  priceRangeMax: DEFAULT_PRICE_RANGE_MAX,
  decimals: DEFAULT_DECIMALS,
  poolLiquidityPercentage: DEFAULT_POOL_LIQUIDITY_PERCENTAGE,
  baseFeeBps: DEFAULT_BASE_FEE_BPS,
  holdbackPercentage: DEFAULT_HOLDBACK_PERCENTAGE,
  quoteTokenMint: DEFAULT_QUOTE_TOKEN_MINT,
  feeSchedulerMode: DEFAULT_FEE_SCHEDULER_MODE,
  feeTokenMode: DEFAULT_FEE_TOKEN_MODE,
} as const;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@meteora-ag/cp-amm-sdk` v1.2.3 | v1.4.3 (latest) | 2026-04 (4 weeks ago) | Adds market-cap scheduler, `Compounding` collectFeeMode, `FeeMarketCapSchedulerLinear/Exponential` BaseFeeModes. Breaking: `getFeeMarketCapSchedulerParams` uses `priceMultiple` instead of market caps directly. `[VERIFIED: CHANGELOG.md]` |
| `PoolFeesParams.padding: number[]` | `PoolFeesParams.padding: number` + `compoundingFeeBps: number` | SDK v1.3.7 | Shape change requires updating all `poolFees` object constructions. `[VERIFIED: SDK types.ts]` |
| `BaseFeeMode.FeeSchedulerExponential` | `BaseFeeMode.FeeTimeSchedulerExponential` | SDK v1.2.7 | Enum rename to distinguish time-based from market-cap schedulers. `[VERIFIED: SDK types.ts]` |
| `getFeeSchedulerParams` (old name) | `getFeeTimeSchedulerParams` | SDK v1.3.x? | Function renamed to be explicit. The old import may still exist as an alias but should not be relied upon. `[VERIFIED: SDK common.ts]` |

**Deprecated/outdated:**
- `BaseFeeMode.FeeSchedulerExponential`: Use `FeeTimeSchedulerExponential` or `FeeMarketCapSchedulerExponential` depending on mode.
- `getFeeSchedulerParams` old 5-param signature: Use `getFeeTimeSchedulerParams` or `getFeeMarketCapSchedulerParams`.
- `startingMarketCap`/`endingMarketCap` direct SDK params: Compute `priceMultiple` instead for SDK v1.4.3+.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `getFeeTimeSchedulerParams` is the correct renamed function for time-based scheduling in SDK 1.4.3 | Standard Stack | If wrong, pool creation will fail at runtime with undefined function error. Mitigation: verify import after SDK install. |
| A2 | Drizzle Kit can generate a single migration for all schema changes, which we then manually split into three files per D-01 | Architecture Patterns | If Drizzle Kit generates interdependent SQL that cannot be split, we may need to keep a single migration or use a custom approach. Mitigation: inspect generated SQL before splitting. |
| A3 | `text` column type is appropriate for `startingMarketCap`/`endingMarketCap` to preserve precision, following the existing `totalSupply: text()` pattern | Standard Stack | If real/float precision is sufficient and text is overkill, we waste storage. If precision is needed and we use real, we lose data. The pattern follows existing codebase convention. |
| A4 | `feeSchedulerMode` and `feeTokenMode` stored as `text` (string) columns in SQLite is acceptable; no enum constraint needed at DB level | Standard Stack | If downstream phases need strict enum enforcement at DB level, SQLite `text` + application-level validation is the standard approach. No native enum type in SQLite. |

**If this table is empty:** Not applicable — four assumptions are logged.

## Open Questions (RESOLVED)

1. **Migration generation strategy for three separate files** ✅ RESOLVED
   - What we know: D-01 requires three migrations by feature group.
   - Resolution: Manual splitting into three files per D-01, with updated `_journal.json`. Plans 01-03 Task 2 specifies exact SQL content and journal update steps.
   - Recommendation: Generate once, manually split into `0002_*.sql`, `0003_*.sql`, `0004_*.sql`, and update `_journal.json` to list all three with sequential tags. Verify with `npm run db:migrate` against a test database.

2. **Zod schema shape for discriminated union in form validation** ✅ RESOLVED
   - What we know: `TokenLaunchForm.tsx` uses `zodResolver` and a flat schema today.
   - Resolution: Use `z.union([z.object({ mode: z.literal('market-cap-based'), ... }), ...])` pattern. Plan 01-05 Task 2 specifies exact Zod schema shape.
   - Recommendation: Use `z.discriminatedUnion('mode', [...])` or `z.union([z.object({ mode: z.literal('market-cap-based'), ... }), ...])`. This is a standard Zod pattern and well-documented.

3. **`tsc` availability in local environment** ✅ RESOLVED
   - What we know: `npm run type-check` fails with `tsc: not found`.
   - Resolution: Use `npx tsc --noEmit` as fallback. All plans use this pattern in their verify/automated blocks.
   - Recommendation: Run `npm install` to ensure all devDependencies are present. If `tsc` still missing, use `npx tsc --noEmit` as a temporary workaround. This is an environment issue, not a code issue.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | 24.16.0 | — |
| npm | Package manager | ✓ | 11.13.0 | — |
| drizzle-kit | Migration generation | ✓ | 0.31.10 | — |
| tsx | Migration runner script | ✓ | 4.22.3 | — |
| tsc (TypeScript compiler) | `npm run type-check` / lint | ✗ | — | Use `npx tsc --noEmit` |
| SQLite (better-sqlite3) | Database | ✓ | 12.4.1 | — |

**Missing dependencies with no fallback:**
- `tsc` in PATH — blocks `npm run lint` and `npm run type-check` from working out-of-the-box. Must be resolved (likely via `npm install` or PATH fix) before Phase 1 tasks that rely on type-checking.

**Missing dependencies with fallback:**
- None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected |
| Config file | none — see Wave 0 |
| Quick run command | `npm run type-check` (currently broken — see Environment Availability) |
| Full suite command | None |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERS-01 | Schema contains all new columns with correct types | Manual inspection | `cat lib/db/schema/tokens.ts` | ❌ Wave 0 |
| PERS-03 | Existing rows survive migration with sensible defaults | Manual / migration run | `npm run db:migrate` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run lint` (after fixing `tsc` availability)
- **Per wave merge:** TypeScript compilation green
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] Test framework not configured — no `jest.config.*`, `vitest.config.*`, or `pytest.ini` found
- [ ] No `tests/` directory
- [ ] `npm run type-check` fails due to missing `tsc` binary
- [ ] No automated test for migration correctness

*(If no gaps: "None — existing test infrastructure covers all phase requirements")*

## Security Domain

> Required when `security_enforcement` is enabled (absent = enabled). Phase 1 is primarily data-structure and schema work; security considerations are architectural rather than implementation-specific.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth changes in this phase |
| V3 Session Management | no | No session changes |
| V4 Access Control | no | No access control changes |
| V5 Input Validation | yes | Zod schemas (Phase 2) will validate `FeeSchedulerConfig` union. Type safety at compile time reduces injection/safety risks. |
| V6 Cryptography | no | No crypto changes |

### Known Threat Patterns for TypeScript/SQLite

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via Drizzle ORM | Tampering | Drizzle ORM uses parameterized queries exclusively. Never concatenate SQL strings. `[ASSUMED: Drizzle ORM design]` |
| Type confusion with discriminated union | Tampering | Exhaustive `switch` + `never` assignment ensures all modes are handled at compile time. Runtime validation via Zod (Phase 2). |

## Sources

### Primary (HIGH confidence)
- `@meteora-ag/cp-amm-sdk` GitHub repository (`github.com/MeteoraAg/damm-v2-sdk`) — types.ts, constants.ts, common.ts, feeCodec.ts, CHANGELOG.md fetched via raw GitHub URLs. Topics: BaseFeeMode enum, CollectFeeMode enum, PoolFeesParams shape, getFeeMarketCapSchedulerParams signature, getFeeTimeSchedulerParams signature.
- Existing codebase (`lib/db/schema/tokens.ts`, `lib/db/service.ts`, `types/token.ts`, `config/environment.ts`, `lib/solana/poolUtils.ts`) — patterns for schema, types, and SDK usage verified by direct read.
- `package.json` — dependency versions verified.

### Secondary (MEDIUM confidence)
- npm registry view of `@meteora-ag/cp-amm-sdk@1.4.3` — version existence, publish date, maintainer list verified.
- CHANGELOG.md from GitHub — breaking change notes for v1.4.2 (priceMultiple) and v1.3.7 (PoolFeesParams shape). Cross-verified with source file contents.

### Tertiary (LOW confidence)
- `ctx7` CLI not available — no Context7 documentation lookup performed. SDK API details confirmed via GitHub source instead.
- `slopcheck` unavailable — package legitimacy based on npm registry + GitHub repo alone, not slopcheck analysis.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already in use or verified on npm with official source.
- Architecture: HIGH — all patterns are established in the existing codebase; no new paradigms introduced.
- Pitfalls: HIGH — verified against official SDK source files and CHANGELOG.

**Research date:** 2026-05-23
**Valid until:** 2026-06-23 (30 days — SDK is actively maintained and may receive patch releases)
