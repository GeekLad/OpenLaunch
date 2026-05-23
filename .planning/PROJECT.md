# OpenLaunch

## What This Is

A Solana token launchpad built on Next.js that lets users create SPL tokens, upload metadata to IPFS, and launch Meteora DAMMv2 liquidity pools. The app provides a guided form for token parameters and handles the full on-chain transaction flow.

## Core Value

Users can launch a token with a liquidity pool in a single guided flow, without writing code or manually building transactions.

## Requirements

### Validated

- ✓ Token creation (mint + metadata + IPFS upload) — existing
- ✓ Custom mint keypair support — existing
- ✓ Meteora DAMMv2 pool creation — existing
- ✓ Time-based exponential fee scheduler with start/end rate configuration — existing
- ✓ Quote-token-only fee collection — existing
- ✓ SOL as quote token — existing
- ✓ Token listing and detail pages — existing
- ✓ Background fee update cron job — existing

### Active

- [ ] User-configurable token holdback percentage (with red-flag warning at >10%)
- [ ] Market-cap-based fee scheduler as default, with option to switch to time-based or disable
- [ ] User-configurable fee token mode (quote-only default, option for quote + base)
- [ ] User-configurable quote token (SOL default, option for USDC)
- [ ] Expose additional hardcoded env values to the form: total supply, initial price, price range min/max
- [ ] Advanced options section in the launch form for all customizations

### Out of Scope

- Support for quote tokens beyond SOL and USDC — requires broader price oracle integration and UI complexity not justified for v1
- Real-time market cap calculation inside the launch transaction — rely on Meteora's on-chain fee scheduler behavior
- Custom fee scheduler curves beyond Meteora SDK's built-in options — stay within SDK-supported modes

## Context

- Next.js 16 + App Router + TypeScript
- Solana web3.js + @meteora-ag/cp-amm-sdk for pool creation
- SQLite + Drizzle ORM for local token tracking
- Current env-based defaults: 1B total supply, 0.00001 initial price, 0.000001–0.0001 price range, 100% liquidity to pool, 9 decimals
- Fee scheduler currently uses time-based exponential decay with configurable start/end rates

## Constraints

- **Tech stack**: Must stay within Next.js 16 / React 19 / Tailwind / shadcn/ui component patterns already in use
- **Blockchain SDK**: Fee scheduler modes must be supported by @meteora-ag/cp-amm-sdk
- **Wallet compatibility**: All transaction building must remain compatible with standard Solana wallet adapters
- **UI simplicity**: Default form stays simple; all customizations live in an "Advanced Options" collapsible section

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Expose env defaults as form fields with current defaults | Users want control without editing .env files | — Pending |
| Market-cap-based fee scheduler as default | User wants latest Meteora feature as default | — Pending |
| Holdback >10% triggers red-flag warning | Trader trust signal; warn but don't block | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-23 after initialization*
