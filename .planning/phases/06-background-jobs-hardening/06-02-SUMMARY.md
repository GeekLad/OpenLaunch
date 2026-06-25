---
phase: 06-background-jobs-hardening
plan: 02
subsystem: api
tags: [meteora, damm-v2, client, db-service, circuit-breaker, usd-microunits]

# Dependency graph
requires:
  - phase: 06-background-jobs-hardening (plan 01)
    provides: "vitest harness, RED tests encoding new interface/URLs/stale-filter, applied 0007 migration adding stale column, meteora pool response fixtures"
provides:
  - "Rewritten lib/meteora/client.ts — verified-live MeteoraPoolMetrics interface (TimeWindowData, cumulative_metrics, pool_config.collect_fee_mode, farm_apr), fixed mainnet/devnet URLs, removed {status,error,data} wrapper, /pools/{address} endpoint (no /metrics suffix)"
  - "Extended lib/db/service.ts — getPoolsDueForUpdate excludes stale pools (eq(stale,false) via and()), new markPoolStale(tokenId) function exported on the dbService barrel"
  - "Fixed app/api/tokens/update-fees/route.ts — same USD-microunits (* 1e6) bug as the cron, now using the new interface field paths"
affects: [06-03-cron-hardening, app-api-tokens-update-fees]

# Tech tracking
tech-stack:
  added: []
  patterns: [verified-live-API interface rewrite, defensive ?? 0 on optional cumulative_metrics (Assumption A1), USD microunits (Math.floor(float * 1e6).toString()), dbService barrel export for cron auto-pickup, combined and() where-clause for stale filter]

key-files:
  created: []
  modified:
    - lib/meteora/client.ts
    - lib/db/service.ts
    - app/api/tokens/update-fees/route.ts

key-decisions:
  - "Followed RESEARCH.md verified-live interface exactly (TimeWindowData keys 30m/1h/2h/4h/12h/24h, cumulative_metrics optional-but-defensive, pool_config.collect_fee_mode 0=both/1=quote, farm_apr for APR)"
  - "Auto-fixed app/api/tokens/update-fees/route.ts (Rule 3 — blocking type error caused by the interface rewrite). It duplicated the cron's * 1e9 lamports bug; switched it to USD microunits using the new field paths so lib/ AND app/ type-check clean (the prompt required app/ type-check passing)."
  - "Left lib/cron/fee-updater.ts alone despite its type errors — Plan 06-03 (Wave 2) rewrites it; touching it now would exceed Plan 02's scope (the prompt explicitly scopes cron type errors as expected-RED until 06-03)."

patterns-established:
  - "Pattern: Meteora client parses the pool object directly with no wrapper check — the real API returns the pool object on 200 and {message} on error (D-11)"
  - "Pattern: All monetary API fields converted to USD microunits via Math.floor(value * 1_000_000).toString() before DB write (D-02); APR (farm_apr) stored as-is as a real float with ?? null guard (D-03)"
  - "Pattern: Circuit-breaker primitives in the DB service — getPoolsDueForUpdate filters stale=false in the WHERE clause (query-level, not application-level), markPoolStale(tokenId) mirrors recordUpdateFailure's db.update().set().where() shape"

requirements-completed: [CRON-01, CRON-02, CRON-03]

# Metrics
duration: 9min
completed: 2026-06-25
---

# Phase 6 Plan 2: Meteora Client Rewrite + DB Stale-Filter/MarkPoolStale Summary

**Rewrote the Meteora DAMMv2 client to the verified-live interface (no wrapper, fixed URLs, TimeWindowData + cumulative_metrics + farm_apr) and added the circuit-breaker DB primitives (stale filter + markPoolStale) — turning the 06-01 RED client/DB suites GREEN**

## Performance

- **Duration:** 9 min
- **Started:** 2026-06-25T14:27:56Z
- **Completed:** 2026-06-25T14:37:01Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Replaced the entirely-wrong `MeteoraPoolMetrics` interface (lp_fee24h/7d/30d, flat volume24h, top-level apr, updated_at — none exist in the real API) with the verified-live shape: `TimeWindowData` (30m/1h/2h/4h/12h/24h), `TokenMetrics`, `PoolConfig.collect_fee_mode`, nested `cumulative_metrics.{volume,fees}`, `farm_apr`/`farm_apy`, `vested_liquidity`, `launchpad`, `tags`
- Deleted the `MeteoraApiResponse` wrapper — the real API returns the pool object directly on 200 (the wrapper check at the old lines 87-93 always failed, silently no-op'ing the cron on every pool)
- Fixed both API base URLs: mainnet `https://damm-v2.datapi.meteora.ag` (old `dammv2-api.meteora.ag` 404s) and devnet `https://damm-v2-api.dev.metdev.io` (old devnet URL dead)
- Dropped the `/metrics` URL suffix — the verified-live endpoint is `GET {baseUrl}/pools/{address}`; added defensive `?? 0` on `cumulative_metrics?.fees` (Assumption A1 — not in OpenAPI `required` but present live)
- Extended `getPoolsDueForUpdate` with `eq(feeUpdateSchedule.stale, false)` combined via `and()` so stale pools never enter the cron rotation (D-15)
- Added `markPoolStale(tokenId)` mirroring the existing `recordUpdateFailure` shape (`db.update(feeUpdateSchedule).set({stale:true}).where(eq(tokenId, ...))`) and exported it on the `dbService` barrel so the cron (06-03) picks it up automatically via `import * as dbService`
- Fixed `app/api/tokens/update-fees/route.ts` — it duplicated the cron's `* 1e9` (SOL-lamports) bug and the old interface field names; the interface rewrite broke its type-check. Switched it to the same USD-microunits path so `lib/` and `app/` type-check clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite Meteora client — new interface, fixed URLs, removed wrapper** - `06e39cc` (feat)
2. **Task 2: Extend DB service — stale filter on getPoolsDueForUpdate + markPoolStale** - `ba58d41` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `lib/meteora/client.ts` - Replaced buggy interface (lines 6-27) with verified TimeWindowData/TokenMetrics/PoolConfig/MeteoraPoolMetrics; deleted MeteoraApiResponse wrapper (lines 32-39); fixed getMeteoraApiBaseUrl URLs (lines 44-53); rewrote getPoolMetrics to parse pool object directly, dropped /metrics suffix, defensive ?? 0, updated success log; getMultiplePoolMetrics auto-updated via interface change (no logic edit)
- `lib/db/service.ts` - getPoolsDueForUpdate WHERE clause now `and(lt(nextUpdate, now), eq(stale, false))`; added markPoolStale(tokenId) after getFeeUpdateSchedule with D-14/D-16 JSDoc + manual reset SQL; added markPoolStale to the dbService barrel's "Fee update schedule operations" section
- `app/api/tokens/update-fees/route.ts` - Switched all three update branches (by tokenId, by poolAddress, all tokens) from `* 1e9` (assumed SOL lamports) to `* 1e6` USD microunits using the new field paths (`cumulative_metrics?.fees ?? 0`, `fees["24h"]`, `volume["24h"]`, `tvl`, `farm_apr ?? null`)

## Decisions Made
- **Followed RESEARCH.md verified-live interface verbatim** — every field name, URL, and the wrapper-removal came from the research doc's "Code Examples > New MeteoraPoolMetrics Interface" and "Rewritten getPoolMetrics()" sections (both verified against live curl). No deviation from the locked decisions D-10/D-11/D-12/D-13.
- **Auto-fixed the update-fees API route (Rule 3 — blocking)** — the interface rewrite broke `app/api/tokens/update-fees/route.ts` type-check (it referenced `lp_fee30d`, `lp_fee24h`, `volume24h`, `apr` — all removed). The acceptance criterion requires `npm run type-check passes` for production code, and the prompt explicitly says "focus on lib/ and app/ type-check passing". The route duplicated the cron's `* 1e9` lamports bug verbatim, so the fix is the same USD-microunits conversion the cron will get in 06-03. This keeps Plan 02's scope tight (only what's needed for app/ to type-check) without rewriting the cron itself (out of scope for this plan — 06-03 owns it).
- **Left `lib/cron/fee-updater.ts` untouched despite its type errors** — the prompt explicitly scopes cron type errors as expected-RED until 06-03 ("test files referencing cron internals may still error until 06-03 — that's acceptable"). Editing the cron would exceed Plan 02's contract (it only lists lib/meteora/client.ts and lib/db/service.ts in `files_modified`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] app/api/tokens/update-fees/route.ts broke type-check after the interface rewrite**
- **Found during:** Task 1 (Meteora client rewrite — acceptance criteria gate: `npm run type-check passes`)
- **Issue:** The interface rewrite removed `lp_fee30d`, `lp_fee24h`, `volume24h`, and `apr` from `MeteoraPoolMetrics`. The update-fees API route referenced all four fields in three separate branches (by tokenId, by poolAddress, all tokens) — 12 type errors total. The route also carried the same `* 1e9` (assumed SOL lamports) bug as the cron, which is the underlying bug Phase 6 is fixing.
- **Fix:** Rewrote all three branches to use the new verified-live field paths: `cumulative_metrics?.fees ?? 0` for cumulative fees, `fees["24h"]` for 24h fees, `volume["24h"]` for 24h volume, `tvl` for current liquidity, `farm_apr ?? null` for APR. Switched the conversion factor from `* 1e9` (SOL lamports) to `* 1_000_000` (USD microunits, D-02). The route now type-checks clean and aligns with the same USD-microunits discipline the cron will adopt in 06-03.
- **Files modified:** app/api/tokens/update-fees/route.ts
- **Verification:** `npm run type-check` reports zero errors in `app/` and `lib/` (excluding the known `lib/cron/fee-updater.ts` errors which 06-03 resolves). No `1e9` remains in the route. The route's existing behavior (manual fee-update trigger endpoint) is preserved — only the unit conversion and field paths are corrected.
- **Committed in:** 06e39cc (Task 1 commit — same atomic unit as the client rewrite that caused the breakage)

**2. [Note — not a fix] Plan acceptance-criteria regex for the combined WHERE clause**
- **Found during:** Task 2 (AC: `grep -c "and(lt(feeUpdateSchedule.nextUpdate, now)"` returns >=1)
- **Issue:** The AC regex `and(lt(feeUpdateSchedule.nextUpdate, now)` does not match the implemented code because the formatter places `lt(...)` on its own line inside the `and(...)` call (multi-line). Semantically the clause is present and correct: `and(lt(feeUpdateSchedule.nextUpdate, now), eq(feeUpdateSchedule.stale, false))`.
- **Resolution:** Verified the combined clause is present at lib/db/service.ts:453-456 via `rg -n "and\(" and rg -n "lt(feeUpdateSchedule.nextUpdate"`. The DB tests (which assert the stale filter behavior) pass GREEN (2/2). Not a code defect — the AC regex was written against a single-line projection of the code; the multi-line form is functionally identical and matches the project's existing `and(...)` style (see lines 343, 376).
- **Files modified:** none (verification only)

---

**Total deviations:** 1 auto-fixed (1 blocking — update-fees route type-breakage from interface rewrite), 1 documented note (AC regex line-break mismatch, semantically satisfied)
**Impact on plan:** The update-fees route fix was unavoidable — the interface rewrite (the plan's core deliverable) broke its type-check, and the AC explicitly requires `npm run type-check passes` for production code. The fix is the same USD-microunits conversion the cron will get in 06-03, so it advances the phase goal rather than scope-creeping. No unrelated code touched.

## Issues Encountered
None beyond the documented deviation. The `data/` directory appears as untracked in `git status` — it is the runtime SQLite DB directory, not introduced by this plan, and is normally gitignored. Not treated as a stub or issue.

## User Setup Required
None - no external service configuration required. The Meteora DAMMv2 API is public (no auth, no API keys) and the URLs are baked into the client code.

## Next Phase Readiness
- **Ready for Wave 2 (Plan 06-03 — cron hardening):** The `lib/meteora/client.ts` now returns real parsed pool data with the verified-live interface, so the cron can call `getPoolMetrics()` and read `metrics.cumulative_metrics.fees`, `metrics.fees["24h"]`, `metrics.volume["24h"]`, `metrics.tvl`, `metrics.farm_apr`, `metrics.pool_config.collect_fee_mode` directly. The `dbService.markPoolStale` function is exported on the barrel and visible to `import * as dbService from "@/lib/db/service"`. The `getPoolsDueForUpdate` query already filters stale pools, so the cron's per-run loop will never receive a stale schedule.
- **Cron test contract intact:** `tests/cron/fee-updater.test.ts` is still RED (5 fail | 3 pass) — expected, since 06-03 rewrites `lib/cron/fee-updater.ts` to use the new interface + USD microunits + circuit breaker. The cron file's current type errors (referencing removed `lp_fee30d`/`lp_fee24h`/`volume24h`/`apr` fields) will resolve when 06-03 rewrites it. The cron test file's `markPoolStale` import errors are now resolved (markPoolStale is exported on the dbService barrel as of Task 2).
- **Blockers:** None. The two non-cron halves of the fix are GREEN and type-clean.

## Self-Check: PASSED

**Key files modified (exist on disk):**
- `lib/meteora/client.ts` — FOUND
- `lib/db/service.ts` — FOUND
- `app/api/tokens/update-fees/route.ts` — FOUND

**Commits exist:**
- `06e39cc` (feat 06-02 — Meteora client rewrite + update-fees route fix) — FOUND
- `ba58d41` (feat 06-02 — DB service stale filter + markPoolStale) — FOUND

**Plan-level acceptance criteria re-run:**
- `npx vitest run tests/meteora/client.test.ts tests/db/fee-update-schedule.test.ts` exits 0 (6/6 GREEN) — PASS
- `npm run type-check` — lib/ and app/ clean (only `lib/cron/fee-updater.ts` and `tests/cron/fee-updater.test.ts` errors remain, both expected until 06-03) — PASS
- `rg -c "1e9" lib/meteora/client.ts lib/db/service.ts` returns 0 for both — PASS
- Cron test remains RED (5 fail | 3 pass) — expected, 06-03 turns it GREEN

---
*Phase: 06-background-jobs-hardening*
*Completed: 2026-06-25*