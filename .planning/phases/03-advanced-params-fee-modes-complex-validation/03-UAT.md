---
status: diagnosed
phase: 03-advanced-params-fee-modes-complex-validation
source:
  - 03-01-SUMMARY.md
  - 03-02-SUMMARY.md
  - 03-03-SUMMARY.md
  - 03-04-SUMMARY.md
started: "2026-05-25T22:00:00Z"
updated: "2026-05-26T00:15:00Z"
---

## Current Test

[testing paused — 4 items outstanding: 3 issues, 1 blocked]

## Tests

### 1. Cold Start Build
expected: |
  Run `npm install && npm run build` from a clean state. The build succeeds without TypeScript or ESLint errors, including all 6 new Radix UI primitives and the new validation API route.
result: pass

### 2. Holdback Slider
expected: |
  In the Launch Parameters section, a horizontal slider is visible. Dragging it updates a real-time percentage readout (e.g., "25%"). Range is 0–100% with helper text explaining the purpose.
result: pass

### 3. Red-Flag Warning (>10% Holdback)
expected: |
  When holdback is set above 10%, a red "Modified" badge appears on the collapsed Launch Parameters section header, and an Alert banner with destructive styling appears inside the expanded section warning about high holdback.
result: pass

### 4. Quote Token Selection
expected: |
  In the Launch Parameters section, a Select dropdown labeled "Quote Token" shows SOL and USDC options. The default selected value is SOL. Selecting USDC changes the displayed choice.
result: pass

### 5. Fee Scheduler Mode Selection
expected: |
  In the Fee Schedule section, a Select dropdown replaces the previous read-only "market-cap-based" badge. It has 3 options: Market-Cap Based, Time-Based, and Disabled. Selecting a mode changes the visible sub-fields below it.
result: issue
reported: "Fee End Rate for time based displays in percent instead of BPS. Also, Market cap based fees may need starting and ending fee bps."
severity: minor

### 6. Dynamic Fee Sub-Fields
expected: |
  Selecting "Market-Cap Based" shows Starting Market Cap and Ending Market Cap inputs. Selecting "Time-Based" shows Fee Start Rate, Fee End Rate, and Duration Hours inputs. Selecting "Disabled" shows a Fixed Fee Rate input. Values entered in one mode are preserved when switching to another mode and back.
result: pass
note: |
  Core functionality confirmed. Additional UX issues noted during testing: (1) Fee End Rate for Time-Based mode displays as percent instead of BPS. (2) Market-Cap Based mode needs starting/ending fee rate fields in addition to market cap fields.

### 7. Fee Token Mode Radio Group
expected: |
  In the Fee Schedule section, a radio group with two options is visible: "Quote Only" and "Both". "Quote Only" is selected by default. Each option shows a filled-circle indicator when selected.
result: pass

### 8. Cross-Field Validation
expected: |
  If Ending Market Cap is less than or equal to Starting Market Cap, a validation error appears. If Fee End Rate is greater than Fee Start Rate, a validation error appears. Errors are displayed inline next to the relevant fields.
result: issue
reported: "Cross-field validation errors (endingMarketCap <= startingMarketCap, feeEndRate > feeStartRate) only display if required fields (name, symbol, logo) are already filled out. The same fix from Phase 2 (useMemo + inline error display instead of superRefine) needs to be applied to all fee scheduler cross-field validations."
severity: major

### 9. Launch Confirmation Modal
expected: |
  Clicking "Launch Token" after filling the form opens a Dialog modal (overlay + centered content). The modal shows all non-default values grouped by section (Token Info, Launch Parameters, Fee Configuration) in red text. "Cancel" closes the modal and returns to the form. "Confirm" proceeds with the launch flow.
result: issue
reported: "The Launch Token button is not enabling. Cannot click it to proceed."
severity: blocker

### 10. Server-Side Validation Flow
expected: |
  Clicking "Launch Token" triggers a brief loading state on the button ("Loading..." text or spinner). If values fail server-side validation, field-level errors appear on the form and the modal does NOT open. If the validation API is unreachable, a generic error message appears: "Unable to validate. Please check your connection and try again."
result: blocked
blocked_by: other
reason: "Launch Token button is disabled (blocked by Test 9 issue), so server-side validation flow cannot be tested."

## Summary

total: 10
passed: 6
issues: 3
pending: 0
skipped: 0
blocked: 1

## Gaps

- truth: "Fee scheduler sub-fields display correctly and use appropriate units (BPS vs percent)"
  status: failed
  reason: "User reported: Fee End Rate for Time-Based mode displays in percent (0.25) instead of BPS (25). Market-Cap Based mode needs starting/ending fee rate fields."
  severity: minor
  test: 5
  root_cause: "DEFAULT_FEE_END_RATE in config/defaults.ts is set to 0.25 (percent) instead of 25 (basis points). The schema min(1) constraint expects BPS values. Market-cap-based mode only has market cap fields but the SDK expects fee rates alongside them."
  artifacts:
    - path: "config/defaults.ts"
      issue: "DEFAULT_FEE_END_RATE = 0.25 (should be 25 BPS)"
    - path: "components/forms/TokenLaunchForm.tsx"
      issue: "Market-cap-based sub-fields only show startingMarketCap/endingMarketCap, missing fee rate inputs"
  missing:
    - "Change DEFAULT_FEE_END_RATE from 0.25 to 25"
    - "Add DEFAULT_MARKET_CAP_FEE_START_RATE and DEFAULT_MARKET_CAP_FEE_END_RATE"
    - "Add fee rate inputs to market-cap-based sub-fields container"
  debug_session: ".planning/debug/fee-end-rate-unit-confusion.md"

- truth: "Cross-field validation errors display immediately without requiring all required fields to be filled first"
  status: failed
  reason: "User reported: Cross-field validation errors (endingMarketCap <= startingMarketCap, feeEndRate > feeStartRate) only display if required fields (name, symbol, logo) are already filled out."
  severity: major
  test: 8
  root_cause: "Zod superRefine only runs after base .object() validation passes. When required fields (symbol, name, logoFile) are empty, base validation fails first, so cross-field validation in superRefine never executes. The Phase 2 fix (useMemo + inline JSX error display, bypassing RHF errors object) was applied to price range but NOT to fee scheduler cross-field validations."
  artifacts:
    - path: "components/forms/TokenLaunchForm.tsx"
      issue: "Fee scheduler cross-field validations (endingMarketCap <= startingMarketCap, feeStartRate < feeEndRate) live in superRefine and never run when required fields are empty"
    - path: "components/forms/TokenLaunchForm.tsx"
      issue: "priceError useMemo pattern exists but no equivalent feeSchedulerError useMemo exists"
  missing:
    - "Create feeSchedulerError useMemo that watches startingMarketCap, endingMarketCap, feeStartRate, feeEndRate"
    - "Display feeSchedulerError inline next to relevant fields (like priceError pattern)"
    - "Optionally: remove fee scheduler checks from superRefine to avoid double-validation"
  debug_session: ".planning/debug/fee-cross-field-validation-blocked.md"

- truth: "Launch Token button is enabled when form is valid, allowing user to open confirmation modal"
  status: failed
  reason: "User reported: The Launch Token button is not enabling. Cannot click it to proceed."
  severity: blocker
  test: 9
  root_cause: "DEFAULT_FEE_END_RATE = 0.25 violates the Zod schema constraint feeEndRate: z.number().min(1).max(9900).optional(). Because the form defaultValues sets feeEndRate: DEFAULT_LAUNCH_PARAMS.feeEndRate (0.25), the field is permanently invalid (0.25 < 1). This makes formState.isValid permanently false, disabling the Launch Token button regardless of whether required fields are filled."
  artifacts:
    - path: "config/defaults.ts"
      issue: "DEFAULT_FEE_END_RATE = 0.25 violates schema min(1) — makes form permanently invalid"
    - path: "components/forms/TokenLaunchForm.tsx"
      issue: "Button disabled={!isValid} — isValid never true because feeEndRate default fails schema"
  missing:
    - "Fix DEFAULT_FEE_END_RATE to 25 (or another value >= 1 and <= 9900)"
    - "Verify all other defaults pass their schema constraints"
  debug_session: ".planning/debug/launch-button-disabled.md"
