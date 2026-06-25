# Phase 6: Background Jobs & Hardening - Pattern Map

**Mapped:** 2026-06-25
**Files analyzed:** 5 (4 modified, 1 generated)
**Analogs found:** 5 / 5 (all files being modified are their own closest analog — this is a fix/rewrite phase, not greenfield)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `lib/cron/fee-updater.ts` | service (cron) | event-driven (scheduled) | `lib/cron/fee-updater.ts` (self — rewrite) | exact (self) |
| `lib/meteora/client.ts` | service (HTTP client) | request-response | `lib/meteora/client.ts` (self — rewrite) | exact (self) |
| `lib/db/schema/fee-update-schedule.ts` | model (schema) | CRUD | `lib/db/schema/tokens.ts` (boolean column pattern) | exact (pattern) |
| `lib/db/service.ts` | service (DB CRUD) | CRUD | `lib/db/service.ts` (self — extend) | exact (self) |
| `lib/db/migrations/0007_*.sql` | migration | file-I/O (generated) | `lib/db/migrations/0006_cleanup_obsolete_columns.sql` (drizzle-kit output) | exact (pattern) |

> **Note:** Phase 6 is a **fix/rewrite of existing files**, not greenfield creation. Each target file is its own closest analog. The patterns below extract the *current* (buggy) code that must be replaced, plus the established project conventions the new code must follow (boolean column from `tokens.ts`, service-barrel from `service.ts`, etc.).

## Pattern Assignments

### `lib/meteora/client.ts` (service, request-response) — REWRITE

**Analog:** self (`lib/meteora/client.ts`)

**Imports pattern** (lines 1):
```typescript
import { SOLANA_NETWORK } from "@/config/public";
```
> Keep this import. Network detection via `SOLANA_NETWORK` is preserved (D-13).

**Current (buggy) interface — lines 6-27** (REPLACE ENTIRELY):
```typescript
export interface MeteoraPoolMetrics {
  pool_address: string;
  volume24h: number;
  volume7d: number;
  volume30d: number;
  lp_fee24h: number;
  lp_fee7d: number;
  lp_fee30d: number;
  protocol_fee24h: number;
  protocol_fee7d: number;
  protocol_fee30d: number;
  partner_fee24h: number;
  partner_fee7d: number;
  partner_fee30d: number;
  referral_fee24h: number;
  referral_fee7d: number;
  referral_fee30d: number;
  tvl: number; // Total Value Locked
  apr: number;
  fee_tvl_ratio: number;
  updated_at: number; // Unix timestamp
}
```
> **All of these fields are wrong.** None of `lp_fee*`, `volume*` (flat), `apr` (top-level), `updated_at` exist in the real API. Replace with the verified interface from RESEARCH.md Code Examples (`TimeWindowData`, `TokenMetrics`, `PoolConfig`, `MeteoraPoolMetrics` with nested `cumulative_metrics`, `pool_config.collect_fee_mode`, `fees`/`volume` as `TimeWindowData`, `farm_apr`).

**Current (buggy) wrapper — lines 32-39** (DELETE):
```typescript
interface MeteoraApiResponse {
  status: number;
  error: { message: string; type: string; } | null;
  data: MeteoraPoolMetrics | null;
}
```
> **Remove entirely.** The real API returns the pool object directly on 200 (no wrapper). The wrapper check at lines 87-93 always fails → cron silently no-ops (CONTEXT.md landmine).

**Current (buggy) URL — lines 44-53** (REPLACE):
```typescript
function getMeteoraApiBaseUrl(): string {
  const network = SOLANA_NETWORK.toLowerCase();
  if (network === "devnet") {
    return "https://dammv2-api.devnet.meteora.ag";   // DEAD
  }
  return "https://dammv2-api.meteora.ag";            // 404
}
```
> **Replace URLs** per D-12/D-13: mainnet `https://damm-v2.datapi.meteora.ag`, devnet `https://damm-v2-api.dev.metdev.io`. Preserve the `SOLANA_NETWORK.toLowerCase()` detection logic.

**Core fetch pattern — lines 60-103** (REWRITE body):
```typescript
export async function getPoolMetrics(poolAddress: string): Promise<MeteoraPoolMetrics | null> {
  try {
    const baseUrl = getMeteoraApiBaseUrl();
    const url = `${baseUrl}/pools/${poolAddress}/metrics`;  // NOTE: old path had /metrics suffix

    // ... fetch with cache: "no-store" (KEEP this) ...

    const apiResponse: MeteoraApiResponse = await response.json();  // REMOVE wrapper
    if (apiResponse.error || !apiResponse.data) {                   // REMOVE this check
      return null;
    }
    return apiResponse.data;                                        // RETURN pool object directly
  } catch (error) { ... }
}
```
> **Key changes:** (1) URL path — real endpoint is `/pools/{address}` (no `/metrics` suffix) per RESEARCH.md verified live curl. (2) Parse pool object directly: `const pool: MeteoraPoolMetrics = await response.json();` — no wrapper. (3) Keep `cache: "no-store"`, 404→null, `[Meteora API]` log prefix with `✓` markers. (4) Use defensive `?? 0` on `cumulative_metrics?.fees` (not in OpenAPI `required` list but present in live responses — Assumption A1).

**Error handling pattern** (KEEP — already correct):
```typescript
if (!response.ok) {
  if (response.status === 404) {
    console.warn(`[Meteora API] Pool ${poolAddress} not found (404)`);
    return null;
  }
  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}
// ... catch block:
console.error(`[Meteora API] Error fetching pool metrics for ${poolAddress}:`, error);
return null;
```
> This pattern matches project conventions: bracketed log prefix, `instanceof Error`-style messages, null return on failure.

---

### `lib/cron/fee-updater.ts` (service, event-driven) — REWRITE

**Analog:** self (`lib/cron/fee-updater.ts`)

**Imports pattern** (lines 1-4) (KEEP, extend):
```typescript
import * as cron from "node-cron";
import { getPoolMetrics } from "@/lib/meteora/client";
import { calculateNextUpdateTime } from "@/lib/meteora/polling-strategy";
import * as dbService from "@/lib/db/service";
```
> Add: `import { MAX_CONSECUTIVE_FAILURES } from "@/config/defaults";` (if D-17 places constant there) or define inline. Planner picks per Open Question #2 — recommend `config/defaults.ts` for consistency.

**Singleton module-state pattern** (lines 11, 128-141) (KEEP unchanged):
```typescript
let cronJob: cron.ScheduledTask | null = null;

export function startFeeUpdaterCron() {
  if (cronJob) { console.log("[Cron] Fee updater already running"); return; }
  cronJob = cron.schedule("*/5 * * * *", updateTokenFees);
  console.log("[Cron] ✓ Fee updater cron started (runs every 5 minutes)");
  setTimeout(updateTokenFees, 1000); // immediate startup run
}
```
> Matches architecture constraint (module-level singleton, in-process cron). `polling-strategy.ts` requires NO change.

**Current (buggy) conversion block — lines 47-69** (REPLACE):
```typescript
if (metrics) {
  // BUG: assumes SOL lamports. API returns USD.
  const cumulativeFeesLamports = Math.floor(metrics.lp_fee30d * 1e9);  // ← THE BUG (D-01)
  await dbService.updateCumulativeFeesSnapshot(token.mintAddress, cumulativeFeesLamports.toString());
  await dbService.createPoolStatsSnapshot(token.id, token.poolAddress, {
    totalFeesGenerated: cumulativeFeesLamports.toString(),
    fees24h: Math.floor(metrics.lp_fee24h * 1e9).toString(),     // BUG
    volume24h: Math.floor(metrics.volume24h * 1e9).toString(),   // BUG
    currentLiquidity: Math.floor(metrics.tvl * 1e9).toString(),   // BUG
    apr: metrics.apr,                                              // field doesn't exist
  });
}
```
> **Replace with USD microunits** (D-02, `* 1e6` not `* 1e9`):
> ```typescript
> const USD_MICROUNITS = 1_000_000;
> const cumulativeFeesMicro = Math.floor((metrics.cumulative_metrics?.fees ?? 0) * USD_MICROUNITS);
> const fees24hMicro = Math.floor(metrics.fees["24h"] * USD_MICROUNITS);
> const volume24hMicro = Math.floor(metrics.volume["24h"] * USD_MICROUNITS);
> const tvlMicro = Math.floor(metrics.tvl * USD_MICROUNITS);
> const apr = metrics.farm_apr ?? null;  // real, no conversion (D-03); NOTE Open Question #1 on field choice
> await dbService.updateCumulativeFeesSnapshot(token.mintAddress, cumulativeFeesMicro.toString());
> await dbService.createPoolStatsSnapshot(token.id, token.poolAddress, {
>   totalFeesGenerated: cumulativeFeesMicro.toString(),
>   fees24h: fees24hMicro.toString(),
>   volume24h: volume24hMicro.toString(),
>   currentLiquidity: tvlMicro.toString(),
>   apr,
> });
> ```
> **Regression guard:** grep the file for `1e9` after edit — expect ZERO matches. Unit test asserts no `* 1e9` literal remains.

**CRON-01 mode read — insert after line 43** (`if (!token) { continue; }`):
```typescript
// NEW (D-05, CRON-01): read feeTokenMode for awareness/logging
if (token.feeTokenMode === 'bothTokens') {
  console.log(
    `[Cron] Pool ${token.poolAddress} uses both-token fee mode; ` +
    `tracking aggregate USD fees (per-side tracking deferred per CRON-03)`
  );
}
// fetch + store path is IDENTICAL regardless of mode (D-05/D-22)
```
> `token.feeTokenMode` already exists on the `Token` type (`tokens.ts:50`). No schema change needed for this read (D-07).

**Current failure handling — lines 88-113** (EXTEND with circuit breaker):
```typescript
} else {
  failCount++;
  console.warn(`[Cron] ✗ Failed to fetch metrics for token ${token.id} ...`);
  await dbService.recordUpdateFailure(token.id, "Pool not found in Meteora DAMMv2 API (404)");
}
// ... catch block also calls recordUpdateFailure (lines 109-112)
```
> **Add circuit breaker after each `recordUpdateFailure` call** (D-14/D-17, Pitfall 4 — re-fetch to read post-increment count):
> ```typescript
> await dbService.recordUpdateFailure(token.id, errorMessage);
> // NEW: circuit breaker check (D-14)
> const updated = await dbService.getFeeUpdateSchedule(token.id);
> if (updated && updated.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
>   await dbService.markPoolStale(token.id);  // NEW DB function
>   console.warn(`[Cron] ⚠️ Pool ${token.poolAddress} marked stale after ${MAX_CONSECUTIVE_FAILURES} consecutive failures`);
> }
> ```
> Apply this pattern to BOTH failure branches (the `metrics === null` branch at line 88 AND the `catch` branch at line 100). `recordUpdateFailure` returns `void` (verified `service.ts:456-468`) — re-fetch is mandatory (Assumption A4).

**Logging convention** (KEEP — already correct):
```typescript
console.log("[Cron] Starting fee update job...");
console.log(`[Cron] ✓ Updated fees for token ${token.id} ...`);   // ✓ success
console.warn(`[Cron] ✗ Failed to fetch metrics ...`);             // ✗ failure
console.warn(`[Cron] ⚠️ Pool ... marked stale ...`);               // ⚠️ warning (NEW)
```
> Bracketed `[Cron]` prefix, `✓`/`✗`/`⚠️` markers — matches CONVENTIONS.md.

---

### `lib/db/schema/fee-update-schedule.ts` (model, CRUD) — EDIT

**Analog:** `lib/db/schema/tokens.ts` (boolean column pattern)

**Boolean column pattern** — `tokens.ts:27`:
```typescript
featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
```
> **Copy this exact pattern** for the new `stale` column (D-14). `integer({mode:'boolean'})` is proven in the codebase with `better-sqlite3`. Add after line 35 (`lastErrorAt`):
> ```typescript
> // Circuit breaker flag — when true, cron skips this pool entirely (D-14/D-15)
> stale: integer('stale', { mode: 'boolean' }).notNull().default(false),
> ```

**Schema file conventions** (from `fee-update-schedule.ts`):
- kebab-case filename ✓
- `sqliteTable('fee_update_schedule', {...})` — snake_case table name ✓
- Inline column comments explaining purpose ✓
- Indexes defined inline in the table's third arg `(table) => ({...})` ✓
- Type inference exports at bottom (lines 50-51):
  ```typescript
  export type FeeUpdateSchedule = typeof feeUpdateSchedule.$inferSelect;
  export type NewFeeUpdateSchedule = typeof feeUpdateSchedule.$inferInsert;
  ```
  > **These types auto-update** when the `stale` column is added — no manual type edit needed. `FeeUpdateSchedule.stale: boolean` propagates to `service.ts` and `fee-updater.ts` automatically.

**Imports** (line 1) — already includes `integer`:
```typescript
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
```
> No new imports needed. `integer` is already imported.

---

### `lib/db/service.ts` (service, CRUD) — EXTEND

**Analog:** self (`lib/db/service.ts`)

**Imports** (lines 1-5) (KEEP — already complete):
```typescript
import { db } from './client';
import { tokens, poolStatsHistory, feeUpdateSchedule } from './schema';
import type { Token, PoolStatsHistory, FeeUpdateSchedule } from './schema';
import { eq, desc, asc, like, or, and, lt, lte, gt, gte, sql } from 'drizzle-orm';
```
> `eq`, `sql`, `and` are already imported — needed for the new `markPoolStale()` and `getPoolsDueForUpdate()` filter.

**Existing `getPoolsDueForUpdate` — lines 442-451** (EDIT — add stale filter):
```typescript
export async function getPoolsDueForUpdate(limit: number = 50): Promise<FeeUpdateSchedule[]> {
  const now = new Date();
  return await db
    .select()
    .from(feeUpdateSchedule)
    .where(lt(feeUpdateSchedule.nextUpdate, now))   // ADD: AND stale = false
    .orderBy(asc(feeUpdateSchedule.nextUpdate))
    .limit(limit);
}
```
> **Change `where` to** (D-15):
> ```typescript
> .where(and(
>   lt(feeUpdateSchedule.nextUpdate, now),
>   eq(feeUpdateSchedule.stale, false),   // NEW: skip stale pools
> ))
> ```
> `and` is already imported (line 4). `eq` is already imported. The `stale` column will exist on the `feeUpdateSchedule` schema object after the schema edit + migration.

**New `markPoolStale` function** — add after `getFeeUpdateSchedule` (line 481), modeled on existing update pattern:
```typescript
// Template from recordUpdateFailure (lines 456-468) — same shape:
export async function markPoolStale(tokenId: number): Promise<void> {
  await db
    .update(feeUpdateSchedule)
    .set({ stale: true })
    .where(eq(feeUpdateSchedule.tokenId, tokenId));
}
```
> **Copy the `recordUpdateFailure` shape exactly** — same `db.update(feeUpdateSchedule).set(...).where(eq(..., tokenId))` pattern. Returns `void`. JSDoc required per CONVENTIONS.md.

**dbService barrel export — lines 622-650** (EXTEND — add `markPoolStale`):
```typescript
export const dbService = {
  // ... existing exports ...
  upsertFeeUpdateSchedule,
  getPoolsDueForUpdate,
  recordUpdateFailure,
  getFeeUpdateSchedule,
  // NEW:
  markPoolStale,
  // ...
};
```
> Add `markPoolStale` to the "Fee update schedule operations" section of the barrel (after line 647). The cron imports `* as dbService` so it accesses new functions automatically.

---

### `lib/db/migrations/0007_*.sql` (migration) — GENERATED

**Analog:** `lib/db/migrations/0006_cleanup_obsolete_columns.sql` (drizzle-kit output)

**Generation command** (from RESEARCH.md Pattern 4):
```bash
npm run db:generate    # drizzle-kit generate — produces 0007_*.sql from schema diff
```
> **Wave 0 ordering constraint** (Pitfall 6): schema edit → `db:generate` → apply migration → THEN cron/service edits that reference `stale`. Otherwise SQLite throws `no such column: stale` at runtime.

**Migration application** — existing runner (check `package.json` `db:migrate` script). The generated SQL will be an `ALTER TABLE fee_update_schedule ADD COLUMN stale INTEGER NOT NULL DEFAULT 0;` (Drizzle emits boolean as `INTEGER` 0/1).

---

## Shared Patterns

### Bracketed Log Prefixes with Status Markers
**Source:** `lib/cron/fee-updater.ts` (lines 18, 24, 86, 91, 103), `lib/meteora/client.ts` (lines 78, 95, 100)
**Apply to:** All log statements in modified files
```typescript
console.log("[Cron] ✓ ...")      // success
console.warn("[Cron] ✗ ...")      // failure
console.warn("[Cron] ⚠️ ...")     // warning (NEW — circuit breaker)
console.error("[Cron] Error ...") // error
console.log("[Meteora API] ✓ ...")
console.warn("[Meteora API] Pool ... not found (404)")
```
> Convention from CONVENTIONS.md: `[Cron]`, `[Meteora API]` prefixes; `✓`/`✗`/`⚠️` markers; `instanceof Error` check before `.message` (see `fee-updater.ts:102`).

### Typed Error Extraction
**Source:** `lib/cron/fee-updater.ts:102`
**Apply to:** All catch blocks in modified files
```typescript
const errorMessage = error instanceof Error ? error.message : "Unknown error";
```
> CONVENTIONS.md mandates `instanceof Error` check before accessing `.message`.

### Text-Precision Storage (string-encoded integers)
**Source:** `lib/db/schema/tokens.ts:76` (`cumulativeFeesSnapshot: text(...).default('0')`), `lib/db/schema/pool-stats-history.ts:25-36`
**Apply to:** All monetary metric DB writes in the cron
```typescript
// Fee values stored as text (string-encoded integers) to avoid SQLite integer limits.
// USD microunits as strings: Math.floor(usdFloat * 1e6).toString()
await dbService.updateCumulativeFeesSnapshot(mintAddress, cumulativeFeesMicro.toString());
```
> No schema change needed for fee columns — existing `text` columns hold the new USD-microunits strings. The `* 1e6` conversion + `.toString()` happens in the cron before writing. (D-02, D-20.)

### Drizzle ORM Query Pattern
**Source:** `lib/db/service.ts:442-451`, `456-468`
**Apply to:** `getPoolsDueForUpdate()` edit + new `markPoolStale()`
```typescript
// Select with where: db.select().from(table).where(condition).orderBy(...).limit(n)
// Update: db.update(table).set({...}).where(eq(table.col, val))
// Atomic increment via SQL: sql`${table.col} + 1`  (recordUpdateFailure pattern, line 463)
```
> All query builders (`eq`, `and`, `lt`, `sql`) already imported in `service.ts:4`. Use `eq(feeUpdateSchedule.stale, false)` for the new filter.

### Defensive Optional Field Parsing
**Source:** RESEARCH.md Code Examples (A1 — `cumulative_metrics` not in OpenAPI `required` list)
**Apply to:** `getPoolMetrics()` response parsing in `lib/meteora/client.ts`
```typescript
const cumulativeFeesMicro = Math.floor((metrics.cumulative_metrics?.fees ?? 0) * USD_MICROUNITS);
const apr = metrics.farm_apr ?? null;
```
> `?? 0` / `?? null` guards prevent `NaN` poisoning (Pitfall 2). `Math.floor(undefined * 1e6)` = `NaN` → guard converts to `0` first.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| _(none)_ | — | — | All 5 files have exact analogs (self or established project pattern). Phase 6 rewrites existing code — no greenfield files. |

> The circuit breaker (`markPoolStale` + threshold check) is the only "new" mechanism, but it composes existing primitives (`recordUpdateFailure` pattern + boolean column pattern from `tokens.ts:27` + existing query filter shape). No new analog needed.

## Metadata

**Analog search scope:**
- `lib/cron/fee-updater.ts` (read: full file, 162 lines)
- `lib/meteora/client.ts` (read: full file, 126 lines)
- `lib/db/schema/fee-update-schedule.ts` (read: full file, 51 lines)
- `lib/db/schema/tokens.ts` (read: full file, 90 lines — boolean column analog)
- `lib/db/schema/index.ts` (read: full file, 8 lines — barrel pattern)
- `lib/db/service.ts` (grep + targeted reads: lines 1-60, 190-239, 275-404, 405-494, 600-651 — 5 non-overlapping ranges)
- `config/defaults.ts` (grep: constant naming pattern)
- `lib/db/migrations/` (ls: migration numbering convention)

**Files scanned:** 8 source files + 1 migration directory listing
**Pattern extraction date:** 2026-06-25

### Key Patterns Summary for Planner
1. **Self-analog rewrite:** All 5 target files are existing code being fixed. Patterns extract the *current buggy code* to replace and the *project conventions* the new code must match.
2. **Boolean column:** Copy `tokens.ts:27` `featured` pattern exactly for the new `stale` column.
3. **DB service extension:** Copy `recordUpdateFailure` (service.ts:456-468) shape for new `markPoolStale`; add `eq(stale, false)` to existing `getPoolsDueForUpdate` where-clause.
4. **USD microunits:** Replace ALL `* 1e9` with `* 1e6`; store as `.toString()` in existing `text` columns. Regression guard: grep for `1e9` → expect 0 matches.
5. **Wave 0 ordering:** Schema edit → `db:generate` → apply migration → THEN cron/service edits (Pitfall 6).
6. **Circuit breaker:** Re-fetch schedule after `recordUpdateFailure` (returns void) to read post-increment `consecutiveFailures` (Pitfall 4 off-by-one).