---
phase: 06-background-jobs-hardening
plan: 03
subsystem: cron
tags: [cron, fee-updater, usd-microunits, circuit-breaker, feeTokenMode]

# Dependency graph
requires:
  - phase: 06-background-jobs-hardening (plan 01)
    provides: "vitest harness + RED cron tests encoding USD-microunits/feeTokenMode/circuit-breaker fixed behavior; meteora pool response fixtures"
  - phase: 06-background-jobs-hardening (plan 02)
    provides: "Rewritten MeteoraPoolMetrics interface (cumulative_metrics, fees/volume TimeWindowData, farm_apr, pool_config.collect_fee_mode); dbService.markPoolStale + getPoolsDueForUpdate stale filter"
provides:
  - "Rewritten lib/cron/fee-updater.ts — USD microunits (Math.floor(usd * 1e6)) conversion using cumulative_metrics.fees/fees[24h]/volume[24h]/tvl, feeTokenMode read + deferred-per-side both-token warning, circuit breaker (markPoolStale on consecutiveFailures >= 10 via re-fetch) in both failure branches"
  - "config/defaults.ts MAX_CONSECUTIVE_FAILURES = 10 constant (circuit-breaker threshold, D-17 centralized)"
  - "Full Phase 6 test suite GREEN (14/14 tests) — CRON-01/02/03 closed"
affects: [display-layer, charts, pool-stats-history]

# Tech tracking
tech-stack:
  added: []
  patterns: [USD microunits Math.floor(float * 1_000_000).toString() for text-column storage, circuit-breaker re-fetch pattern (recordUpdateFailure returns void → getFeeUpdateSchedule to read post-increment count), mode-aware logging without branching store logic, as-const threshold constant in config/defaults.ts]

key-files:
  created: []
  modified:
    - config/defaults.ts
    - lib/cron/fee-updater.ts

key-decisions:
  - "MAX_CONSECUTIVE_FAILURES placed in config/defaults.ts (not inline in cron) per RESEARCH Open Question #2 — centralization alongside DEFAULT_FEE_TOKEN_MODE"
  - "Circuit breaker uses re-fetch pattern (Pitfall 4): recordUpdateFailure increments via SQL and returns void, so getFeeUpdateSchedule is mandatory to read the post-increment count — avoids off-by-one (10 marks stale, 9 does not)"
  - "Both-token and quote-only pools follow the IDENTICAL aggregate-USD store path; feeTokenMode only affects a log warning (D-05/D-22) — no branching on mode for store logic"
  - "Catch-block stale warning uses schedule.poolAddress only (token is try-scoped and not visible in catch) — Rule 1 fix of plan's literal code which would have thrown ReferenceError"

patterns-established:
  - "Pattern: USD microunits conversion block (USD_MICROUNITS = 1_000_000; Math.floor((metrics.cumulative_metrics?.fees ?? 0) * USD_MICROUNITS).toString()) — defensive ?? 0 on optional cumulative_metrics (Assumption A1)"
  - "Pattern: Circuit breaker in both failure branches — recordUpdateFailure → getFeeUpdateSchedule re-fetch → threshold check → markPoolStale + ⚠️ warning log"
  - "Pattern: Mode-aware logging (CRON-01) without mode-branching store logic — bothTokens emits deferred-per-side warning, quoteOnly is silent, both store aggregate USD identically"

requirements-completed: [CRON-01, CRON-02, CRON-03]

# Metrics
duration: 3min
completed: 2026-06-25
---

# Phase 6 Plan 3: Cron Hardening Summary

**Rewrote updateTokenFees() to convert all monetary metrics to USD microunits (Math.floor * 1e6, no * 1e9), read token.feeTokenMode per pool, and trigger the circuit breaker (markPoolStale at consecutiveFailures >= 10) — turning all 14 Phase 6 tests GREEN and closing CRON-01/02/03**

## Performance

- **Duration:** 3 min
- **Started:** 2026-06-25T14:57:23Z
- **Completed:** 2026-06-25T15:00:34Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `MAX_CONSECUTIVE_FAILURES = 10 as const` to `config/defaults.ts` (centralized circuit-breaker threshold per D-17 / RESEARCH Open Question #2), placed alongside `DEFAULT_FEE_TOKEN_MODE` with JSDoc referencing D-14/D-16/D-17
- Rewrote `lib/cron/fee-updater.ts` `updateTokenFees()`: removed all `* 1e9` SOL-lamports conversions; replaced with USD microunits (`Math.floor(value * 1_000_000)`) using the verified-live interface field paths (`cumulative_metrics?.fees ?? 0`, `fees["24h"]`, `volume["24h"]`, `tvl`, `farm_apr ?? null`)
- CRON-01: reads `token.feeTokenMode` per pool; both-token pools emit a deferred-per-side log warning, quote-only pools are silent — store path identical regardless of mode (D-05/D-22)
- CRON-03: both-token and quote-only fixtures with identical `cumulative_metrics.fees` produce IDENTICAL `updateCumulativeFeesSnapshot` calls (verified by equivalence test)
- Circuit breaker (D-14/D-17, Pitfall 4): after `recordUpdateFailure`, re-fetches `getFeeUpdateSchedule` to read the post-increment `consecutiveFailures` count (recordUpdateFailure returns void); if `>= MAX_CONSECUTIVE_FAILURES` (10), calls `markPoolStale(tokenId)` and logs a ⚠️ warning — applied in BOTH failure branches (metrics===null and catch)
- Full Phase 6 test suite GREEN: 14/14 tests pass (5 cron, 4 meteora client, 2 db — across 3 test files); `npm run type-check` passes clean with zero errors in lib/, app/, config/, or tests/

## Task Commits

Each task was committed atomically:

1. **Task 1: Add MAX_CONSECUTIVE_FAILURES constant to config/defaults.ts** - `75478f2` (feat)
2. **Task 2: Rewrite cron updateTokenFees — USD microunits, feeTokenMode read, circuit breaker** - `29149ba` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `config/defaults.ts` - Added exported `MAX_CONSECUTIVE_FAILURES = 10 as const` after `DEFAULT_FEE_TOKEN_MODE` with JSDoc (D-14/D-16/D-17)
- `lib/cron/fee-updater.ts` - Added `MAX_CONSECUTIVE_FAILURES` import; inserted CRON-01 feeTokenMode read + bothTokens deferred-per-side warning after the token guard; replaced the buggy `* 1e9` lamports conversion block (lines 47-69) with USD-microunits block using `cumulative_metrics?.fees`, `fees["24h"]`, `volume["24h"]`, `tvl`, `farm_apr ?? null`; updated success log to report USD microunits + mode; added circuit-breaker re-fetch + `markPoolStale` + ⚠️ warning in BOTH failure branches (metrics===null and catch)

## Decisions Made
- **MAX_CONSECUTIVE_FAILURES in config/defaults.ts (not inline):** Per RESEARCH Open Question #2 resolution and D-17 — centralizes the threshold alongside `DEFAULT_FEE_TOKEN_MODE` for consistency with the project's config-centralization pattern. Low stakes either way; the planner locked this in Plan 03 Task 1.
- **Re-fetch pattern for circuit breaker (Pitfall 4):** `recordUpdateFailure()` increments `consecutiveFailures` via SQL (`consecutiveFailures = consecutiveFailures + 1`) and returns `void` (verified at service.ts). To read the post-increment count, `getFeeUpdateSchedule(tokenId)` is re-fetched and `consecutiveFailures >= MAX_CONSECUTIVE_FAILURES` is checked. This prevents the classic off-by-one (tests assert 10 marks stale, 9 does not).
- **No mode-branching in store logic (D-05/D-22):** `feeTokenMode` is read for awareness/logging only. Both-token and quote-only pools follow the identical fetch + USD-microunits store path because the Meteora API returns aggregate USD fees regardless of `collect_fee_mode`. The only behavioral difference is the deferred-per-side log warning for both-token pools.
- **APR field choice (D-03, RESEARCH Open Question #1 resolved):** Used `metrics.farm_apr ?? null` for the `apr` column (real/float, no conversion). `farm_apr` is the only APR-like top-level field in the verified-live API. Flagged for the display phase to revisit if charts show wrong APR semantics for non-farm pools.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Catch-block stale warning referenced try-scoped `token` (would throw ReferenceError)**
- **Found during:** Task 2 (cron rewrite — catch-branch circuit breaker)
- **Issue:** The plan's action specified the catch-branch stale warning as `schedule.poolAddress ?? token?.poolAddress ?? 'unknown'`. However, `token` is declared with `const` inside the inner `try` block (line 40) and is NOT in scope in the `catch` block — referencing it would throw a `ReferenceError` at runtime and fail type-check (`Cannot find name 'token'`).
- **Fix:** Used `schedule.poolAddress ?? 'unknown'` in the catch-branch warning instead. `schedule.poolAddress` is `notNull()` on the `FeeUpdateSchedule` schema, so the `?? 'unknown'` is purely defensive. The metrics===null branch (which IS in `token`'s scope) uses `token.poolAddress` as the plan specified.
- **Files modified:** lib/cron/fee-updater.ts
- **Verification:** `npm run type-check` passes clean (no `Cannot find name 'token'` error); all 14 tests GREEN including both circuit-breaker tests which exercise the metrics===null branch.
- **Committed in:** 29149ba (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — catch-block scoping)
**Impact on plan:** The fix was necessary for the code to compile and run — the plan's literal code would have crashed. The behavioral intent (log the pool address in the stale warning) is preserved using the in-scope `schedule.poolAddress`. No scope creep.

## Issues Encountered
None beyond the documented deviation. Pre-existing lint errors in `tests/db/fee-update-schedule.test.ts` (13 `no-explicit-any` / `no-unused-vars` errors from Plan 01's RED test scaffolding) are out of scope per the scope-boundary rule — they are in an unrelated file not modified by this plan, and the plan's AC only requires `npm run type-check passes` (which it does, cleanly).

## User Setup Required
None - no external service configuration required. The cron runs in-process against the public Meteora DAMMv2 API (no auth, no keys).

## Next Phase Readiness
- **Phase 6 complete:** All 3 plans done (test harness + RED tests → client/DB rewrite → cron rewrite). Full suite GREEN (14/14). `npm run type-check` passes clean. CRON-01/02/03 closed.
- **Known accepted tradeoff (D-20, T-06-08):** Pre-Phase-6 `pool_stats_history` snapshots remain in lamports (old `* 1e9` unit); new snapshots are USD microunits. The display layer / charts MUST handle this unit mismatch at the Phase-6 cutover timestamp — out of scope for Phase 6 (documented for the display phase).
- **APR semantics flag (RESEARCH Open Question #1):** `farm_apr` is used for the `apr` column. For pools without a farm (`has_farm === false`), this may yield 0.0. The display phase should revisit if charts show wrong APR for non-farm pools — `fee_tvl_ratio["24h"]` (annualized fee yield) is an alternative.
- **Stale pool recovery (D-16):** Stale pools require manual DB reset (`UPDATE fee_update_schedule SET stale=0, consecutive_failures=0 WHERE token_id=N`). No automatic reset. An admin API endpoint could be added in a future phase (out of scope).
- **Blockers:** None. Phase 6 is ready for `/gsd-verify-work 6`.

## Self-Check: PASSED

**Key files modified (exist on disk):**
- `config/defaults.ts` — FOUND (MAX_CONSECUTIVE_FAILURES = 10 exported)
- `lib/cron/fee-updater.ts` — FOUND (USD microunits, feeTokenMode, circuit breaker)

**Commits exist:**
- `75478f2` (feat 06-03 — MAX_CONSECUTIVE_FAILURES constant) — FOUND
- `29149ba` (feat 06-03 — cron rewrite) — FOUND

**Plan-level verification re-run:**
- `npx vitest run` exits 0 (14/14 tests GREEN across 3 files) — PASS
- `npm run type-check` passes clean (zero errors) — PASS
- `grep -c "1e9" lib/cron/fee-updater.ts` returns 0 (the bug is gone) — PASS
- `grep -c "MAX_CONSECUTIVE_FAILURES" config/defaults.ts` returns 1 — PASS
- All Task 2 acceptance-criteria greps pass (USD_MICROUNITS, cumulative_metrics, farm_apr, feeTokenMode, bothTokens, markPoolStale >=2, getFeeUpdateSchedule >=2, no old fields, schedule unchanged) — PASS

---
*Phase: 06-background-jobs-hardening*
*Completed: 2026-06-25*