# Milestones

Historical record of shipped versions. Each entry links to the archived roadmap and requirements.

---

## v1.4.3 — Configurable Launch

**Shipped:** 2026-06-26
**Status:** ✅ Complete

**Delivered:** A configurable Solana token launch experience where users set all launch parameters (supply, market cap, holdback/locked liquidity, quote token, fee scheduler mode, fee token mode) through a guided form with on-chain safety, database persistence, and mode-aware background fee tracking.

**Stats:**

- Phases: 7 (6 GSD-tracked + 1 freeform polish phase 5.1)
- Plans: 19 (GSD-tracked)
- Commits: 89 (milestone-scoped)
- Files changed: 160
- Lines: +22,921 / −2,769
- Timeline: 33 days (2026-05-23 → 2026-06-25)
- Codebase LOC: ~10,399 TS/TSX + 506 test LOC
- Requirements: 29/29 v1 complete

**Key accomplishments:**

1. Migrated to Meteora DAMMv2 SDK v1.4.3 and built a discriminated-union type system + database schema for all configurable launch parameters
2. Built a guided launch form with collapsible Advanced Options, holdback slider, quote token selection, dynamic fee scheduler sub-fields, and a launch confirmation modal highlighting non-default selections
3. Wired on-chain transaction building to respect user choices (quote token decimals, holdback split, fee scheduler mode → SDK constructor mapping) with a pre-flight validation gate
4. Persisted all launch parameters to the database and surfaced them on the token detail page (Pool Configuration, Fee Schedule, Holdback sections)
5. Polished UX in Phase 5.1: inverted holdback to "Locked Liquidity", converted price to market cap terms, percent-based fee display, two-column form, reusable NumberInput component
6. Hardened background fee tracking: rewrote Meteora client to live DAMMv2 API URLs, fixed lamports→USD-microunits bug, added fee-token-mode awareness, and added a circuit breaker (stale flag + MAX_CONSECUTIVE_FAILURES)

**Known gaps / deferred items:**

- Per-side fee split for both-token pools deferred to v2 (aggregate USD only in v1) per CRON-03 acceptance text
- `pool_stats_history` unit inconsistency between old (lamports) and new (USD microunits) rows — display-layer handling deferred
- Stale pool recovery is manual DB reset only — no admin API endpoint
- Phase 5.1 produced no PLAN/SUMMARY/VERIFICATION artifacts (freeform commit) — traceability gap
- Requirements tracker was not maintained during execution — reconciled from evidence at close

**Archives:**

- Roadmap: `.planning/milestones/v1.4.3-ROADMAP.md`
- Requirements: `.planning/milestones/v1.4.3-REQUIREMENTS.md`

---
*Last updated: 2026-06-26*