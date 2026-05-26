---
phase: 04
slug: blockchain-integration-pre-flight-safety
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-26
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x (via Next.js built-in) |
| **Config file** | `jest.config.js` or Next.js built-in |
| **Quick run command** | `npm test -- --testPathPattern="launch\\|pool\\|token"` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~10 seconds (unit tests only) |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint` (type-check + eslint)
- **After every plan wave:** Run `npm run lint` + manual devnet test if applicable
- **Before `/gsd-verify-work`:** Full lint suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | LAUN-10 | T-04-01 / — | holdbackPercentage = 10 → pool gets 90% of supply | unit | `npm test -- holdback` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | LAUN-10 | T-04-02 / — | quoteToken = USDC → tokenBDecimals = 6 | unit | `npm test -- decimals` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | FEE-06 | T-04-03 / — | feeTokenMode = 'both' → CollectFeeMode.BothToken | unit | `npm test -- collectFeeMode` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 2 | FEE-06 | T-04-04 / — | market-cap mode → getFeeMarketCapSchedulerParams called | unit | `npm test -- feeScheduler` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 3 | VALID-03 | T-04-05 / — | invalid holdback (101) → hard stop, no tx built | unit | `npm test -- validation` | ❌ W0 | ⬜ pending |
| 04-03-02 | 03 | 3 | VALID-03 | T-04-06 / — | invalid price range → structured field-level errors | unit | `npm test -- validation` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/validation/__tests__/launch.test.ts` — stubs for LAUN-10, FEE-06, VALID-03
- [ ] `lib/solana/__tests__/poolUtils.test.ts` — stubs for priceToSqrtPrice with USDC decimals
- [ ] `jest.config.js` — if no framework detected

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pool creation with USDC quote token on devnet | LAUN-10 | Requires live RPC and wallet signature | 1. Switch quote token to USDC 2. Launch token 3. Verify pool uses USDC vault with 6 decimals |
| CollectFeeMode.BothToken on devnet | FEE-06 | Requires live RPC and pool state inspection | 1. Set fee token mode to "Both" 2. Launch token 3. Query pool state, verify collectFeeMode = 0 |
| Market-cap fee scheduler interpolation | FEE-06 | Requires on-chain market cap growth | 1. Launch with market-cap mode 2. Monitor fees as market cap changes |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
