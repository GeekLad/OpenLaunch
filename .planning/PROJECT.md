# OpenLaunch

## What This Is

A Solana token launchpad built on Next.js that lets users create SPL tokens, upload metadata to IPFS, and launch Meteora DAMMv2 liquidity pools. The app provides a guided form where every launch parameter is user-configurable (supply, market cap, locked liquidity, quote token, fee scheduler mode, fee token mode) and handles the full on-chain transaction flow with pre-flight validation.

## Core Value

Users can launch a token with a liquidity pool in a single guided flow, without writing code or manually building transactions.

## Requirements

### Validated

- ✓ Token creation (mint + metadata + IPFS upload) — existing
- ✓ Custom mint keypair support — existing
- ✓ Meteora DAMMv2 pool creation — existing
- ✓ Token listing and detail pages — existing
- ✓ Background fee update cron job — existing
- ✓ User-configurable total token supply — v1.4.3
- ✓ User-configurable market cap / price range (min/max) — v1.4.3
- ✓ User-configurable locked liquidity (holdback %) with red-flag warning — v1.4.3
- ✓ User-configurable quote token (SOL default, USDC option) with correct decimal math — v1.4.3
- ✓ Fee scheduler mode selection (Market-Cap Based default, Time-Based, Disabled) — v1.4.3
- ✓ Fee token mode selection (Quote Only default, Both Quote + Base) — v1.4.3
- ✓ Advanced Options collapsible section preserving form state — v1.4.3
- ✓ Launch confirmation modal highlighting non-default selections — v1.4.3
- ✓ Frontend Zod + server-side SDK validation — v1.4.3
- ✓ Pre-flight transaction simulation gate (no orphaned tokens on sim failure) — v1.4.3
- ✓ Database persistence of all launch parameters — v1.4.3
- ✓ Token detail page showing Pool Configuration, Fee Schedule, Locked Liquidity — v1.4.3
- ✓ Mode-aware background fee tracking (quote-only + both-token) — v1.4.3
- ✓ Cron circuit breaker (stale flag + consecutive failure threshold) — v1.4.3

### Active

(None — next milestone requirements defined via `/gsd-new-milestone`)

### Out of Scope

- Support for quote tokens beyond SOL and USDC — requires broader price oracle integration and UI complexity not justified for v1
- Real-time market cap calculation inside the launch transaction — rely on Meteora's on-chain fee scheduler behavior
- Custom fee scheduler curves beyond Meteora SDK's built-in options — stay within SDK-supported modes
- Per-side fee split for both-token pools — Meteora API returns aggregate USD fees; deferred to v2
- Mobile app — web-first; mobile later if product validates
- Multi-chain support (Ethereum, etc.) — Solana-only focus for v1
- On-chain vesting contracts — requires significant smart contract work; defer to v2

## Context

- **Shipped v1.4.3** with ~10,399 LOC TS/TSX (app/lib/components/config/types) + 506 test LOC
- **Tech stack:** Next.js 16 + App Router + React 19 + TypeScript 5.9, Tailwind, shadcn/ui, Drizzle ORM + SQLite, @solana/web3.js, @meteora-ag/cp-amm-sdk v1.4.3
- **Validation:** Vitest test suite (14 tests GREEN), `npm run lint` clean, conversational UAT passed per phase
- **Known technical debt:** `pool_stats_history` unit inconsistency (old lamports vs new USD microunits); Phase 5.1 produced no PLAN/SUMMARY artifacts; requirements tracker had to be reconciled from evidence at close
- **Deferred to v2:** Per-side both-token fee split, Rate Limiter fee mode, custom dynamic fees, vesting/locking schedule, Alpha Vault integration, additional quote tokens, Token-2022 support

## Constraints

- **Tech stack**: Must stay within Next.js 16 / React 19 / Tailwind / shadcn/ui component patterns already in use
- **Blockchain SDK**: Fee scheduler modes must be supported by @meteora-ag/cp-amm-sdk
- **Wallet compatibility**: All transaction building must remain compatible with standard Solana wallet adapters
- **UI simplicity**: Default form stays simple; all customizations live in an "Advanced Options" collapsible section

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Expose env defaults as form fields with current defaults | Users want control without editing .env files | ✓ Good — shipped in v1.4.3 |
| Market-cap-based fee scheduler as default | User wants latest Meteora feature as default | ✓ Good — shipped in v1.4.3 |
| Holdback >10% triggers red-flag warning | Trader trust signal; warn but don't block | ⚠️ Revisit — inverted to "Locked Liquidity" (<90% warns) in Phase 5.1; threshold semantics changed |
| Use discriminated union for FeeSchedulerConfig | Compile-time prevention of invalid parameter combinations | ✓ Good — prevented class of bugs |
| `shouldUnregister: false` + CSS `hidden` for collapsible sections | Preserve form state across collapse/expand without button gating issues | ✓ Good — solved button gating + value preservation |
| `useMemo` cross-field validation bypassing RHF resolver | superRefine only runs after base validation passes, blocking cross-field errors | ✓ Good — unblocked fee scheduler validation |
| Launch params converted from price to market cap terms (Phase 5.1) | Market cap easier for users to comprehend than raw price | ✓ Good — clearer UX |
| Fee rates displayed as percentages instead of basis points | User-friendly display | ✓ Good |
| Per-side fee split for both-token pools deferred to v2 | Meteora API returns aggregate USD fees; CRON-03 v1 acceptance | — Pending (v2) |
| Phase 5.1 implemented as freeform commit outside GSD workflow | Polish work treated as ad-hoc | ⚠️ Revisit — process gap, no PLAN/SUMMARY artifacts produced |
| Cron uses USD microunits (Math.floor(usd * 1_000_000)) instead of lamports (* 1e9) | Original lamports conversion was a bug; USD microunits are unit-correct | ✓ Good — fixed silent data corruption |

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
*Last updated: 2026-06-26 after v1.4.3 milestone*