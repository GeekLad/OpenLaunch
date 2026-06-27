# Quick Task: Linear X Axis Toggle for Time-Based Fee Scheduler

## Description
Add a linear x-axis toggle to the time-based fee scheduler chart in the token launch form. Currently, the market-cap-based scheduler has "Market Cap/Price" and "Linear/Log" toggles, while the time-based chart is always linear and has no controls. This task adds analogous controls for time-based mode, allowing users to choose between a linear and an exponential x-axis.

## Scope
- `components/forms/token-launch-form/FeeScheduleSection.tsx`
- `components/forms/token-launch-form/FeeScheduleChart.tsx`

## Plan
1. Extend `FeeScheduleChart` to support an `xScaleMode` for time-based data, generating exponential period spacing when "log" is selected while keeping the axis label/time unit human readable.
2. Render the same "Linear/Log" toggle above the chart when `watchedFeeMode === "time-based"` (reuse existing xScaleMode state and style classes).
3. Update the chart's `xDomain`, `xScale`, and `buildTimeData` to honor the selected scale mode.
4. Run lint and the existing test suite to ensure no regressions.
