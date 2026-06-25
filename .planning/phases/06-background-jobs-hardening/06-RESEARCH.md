# Phase 6: Background Jobs & Hardening - Research

**Researched:** 2026-06-25
**Domain:** Solana / Meteora DAMMv2 API integration, node-cron background jobs, Drizzle ORM migrations, SQLite circuit-breaker pattern
**Confidence:** HIGH

## Summary

Phase 6 fixes three concrete, pre-existing bugs in the fee-updater cron (`lib/cron/fee-updater.ts`) and its Meteora client (`lib/meteora/client.ts`), then hardens the cron with a circuit breaker. The bugs are fully diagnosed in CONTEXT.md and verified live in this research session: (1) the mainnet API base URL `https://dammv2-api.meteora.ag` returns HTTP 404 — **verified live** — and the devnet URL is also stale; (2) the `MeteoraPoolMetrics` interface references fields (`lp_fee24h`, `lp_fee30d`, `volume24h`, `apr`, `updated_at`) that do not exist in the real Meteora DAMMv2 API response, and the code assumes a `{status, error, data}` wrapper that the real API does not return (it returns the pool object directly on 200, or `{message}` on 400); (3) the cron multiplies every monetary value by `1e9` assuming SOL lamports, but the API returns all monetary values (fees, volume, TVL, cumulative fees) in **USD as floats**, not SOL.

The fix path is locked by 22 decisions in CONTEXT.md (D-01..D-22): replace `* 1e9` with `* 1e6` (USD microunits, 6 decimals, integer-safe), rewrite the interface to match the verified live response (TimeWindowData for fees/volume/protocol_fees/fee_tvl_ratio, flat `tvl`/`current_price` doubles, nested `cumulative_metrics.{volume,fees}`, `pool_config.collect_fee_mode` 0=both/1=quote), swap the API base URLs to `https://damm-v2.datapi.meteora.ag` (mainnet) and `https://damm-v2-api.dev.metdev.io` (devnet), remove the response wrapper, add a `stale` boolean column to `fee_update_schedule` with a Drizzle migration, and add a `markPoolStale()` DB function + threshold check in the cron. Both-token mode pools are tracked identically to quote-only pools because the API returns aggregate USD fees regardless of `collect_fee_mode` — per-side tracking is deferred per CRON-03's feasibility clause.

**Primary recommendation:** Execute as 4 sequential tasks — (1) Drizzle schema migration for the `stale` column, (2) Meteora client interface/URL/wrapper rewrite, (3) cron logic rewrite (USD microunits + `feeTokenMode` read + circuit breaker), (4) DB service `markPoolStale()` + `getPoolsDueForUpdate()` stale filter — each verified by unit tests with mocked Meteora fixtures before any live API call.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Meteora API returns ALL monetary values in USD (not SOL/lamports). All `* 1e9` conversions are bugs and must be removed.
- **D-02:** Monetary metrics stored as **USD microunits** (integer, 6 decimals). e.g. $277,672.23 → `277672230000`. Existing `text` columns hold string-encoded integers — no schema change for fee columns.
- **D-03:** APR stored as-is from API as `real` (float). No multiplication/conversion.
- **D-04:** API returns fees as a single aggregate USD value with no per-token-side breakdown. `pool_config.collect_fee_mode` (0=both, 1=quote) indicates on-chain mode but API reports one number.
- **D-05:** Cron reads `token.feeTokenMode` from DB for awareness/logging but does NOT attempt per-side fee tracking. Both-token pools store the same aggregate USD fee as quote-only.
- **D-06:** Per-side fee tracking **deferred** per CRON-03 "deferred if not feasible in v1" clause. Document in logs when a both-token pool is encountered.
- **D-07:** No new DB columns for both-token mode. `feeTokenMode` column stays for display/on-chain reference only.
- **D-08:** Use `cumulative_metrics.fees` (true all-time cumulative, USD) directly as `tokens.cumulativeFeesSnapshot` (USD microunits). Replaces incorrect `lp_fee30d` proxy.
- **D-09:** `pool_stats_history` snapshots: store `fees.24h` (TimeWindowData) as `fees24h`, and `cumulative_metrics.fees` as `totalFeesGenerated`. Both USD microunits.
- **D-10:** `MeteoraPoolMetrics` interface rewritten: `fees`/`volume`/`protocol_fees`/`fee_tvl_ratio` → `TimeWindowData` (keys `30m`,`1h`,`2h`,`4h`,`12h`,`24h`); `tvl`/`current_price` → number; `apr` removed (no top-level APR; `farm_apr` exists separately); `cumulative_metrics` → `{volume:number, fees:number}`; `pool_config` includes `collect_fee_mode` (0=both,1=quote), `base_fee_mode`, `base_fee_pct`, etc.; `token_x`/`token_y` → TokenMetrics with `decimals`,`price`,`market_cap`. Removed: `lp_fee24h/7d/30d`, `volume24h/7d/30d`, `protocol_fee24h/7d/30d`, `partner_fee*`, `referral_fee*`, `updated_at`.
- **D-11:** `getPoolMetrics()` rewritten to parse new response. Old `MeteoraApiResponse` wrapper (`{status,error,data}`) removed — real API returns pool object directly.
- **D-12:** API base URLs: mainnet `https://damm-v2.datapi.meteora.ag`, devnet `https://damm-v2-api.dev.metdev.io`. Old URLs return 404/dead.
- **D-13:** `getMeteoraApiBaseUrl()` updated with new URLs; network detection (checking `SOLANA_NETWORK` env var) preserved.
- **D-14:** Boolean `stale` column added to `fee_update_schedule` (default `false`). When `consecutiveFailures` reaches configurable threshold (default 10), cron sets `stale = true` and stops attempting updates.
- **D-15:** `getPoolsDueForUpdate()` skips pools where `stale = true` (excluded from query entirely).
- **D-16:** Stale pools manually reset via DB (`stale = false`, `consecutiveFailures = 0`). No automatic reset.
- **D-17:** Failure threshold configurable via constant `MAX_CONSECUTIVE_FAILURES = 10` in `lib/cron/fee-updater.ts` or `config/defaults.ts`.
- **D-18:** Cron continues every 5 minutes. Polling-strategy intervals are aspirational; 5-min cron is the update floor. Acceptable: first update within 5 min of launch.
- **D-19:** 5-min schedule is a configurable default via cron expression in `startFeeUpdaterCron()`. Code change, not env var.
- **D-20:** No backfill migration. Cron overwrites `cumulativeFeesSnapshot` each run → next cycle writes USD microunits. Old historical `pool_stats_history` snapshots remain in lamports (old format), used only for time-series charts. Display layer must handle unit mismatch for pre-Phase-6 snapshots.
- **D-21:** Existing tokens have `feeTokenMode` defaulting to `'quoteOnly'` — work unchanged. Mode read is new but non-breaking.
- **D-22:** Failure handling uniform across all fee token modes. Cron treats all tokens the same: fetch metrics, store USD microunits, record failures. `feeTokenMode` does not change error handling since API returns aggregate USD regardless.

### Agent's Discretion
- No areas deferred to agent discretion in this discussion.

### Deferred Ideas (OUT OF SCOPE)
- Per-side (base/quote) fee tracking — requires on-chain account reads. Deferred per CRON-03 feasibility clause. Future phase could add Solana RPC account deserialization.
- Dynamic SOL/USD price fetching for historical conversion — not needed since natural overwrite chosen.
- Configurable cron schedule via env var — 5-min interval hardcoded; future enhancement.
- Version flag / `unit_version` column on `pool_stats_history` — could distinguish lamport vs USD-microunits snapshots; not needed since natural overwrite chosen.

## Project Constraints (from AGENTS.md)

- **Tech stack locked:** Next.js 16 / React 19 / Tailwind / shadcn/ui patterns (already in use). No new UI frameworks.
- **Blockchain SDK:** Fee scheduler modes must be supported by `@meteora-ag/cp-amm-sdk`. (Not relevant to cron phase — cron only reads Meteora HTTP API, not the SDK.)
- **Wallet compatibility:** Standard Solana wallet adapters. (Not relevant — cron runs server-side, no wallet interaction.)
- **UI simplicity:** Default form stays simple; customizations in "Advanced Options" collapsible. (Not relevant — Phase 6 is UI-hint: no, no UI changes.)
- **Conventions (from CONVENTIONS.md):** camelCase utility files, PascalCase components, kebab-case schema files, named exports only, JSDoc on exported functions, `[Cron]`/`[Meteora API]` log prefixes with `✓`/`✗`/`⚠️` markers, error prefixing with bracketed tags, `instanceof Error` check before `.message`, API routes return `{error, details}`. Service-object pattern for `dbService`. Schema-first Drizzle migrations via `drizzle-kit generate`.
- **Architecture constraints:** Single-threaded Node event loop (cron runs in-process). Module-level singletons (cron job handle at `lib/cron/fee-updater.ts:11`). Build-time skip (`NEXT_PHASE === 'phase-production-build'`). Text-precision storage for large values (string-encoded integers).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CRON-01 | Fee updater cron job reads `collectFeeMode` from database | D-05: read `token.feeTokenMode` from DB per pool in the cron loop (already fetched via `dbService.getTokenById(schedule.tokenId)` at `fee-updater.ts:39`). Log the mode. No per-side tracking. |
| CRON-02 | Fee updater correctly handles quote-only fee tracking (current behavior preserved) | D-01/D-02/D-08/D-09: after fixing USD microunits conversion + API URL + interface, quote-only (default) pools track correctly. API returns aggregate USD regardless of mode, so quote-only is the default code path. |
| CRON-03 | Fee updater supports both-token fee tracking when `collectFeeMode` is "both" (deferred if not feasible in v1) | D-04/D-05/D-06: both-token pools tracked identically to quote-only (aggregate USD). Per-side tracking deferred per feasibility clause. Logged when encountered. |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Cron scheduling & orchestration | API / Backend | — | `node-cron` runs in-process on the Next.js server (single-threaded event loop). Server-only. |
| Meteora API HTTP fetch | API / Backend | — | Server-side `fetch()` to Meteora REST API. No browser calls — keeps no secrets client-side and avoids CORS. |
| Fee unit conversion (USD → microunits) | API / Backend | — | Pure function in cron. No client involvement. |
| `feeTokenMode` read | Database / Storage | — | Read from `tokens` table via `dbService.getTokenById`. |
| Circuit breaker state | Database / Storage | — | `stale` boolean column in `fee_update_schedule`; `markPoolStale()` DB function; query filter in `getPoolsDueForUpdate()`. |
| Schema migration (stale column) | Database / Storage | — | Drizzle Kit generates SQL migration from schema change. |
| Display of historical snapshots | Browser / Client | Frontend Server | Pre-Phase-6 snapshots are in lamports; post-Phase-6 in USD microunits. Display layer must handle — but this is OUT OF SCOPE for Phase 6 (D-20 notes display layer awareness, no work here). |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node-cron | ^4.2.1 (installed) | Cron scheduling | Already in use at `lib/cron/fee-updater.ts:1`. No change. [VERIFIED: package.json] |
| drizzle-orm | 0.44.7 (installed) | Schema definition + query builder | Already in use for all DB ops. Adds `stale` boolean column. [VERIFIED: package.json] |
| drizzle-kit | ^0.31.6 (installed) | Migration generation | `npm run db:generate` produces SQL migration from schema diff. [VERIFIED: package.json] |
| better-sqlite3 | 12.4.1 (installed) | SQLite driver | Sync driver; `integer({mode:'boolean'})` already proven in `tokens.ts:27` (`featured` column). [VERIFIED: codebase] |
| tsx | ^4.20.6 (installed) | TypeScript execution for scripts/migrations | Used to run migrations. [VERIFIED: package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | — | — | Phase 6 adds NO new dependencies. All changes are to existing files using existing libs. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| node-cron (in-process) | External scheduler (BullMQ, systemd timer) | Out of scope — locked by existing architecture. In-process cron is a deliberate project choice. |
| Drizzle boolean column | Separate `stale_at` timestamp | Boolean matches existing pattern (`featured` column). Simpler. Locked by D-14. |
| USD microunits (int ×1e6) | Store raw USD float | Locked by D-02 — integer avoids float precision loss in cumulative sums. |

**Installation:**
```bash
# No installs required. All dependencies already present.
```

**Version verification:** All packages above are already in `package.json` and `node_modules`. No new packages to verify against registries. [VERIFIED: codebase grep of package.json]

## Package Legitimacy Audit

> No new packages are installed in this phase. All changes are to existing files using already-installed dependencies (node-cron, drizzle-orm, drizzle-kit, better-sqlite3, tsx). slopcheck gate is not triggered — there are no new package installs to audit.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| (none new) | — | — | — | — | — | N/A — no new packages |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```text
[Next.js Server Process (in-process cron)]
        │
        ▼
[startFeeUpdaterCron()] ──► node-cron schedule "*/5 * * * *"
        │                        │
        │                        ▼ (every 5 min + 1s startup run)
        │              [updateTokenFees()]
        │                        │
        │                        ▼
        │   ┌────────────────────────────────────────────┐
        │   │ 1. dbService.getPoolsDueForUpdate()         │
        │   │    WHERE nextUpdate <= now AND stale=false  │ ◄── NEW stale filter (D-15)
        │   └────────────────────────────────────────────┘
        │                        │ scheduledPools[]
        │                        ▼
        │   ┌────────────────────────────────────────────┐
        │   │ 2. For each schedule:                       │
        │   │    token = dbService.getTokenById(tokenId) │
        │   │    → reads token.feeTokenMode (CRON-01)     │ ◄── NEW mode read (D-05)
        │   │    log mode (both→warn deferred per-side)   │
        │   └────────────────────────────────────────────┘
        │                        │
        │                        ▼
        │   ┌────────────────────────────────────────────┐
        │   │ 3. getPoolMetrics(poolAddress)               │
        │   │    fetch GET {BASE_URL}/pools/{address}      │
        │   │    BASE_URL = damm-v2.datapi.meteora.ag      │ ◄── FIXED URL (D-12)
        │   │    parse pool object directly (no wrapper)   │ ◄── FIXED parse (D-11)
        │   │    → MeteoraPoolMetrics                       │
        │   └────────────────────────────────────────────┘
        │                        │
        │            ┌───────────┴───────────┐
        │            ▼ success              ▼ failure (null/throw)
        │   ┌──────────────┐         ┌──────────────────────┐
        │   │ USD microunit │         │ recordUpdateFailure()│
        │   │ conversion   │         │ consecutiveFailures++ │
        │   │ *1e6 (D-02)  │         └──────────────────────┘
        │   └──────────────┘                  │
        │            │                        ▼
        │            ▼               ┌──────────────────────┐
        │   ┌────────────────┐      │ if (cf+1 >= THRESHOLD)│ ◄── NEW circuit
        │   │ updateCumulative│      │   markPoolStale()     │    breaker (D-14/17)
        │   │ FeesSnapshot()  │      └──────────────────────┘
        │   │ createPoolStats │
        │   │ Snapshot()      │
        │   │ upsertFeeUpdate │
        │   │ Schedule()      │
        │   └────────────────┘
        │
        ▼
[SQLite DB: tokens, pool_stats_history, fee_update_schedule (+stale)]
```

### Recommended Project Structure
```
lib/
├── cron/
│   └── fee-updater.ts          # REWRITE: USD microunits, feeTokenMode read, circuit breaker
├── meteora/
│   ├── client.ts               # REWRITE: interface, URL, remove wrapper
│   └── polling-strategy.ts     # NO CHANGE
├── db/
│   ├── schema/
│   │   └── fee-update-schedule.ts  # EDIT: add `stale` boolean column
│   ├── service.ts              # EDIT: markPoolStale(), getPoolsDueForUpdate() stale filter
│   └── migrations/
│       └── 0007_*.sql          # GENERATED by drizzle-kit
└── (config/defaults.ts         # OPTIONAL: MAX_CONSECUTIVE_FAILURES constant)
```

### Pattern 1: USD Microunits Conversion (D-02)
**What:** All monetary values from the Meteora API are USD floats. Convert to integer microunits (×1e6) for integer-safe storage in `text` columns.
**When to use:** Every monetary metric written to DB by the cron.
**Example:**
```typescript
// Source: CONTEXT.md D-02 + live API verification (cumulative_metrics.fees = 4.424... USD)
const USD_MICROUNITS = 1_000_000; // 6 decimal places

const cumulativeFeesMicro = Math.floor(metrics.cumulative_metrics.fees * USD_MICROUNITS);
const fees24hMicro = Math.floor(metrics.fees["24h"] * USD_MICROUNITS);
const volume24hMicro = Math.floor(metrics.volume["24h"] * USD_MICROUNITS);
const tvlMicro = Math.floor(metrics.tvl * USD_MICROUNITS);

// APR is a percentage, NOT monetary — store as-is (D-03)
const apr = metrics.farm_apr; // real (float), no conversion
```

### Pattern 2: Mode-Aware Read (CRON-01, D-05)
**What:** Read `token.feeTokenMode` for awareness/logging. Both-token mode pools are tracked identically to quote-only (aggregate USD). Log a deferred-per-side warning for both-token pools.
**When to use:** Inside the per-pool cron loop.
**Example:**
```typescript
// Source: CONTEXT.md D-05/D-06 + CRON-01
const token = await dbService.getTokenById(schedule.tokenId);
if (!token) { continue; }

if (token.feeTokenMode === 'bothTokens') {
  console.log(
    `[Cron] Pool ${token.poolAddress} uses both-token fee mode; ` +
    `tracking aggregate USD fees (per-side tracking deferred per CRON-03)`
  );
}
// ... identical fetch + store path regardless of mode
```

### Pattern 3: Circuit Breaker (D-14..D-17)
**What:** After recording a failure, if `consecutiveFailures + 1 >= MAX_CONSECUTIVE_FAILURES`, mark the pool stale so it's excluded from future queries.
**When to use:** In the failure branch of the cron loop.
**Example:**
```typescript
// Source: CONTEXT.md D-14/D-17 + existing recordUpdateFailure() at service.ts:456
const MAX_CONSECUTIVE_FAILURES = 10; // configurable (D-17)

await dbService.recordUpdateFailure(schedule.tokenId, errorMessage);

// Re-fetch to check threshold (recordUpdateFailure increments via SQL)
const scheduleRow = await dbService.getFeeUpdateSchedule(schedule.tokenId);
if (scheduleRow && scheduleRow.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
  await dbService.markPoolStale(schedule.tokenId);
  console.warn(
    `[Cron] ⚠️ Pool ${schedule.poolAddress} marked stale after ` +
    `${MAX_CONSECUTIVE_FAILURES} consecutive failures`
  );
}
```

### Pattern 4: Drizzle Boolean Column Migration
**What:** Add `stale` boolean column. Drizzle's `integer({mode:'boolean'})` is already proven in the codebase (`tokens.ts:27` `featured`). Run `drizzle-kit generate` to produce the migration SQL.
**When to use:** Wave 0 — schema change must land before cron/DB-service edits depend on it.
**Example:**
```typescript
// Source: codebase pattern at lib/db/schema/tokens.ts:27 + CONTEXT.md D-14
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const feeUpdateSchedule = sqliteTable('fee_update_schedule', {
  // ... existing columns ...
  stale: integer('stale', { mode: 'boolean' }).notNull().default(false),
  // ... existing indexes ...
});
```
Then: `npm run db:generate` → produces `lib/db/migrations/0007_*.sql`. Apply via existing migration runner.

### Anti-Patterns to Avoid
- **Multiplying USD by 1e9:** The current code does `metrics.lp_fee30d * 1e9` assuming SOL lamports. The API returns USD. This is THE bug. Replace ALL `* 1e9` with `* 1e6`. (CONTEXT.md D-01, verified live: `cumulative_metrics.fees = 4.424` USD.)
- **Keeping the response wrapper:** The current code checks `apiResponse.error` / `apiResponse.data`. The real API returns the pool object directly on 200. The wrapper check always fails → cron silently no-ops on every pool. Remove it. (CONTEXT.md D-11, verified live: response is the pool object, not `{status,error,data}`.)
- **Using non-existent fields:** `lp_fee24h`, `lp_fee30d`, `volume24h` (flat), `apr` (top-level), `updated_at` do not exist in the real API. They're `undefined` → `NaN` after `* 1e9` → `0` after `Math.floor`. The cron writes zeros. Use `fees["24h"]`, `cumulative_metrics.fees`, `volume["24h"]`, `tvl`, `farm_apr`. (Verified live against real pool.)
- **Per-side fee tracking via the API:** The API returns aggregate USD only. Attempting base/quote split via the API is impossible. Don't hand-roll it — it's deferred. (CONTEXT.md D-06.)
- **Backfilling old snapshots:** D-20 explicitly chose natural overwrite. Do NOT write a backfill migration. The cron overwrites `cumulativeFeesSnapshot` each run.
- **Automatic stale reset:** D-16 says no automatic reset. A stale pool indicates a persistent issue. Manual DB reset only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cron scheduling | Custom setInterval/recursive timeout | `node-cron` (already in use) | Handles cron expressions, drift, DST. Already integrated. |
| DB migration generation | Hand-written ALTER TABLE SQL | `drizzle-kit generate` | Generates idempotent migrations from schema diff. Project convention (CONVENTIONS.md). |
| Boolean column storage | Integer 0/1 with manual casts | Drizzle `integer({mode:'boolean'})` | Proven in `tokens.ts:27`. Type-safe. |
| Failure counter increment | Read-modify-write in JS | SQL `consecutiveFailures = consecutiveFailures + 1` (already in `recordUpdateFailure`) | Atomic, avoids race conditions. Already implemented at `service.ts:463`. |
| HTTP fetch to Meteora | Custom HTTP client / axios | Native `fetch` (already in use) | No new deps. Already in `client.ts:67`. |
| Polling interval calc | Custom age-based logic | `calculateNextUpdateTime()` (existing) | Already correct, no change needed (CONTEXT.md canonical_refs). |

**Key insight:** Phase 6 is a fix/rewrite of existing code using existing libraries. The only "new" mechanism is the circuit breaker, which is ~10 lines using existing DB primitives (`recordUpdateFailure` + new `markPoolStale` + query filter). Do not introduce new dependencies.

## Runtime State Inventory

> This phase adds a DB column (`stale`) and changes how the cron writes monetary values. Applicable to refactor/migration categories.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **Pre-Phase-6 `pool_stats_history` snapshots** store fee/volume/tvl values as lamports (from old `* 1e9`). New snapshots will be USD microunits (`* 1e6`). `tokens.cumulativeFeesSnapshot` likewise. | **No data migration** (D-20). Cron overwrites `cumulativeFeesSnapshot` next run. Old history rows stay in lamports — display layer must be aware (out of scope for Phase 6). Verified: `pool_stats_history.totalFeesGenerated/fees24h/volume24h/currentLiquidity` are all `text` columns (`pool-stats-history.ts:25-36`); `tokens.cumulativeFeesSnapshot` is `text` default `'0'` (`tokens.ts:76`). |
| Live service config | None. Meteora API is external; no config stored outside git. | None. |
| OS-registered state | None. Cron is in-process (node-cron), not OS Task Scheduler/launchd/systemd. | None. |
| Secrets/env vars | `SOLANA_NETWORK` env var read by `getMeteoraApiBaseUrl()` (existing, unchanged logic). No secret renames. | None. |
| Build artifacts | Drizzle migration SQL file will be generated (`0007_*.sql`). Must be committed and run via existing migration runner. `drizzle-kit` cache in `lib/db/migrations/meta/`. | **Generate + commit migration** via `npm run db:generate`. Apply via existing migration script. |

**Nothing found in category:** Live service config (none — Meteora API has no project-managed config outside git), OS-registered state (none — in-process cron), Secrets/env vars (no renames).

## Common Pitfalls

### Pitfall 1: Silent cron no-op due to dead API URL + broken wrapper
**What goes wrong:** The cron has been silently failing on every pool. `getMeteoraApiBaseUrl()` returns `https://dammv2-api.meteora.ag` which returns HTTP 404 for all requests. Even if it didn't 404, the response parsing checks `apiResponse.error`/`apiResponse.data` against a wrapper that doesn't exist.
**Why it happens:** The API moved domains and the interface was written against an older/incorrect API version.
**How to avoid:** Fix BOTH the URL (D-12) AND the interface/wrapper (D-10/D-11) in the same change. Fixing only one still leaves the cron broken. **Verified live:** old mainnet URL → 404; new URL → 200 with pool object directly (no wrapper).
**Warning signs:** `[Cron] ✗ Failed to fetch metrics` for every pool; `[Meteora API] Pool ... not found (404)`; `consecutiveFailures` climbing on all pools (pre-circuit-breaker).

### Pitfall 2: NaN→0 from non-existent interface fields
**What goes wrong:** Even with the correct URL, the current interface fields (`lp_fee24h`, `lp_fee30d`, `volume24h`, `apr`, `updated_at`) don't exist in the real response → `undefined` → `undefined * 1e9 = NaN` → `Math.floor(NaN) = 0`. The cron writes zeros to the DB.
**Why it happens:** Interface was wrong from the start.
**How to avoid:** Rewrite the interface to match the verified live response (TimeWindowData, cumulative_metrics, etc.). **Verified live fields:** `fees.24h`, `volume.24h`, `tvl` (flat number), `cumulative_metrics.fees`, `farm_apr`, `pool_config.collect_fee_mode`.
**Warning signs:** All fee snapshots are `0`; `apr` is `null`/`0` in DB.

### Pitfall 3: Unit mismatch in historical snapshots (D-20)
**What goes wrong:** After the fix, new `pool_stats_history` rows are USD microunits, but old rows are lamports. A chart reading both will show a massive discontinuity.
**Why it happens:** Natural-overwrite strategy (D-20) — no backfill.
**How to avoid:** This is a KNOWN, ACCEPTED tradeoff per D-20. Phase 6 does NOT fix the display layer. Document for the display/UI phase. If charts look wrong after Phase 6, it's expected — the display layer must handle the transition (out of scope).
**Warning signs:** Sudden jump/drop in time-series charts at the Phase-6 cutover timestamp.

### Pitfall 4: Circuit breaker threshold off-by-one
**What goes wrong:** The threshold check fires at the wrong failure count (e.g., 9 instead of 10, or 11).
**Why it happens:** `recordUpdateFailure()` increments via SQL (`consecutiveFailures = consecutiveFailures + 1`) but returns `void`. To check the post-increment value, you must re-fetch the schedule row.
**How to avoid:** After `recordUpdateFailure()`, call `getFeeUpdateSchedule(tokenId)` and compare the fetched `consecutiveFailures >= MAX_CONSECUTIVE_FAILURES`. Do NOT try to track the count in JS local state across the loop — the SQL increment is the source of truth.
**Warning signs:** Pools marked stale too early or never marked stale.

### Pitfall 5: Stale pool never recoverable without manual DB edit (D-16)
**What goes wrong:** A pool hit 10 failures, got marked stale, and the underlying issue is fixed (e.g., API came back), but the cron still ignores it forever.
**Why it happens:** D-16 explicitly chose no auto-reset. Stale = investigate manually.
**How to avoid:** Document the manual reset procedure (`UPDATE fee_update_schedule SET stale=0, consecutive_failures=0 WHERE token_id=N`) in a runbook/comment. Consider an admin API endpoint in a future phase (out of scope here).
**Warning signs:** A pool that should be updating isn't appearing in cron logs at all.

### Pitfall 6: Drizzle migration not applied before cron uses `stale` column
**What goes wrong:** Cron code references `stale` column but the migration hasn't run → SQLite error "no such column".
**Why it happens:** Migration generation (`db:generate`) and migration application are separate steps.
**How to avoid:** Wave 0 must generate AND apply the migration before any cron/DB-service code that references `stale` runs. Order: schema edit → `db:generate` → apply migration → then cron/service edits.
**Warning signs:** `SQLITE_ERROR: no such column: stale` at runtime.

## Code Examples

### New MeteoraPoolMetrics Interface (verified against live API)
```typescript
// Source: [CITED: https://docs.meteora.ag/api-reference/damm-v2/pools/pool] OpenAPI schema
//        + [VERIFIED: live curl of https://damm-v2.datapi.meteora.ag/pools/HKzhvF81...]
// Note: cumulative_metrics is present in live responses but NOT in OpenAPI "required" list.
// Treat it as present-but-optional in parsing (defensive: default to 0 if absent).

export interface TimeWindowData {
  "30m": number;
  "1h": number;
  "2h": number;
  "4h": number;
  "12h": number;
  "24h": number;
}

export interface TokenMetrics {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  is_verified: boolean;
  holders: number;
  freeze_authority_disabled: boolean;
  total_supply: number;
  price: number;
  market_cap: number;
}

export interface PoolConfig {
  collect_fee_mode: number; // 0 = both, 1 = quote  [VERIFIED: live + docs]
  base_fee_mode: number;
  base_fee_pct: number;
  protocol_fee_pct: number;
  partner_fee_pct: number;
  referral_fee_pct: number;
  dynamic_fee_initialized: boolean;
  pool_type: number;
  concentrated_liquidity: boolean;
  min_price: number;
  max_price: number;
  activation_type: number;
  activation_point: number;
}

export interface MeteoraPoolMetrics {
  address: string;
  name: string;
  token_x: TokenMetrics;
  token_y: TokenMetrics;
  token_x_amount: number;
  token_y_amount: number;
  created_at: number;
  vault_x: string;
  vault_y: string;
  alpha_vault: string;
  pool_config: PoolConfig;
  tvl: number;              // USD, double
  current_price: number;    // double
  has_farm: boolean;
  farm_apr: number;          // use this for APR (D-03), NOT a top-level `apr`
  farm_apy: number;
  permanent_lock_liquidity: number;
  vested_liquidity: { months_3: number; months_6: number };
  volume: TimeWindowData;   // USD per window
  fees: TimeWindowData;     // USD per window
  protocol_fees: TimeWindowData;
  fee_tvl_ratio: TimeWindowData;
  cumulative_metrics: { volume: number; fees: number }; // all-time USD (present in live resp)
  is_blacklisted: boolean;
  launchpad: string | null;
  tags: string[];
}
```

### Rewritten getPoolMetrics() (no wrapper)
```typescript
// Source: [VERIFIED: live curl — 200 returns pool object directly; 400 returns {message}]
export async function getPoolMetrics(poolAddress: string): Promise<MeteoraPoolMetrics | null> {
  try {
    const baseUrl = getMeteoraApiBaseUrl(); // fixed URLs (D-12/D-13)
    const url = `${baseUrl}/pools/${poolAddress}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[Meteora API] Pool ${poolAddress} not found (404)`);
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // NO wrapper — pool object returned directly
    const pool: MeteoraPoolMetrics = await response.json();
    console.log(`[Meteora API] ✓ Fetched metrics for ${poolAddress} | ` +
      `fees24h=${pool.fees["24h"]} cumulative=${pool.cumulative_metrics?.fees ?? 0} mode=${pool.pool_config.collect_fee_mode}`);
    return pool;
  } catch (error) {
    console.error(`[Meteora API] Error fetching pool metrics for ${poolAddress}:`, error);
    return null;
  }
}
```

### Fixed API base URLs
```typescript
// Source: [CITED: OpenAPI servers block] + [VERIFIED: live curl — new=200, old=404]
function getMeteoraApiBaseUrl(): string {
  const network = SOLANA_NETWORK.toLowerCase();
  if (network === "devnet") {
    return "https://damm-v2-api.dev.metdev.io";
  }
  return "https://damm-v2.datapi.meteora.ag";
}
```

### Cron conversion block (replaces fee-updater.ts:48-69)
```typescript
// Source: CONTEXT.md D-02/D-08/D-09 + [VERIFIED: live API field names]
const USD_MICROUNITS = 1_000_000;

if (metrics) {
  const cumulativeFeesMicro = Math.floor(
    (metrics.cumulative_metrics?.fees ?? 0) * USD_MICROUNITS
  );
  const fees24hMicro = Math.floor(metrics.fees["24h"] * USD_MICROUNITS);
  const volume24hMicro = Math.floor(metrics.volume["24h"] * USD_MICROUNITS);
  const tvlMicro = Math.floor(metrics.tvl * USD_MICROUNITS);
  const apr = metrics.farm_apr ?? null; // real, no conversion (D-03)

  await dbService.updateCumulativeFeesSnapshot(token.mintAddress, cumulativeFeesMicro.toString());
  await dbService.createPoolStatsSnapshot(token.id, token.poolAddress, {
    totalFeesGenerated: cumulativeFeesMicro.toString(),
    fees24h: fees24hMicro.toString(),
    volume24h: volume24hMicro.toString(),
    currentLiquidity: tvlMicro.toString(),
    apr,
  });
  // ... upsert schedule, successCount++ ...
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Meteora API at `dammv2-api.meteora.ag` | `damm-v2.datapi.meteora.ag` (mainnet) / `damm-v2-api.dev.metdev.io` (devnet) | Pre-Phase-6 (unknown date) | Old URLs return 404 — cron was silently broken. |
| `MeteoraPoolMetrics` with flat `lp_fee24h/7d/30d`, `volume24h`, `apr` | `TimeWindowData` (`30m`/`1h`/`2h`/`4h`/`12h`/`24h`) + `cumulative_metrics` + `farm_apr` | API redesign | Old fields are `undefined` → `NaN` → `0` in DB. |
| `{status,error,data}` response wrapper | Pool object returned directly (200) / `{message}` (400) | API redesign | Wrapper check always failed → cron no-op. |
| `* 1e9` (assume SOL lamports) | `* 1e6` (USD microunits) | This phase (D-01/D-02) | Fixes silent zero-writes; correct unit is USD not SOL. |

**Deprecated/outdated:**
- `lp_fee30d` as proxy for cumulative fees: replaced by `cumulative_metrics.fees` (true all-time). `lp_fee30d` doesn't exist in the real API anyway.
- Top-level `apr` field: doesn't exist. Use `farm_apr`.
- `updated_at`: doesn't exist in the real API.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `cumulative_metrics` is always present in live 200 responses despite not being in the OpenAPI `required` list. | Code Examples, Pattern 1 | If absent, `cumulativeFeesSnapshot` writes 0 (defensive `?? 0` handles this). Low risk — verified present on one live pool; planner should test against ≥1 mainnet pool with real fees. |
| A2 | `farm_apr` is the correct field to use for the APR stored in `pool_stats_history.apr`. | Code Examples, D-03 | If wrong field, APR column gets farm rewards APR not pool APR. MEDIUM risk — CONTEXT.md D-03 says "APR is a percentage... stored as-is from the API" but doesn't name the field. OpenAPI shows `farm_apr`/`farm_apy` as the only APR-like fields. The old code used a top-level `apr` that doesn't exist. Recommend planner confirm with user which APR semantics are wanted (pool fee APR vs farm APR) — may warrant a user-confirmation checkpoint. |
| A3 | The devnet new URL `https://damm-v2-api.dev.metdev.io` is correct and stable. | Standard Stack, Code Examples | Verified returns 200 to a `/pools?limit=1` probe, but did not fetch a specific devnet pool. LOW risk — matches OpenAPI `servers` block exactly. |
| A4 | `recordUpdateFailure` returns void and a separate `getFeeUpdateSchedule` re-fetch is needed to read the post-increment count. | Pattern 3, Pitfall 4 | If `recordUpdateFailure` were changed to return the updated row, the re-fetch would be redundant (harmless). Verified void return at `service.ts:456-468`. LOW risk. |

## Open Questions (RESOLVED)

1. **Which APR semantics does the product want in `pool_stats_history.apr`?** — RESOLVED: Use `farm_apr` (per D-03 "stored as-is from the API"; Plan 03 Task 2 defaults to `metrics.farm_apr ?? null`). The real API exposes `farm_apr` as the only APR-like top-level field. Flagged in SUMMARY guidance for the display phase to revisit if charts show wrong APR semantics for non-farm pools.
   - What we know: The old (broken) interface had a top-level `apr` field that doesn't exist in the real API. The real API has `farm_apr` (farm reward APR) and `fee_tvl_ratio` (fee/TVL ratio per window). D-03 says "APR is a percentage, stored as-is from the API" but doesn't name the field.
   - What's unclear: Should `apr` be `farm_apr` (only meaningful if pool has a farm), `fee_tvl_ratio["24h"]` (annualized fee yield), or something computed?
   - Recommendation: Planner should add a `checkpoint:human-verify` for the APR field choice, OR default to `farm_apr` with a logged warning when `has_farm === false` (yields 0.0). This is the one genuinely ambiguous decision in the phase.

2. **Should `MAX_CONSECUTIVE_FAILURES` live in `config/defaults.ts` or inline in `fee-updater.ts`?** — RESOLVED: `config/defaults.ts` (Plan 03 Task 1 places the constant there alongside `DEFAULT_FEE_TOKEN_MODE`, matching the RESEARCH recommendation and existing config-centralization pattern).
   - What we know: D-17 says "configurable via a constant... in `lib/cron/fee-updater.ts` or `config/defaults.ts`".
   - What's unclear: Project convention leans toward `config/defaults.ts` for tunables, but this is a cron-internal knob.
   - Recommendation: Put it in `config/defaults.ts` alongside `DEFAULT_FEE_TOKEN_MODE` for consistency with existing config-centralization pattern. Low stakes either way.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 24+ | Runtime | ✓ | 24.10.0 (Dockerfile) | — |
| npm 10+ | Package mgmt | ✓ | (lockfile present) | — |
| node-cron | Cron scheduling | ✓ | ^4.2.1 (installed) | — |
| drizzle-orm | DB ORM | ✓ | 0.44.7 (installed) | — |
| drizzle-kit | Migration gen | ✓ | ^0.31.6 (installed) | — |
| better-sqlite3 | SQLite driver | ✓ | 12.4.1 (installed) | — |
| tsx | Migration runner | ✓ | ^4.20.6 (installed) | — |
| Meteora API (mainnet) | Live fee fetch | ✓ | `damm-v2.datapi.meteora.ag` returns 200 | Mock fixtures for unit tests |
| Meteora API (devnet) | Live fee fetch (dev) | ✓ | `damm-v2-api.dev.metdev.io` returns 200 | Mock fixtures for unit tests |
| Native build tools (python3, make, g++) | better-sqlite3 compile | ✓ (assumed — already installed) | — | — |
| curl (for live verification) | Research/probe | ✓ | — | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none — all present. Live Meteora API calls should be mocked in unit tests (no network in CI); a smoke/integration test can hit the real API guarded behind a flag.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | **None currently installed.** No `tests/`, `__tests__/`, `vitest`/`jest` in `package.json`. This is a Wave 0 gap. |
| Config file | none — see Wave 0 |
| Quick run command | `npx vitest run` (after Wave 0 install) |
| Full suite command | `npx vitest run` |

**Recommendation:** Install `vitest` (matches the Vite/Next.js ecosystem, fast, native TS/ESM support) as the test framework. It is the standard for Next.js projects without an existing test runner. Alternative: `node --test` (built-in, zero install) — viable for pure-logic unit tests of the conversion/circuit-breaker functions but weaker for mocking `fetch`.

> **Package legitimacy:** `vitest` is widely used, maintained by the Vite team, source at `github.com/vitest-dev/vitest`. If the planner installs it, run the slopcheck gate: `pip install slopcheck ... && slopcheck install vitest --json`. Expected `[OK]`. Also check `npm view vitest version` and `npm view vitest scripts.postinstall` (none expected). Tag as `[VERIFIED: npm registry]` only after both pass.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CRON-01 | Cron reads `token.feeTokenMode` from DB per pool and logs it | unit | `npx vitest run tests/cron-fee-updater.test.ts -t "reads fee token mode"` | ❌ Wave 0 |
| CRON-02 | Quote-only pools: USD microunits conversion correct (no `* 1e9`) | unit | `npx vitest run tests/cron-fee-updater.test.ts -t "USD microunits"` | ❌ Wave 0 |
| CRON-02 | Quote-only pools tracked with same aggregate-USD code path as both-token | unit | `npx vitest run tests/cron-fee-updater.test.ts -t "quote only aggregate"` | ❌ Wave 0 |
| CRON-03 | Both-token pools tracked identically to quote-only (aggregate USD, per-side deferred) | unit | `npx vitest run tests/cron-fee-updater.test.ts -t "both token mode"` | ❌ Wave 0 |
| CRON-03 | Both-token pool encounter logs deferred-per-side warning | unit | `npx vitest run tests/cron-fee-updater.test.ts -t "deferred per-side"` | ❌ Wave 0 |
| (fix) | `getPoolMetrics` parses live API response shape (no wrapper, TimeWindowData) | unit | `npx vitest run tests/meteora-client.test.ts -t "parses pool object"` | ❌ Wave 0 |
| (fix) | `getMeteoraApiBaseUrl` returns new mainnet/devnet URLs (not 404 URLs) | unit | `npx vitest run tests/meteora-client.test.ts -t "base url"` | ❌ Wave 0 |
| (hardening) | Circuit breaker marks pool stale at `MAX_CONSECUTIVE_FAILURES` (default 10) | unit | `npx vitest run tests/cron-fee-updater.test.ts -t "circuit breaker"` | ❌ Wave 0 |
| (hardening) | `getPoolsDueForUpdate` excludes stale pools | unit | `npx vitest run tests/db-service.test.ts -t "skips stale"` | ❌ Wave 0 |
| (migration) | `stale` column exists with default `false` after migration | integration | `npx tsx scripts/verify-migration.ts` (or `npm run db:migrate && node -e "..."`) | ❌ Wave 0 |
| (smoke) | Live Meteora API returns expected shape for a known pool | integration (network-gated) | `npx vitest run tests/meteora-client.test.ts -t "live" -- --network` (or skip if no network) | ❌ Wave 0 |

### Sampling Rate (Observation Points)

This phase has no UI; verification is via unit tests + DB inspection + log observation.

- **Per task commit:** `npx vitest run` (unit tests, <30s, mocked `fetch` + mocked `dbService`)
- **Per wave merge:** `npx vitest run` + manual DB inspection after migration (`sqlite3 data/db.sqlite "SELECT stale FROM fee_update_schedule LIMIT 1"`)
- **Phase gate (before `/gsd-verify-work`):** Full suite green + live smoke test against one real mainnet pool (e.g. `HKzhvF81Dt6L9YWBXqQqeUmBafQiuaEC22Ke5Zqh6uzu`) confirming the cron writes non-zero USD-microunits values + manual log review showing `[Cron] ✓` lines and correct mode logging.

### How to confirm each success criterion

1. **CRON-01 — cron reads `collectFeeMode`/`feeTokenMode` from DB:**
   - Unit test: mock `dbService.getTokenById` to return a token with `feeTokenMode: 'bothTokens'`; assert the cron logs the mode and proceeds with the aggregate-USD path. Mock `feeTokenMode: 'quoteOnly'`; assert no special warning. Verify the read happens via spy on `getTokenById`.
   - Integration: after a live cron run, grep logs for `[Cron]` lines mentioning the fee token mode per pool.

2. **CRON-02 — quote-only tracking continues working (after USD fix):**
   - Unit test (USD microunits boundary): feed a fixture with `cumulative_metrics.fees = 277672.23`; assert `updateCumulativeFeesSnapshot` called with `"277672230000"` (exactly `Math.floor(277672.23 * 1e6)`). Feed `fees.24h = 4.424238334414426`; assert `fees24h = "4424238"`. This is the **unit boundary test** for USD microunits — confirm no `* 1e9` anywhere (grep the file for `1e9` after the change; expect zero matches).
   - Unit test (no `* 1e9`): a separate test asserts the source file contains no `* 1e9` literal (regression guard).
   - Integration: live cron run writes non-zero values to a real quote-only pool's `cumulativeFeesSnapshot` (was `0` before fix).

3. **CRON-03 — both-token pools tracked identically to quote-only:**
   - Unit test: run the cron conversion logic with two fixtures — one with `pool_config.collect_fee_mode = 1` (quote) and one with `= 0` (both), identical `cumulative_metrics.fees`. Assert both produce identical `updateCumulativeFeesSnapshot` calls (same USD-microunits string). Assert the both-token fixture emits the deferred-per-side log warning; the quote-only fixture does not.
   - This directly confirms "both-token mode pools are tracked identically to quote-only pools" (the success criterion) at the conversion layer.

### How to confirm USD microunits conversion is correct (unit boundary tests)
- **Boundary values:** `0.0 → "0"`; `0.000001 → "1"` (1 microunit); `277672.23 → "277672230000"`; large `999999999.999999 → "999999999999999"`.
- **Negative/NaN guard:** `undefined * 1e6 = NaN` → `Math.floor(NaN) = 0`. Test that a missing `cumulative_metrics` (defensive `?? 0`) yields `"0"`, not `"NaN"`.
- **No-float-leak:** assert every value passed to `dbService.*` is a string (`.toString()`) and matches `/^\d+$/` (non-negative integer string). Catches any float slipping through un-floored.

### How to confirm the circuit breaker triggers at the right threshold
- Unit test: mock `recordUpdateFailure` + `getFeeUpdateSchedule` returning `consecutiveFailures` = 9 → call failure path → assert `markPoolStale` NOT called; return 10 → assert `markPoolStale` IS called exactly once. Return 11 (shouldn't happen if breaker works, but test) → `markPoolStale` called (idempotent set).
- Edge: threshold exactly `MAX_CONSECUTIVE_FAILURES` (10) triggers. Off-by-one is the classic failure (Pitfall 4).
- Confirm `getPoolsDueForUpdate` query filters `stale = false` (unit test with a mocked DB returning only non-stale rows; integration via raw SQL after marking a row stale).

### How to confirm both-token pools are tracked identically to quote-only
- See CRON-03 test above: same input fees → same output microunits string regardless of `collect_fee_mode`. The only behavioral difference is the log warning. This is the definition of "identically tracked" per D-05.

### Wave 0 Gaps
- [ ] `tests/cron-fee-updater.test.ts` — covers CRON-01/02/03, USD conversion, circuit breaker (mock `fetch` + mock `dbService`)
- [ ] `tests/meteora-client.test.ts` — covers interface parse, base URL, wrapper removal (mock `fetch`)
- [ ] `tests/db-service.test.ts` — covers `getPoolsDueForUpdate` stale filter, `markPoolStale` (in-memory better-sqlite3 or mock)
- [ ] `vitest` install + `vitest.config.ts` (or `vitest` section in `tsconfig`/`package.json`) — framework bootstrap
- [ ] `tests/fixtures/meteora-pool.json` — captured live response (the `HKzhvF81...` pool) as a frozen fixture
- [ ] Migration generation + application: `npm run db:generate` then run migration before any code referencing `stale`

*(If the project prefers zero new deps: use `node --test` for pure-logic conversion tests and accept weaker mocking. Vitest is recommended for `fetch` mocking ease.)*

## Security Domain

> `security_enforcement` is not set to `false` in `.planning/config.json` (key absent → enabled).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Cron is internal, no user auth. Meteora API has no auth (`security: []` in OpenAPI). |
| V3 Session Management | no | No sessions in cron. |
| V4 Access Control | yes (minimal) | `markPoolStale` / DB writes are server-only (cron runs in-process). No user-facing endpoint exposes them. Existing `recordUpdateFailure` is server-only. |
| V5 Input Validation | yes | Pool address from DB is trusted (written at launch). `fetch` URL is constructed from a DB-sourced `poolAddress` — ensure it's base58-validated or at least URL-safe (existing code passes it raw; low risk since it's DB-sourced, but a regex guard prevents injection via a malformed address). Meteora API response should be defensively parsed (assume fields may be absent — `?? 0`). |
| V6 Cryptography | no | No crypto operations in this phase. |
| V7 Error Handling | yes | Failures recorded in DB (`consecutiveFailures`, `lastError`). Circuit breaker prevents resource exhaustion from chronic failures. Error messages logged with `[Cron]`/`[Meteora API]` prefix. No secrets in logs (Meteora API has no secrets). |
| V8 Data Protection | yes (minimal) | Fee/volume data is public on-chain data (not PII). Stored as integer strings. No secrets in DB columns added. |
| V9 Communications | yes | `fetch` to Meteora over HTTPS (both base URLs are `https://`). `cache: "no-store"` prevents stale cached responses. |
| V10 Malicious Code | yes (supply chain) | No new packages in this phase. If `vitest` is added for tests, run slopcheck gate. |
| V12 Files/Resources | yes | Circuit breaker (D-14) is a resource-exhaustion control: stops unbounded API calls to dead pools. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SSRF via crafted pool address in `fetch` URL | Tampering/Elevation | Pool address is DB-sourced (written at launch by trusted flow). Add base58 regex guard before constructing URL. Existing code passes raw — low risk but worth a guard. |
| Resource exhaustion (cron hammering dead API/pools) | DoS | Circuit breaker (D-14/D-15): `stale` flag + query filter. `MAX_CONSECUTIVE_FAILURES = 10`. |
| Stale/inconsistent fee data | Tampering | `cache: "no-store"` on `fetch`. Cron overwrites each run (D-20). |
| NaN/undefined poisoning DB with `0`/`"NaN"` | Tampering | Defensive `?? 0` on optional API fields; `Math.floor` + `.toString()`; unit boundary tests (see Validation Architecture). |
| Silent cron failure (no alerting) | Repudiation | `[Cron] ✗`/`⚠️` log markers; `consecutiveFailures`/`lastError` in DB; stale flag for chronic failures. (No external alerting in v1 — out of scope.) |

## Sources

### Primary (HIGH confidence)
- **Live Meteora API verification** — `curl https://damm-v2.datapi.meteora.ag/pools/HKzhvF81Dt6L9YWBXqQqeUmBafQiuaEC22Ke5Zqh6uzu` returned 200 with full pool object (cumulative_metrics, TimeWindowData fees/volume, pool_config.collect_fee_mode=1, farm_apr, tvl). [VERIFIED]
- **Live old-URL verification** — `curl https://dammv2-api.meteora.ag/pools` returned HTTP 404 (confirms D-12). [VERIFIED]
- **Meteora DAMMv2 Pool API OpenAPI spec** — https://docs.meteora.ag/api-reference/damm-v2/pools/pool [CITED] — confirms servers (mainnet/devnet URLs), PoolResponse schema, TimeWindowData, PoolConfig.collect_fee_mode (0=both, 1=quote), TokenMetrics.
- **Codebase** — `lib/cron/fee-updater.ts`, `lib/meteora/client.ts`, `lib/db/schema/fee-update-schedule.ts`, `lib/db/schema/tokens.ts`, `lib/db/schema/pool-stats-history.ts`, `lib/db/service.ts`, `package.json`. [VERIFIED via Read/grep]

### Secondary (MEDIUM confidence)
- **CONTEXT.md D-01..D-22** — user decisions from `/gsd-discuss-phase`. These are locked user choices, treated as authoritative for scope. [CITED: .planning/phases/06-.../06-CONTEXT.md]

### Tertiary (LOW confidence)
- None. All claims verified against live API or codebase. The only genuinely ambiguous item (APR field choice) is flagged in Open Questions / Assumptions Log A2.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new deps; all verified in package.json.
- Architecture: HIGH — fixes to existing code; patterns verified against live API + codebase + OpenAPI spec.
- Pitfalls: HIGH — all 6 pitfalls verified against live API behavior or codebase state.
- Validation: MEDIUM — test framework is a Wave 0 gap (none installed); vitest recommendation is [ASSUMED] standard but not yet verified against this project's tooling.

**Research date:** 2026-06-25
**Valid until:** 2026-07-25 (30 days — Meteora API shape is stable but URLs could change; re-verify live URLs if implementation is delayed beyond 30 days)