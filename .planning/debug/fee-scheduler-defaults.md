---
status: resolved
trigger: With the fee scheduler defaulting to a market cap based schedule, the fee decay duration and periods should be removed from the defaults.  The defaults should be based on the min/max market cap.
created: 2026-05-24
updated: 2026-05-24
---

## Current Focus

hypothesis: |
  The DEFAULT_LAUNCH_PARAMS in config/defaults.ts exports time-based fee scheduler
defaults (feeDurationMinutes=60, numberOfPeriods=60) alongside market-cap mode
starting/endingMarketCap=0. When feeSchedulerMode='market-cap-based', the
time-based fields (feeDurationMinutes, numberOfPeriods) are irrelevant and
confusing. Meanwhile startingMarketCap=0 and endingMarketCap=0 are not
useful defaults for a market-cap-based scheduler.

test: |
  Check each file that references DEFAULT_LAUNCH_PARAMS.feeDurationMinutes or
numberOfPeriods and verify if they are used inappropriately when mode is
'market-cap-based'. Also check seed data where feeDecayDurationMinutes and
feeDecayPeriods are set to 60 while feeSchedulerMode is 'market-cap-based'.

expecting: |
  The defaults file should only export defaults relevant to the active default
mode. The seed data should use consistent values. The form should use
meaningful starting/ending market cap values for market-cap mode.

next_action: |
  Identify all files needing changes and propose specific default values for
  startingMarketCap and endingMarketCap based on the project's intent.

## Evidence

- timestamp: 2026-05-24
  observation: |
    config/defaults.ts exports:
    - DEFAULT_FEE_SCHEDULER_MODE = 'market-cap-based'
    - DEFAULT_STARTING_MARKET_CAP = 0
    - DEFAULT_ENDING_MARKET_CAP = 0
    - DEFAULT_FEE_DURATION_MINUTES = 60
    - DEFAULT_NUMBER_OF_PERIODS = 60
    These time-based defaults are for time-based mode, but the default mode is
    market-cap-based.

- timestamp: 2026-05-24
  observation: |
    DEFAULT_LAUNCH_PARAMS combines all defaults including feeDurationMinutes and
    numberOfPeriods which are irrelevant when mode='market-cap-based'.

- timestamp: 2026-05-24
  observation: |
    lib/db/seed.ts sets feeDecayDurationMinutes=60 and feeDecayPeriods=60 for
    tokens with feeSchedulerMode='market-cap-based', which is inconsistent.

## Files Found Relevant

- config/defaults.ts
- lib/db/seed.ts
- lib/db/schema/tokens.ts
- components/forms/TokenLaunchForm.tsx
- lib/services/launchService.ts (fallback values)
