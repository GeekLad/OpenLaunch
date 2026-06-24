# Phase 6: Background Jobs & Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-24
**Phase:** 6-Background Jobs & Hardening
**Areas discussed:** Both-token tracking scope, Decimal hardening, Both-token fee storage, Failure & backfill handling, APR handling, API interface update, Circuit breaker for chronic failures, Cumulative fee calculation, API base URL verification, Cron schedule vs polling interval

---

## Both-token tracking scope

| Option | Description | Selected |
|--------|-------------|----------|
| Mode-aware reads + graceful deferral | Read feeTokenMode, track quote fees, log both-token deferral | |
| Investigate API for per-side fees | Research if API exposes per-side breakdown | |
| Defer entirely, track quote-only for all | Cron does nothing with feeTokenMode | |

**User's choice:** Custom answer — "The API shows fees in USD. You can look at the documentation here: https://docs.meteora.ag/api-reference/damm-v2/pools/pool"
**Notes:** User pointed to the Meteora API docs, which revealed the API returns fees as aggregate USD values. This redirected the entire discussion — fees are in USD, not in either pool token. The `collect_fee_mode` is available in `pool_config` but the API does not break down fees per token side.

---

## Fee unit and conversion (derived from both-token discussion)

| Option | Description | Selected |
|--------|-------------|----------|
| USD cents (integer) | $1.50 = 150, avoids float precision loss | |
| Raw USD floats | $1.50 = 1.50, simpler but precision issues | |
| USD microunits (6 decimals) | $1.50 = 1,500,000, integer-safe, high precision | ✓ |

**User's choice:** USD microunits (6 decimals)
**Notes:** All monetary values from the API are USD floats. Converting to integer microunits (multiply by 1,000,000) avoids floating-point precision loss in cumulative sums.

---

## Decimal hardening

| Option | Description | Selected |
|--------|-------------|----------|
| All metrics to USD microunits | Fix fees, TVL, volume — remove * 1e9 entirely | ✓ |
| Fees only, audit others in research | Only fix fee conversions, researcher audits TVL/volume consumers | |

**User's choice:** All metrics to USD microunits
**Notes:** Since all API monetary values are USD, all `* 1e9` conversions are wrong. Fixing all at once is cleaner than partial fixes.

---

## Both-token fee storage

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse existing columns, no schema change | Existing text columns hold USD microunits, feeTokenMode stays for reference | ✓ |
| Add feeUnit column for transition | Track whether values are USD microunits or legacy lamports | |

**User's choice:** Reuse existing columns, no schema change
**Notes:** No per-side breakdown means no new fee columns needed. The feeTokenMode column remains but doesn't affect storage.

---

## Failure & backfill handling

| Option | Description | Selected |
|--------|-------------|----------|
| No backfill, natural overwrite | Next cron cycle writes USD microunits, old history stays as lamports | ✓ |
| One-time migration script | Convert all old snapshots from lamports to USD (needs historical SOL prices) | |
| Version flag on snapshots | Add v1/v2 flag to pool_stats_history rows | |

**User's choice:** No backfill, natural overwrite
**Notes:** The cron overwrites cumulativeFeesSnapshot each run, so the transition is automatic. Historical snapshots in pool_stats_history remain in lamports but are only used for charts.

---

## Failure handling (mode-specific)

| Option | Description | Selected |
|--------|-------------|----------|
| Uniform failure handling | All tokens treated the same — API returns aggregate USD regardless of mode | ✓ |
| Mode-aware logging only | Log feeTokenMode when a both-token pool fails, but no behavior change | |

**User's choice:** Uniform failure handling
**Notes:** The feeTokenMode doesn't affect error handling since the API returns aggregate USD regardless of mode.

---

## APR handling

| Option | Description | Selected |
|--------|-------------|----------|
| Store APR as-is | Raw float from API (e.g., 45.2), pool_stats_history.apr is already real type | ✓ |
| APR in basis points | 45.2% = 4520 bps, integer storage | |

**User's choice:** Store APR as-is
**Notes:** APR is a percentage, not a monetary value. No conversion needed.

---

## API interface update

| Option | Description | Selected |
|--------|-------------|----------|
| Full interface update to match API | Update MeteoraPoolMetrics to match real API response shape (TimeWindowData, cumulative_metrics, pool_config) | ✓ |
| Flat interface, field renames only | Minimal change, may miss nested data | |
| Defer to research, verify with live call | Researcher investigates actual API response during research phase | |

**User's choice:** Full interface update to match API
**Notes:** A live API call confirmed the real response shape. The current interface has fields that don't exist (lp_fee7d, lp_fee30d, volume7d, volume30d, etc.) and misses nested objects (fees as TimeWindowData, cumulative_metrics, pool_config).

---

## Circuit breaker for chronic failures

| Option | Description | Selected |
|--------|-------------|----------|
| Circuit breaker with stale flag | After N failures, mark pool stale, skip in getPoolsDueForUpdate | ✓ |
| No circuit breaker, keep retrying | Continue attempting updates for all due pools | |

**User's choice:** Circuit breaker with stale flag
**Notes:** Prevents wasting API calls on permanently broken pools (e.g., deleted pools).

---

## Stale flag implementation

| Option | Description | Selected |
|--------|-------------|----------|
| Add stale column to feeUpdateSchedule | Boolean column, default false, requires migration | ✓ |
| Reuse consecutiveFailures field | Skip pools where consecutiveFailures >= threshold, no schema change | |

**User's choice:** Add stale column to feeUpdateSchedule
**Notes:** More explicit than reusing consecutiveFailures. Requires a migration but is minimal and clean.

---

## Cumulative fee calculation

| Option | Description | Selected |
|--------|-------------|----------|
| Use cumulative_metrics.fees | API has all-time cumulative fees field — use directly | ✓ |
| Both: 24h for history, cumulative for leaderboard | Use fees.24h for pool_stats_history, cumulative_metrics.fees for tokens table | |

**User's choice:** Use cumulative_metrics.fees (then refined to also store 24h in history)
**Notes:** User provided a live API URL showing `cumulative_metrics: { volume: 8509938.91, fees: 277672.23 }`. This is the true all-time cumulative fee. The cron uses this for cumulativeFeesSnapshot and stores fees.24h in pool_stats_history for time-series charts.

---

## API base URL verification

| Option | Description | Selected |
|--------|-------------|----------|
| Update to current API URLs | Mainnet: damm-v2.datapi.meteora.ag, Dev: damm-v2-api.dev.metdev.io | ✓ |
| Defer to research | Researcher verifies URLs during research phase | |

**User's choice:** Update to current API URLs
**Notes:** Verified via curl: old URL (dammv2-api.meteora.ag) returns 404, new URL (damm-v2.datapi.meteora.ag) returns 200. This is a blocking fix — the cron is currently failing silently on every run.

---

## Cron schedule vs polling interval

| Option | Description | Selected |
|--------|-------------|----------|
| Keep 5-minute cron | 5-minute is the real floor, 1-minute intervals are aspirational | ✓ |
| Run cron every minute | Matches polling strategy's 1-minute interval for new tokens | |

**User's choice:** Keep 5-minute cron, set it as a configurable default
**Notes:** The 5-minute schedule is acceptable. Making it configurable is a future enhancement.

---

## the agent's Discretion

No areas were deferred to agent discretion.

## Deferred Ideas

- Per-side (base/quote) fee tracking — requires on-chain account reads, API only returns aggregate USD
- Dynamic SOL/USD price fetching for historical conversion — not needed since no backfill
- Configurable cron schedule via env var — 5-minute interval is hardcoded for v1
- Version flag on pool_stats_history snapshots — natural overwrite handles the transition