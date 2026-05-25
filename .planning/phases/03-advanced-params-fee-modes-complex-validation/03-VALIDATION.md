---
phase: 03
slug: advanced-params-fee-modes-complex-validation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-25
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
</br >> **Note:** Project currently has zero automated tests. This phase installs Jest infrastructure as Wave 0.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x + ts-jest + React Testing Library |
| **Config file** | `jest.config.ts` (Wave 0 installs) |
| **Quick run command** | `npm test -- --testPathPattern="tokenLaunchForm"` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds (minimal suite) |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint` (type-check + eslint) — guaranteed fast feedback
- **After every plan wave:** Manual verification in browser for UI tasks
- **Before `/gsd-verify-work`:** Full lint + interactive browser walkthrough
- **Max feedback latency:** 30 seconds (lint) / 5 minutes (browser)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | FORM-05 | T-03-01 / — | Holdback badge visible when collapsed and >10% | manual | Browser visual | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | LAUN-06 | T-03-02 / — | Slider range 0–100 with integer readout | manual | Browser interaction | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | LAUN-07 | T-03-03 / — | Alert banner at >10% with exact copy | manual | Browser visual | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | LAUN-09 | T-03-04 / — | Quote token Select with SOL/USDC options | manual | Browser interaction | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | FEE-01 | T-03-05 / — | Fee scheduler mode Select with 3 options | manual | Browser interaction | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 1 | FEE-02–FEE-04 | T-03-06 / — | Dynamic sub-fields show/hide per mode, values persist | manual | Browser interaction | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 1 | FEE-05 | T-03-07 / — | RadioGroup with quote-only and both-tokens options | manual | Browser interaction | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 1 | FORM-06 | T-03-08 / — | Dialog shows non-default values in red on submit | manual | Browser visual | ❌ W0 | ⬜ pending |
| 03-04-01 | 04 | 2 | VALID-02 | T-03-09 / T-03-10 | Server-side validation runs before on-chain work | semi-auto | API test + `curl` | ❌ W0 | ⬜ pending |
| 03-04-02 | 04 | 2 | VALID-02 | T-03-11 / — | Parameter bounds enforced (holdback 0–100, fee rates 1–9900) | semi-auto | SDK validator test | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Install Jest: `npm install --save-dev jest ts-jest @types/jest` (if not already in devDependencies)
- [ ] Install React Testing Library: `npm install --save-dev @testing-library/react @testing-library/jest-dom`
- [ ] Create `jest.config.ts` with ts-jest preset and module alias `@/*`
- [ ] Add `test` npm script to `package.json` pointing to jest
- [ ] Create `lib/validation/__tests__/feeValidation.test.ts` — stub test for server-side fee validator
- [ ] Create `components/forms/__tests__/TokenLaunchForm.zod.test.ts` — stub test for Zod schema extension

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Slider thumb UX (drag, keyboard arrows) | LAUN-06 | Browser native interaction not unit-testable | 1. Focus slider via keyboard. 2. Press ←/→. 3. Expect value to change by 1%. 4. Press Home/End. 5. Expect 0%/100%. |
| Modal escape and overlay click | FORM-06 | Dialog overlay behavior is browser-native | 1. Open modal. 2. Press Escape. 3. Expect modal closes. 4. Re-open. 5. Click outside. 6. Expect modal closes. |
| Red-flag visibility toggle (collapsed vs expanded) | FORM-05 | CSS transition + layout shift | 1. Set holdback >10%. 2. Collapse section. 3. Verify red badge on header. 4. Expand. 5. Verify Alert banner replaces badge. |
| Fee scheduler sub-field value persistence | FEE-02–FEE-04 | Cross-field state preservation via hidden DOM | 1. Enter market-cap values. 2. Switch to Time-Based. 3. Enter rates. 4. Switch back to Market-Cap. 5. Verify previous values restored. |
| Responsive layout on mobile | FORM-05 | Viewport-dependent | 1. Open DevTools. 2. Set viewport to iPhone SE. 3. Verify all controls are usable, no horizontal scroll. |

---

## Validation Sign-Off

- [ ] All tasks have `automated` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
