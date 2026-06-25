# Requirements: OpenLaunch

**Defined:** 2026-05-23
**Core Value:** Users can launch a token with a liquidity pool in a single guided flow, without writing code or manually building transactions.

## v1 Requirements

### Launch Parameters — Core

- [ ] **LAUN-01**: User can set total token supply (default: 1,000,000,000)
- [ ] **LAUN-02**: User can set initial price (default: 0.00001)
- [ ] **LAUN-03**: User can set price range minimum (default: 0.000001)
- [ ] **LAUN-04**: User can set price range maximum (default: 0.0001)
- [ ] **LAUN-05**: Validation ensures min price < initial price < max price

### Launch Parameters — Advanced

- [ ] **LAUN-06**: User can set token holdback percentage via slider (default: 0%, max: 100%)
- [ ] **LAUN-07**: UI shows red-flag warning when holdback > 10% ("Holding back more than 10% may be seen as a red flag by traders")
- [ ] **LAUN-08**: Holdback tokens are sent to the creator's wallet; remaining supply goes to the pool
- [ ] **LAUN-09**: User can select quote token: SOL (default) or USDC
- [ ] **LAUN-10**: Price math correctly handles SOL (9 decimals) and USDC (6 decimals)

### Fee Configuration

- [ ] **FEE-01**: User can select fee scheduler mode: Market-Cap Based (default), Time-Based, or Disabled
- [ ] **FEE-02**: When Market-Cap Based is selected, user can configure starting market cap and ending market cap
- [ ] **FEE-03**: When Time-Based is selected, user can configure fee start rate, fee end rate, and total duration
- [ ] **FEE-04**: When Disabled, user can configure a fixed base fee (in basis points)
- [ ] **FEE-05**: User can select fee token mode: Quote Token Only (default) or Both Quote + Base Token
- [ ] **FEE-06**: Fee token mode selection is correctly passed to Meteora SDK `CollectFeeMode`

### Form UI

- [ ] **FORM-01**: Default launch form shows only essential fields (name, symbol, logo, description)
- [ ] **FORM-02**: All configurable parameters (LAUN-01 through FEE-06) are grouped in an "Advanced Options" collapsible section
- [ ] **FORM-03**: Advanced Options section can be expanded/collapsed without losing form state
- [ ] **FORM-04**: Form pre-fills all advanced fields with current environment defaults
- [ ] **FORM-05**: Red-flag warnings (e.g., holdback >10%) are visible even when Advanced Options is collapsed
- [ ] **FORM-06**: Launch confirmation modal highlights any non-default advanced selections

### Validation & Safety

- [ ] **VALID-01**: Frontend Zod schema validates all user inputs with human-friendly error messages
- [ ] **VALID-02**: Server-side validation enforces SDK-specific constraints (e.g., fee rates, liquidity percentages)
- [ ] **VALID-03**: Pre-flight transaction simulation runs before submitting on-chain transactions
- [ ] **VALID-04**: If pool creation simulation fails, mint/setup transactions are not submitted

### Persistence

- [ ] **PERS-01**: Database schema extended to store all configurable launch parameters per token
- [ ] **PERS-02**: Token detail page displays stored launch parameters (holdback %, fee scheduler mode, quote token, fee token mode)
- [ ] **PERS-03**: Existing tokens in database remain compatible (nullable columns or sensible defaults)

### Background Jobs

- [x] **CRON-01**: Fee updater cron job reads `collectFeeMode` from database
- [x] **CRON-02**: Fee updater correctly handles quote-only fee tracking (current behavior preserved)
- [x] **CRON-03**: Fee updater supports both-token fee tracking when `collectFeeMode` is "both" (deferred if not feasible in v1)

## v2 Requirements

### Fee Configuration

- **FEE-07**: Rate Limiter fee scheduler mode (trade-size-based fees)
- **FEE-08**: Custom dynamic fee configuration (volatility parameters)

### Launch Parameters — Advanced

- **LAUN-11**: Vesting/locking schedule for holdback tokens
- **LAUN-12**: Alpha Vault integration (whitelist management)

### Token Support

- **TOKEN-01**: Support for quote tokens beyond SOL and USDC
- **TOKEN-02**: Token-2022 support with transfer fee extensions

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time market cap calculation in launch tx | Meteora handles this on-chain via fee scheduler behavior |
| Custom fee scheduler curves beyond Meteora SDK options | Stay within SDK-supported modes for v1 |
| Mobile app | Web-first; mobile later if product validates |
| Multi-chain support (Ethereum, etc.) | Solana-only focus for v1 |
| On-chain vesting contracts | Requires significant smart contract work; defer to v2 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LAUN-01 | Phase 2 | Pending |
| LAUN-02 | Phase 2 | Pending |
| LAUN-03 | Phase 2 | Pending |
| LAUN-04 | Phase 2 | Pending |
| LAUN-05 | Phase 2 | Pending |
| LAUN-06 | Phase 3 | Pending |
| LAUN-07 | Phase 3 | Pending |
| LAUN-08 | Phase 3 | Pending |
| LAUN-09 | Phase 3 | Pending |
| LAUN-10 | Phase 4 | Pending |
| FEE-01 | Phase 3 | Pending |
| FEE-02 | Phase 3 | Pending |
| FEE-03 | Phase 3 | Pending |
| FEE-04 | Phase 3 | Pending |
| FEE-05 | Phase 3 | Pending |
| FEE-06 | Phase 4 | Pending |
| FORM-01 | Phase 2 | Pending |
| FORM-02 | Phase 2 | Pending |
| FORM-03 | Phase 2 | Pending |
| FORM-04 | Phase 2 | Pending |
| FORM-05 | Phase 3 | Pending |
| FORM-06 | Phase 3 | Pending |
| VALID-01 | Phase 2 | Pending |
| VALID-02 | Phase 3 | Pending |
| VALID-03 | Phase 4 | Pending |
| VALID-04 | Phase 5 | Pending |
| PERS-01 | Phase 1 | Pending |
| PERS-02 | Phase 5 | Pending |
| PERS-03 | Phase 1 | Pending |
| CRON-01 | Phase 6 | Complete |
| CRON-02 | Phase 6 | Complete |
| CRON-03 | Phase 6 | Complete |

**Coverage:**

- v1 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-23*
*Last updated: 2026-05-23 after roadmap creation*
