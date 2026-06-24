# Phase 6: Background Jobs & Hardening - Context

**Gathered:** 2026-06-24
**Status:** Ready for planning
**Requirements:** CRON-01, CRON-02, CRON-03

<domain>
## Phase Boundary

This phase fixes and hardens the fee-updater cron job to correctly handle all fee token modes and scheduler configurations. The cron currently has multiple bugs: it assumes SOL (9 decimals) for all fee conversions, uses dead API URLs, and has an incorrect interface mapping to the Meteora API response shape.

Specifically:
1. **Mode-aware reads (CRON-01):** The cron reads `feeTokenMode` from the database for each token and is aware of the configured mode
2. **Quote-only preservation (CRON-02):** Quote-token-only fee tracking continues to work correctly (after fixing the USD conversion bug)
3. **Both-token mode handling (CRON-03):** The cron correctly handles both-token mode pools — the Meteora API returns aggregate USD fees regardless of mode, so both-token pools are tracked the same way as quote-only pools. Per-side (base/quote) fee breakdown is not feasible via the API and is deferred per the requirement's "deferred if not feasible" clause
4. **API interface correction:** The `MeteoraPoolMetrics` interface is updated to match the actual Meteora API response shape (nested TimeWindowData objects, cumulative_metrics field, pool_config with collect_fee_mode)
5. **API URL fix:** The dead API base URLs are replaced with the current working endpoints
6. **Circuit breaker:** Chronic failure pools are marked stale to stop wasting API calls

**Out of phase scope:** UI changes (Phase 2-3), on-chain transaction building (Phase 4), database persistence of launch params (Phase 5), per-side base/quote fee tracking (requires on-chain reads, deferred).

</domain>

<decisions>
## Implementation Decisions

### Fee Unit and Conversion
- **D-01:** The Meteora API returns ALL monetary values (fees, volume, TVL) in USD — not in SOL, lamports, or either pool token. The current code's `* 1e9` conversion (assuming SOL lamports) is a **bug**. All `* 1e9` multiplications are removed.
- **D-02:** All monetary metrics are stored as **USD microunits** (integer, 6 decimal places). Example: $277,672.23 → `277672230000`. This avoids floating-point precision loss in cumulative sums while maintaining integer-safe storage. Existing text columns (cumulativeFeesSnapshot, totalFeesGenerated, fees24h, volume24h, currentLiquidity) hold these values as string-encoded integers — no schema change needed.
- **D-03:** APR is a percentage (e.g., 45.2), not a monetary value. It is stored as-is from the API as a `real` (float) in `pool_stats_history.apr`. No multiplication or conversion applied.

### Both-Token Mode Tracking (CRON-03)
- **D-04:** The Meteora API returns fees as a single **aggregate USD value** with no per-token-side breakdown. The `collect_fee_mode` field in `pool_config` (0 = both, 1 = quote) indicates the on-chain mode, but the API reports fees as one number regardless.
- **D-05:** The cron reads `token.feeTokenMode` from the DB for awareness/logging but does NOT attempt per-side (base/quote) fee tracking. Both-token mode pools store the same aggregate USD fee as quote-only pools.
- **D-06:** Per-side fee tracking is **deferred** per CRON-03's "deferred if not feasible in v1" clause. It would require on-chain account reads (not available via the API). This is documented in logs when a both-token pool is encountered.
- **D-07:** No new DB columns are needed for both-token mode. The `feeTokenMode` column remains for display/on-chain reference but does not change fee storage behavior.

### Cumulative Fee Calculation
- **D-08:** The API exposes `cumulative_metrics.fees` — true all-time cumulative fees in USD. The cron uses this directly as `tokens.cumulativeFeesSnapshot` (converted to USD microunits). This replaces the current incorrect approach of using `lp_fee30d` (which doesn't exist in the real API) as a proxy for cumulative fees.
- **D-09:** For `pool_stats_history` snapshots, the cron stores `fees.24h` (24-hour fee window from the API's TimeWindowData) as the `fees24h` field, and `cumulative_metrics.fees` as `totalFeesGenerated`. Both are in USD microunits.

### API Interface Update
- **D-10:** The `MeteoraPoolMetrics` interface in `lib/meteora/client.ts` is updated to match the actual API response shape:
  - `fees`, `volume`, `protocol_fees`, `fee_tvl_ratio` → `TimeWindowData` objects with `30m`, `1h`, `2h`, `4h`, `12h`, `24h` keys
  - `tvl` → `number` (double, USD)
  - `current_price` → `number` (double)
  - `apr` → removed (no top-level APR; `farm_apr` exists separately)
  - `cumulative_metrics` → `{ volume: number, fees: number }` (all-time USD)
  - `pool_config` → includes `collect_fee_mode` (0 = both, 1 = quote), `base_fee_mode`, `base_fee_pct`, etc.
  - `token_x`, `token_y` → `TokenMetrics` with `decimals`, `price`, `market_cap`
  - Removed: `lp_fee24h`, `lp_fee7d`, `lp_fee30d`, `volume24h`, `volume7d`, `volume30d`, `protocol_fee24h/7d/30d`, `partner_fee*`, `referral_fee*`, `updated_at` — none of these exist in the real API
- **D-11:** `getPoolMetrics()` in `lib/meteora/client.ts` is updated to parse the new response structure. The old `MeteoraApiResponse` wrapper (with `status`/`error`/`data` fields) does not match the real API — the real API returns the pool object directly. The wrapper is removed.

### API Base URL Fix
- **D-12:** The API base URLs are updated to the current working endpoints:
  - Mainnet: `https://damm-v2.datapi.meteora.ag` (old `https://dammv2-api.meteora.ag` returns 404)
  - Devnet: `https://damm-v2-api.dev.metdev.io` (old `https://dammv2-api.devnet.meteora.ag` is dead)
- **D-13:** The `getMeteoraApiBaseUrl()` function in `lib/meteora/client.ts` is updated with the new URLs. The network detection logic (checking `SOLANA_NETWORK` env var) is preserved.

### Circuit Breaker for Chronic Failures
- **D-14:** A boolean `stale` column is added to the `feeUpdateSchedule` table (default `false`). When `consecutiveFailures` reaches a configurable threshold (default 10), the cron sets `stale = true` and stops attempting updates for that pool.
- **D-15:** `getPoolsDueForUpdate()` is updated to skip pools where `stale = true`. Stale pools are excluded from the query entirely, reducing wasted API calls.
- **D-16:** Stale pools can be manually reset by setting `stale = false` and `consecutiveFailures = 0` in the DB. No automatic reset — a stale pool indicates a persistent issue (e.g., deleted pool) that should be investigated.
- **D-17:** The failure threshold is configurable via a constant (e.g., `MAX_CONSECUTIVE_FAILURES = 10` in `lib/cron/fee-updater.ts` or `config/defaults.ts`).

### Cron Schedule
- **D-18:** The cron continues to run every 5 minutes. The polling-strategy intervals (1 min for new tokens) are aspirational — the 5-minute cron is the real update floor. This is acceptable: new tokens get their first update within 5 minutes of launch.
- **D-19:** The 5-minute schedule is a configurable default (via the cron expression in `startFeeUpdaterCron()`). Changing it requires a code change, not an env var — kept simple for v1.

### Backfill and Transition
- **D-20:** No backfill migration is needed. The cron overwrites `cumulativeFeesSnapshot` on each run, so the next cycle naturally writes USD microunits. Old historical snapshots in `pool_stats_history` remain in lamports (old format) but are only used for time-series charts. The display layer should be aware that pre-Phase-6 snapshots are in a different unit.
- **D-21:** Existing tokens have `feeTokenMode` defaulting to `'quoteOnly'` — they continue to work unchanged. The mode read is new but non-breaking.

### Failure Handling
- **D-22:** Failure handling is uniform across all fee token modes. The cron treats all tokens the same: fetch metrics, store USD microunits, record failures in `feeUpdateSchedule.consecutiveFailures`. The `feeTokenMode` does not change error handling since the API returns aggregate USD regardless of mode.

### the agent's Discretion
- No areas deferred to agent discretion in this discussion.

### Folded Todos
- None

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements & Roadmap
- `.planning/PROJECT.md` — Project overview, constraints, key decisions
- `.planning/REQUIREMENTS.md` — Full v1 requirements (CRON-01, CRON-02, CRON-03 for this phase)
- `.planning/ROADMAP.md` — Phase 6 goal, success criteria, boundaries

### Prior Phase Context
- `.planning/phases/04-blockchain-integration-pre-flight-safety/04-CONTEXT.md` — D-14: CollectFeeMode mapping (OnlyB = quote, BothToken = both)
- `.planning/phases/05-service-orchestration-persistence-detail-pages/05-CONTEXT.md` — Service return types, API validation patterns, DB service patterns

### Database Schema
- `lib/db/schema/tokens.ts` — `feeTokenMode` column (default `'quoteOnly'`), `quoteTokenMint`, `cumulativeFeesSnapshot` (text), `cumulativeFeesUpdatedAt`
- `lib/db/schema/pool-stats-history.ts` — `totalFeesGenerated` (text), `fees24h` (text), `volume24h` (text), `currentLiquidity` (text), `apr` (real)
- `lib/db/schema/fee-update-schedule.ts` — `consecutiveFailures` (integer), `lastError` (text), `lastErrorAt` (timestamp) — needs new `stale` column

### Primary Target Files for Changes
1. `lib/cron/fee-updater.ts` — Main target: remove `* 1e9`, use USD microunits, use `cumulative_metrics.fees`, add circuit breaker, read `feeTokenMode`
2. `lib/meteora/client.ts` — Update `MeteoraPoolMetrics` interface to match real API, update API base URLs, remove response wrapper
3. `lib/db/schema/fee-update-schedule.ts` — Add `stale` boolean column (migration)
4. `lib/db/service.ts` — Update `getPoolsDueForUpdate()` to skip stale pools, add `markPoolStale()` function
5. `lib/meteora/polling-strategy.ts` — No change needed (age-based intervals are fine)

### External API Reference
- Meteora DAMM v2 Pool API: `GET /pools/{address}` on `https://damm-v2.datapi.meteora.ag` — returns pool object with `fees` (TimeWindowData), `volume` (TimeWindowData), `tvl` (double), `cumulative_metrics` ({volume, fees}), `pool_config` ({collect_fee_mode, ...}), `token_x`/`token_y` (TokenMetrics)
- API docs: https://docs.meteora.ag/api-reference/damm-v2/pools/pool
- Fee overview docs: https://docs.meteora.ag/core-products/damm-v2/fees/overview.md (collect_fee_mode: 0 = both, 1 = quote)

### Config & Defaults
- `config/defaults.ts` — `DEFAULT_FEE_TOKEN_MODE = 'quoteOnly'`, `getQuoteTokenDecimals()` (still used for pool creation, not for cron fee tracking)

### Types
- `types/fee.ts` — `CollectFeeMode` type, `FeeSchedulerConfig` discriminated union

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`getQuoteTokenDecimals()`** in `config/defaults.ts` — still used for pool creation (Phase 4), NOT needed for cron fee tracking (API returns USD)
- **`calculateNextUpdateTime()`** in `lib/meteora/polling-strategy.ts` — age-based polling strategy, no change needed
- **`dbService.recordUpdateFailure()`** — existing failure tracking, reused for circuit breaker threshold detection
- **`dbService.upsertFeeUpdateSchedule()`** — existing schedule upsert, extended to set `stale` flag

### Established Patterns
- **Cron pattern:** `node-cron` schedule with `setTimeout` for immediate startup run (`lib/cron/fee-updater.ts:135-140`)
- **DB service barrel:** `dbService.getPoolsDueForUpdate()`, `dbService.getTokenById()`, `dbService.updateCumulativeFeesSnapshot()`, `dbService.createPoolStatsSnapshot()`, `dbService.upsertFeeUpdateSchedule()`, `dbService.recordUpdateFailure()` — all in `lib/db/service.ts`
- **Schema-first migrations:** Drizzle Kit generates migrations from schema changes (`drizzle.config.ts`)
- **Error logging:** `[Cron]` prefix with `✓`/`✗` markers, structured `console.log`/`console.error`
- **Text-precision storage:** Fee/volume values stored as `text` (string-encoded integers) to avoid SQLite integer limits for large values

### Integration Points
- **`lib/cron/fee-updater.ts:50`** — `cumulativeFeesLamports = Math.floor(metrics.lp_fee30d * 1e9)` — THIS IS THE BUG. Replace with `Math.floor(metrics.cumulative_metrics.fees * 1e6)` (USD microunits)
- **`lib/cron/fee-updater.ts:64-66`** — `fees24h`, `volume24h`, `currentLiquidity` all use `* 1e9` — replace with `* 1e6` and use the new API field paths (`metrics.fees.24h`, `metrics.volume.24h`, `metrics.tvl`)
- **`lib/meteora/client.ts:44-52`** — `getMeteoraApiBaseUrl()` returns dead URLs — update to `damm-v2.datapi.meteora.ag` / `damm-v2-api.dev.metdev.io`
- **`lib/meteora/client.ts:6-27`** — `MeteoraPoolMetrics` interface — completely replaced with new shape matching real API
- **`lib/meteora/client.ts:32-39`** — `MeteoraApiResponse` wrapper — removed (real API returns pool object directly, no wrapper)
- **`lib/db/schema/fee-update-schedule.ts`** — Add `stale: integer('stale', { mode: 'boolean' }).notNull().default(false)` column

### Known Landmines
- **The old API URL is dead (404)** — `https://dammv2-api.meteora.ag` returns 404 for all pool queries. This means the cron is currently failing silently on every run (returning null from `getPoolMetrics`).
- **The old interface fields don't exist** — `lp_fee24h`, `lp_fee7d`, `lp_fee30d`, `volume7d`, `volume30d`, `protocol_fee*`, `partner_fee*`, `referral_fee*` are not in the real API response. The current interface was likely based on an older API version or was incorrect from the start.
- **No response wrapper** — The real API returns the pool object directly (200) or an error object (400). There is no `{status, error, data}` wrapper. The current parsing code checks `apiResponse.error` and `apiResponse.data` which will always fail.
- **Pre-Phase-6 snapshots are in lamports** — Historical `pool_stats_history` rows store fee values as lamports (from the old `* 1e9`). After Phase 6, new snapshots are in USD microunits. The display layer must handle this unit mismatch if it reads historical data.
- **`totalSupply` and market cap columns are text** — Some columns use `text` for arbitrary precision. Fee values follow the same pattern (text-encoded integers).

</code_context>

<specifics>
## Specific Ideas

### USD Microunits Conversion Formula
```typescript
// All monetary values from API are USD floats. Convert to integer microunits.
const USD_MICROUNITS = 1_000_000; // 6 decimal places

const cumulativeFeesMicro = Math.floor(metrics.cumulative_metrics.fees * USD_MICROUNITS);
const fees24hMicro = Math.floor(metrics.fees["24h"] * USD_MICROUNITS);
const volume24hMicro = Math.floor(metrics.volume["24h"] * USD_MICROUNITS);
const tvlMicro = Math.floor(metrics.tvl * USD_MICROUNITS);
```

### New MeteoraPoolMetrics Interface (approximate)
```typescript
interface TimeWindowData {
  "30m": number;
  "1h": number;
  "2h": number;
  "4h": number;
  "12h": number;
  "24h": number;
}

interface MeteoraPoolMetrics {
  address: string;
  name: string;
  token_x: TokenMetrics;
  token_y: TokenMetrics;
  token_x_amount: number;
  token_y_amount: number;
  tvl: number;
  current_price: number;
  volume: TimeWindowData;
  fees: TimeWindowData;
  protocol_fees: TimeWindowData;
  fee_tvl_ratio: TimeWindowData;
  cumulative_metrics: { volume: number; fees: number };
  pool_config: {
    collect_fee_mode: number; // 0 = both, 1 = quote
    base_fee_mode: number;
    base_fee_pct: number;
    // ... other config fields
  };
  farm_apr: number;
  farm_apy: number;
  has_farm: boolean;
  is_blacklisted: boolean;
  // ... other fields as needed
}
```

### Circuit Breaker Logic
```typescript
const MAX_CONSECUTIVE_FAILURES = 10;

// After recording a failure:
if (schedule.consecutiveFailures + 1 >= MAX_CONSECUTIVE_FAILURES) {
  await dbService.markPoolStale(schedule.tokenId);
  console.warn(`[Cron] Pool ${schedule.poolAddress} marked stale after ${MAX_CONSECUTIVE_FAILURES} consecutive failures`);
}
```

### API URL Update
```typescript
function getMeteoraApiBaseUrl(): string {
  const network = SOLANA_NETWORK.toLowerCase();
  if (network === "devnet") {
    return "https://damm-v2-api.dev.metdev.io";
  }
  return "https://damm-v2.datapi.meteora.ag";
}
```

</specifics>

<deferred>
## Deferred Ideas

- **Per-side (base/quote) fee tracking** — Requires on-chain account reads to get separate fee amounts per token side. The API only returns aggregate USD. Deferred per CRON-03's "deferred if not feasible" clause. Future phase could add Solana RPC account deserialization.
- **Dynamic SOL/USD price fetching for historical conversion** — If backfilling old lamport snapshots to USD is ever needed, it would require historical SOL prices. Not needed since we chose natural overwrite.
- **Configurable cron schedule via env var** — The 5-minute cron interval is hardcoded. Making it configurable via env var is a future enhancement.
- **Version flag on pool_stats_history snapshots** — Could add a `unit_version` column to distinguish lamport vs USD-microunits snapshots. Not needed since we chose natural overwrite and the display layer can handle the transition.

### Reviewed Todos (not folded)
- None

</deferred>

---

*Phase: 6-Background Jobs & Hardening*
*Context gathered: 2026-06-24*