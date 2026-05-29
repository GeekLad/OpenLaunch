# Roadmap: OpenLaunch

## Overview

This roadmap delivers a configurable token launch experience for OpenLaunch. Starting from a working launchpad with hardcoded defaults, we progressively expose all launch parameters through a guided form, handle complex parameter combinations safely on-chain, and ensure the full lifecycle (creation → monitoring → fee tracking) respects user choices.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Types, Schema & Defaults Foundation** - Data structures, database schema, and single source of truth for all configurable parameters (completed 2026-05-23)
- [x] **Phase 2: Core Form Parameters & Basic UI** - Essential form expansion with supply, price, and range fields in an Advanced Options section
- [x] **Phase 3: Advanced Parameters, Fee Modes & Complex Validation** - Holdback slider, quote token selection, fee scheduler modes, and server-side SDK validation (completed 2026-05-26)
- [x] **Phase 4: Blockchain Integration & Pre-flight Safety** - SDK upgrade, on-chain parameter mapping, holdback math, and transaction simulation (completed 2026-05-26)
- [x] **Phase 5: Service Orchestration, Persistence & Detail Pages** - Full launch flow wiring, database persistence, and token detail page enhancement (completed 2026-05-26)
- [ ] **Phase 6: Background Jobs & Hardening** - Mode-aware fee updater, both-token fee tracking, and final safety hardening

## Phase Details

### Phase 1: Types, Schema & Defaults Foundation

**Goal:** All data structures, default values, and database schema are in place to support configurable launch parameters
**Mode:** mvp
**Depends on:** Nothing (first phase)
**Requirements:** PERS-01, PERS-03
**Success Criteria** (what must be TRUE):

  1. Database schema has columns for all configurable launch parameters (supply, price range, holdback %, quote token, fee scheduler mode, fee token mode) with sensible defaults or nullability
  2. Existing tokens in the database remain compatible (no data loss, no migration breakage)
  3. A single DEFAULTS configuration object is imported by both frontend and backend code, preventing silent drift
  4. TypeScript types use discriminated unions for fee scheduler modes, preventing invalid parameter combinations at compile time

**Plans:** 5/5 plans complete
**Plan list:**

- [x] 01-01-PLAN.md — Upgrade @meteora-ag/cp-amm-sdk to v1.4.3 and update poolUtils.ts API usage
- [x] 01-02-PLAN.md — Create types/fee.ts discriminated union, config/defaults.ts constants, update types/token.ts
- [x] 01-03-PLAN.md — Extend database schema with new columns and three sequential migrations
- [x] 01-04-PLAN.md — Update backend files: environment.ts, db/service.ts, API create route
- [x] 01-05-PLAN.md — Update downstream consumers: launchService.ts and TokenLaunchForm.tsx

**UI hint**: no

### Phase 2: Core Form Parameters & Basic UI

**Goal:** Users can configure core launch parameters through an intuitive Advanced Options section while the default form stays simple
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** LAUN-01, LAUN-02, LAUN-03, LAUN-04, LAUN-05, FORM-01, FORM-02, FORM-03, FORM-04, VALID-01
**Success Criteria** (what must be TRUE):

  1. User sees an "Advanced Options" collapsible section on the launch form below the essential fields (name, symbol, logo, description)
  2. User can set total token supply, initial price, and price range (min/max) inside Advanced Options
  3. Form shows clear validation errors when min price is not less than initial price or initial price is not less than max price
  4. All new fields are pre-filled with current environment defaults (1B supply, 0.00001 initial, 0.000001–0.0001 range)
  5. Expanding or collapsing Advanced Options preserves all entered values without resetting the form

**Plans**: TBD
**UI hint**: yes

### Phase 3: Advanced Parameters, Fee Modes & Complex Validation

**Goal:** Users can configure advanced parameters (holdback, quote token, fee scheduler, fee token mode) with full validation and safety warnings
**Mode:** mvp
**Depends on:** Phase 2
**Requirements:** LAUN-06, LAUN-07, LAUN-08, LAUN-09, FEE-01, FEE-02, FEE-03, FEE-04, FEE-05, FORM-05, FORM-06, VALID-02
**Success Criteria** (what must be TRUE):

  1. User can set a token holdback percentage (0–100%) via a slider; a red-flag warning appears when holdback exceeds 10%
  2. User can select SOL or USDC as the quote token from a dropdown
  3. User can select fee scheduler mode (Market-Cap Based default, Time-Based, or Disabled); the form dynamically shows only the relevant configuration fields for the selected mode
  4. User can select fee token mode (Quote Token Only default, or Both Quote + Base Token)
  5. Server-side validation rejects parameter combinations that violate SDK-specific constraints before any on-chain work begins
  6. Launch confirmation modal highlights any non-default advanced selections in red for user awareness
  7. Red-flag warnings remain visible even when Advanced Options is collapsed

**Plans**: TBD
**UI hint**: yes

### Phase 4: Blockchain Integration & Pre-flight Safety

**Goal:** The on-chain transaction builder correctly handles all configurable parameters, quote token decimals, and fee scheduler modes with pre-flight simulation
**Mode:** mvp
**Depends on:** Phase 3
**Requirements:** LAUN-10, FEE-06, VALID-03
**Success Criteria** (what must be TRUE):

  1. Pool creation transactions correctly use the user's selected quote token (SOL or USDC) with proper decimal handling (9 vs 6)
  2. Holdback percentage correctly splits the minted token supply between the creator's wallet and the liquidity pool
  3. Fee scheduler mode and its parameters are correctly mapped to the appropriate Meteora SDK constructor (market-cap, time-based, or fixed fee)
  4. Fee token mode is correctly passed to the Meteora SDK's CollectFeeMode enum
  5. A pre-flight transaction simulation runs on the pool creation transaction before it is submitted on-chain

**Plans**: TBD
**UI hint**: no

### Phase 5: Service Orchestration, Persistence & Detail Pages

**Goal:** The complete launch flow persists all user choices to the database and surfaces them on the token detail page
**Mode:** mvp
**Depends on:** Phase 4
**Requirements:** PERS-02, VALID-04
**Success Criteria** (what must be TRUE):

  1. When a token is successfully launched, all configured parameters (holdback %, fee scheduler mode, quote token, fee token mode, price range) are saved to the database
  2. The token detail page displays all stored launch parameters in a readable format
  3. If the pool creation transaction simulation fails, the preceding mint and setup transactions are not submitted (no orphaned tokens)
  4. The API endpoint accepts and validates all new launch parameters before passing them to the service layer

**Plans**: TBD
**UI hint**: yes

### Phase 6: Background Jobs & Hardening

**Goal:** Background fee tracking correctly handles all fee token modes and scheduler configurations
**Mode:** mvp
**Depends on:** Phase 5
**Requirements:** CRON-01, CRON-02, CRON-03
**Success Criteria** (what must be TRUE):

  1. Fee updater cron job reads the configured fee token mode (collectFeeMode) from the database for each token
  2. Quote-token-only fee tracking continues to work exactly as before for tokens using the default mode
  3. When fee token mode is set to "both tokens," the fee updater correctly tracks and reports fees from both base and quote tokens

**Plans**: TBD
**UI hint**: no

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Types, Schema & Defaults Foundation | 5/5 | Complete   | 2026-05-23 |
| 2. Core Form Parameters & Basic UI | 1/1 | Complete   | 2026-05-25 |
| 3. Advanced Parameters, Fee Modes & Complex Validation | 5/5 | Complete   | 2026-05-26 |
| 4. Blockchain Integration & Pre-flight Safety | 3/3 | Complete | 2026-05-26 |
| 5. Service Orchestration, Persistence & Detail Pages | 2/2 | Complete | 2026-05-26 |
| 6. Background Jobs & Hardening | 0/TBD | Not started | - |
