---
status: complete
date_completed: "2026-06-27"
---

# Summary: Linear X Axis Toggle for Time-Based Fee Scheduler

## What changed
- `components/forms/token-launch-form/FeeScheduleChart.tsx`
  - `buildTimeData` now accepts `xScaleMode` and exponentially spaces x-axis samples (`Math.pow(progress, 2)`) when "log" is selected, while keeping fee values computed at the same period index.
  - Time-based chart branch now returns `"log"` or `"linear"` `xScale` based on the prop instead of hard-coding `"linear"`.
- `components/forms/token-launch-form/FeeScheduleSection.tsx`
  - The "Linear / Log" toggle buttons now render for both `"market-cap-based"` and `"time-based"` modes.
  - The "Market Cap / Price" toggle remains visible only for `"market-cap-based"` mode.

## Verification
- TypeScript type check: passed (no errors)
- Existing test suite: 14/14 tests passed
- ESLint runner: pre-existing infrastructure failure (`Cannot set properties of undefined (setting 'defaultMeta')` in `eslint/eslintrc`) unrelated to changed files.
