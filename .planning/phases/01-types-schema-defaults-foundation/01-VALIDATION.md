---
phase: 01
slug: types-schema-defaults-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-23
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — Wave 0 addresses `tsc` availability |
| **Config file** | none — Wave 0 |
| **Quick run command** | `npx tsc --noEmit` (fallback until `tsc` in PATH) |
| **Full suite command** | `npm run type-check` (after PATH fix) |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx tsc --noEmit`
- **Before `/gsd-verify-work`:** Full type-check must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | PERS-01 | — | Schema contains all new columns with correct types and defaults | type-check | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | PERS-01 | — | `types/fee.ts` exports discriminated union with exhaustive narrowing | type-check | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | PERS-03 | — | Migration applies retroactive defaults without data loss | manual run | `npm run db:migrate` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 1 | PERS-01 | — | `config/defaults.ts` exports constants used by both frontend and backend | type-check | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 01-04-01 | 04 | 2 | PERS-01 | — | SDK v1.4.3 types resolve without errors in `poolUtils.ts` | type-check | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Fix `tsc` availability (`npm install` or PATH fix) so `npm run type-check` works
- [ ] Verify `npm run db:migrate` script exists and references `tsx`

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration retroactive defaults on existing tokens | PERS-03 | Requires live SQLite DB with existing rows | 1. Backup `./data/openlaunch.db` 2. Run `npm run db:migrate` 3. Inspect with `sqlite3` CLI: `SELECT total_supply, holdback_percentage, fee_scheduler_mode FROM tokens;` verify no NULLs |
| SDK v1.4.3 function signatures at runtime | PERS-01 | Type-check is static; runtime import verification needed | 1. `npm install @meteora-ag/cp-amm-sdk@1.4.3` 2. Add `console.log` import of `getFeeMarketCapSchedulerParams` in temporary file 3. `npx tsx verify-import.ts` — confirm no runtime error |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
