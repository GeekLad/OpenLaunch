---
phase: 6
slug: background-jobs-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-25
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (not installed — Wave 0 installs) |
| **Config file** | `vitest.config.ts` — Wave 0 creates |
| **Quick run command** | `npx vitest run --reporter=dot` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=dot`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 6-01-01 | 01 | 0 | CRON-* | — | N/A | unit | `npx vitest run --reporter=dot` | ❌ W0 | ⬜ pending |
| 6-01-02 | 01 | 0 | CRON-* | T-06-SC | N/A | integration | `npx drizzle-kit push && node -e "..."` | ❌ W0 | ⬜ pending |
| 6-02-01 | 02 | 1 | CRON-01 | — | N/A | unit | `npx vitest run --reporter=dot` | ❌ W0 | ⬜ pending |
| 6-02-02 | 02 | 1 | CRON-02 | — | Stale pools excluded from query | unit | `npx vitest run --reporter=dot` | ❌ W0 | ⬜ pending |
| 6-03-01 | 03 | 2 | CRON-01 | — | feeTokenMode read from DB | unit | `npx vitest run --reporter=dot` | ❌ W0 | ⬜ pending |
| 6-03-02 | 03 | 2 | CRON-03 | — | Both-token ≡ quote-only equivalence; circuit breaker triggers at threshold | unit | `npx vitest run --reporter=dot` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — vitest configuration with Node environment
- [ ] `tests/fixtures/meteora-pool-response.json` — captured live pool response (fixture)
- [ ] `tests/cron/fee-updater.test.ts` — stubs for CRON-01, CRON-02, CRON-03
- [ ] `tests/meteora/client.test.ts` — stubs for interface parsing
- [ ] `tests/db/fee-update-schedule.test.ts` — stubs for circuit breaker + stale exclusion
- [ ] `vitest` + `@vitest/expect` installed as devDependencies
- [ ] `package.json` `test` script added

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live API URL returns 200 | CRON-02 | Requires network + real pool address | `curl -s -o /dev/null -w "%{http_code}" https://damm-v2.datapi.meteora.ag/pools/{real_pool_address}` |
| Cron schedule fires every 5 min | CRON-* | Requires running server + time passage | Start app with `ENABLE_CRON=true`, check logs for `[Cron]` entries at 5-min intervals |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending