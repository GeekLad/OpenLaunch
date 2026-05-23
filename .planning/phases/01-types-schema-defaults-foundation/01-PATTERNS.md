# Phase 01 — Pattern Map: Types, Schema & Defaults Foundation

**Generated:** 2026-05-23
**Scope:** Files to be created or modified in Phase 1

---

## Files to Create

### `types/fee.ts` (New)
- **Role:** Type definitions — discriminated union for fee scheduler modes, fee token mode enum
- **Data flow:** Frontend form ↔ Backend API ↔ Database schema ↔ SDK helpers
- **Closest analog:** `types/token.ts` (existing type definitions with interfaces)
- **Pattern to follow:** Named exports, interfaces with JSDoc comments, discriminated union with `mode` tag
- **Why new file:** D-08 mandates dedicated `types/fee.ts` for fee types, separate from existing token types

### `config/defaults.ts` (New)
- **Role:** Configuration — named constants for all launch parameter defaults
- **Data flow:** Imported by form components (defaultValues), API routes (fallbacks), service layer (validation)
- **Closest analog:** `config/environment.ts` (existing env-based config)
- **Pattern to follow:** Individual `export const DEFAULT_X = value` + aggregate `DEFAULT_LAUNCH_PARAMS` object
- **Why new file:** D-10 requires hardcoded business defaults separate from infrastructure env vars

### `lib/db/migrations/0002_core_launch_params.sql` (New)
- **Role:** Schema migration — adds core launch parameter columns to `tokens` table
- **Data flow:** Applied at startup via `npm run db:migrate`
- **Closest analog:** `lib/db/migrations/0001_initial.sql` (initial migration)
- **Pattern to follow:** `ALTER TABLE tokens ADD COLUMN ... NOT NULL DEFAULT ...`
- **Why new file:** D-01 requires three sequential migrations grouped by feature

### `lib/db/migrations/0003_fee_configuration.sql` (New)
- **Role:** Schema migration — adds fee scheduler and fee token mode columns
- **Data flow:** Applied sequentially after 0002
- **Closest analog:** Same as above
- **Pattern to follow:** `ALTER TABLE tokens ADD COLUMN ... NOT NULL DEFAULT ...`

### `lib/db/migrations/0004_pool_configuration.sql` (New)
- **Role:** Schema migration — adds holdback and quote token columns
- **Data flow:** Applied sequentially after 0003
- **Closest analog:** Same as above
- **Pattern to follow:** `ALTER TABLE tokens ADD COLUMN ... NOT NULL DEFAULT ...`

---

## Files to Modify

### `lib/db/schema/tokens.ts` (Modify)
- **Role:** Schema source of truth — Drizzle ORM table definition
- **Data flow:** Schema ↔ Drizzle Kit ↔ Migration SQL ↔ SQLite DB
- **Closest analog:** *Itself* — this IS the source of truth for token schema
- **Pattern to follow (from current file):**
  - `text('column_name').notNull().default('value')` for string defaults
  - `real('column_name').notNull().default(0)` for numeric defaults
  - `integer('column_name', { mode: 'boolean' }).notNull().default(false)` for booleans
  - Add new columns alongside existing columns, grouped by feature area

**Excerpt — existing pattern for adding columns with defaults:**
```typescript
// lines 26-27 in current tokens.ts
export const tokens = sqliteTable('tokens', {
  decimals: integer('decimals').notNull().default(9),
  totalSupply: text('total_supply').notNull(), // String for large numbers
  // ...
  cumulativeFeesSnapshot: text('cumulative_fees_snapshot').notNull().default('0'),
});
```

**New columns to add (per RESEARCH.md and D-01/D-03):**
```typescript
// Core launch params (0002)
priceRangeMin: real('price_range_min').notNull().default(0.000001),
priceRangeMax: real('price_range_max').notNull().default(0.0001),

// Fee configuration (0003)
feeSchedulerMode: text('fee_scheduler_mode').notNull().default('market-cap-based'),
feeTokenMode: text('fee_token_mode').notNull().default('quoteOnly'),
startingMarketCap: text('starting_market_cap').notNull().default('0'),
endingMarketCap: text('ending_market_cap').notNull().default('0'),
startRate: real('start_rate').notNull().default(0),
endRate: real('end_rate').notNull().default(0),
durationMinutes: integer('duration_minutes').notNull().default(0),
fixedBaseFeeBps: integer('fixed_base_fee_bps').notNull().default(0),

// Pool configuration (0004)
holdbackPercentage: real('holdback_percentage').notNull().default(0),
```

### `types/token.ts` (Modify)
- **Role:** Type definitions — update `TokenFormData` and `TokenLaunchConfig`
- **Data flow:** Form state ↔ Zod validation ↔ API request body ↔ Service layer
- **Closest analog:** *Itself* — existing type definitions
- **Pattern to follow (from current file):**
  - Interface with optional fields marked `?:`
  - Nested objects for grouped config
  - `PublicKey` from `@solana/web3.js` for on-chain addresses

**Excerpt — current flat fee schedule pattern to replace:**
```typescript
// lines 33-37 in current token.ts
export interface TokenFormData {
  enableFeeScheduler: boolean;
  startingFeeRate: number;
  endingFeeRate: number;
  // ...
}

// lines 66-71 in current token.ts
export interface TokenLaunchConfig {
  feeSchedule?: {
    enabled: boolean;
    startRate: number;
    endRate: number;
    decayDuration: number;
  };
}
```

**Replacement pattern (per D-05/D-06/D-07):**
```typescript
// Import from new types/fee.ts
import { FeeSchedulerConfig, FeeTokenMode } from './fee';

export interface TokenFormData {
  // Remove: enableFeeScheduler, startingFeeRate, endingFeeRate
  // Add:
  feeSchedulerConfig: FeeSchedulerConfig;
  feeTokenMode: FeeTokenMode;
  totalSupply: number;
  initialPrice: number;
  priceRangeMin: number;
  priceRangeMax: number;
  holdbackPercentage: number;
  quoteTokenMint: string;
  // ... rest unchanged
}

export interface TokenLaunchConfig {
  // Remove old feeSchedule block
  // Add:
  feeSchedulerConfig: FeeSchedulerConfig;
  feeTokenMode: FeeTokenMode;
  totalSupply: number;
  initialPrice: number;
  priceRangeMin: number;
  priceRangeMax: number;
  holdbackPercentage: number;
  // ... rest unchanged
}
```

### `config/environment.ts` (Modify)
- **Role:** Configuration — remove business defaults, keep infrastructure
- **Data flow:** Env vars → runtime config
- **Closest analog:** *Itself* — existing env config
- **Pattern to follow (from current file):**
  - Keep: `RPC_URL`, `SOLANA_NETWORK`, `IPFS_GATEWAY`, `MAX_IMAGE_SIZE_MB`
  - Remove/deprecate: `TOTAL_SUPPLY`, `INITIAL_PRICE`, `PRICE_RANGE_MIN`, `PRICE_RANGE_MAX`, `FEE_DECAY_DURATION_MINUTES`, `FEE_DECAY_PERIODS`, `POOL_LIQUIDITY_PERCENTAGE`
  - The business defaults move to `config/defaults.ts` (D-10)

**Excerpt — current env-based defaults to remove:**
```typescript
// lines 13-27 in current environment.ts
TOTAL_SUPPLY: parseInt(process.env.NEXT_PUBLIC_TOTAL_SUPPLY || '1000000000'),
INITIAL_PRICE: parseFloat(process.env.NEXT_PUBLIC_INITIAL_PRICE || '0.00001'),
PRICE_RANGE_MIN: parseFloat(process.env.NEXT_PUBLIC_PRICE_RANGE_MIN || '0.000001'),
PRICE_RANGE_MAX: parseFloat(process.env.NEXT_PUBLIC_PRICE_RANGE_MAX || '0.0001'),
FEE_DECAY_DURATION_MINUTES: parseInt(process.env.NEXT_PUBLIC_FEE_DECAY_DURATION_MINUTES || '60'),
FEE_DECAY_PERIODS: parseInt(process.env.NEXT_PUBLIC_FEE_DECAY_PERIODS || '60'),
POOL_LIQUIDITY_PERCENTAGE: parseFloat(process.env.NEXT_PUBLIC_POOL_LIQUIDITY_PERCENTAGE || '1.0'),
```

### `lib/db/service.ts` (Modify)
- **Role:** Database CRUD — update `TokenCreateInput` interface and insert operations
- **Data flow:** API route → service layer → Drizzle ORM → SQLite
- **Closest analog:** *Itself* — existing dbService barrel object
- **Pattern to follow (from conventions):**
  - `TokenCreateInput` interface extends inferred insert type
  - Named exports via `dbService` barrel object
  - All CRUD functions return typed objects (`Promise<Token | null>`)

**Expected change:** Extend `TokenCreateInput` to include all new fields from the schema. The exact shape is derived from `typeof tokens.$inferInsert` after schema changes.

### `lib/solana/poolUtils.ts` (Modify)
- **Role:** Blockchain — update SDK v1.4.3 imports and API usage
- **Data flow:** Service layer → Meteora SDK → on-chain transactions
- **Closest analog:** *Itself* — existing pool creation code
- **Pattern to follow (from current file):**
  - Import `getFeeTimeSchedulerParams`, `getFeeMarketCapSchedulerParams` instead of old `getFeeSchedulerParams`
  - Update `BaseFeeMode.FeeSchedulerExponential` → `BaseFeeMode.FeeTimeSchedulerExponential`
  - Update `PoolFeesParams.padding` from `number[]` to `number`
  - Add `compoundingFeeBps: 0` to `poolFees`
  - Handle `CollectFeeMode` for both-token mode (if supported in v1.4.3)

**Excerpt — current SDK usage to update:**
```typescript
// lines 1-2 in current poolUtils.ts
import { CpAmm, type PoolFeesParams, bpsToFeeNumerator, getFeeSchedulerParams, BaseFeeMode, CollectFeeMode, getDynamicFeeParams } from "@meteora-ag/cp-amm-sdk";

// lines 210-216 — old fee scheduler call
const baseFee = getFeeSchedulerParams(
  startBps,
  endBps,
  BaseFeeMode.FeeSchedulerExponential,
  numberOfPeriods,
  durationSeconds
);

// lines 218-222 — old poolFees shape
poolFees = {
  baseFee,
  padding: [0, 0, 0],
  dynamicFee,
};

// lines 235-242 — old fixed fee shape
poolFees = {
  baseFee: { ... },
  padding: [0, 0, 0],
  dynamicFee,
};

// line 287 — current collectFeeMode
collectFeeMode: CollectFeeMode.OnlyB,
```

**Replacement pattern (per RESEARCH.md):**
```typescript
import {
  CpAmm, type PoolFeesParams, bpsToFeeNumerator,
  getFeeTimeSchedulerParams,      // renamed from getFeeSchedulerParams
  getFeeMarketCapSchedulerParams,  // new in v1.4.3
  BaseFeeMode,
  CollectFeeMode,
  getDynamicFeeParams,
} from "@meteora-ag/cp-amm-sdk";

// Time-based scheduler
const baseFee = getFeeTimeSchedulerParams(
  startBps, endBps,
  BaseFeeMode.FeeTimeSchedulerExponential,
  numberOfPeriods,
  durationSeconds
);

// Market-cap scheduler (compute priceMultiple from stored caps)
const priceMultiple = endingMarketCap / startingMarketCap;
const baseFee = getFeeMarketCapSchedulerParams(
  startBps, endBps,
  BaseFeeMode.FeeMarketCapSchedulerExponential,
  numberOfPeriods,
  priceMultiple,
  schedulerExpirationDuration
);

// Updated poolFees shape
poolFees = {
  baseFee,
  compoundingFeeBps: 0,  // new in v1.4.3
  padding: 0,             // changed from number[] to number
  dynamicFee,
};

// CollectFeeMode — may support BothTokens in v1.4.3
// collectFeeMode: CollectFeeMode.OnlyB | CollectFeeMode.BothTokens (verify in SDK)
```

### `components/forms/TokenLaunchForm.tsx` (Modify — downstream prep)
- **Role:** Form UI — update Zod schema to use new discriminated union
- **Data flow:** User input → Zod validation → react-hook-form state
- **Closest analog:** *Itself* — existing form with Zod schema
- **Pattern to follow:**
  - Use `z.discriminatedUnion('mode', [...])` for `FeeSchedulerConfig`
  - Use `z.literal()` for mode values
  - Keep existing form structure, update field names

**Note:** This file modification is primarily preparation for Phase 2/3. Phase 1 changes may be limited to type imports and minimal schema updates to keep TypeScript compilation green.

### `app/api/tokens/create/route.ts` (Modify — downstream prep)
- **Role:** API route — accept and validate new parameters
- **Data flow:** Client POST → server validation → dbService → SQLite
- **Closest analog:** *Itself* — existing token creation API
- **Pattern to follow:**
  - Add new fields to request body parsing
  - Use Zod or manual validation for new parameters
  - Pass all fields to `dbService.createToken()`

**Note:** Like the form, this is downstream prep. Phase 1 changes may be minimal (type imports, extended interface) to prevent compilation errors.

---

## Integration Points (Cross-File Dependencies)

```
config/defaults.ts ───┬───> types/token.ts (TokenFormData uses default values)
                      ├──> types/fee.ts (FeeSchedulerConfig defaults)
                      └───> components/forms/TokenLaunchForm.tsx (defaultValues)

types/fee.ts ─────────┬───> types/token.ts (TokenFormData, TokenLaunchConfig import)
                      ├──> lib/solana/poolUtils.ts (SDK helpers use mode values)
                      └───> components/forms/TokenLaunchForm.tsx (Zod discriminatedUnion)

types/token.ts ───────┬───> lib/services/launchService.ts (TokenLaunchConfig)
                      ├──> lib/db/service.ts (TokenCreateInput)
                      └───> app/api/tokens/create/route.ts (request body type)

lib/db/schema/tokens.ts ─┬──> lib/db/service.ts ($inferInsert / $inferSelect)
                         ├──> lib/db/migrations/*.sql (Drizzle Kit generates from schema)
                         └──> lib/db/schema/index.ts (barrel export)

lib/solana/poolUtils.ts ─┬─> lib/services/launchService.ts (createDAMMv2Pool)
                          └──> config/defaults.ts (may import defaults for fallback)
```

---

## Pattern Summary Table

| Pattern | Where Used | Source File | Line(s) | Notes |
|---------|-----------|-------------|---------|-------|
| Drizzle schema `.notNull().default()` | `tokens.ts` new columns | `lib/db/schema/tokens.ts` | 16, 26, 55 | Established pattern for retroactive defaults |
| `$inferSelect` / `$inferInsert` | Type inference | `lib/db/schema/tokens.ts` | 72-73 | All new columns auto-infer |
| Discriminated union `mode` tag | `types/fee.ts` | New file | N/A | `switch (config.mode)` + `never` |
| Named default constants | `config/defaults.ts` | New file | N/A | `DEFAULT_TOTAL_SUPPLY`, etc. |
| SDK v1.4.3 import rename | `poolUtils.ts` | `lib/solana/poolUtils.ts` | 1-2 | `getFeeSchedulerParams` → `getFeeTimeSchedulerParams` |
| `padding: number[]` → `number` | `poolUtils.ts` | `lib/solana/poolUtils.ts` | 219, 241 | Breaking change in SDK v1.3.7+ |
| Add `compoundingFeeBps: 0` | `poolUtils.ts` | `lib/solana/poolUtils.ts` | 218-222 | New field in SDK v1.4.3 |
| Migration `ALTER TABLE ... DEFAULT` | `0002-0004.sql` | New files | N/A | Retroactive defaults per D-02 |
| Barrel export | `lib/db/schema/index.ts` | `lib/db/schema/index.ts` | N/A | Re-export tokens (no change needed) |

---

## Risk Markers

| File | Risk | Mitigation |
|------|------|------------|
| `lib/db/schema/tokens.ts` | Breaking existing DB queries if types drift | Keep schema as source of truth; regenerate migrations with `db:generate` |
| `lib/solana/poolUtils.ts` | SDK v1.4.3 API changes may cause runtime errors | Verify all imports after `npm install`; test with temporary script |
| `types/token.ts` | Removing old fields breaks downstream files | Phase 1 may do dual-field approach temporarily, or update all downstream in same commit |
| `lib/db/migrations/` | Manual splitting of generated SQL may corrupt `_journal.json` | Test `db:migrate` against fresh DB after splitting |
| `config/environment.ts` | Removing env vars may break `.env.local` users | Document in AGENTS.md; no code references to removed vars |

---

*Pattern map generated by orchestrator from existing codebase analysis*
