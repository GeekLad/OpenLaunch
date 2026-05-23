---
phase: 01
slug: types-schema-defaults-foundation
status: draft
nyquist_compliant: true
wave_0_complete: true
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
| 01-01-T1 | 01-01 | 1 | PERS-01 | T-01-01 | SDK v1.4.3 installed with verified version | install | `cat node_modules/@meteora-ag/cp-amm-sdk/package.json \| grep version` | ✅ | ⬜ pending |
| 01-01-T2 | 01-01 | 1 | PERS-01 | T-01-02 | poolUtils.ts uses v1.4.3 imports without compile errors | type-check | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 01-02-T1 | 01-02 | 1 | PERS-01 | T-01-03 | `types/fee.ts` exports discriminated union with exhaustive narrowing | type-check | `npx tsc --noEmit` | ❌ (new) | ⬜ pending |
| 01-02-T2 | 01-02 | 1 | PERS-01 | T-01-04 | `config/defaults.ts` exports all named constants with no env vars | type-check | `npx tsc --noEmit` | ❌ (new) | ⬜ pending |
| 01-02-T3 | 01-02 | 1 | PERS-01 | T-01-03 | `types/token.ts` uses FeeSchedulerConfig, old fields removed | type-check | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 01-03-T1 | 01-03 | 2 | PERS-01, PERS-03 | T-01-05 | Schema has all new columns with NOT NULL and defaults | type-check | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 01-03-T2 | 01-03 | 2 | PERS-01, PERS-03 | T-01-05 | Three migration SQL files exist with retroactive defaults UPDATE | manual inspect | `ls lib/db/migrations/*.sql` | ❌ (new) | ⬜ pending |
| 01-03-T3 | 01-03 | 2 | PERS-03 | T-01-06 | Database schema push succeeds, all columns present | migration run | `npm run db:migrate` | ✅ | ⬜ pending |
| 01-04-T1 | 01-04 | 3 | PERS-01 | T-01-09 | environment.ts has only infrastructure config, no business defaults | type-check | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 01-04-T2 | 01-04 | 3 | PERS-01 | T-01-08 | TokenCreateInput includes all 11 new fields | type-check | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 01-04-T3 | 01-04 | 3 | PERS-01 | T-01-08 | API route accepts all new fields with fallback defaults | type-check | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 01-05-T1 | 01-05 | 3 | PERS-01 | T-01-11 | launchService.ts uses new types, no old fee fields | type-check | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 01-05-T2 | 01-05 | 3 | PERS-01 | T-01-11 | TokenLaunchForm.tsx uses new Zod schema and defaultValues | type-check | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 01-05-T3 | 01-05 | 3 | PERS-01 | — | Full project compiles without errors after all changes | type-check | `npx tsc --noEmit` | N/A | ⬜ pending |
| 01-05-T4 | 01-05 | 3 | PERS-01 | — | No old fee field references remain anywhere in source | grep | `grep -r "enableFeeScheduler\|startingFeeRate\|endingFeeRate" --include="*.ts" --include="*.tsx" lib/ app/ components/ types/ config/` | N/A | ⬜ pending |

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
